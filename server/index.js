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

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || '';
if (!mongoUri) {
  console.warn('MONGODB_URI is not set. The server will not function properly without it.');
}
mongoose.connect(mongoUri, {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas (with referral fields)
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

// Helper: init seed tasks if empty
async function seedTasks() {
  const count = await Task.countDocuments();
  if (count === 0) {
    await Task.create([
      { id: 't1', title: 'Visit Linkvertise Task #1', link: 'https://linkvertise.com/123/landing', reward: 0.25, code: '1212', active: true },
      { id: 't2', title: 'Visit Linkvertise Task #2', link: 'https://linkvertise.com/456/landing', reward: 0.3, code: '3434', active: true },
      { id: 't3', title: 'Partner Offer', link: 'https://example.com/offer', reward: 0.5, code: '5656', active: true }
    ]);
    console.log('Seeded tasks');
  }
}
seedTasks().catch(console.error);

// --- Telegram initData verification ---
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

// Middleware to require valid Telegram init data (but allow local dev)
app.use((req, res, next) => {
  const initData = req.header('x-telegram-init-data') || req.query.initData;

  // In dev mode, allow fallback user
  if (!initData && process.env.NODE_ENV !== 'production') {
    req.tgUser = {
      id: "999999",
      first_name: "Dev",
      username: "localtester"
    };
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
    const user = JSON.parse(parsed.user || '{}');
    req.tgUser = user;
  } catch {
    req.tgUser = null;
  }
  next();
});


// --- Routes (unchanged) ---
// (keep your /api/me, /api/tasks, /api/tasks/:id/verify, /api/withdraw, /api/withdrawals here)

// Serve frontend in production (client/dist)
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Server running on port', port);
});
