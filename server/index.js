import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// ✅ Allow local dev + Render production
const allowedOrigins = [
  'http://localhost:5173',
  'https://tele-miniapp.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// --- MongoDB ---
const mongoUri = process.env.MONGODB_URI || '';
if (!mongoUri) {
  console.warn('⚠️ MONGODB_URI is not set.');
}
mongoose.connect(mongoUri, {})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// --- Schemas ---
const TaskSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  link: String,
  reward: Number,
  code: String,
  active: { type: Boolean, default: true }
});
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  first_name: String,
  last_name: String,
  username: String,
  balance: { type: Number, default: 0 },
  completedTaskIds: [String],
  referrerId: { type: String, default: null },
  referrals: [String],
  referralEarnings: { type: Number, default: 0 }
});
const WithdrawalSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  method: String,
  details: Object,
  amount: Number,
  status: String,
  createdAt: Date
});
const Task = mongoose.model('Task', TaskSchema);
const User = mongoose.model('User', UserSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// --- Seed Tasks ---
async function seedTasks() {
  const count = await Task.countDocuments();
  if (count === 0) {
    await Task.create([
      { id: 't1', title: 'Visit Linkvertise Task #1', link: 'https://linkvertise.com/123/landing', reward: 0.25, code: '1212' },
      { id: 't2', title: 'Visit Linkvertise Task #2', link: 'https://linkvertise.com/456/landing', reward: 0.3, code: '3434' },
      { id: 't3', title: 'Partner Offer', link: 'https://example.com/offer', reward: 0.5, code: '5656' }
    ]);
    console.log('✅ Seeded tasks');
  }
}
seedTasks().catch(console.error);

// --- Telegram initData ---
function getCheckString(params) {
  const sorted = Object.keys(params).sort();
  return sorted.map(k => `${k}=${params[k]}`).join('\n');
}
function parseInitData(initData) {
  const pairs = initData.split('&');
  const out = {};
  for (const p of pairs) {
    const [k, v] = p.split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(v || '');
  }
  return out;
}
function verifyTelegramInitData(initData, botToken) {
  try {
    const data = parseInitData(initData);
    const hash = data.hash;
    delete data.hash;
    const dataCheckString = getCheckString(data);
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
  } catch (e) {
    return false;
  }
}

// --- API Auth Middleware (applies only to /api/*) ---
function telegramAuth(req, res, next) {
  const initData = req.header('x-telegram-init-data') || req.query.initData;

  // ✅ Allow dev
  if ((!initData || initData === '') && process.env.NODE_ENV !== 'production') {
    req.tgUser = { id: "999999", first_name: "Dev", username: "localtester" };
    return next();
  }

  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  const ok = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');
  if (!ok) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  const parsed = parseInitData(initData);
  try {
    req.tgUser = JSON.parse(parsed.user || '{}');
  } catch {
    req.tgUser = null;
  }
  next();
}

// --- API Routes ---
const api = express.Router();
api.use(telegramAuth);

api.get('/me', async (req, res) => {
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) {
    user = await User.create({
      id: req.tgUser.id,
      first_name: req.tgUser.first_name,
      username: req.tgUser.username
    });
  }
  res.json({ user });
});

api.get('/tasks', async (req, res) => {
  const tasks = await Task.find({ active: true });
  res.json({ tasks });
});

// TODO: add /api/tasks/:id/verify, /api/withdraw, etc.

app.use('/api', api);

// --- Serve Frontend ---
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// --- Start ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
