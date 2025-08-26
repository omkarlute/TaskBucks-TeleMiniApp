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

// ✅ Allow local dev + production via env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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

// --- API Auth Middleware ---
function telegramAuth(req, res, next) {
  const initData = req.header('x-telegram-init-data') || req.query.initData;

  // ✅ Allow dev without initData
  if ((!initData || initData === '') && process.env.NODE_ENV !== 'production') {
    req.tgUser = { id: "999999", first_name: "Dev", username: "localtester" };
    return next();
  }

  // Allow non-Telegram web users via x-anon-id header
  if (!initData) {
    const anon = req.header('x-anon-id') || null;
    if (anon) {
      req.tgUser = { id: anon, first_name: 'WebUser', username: 'web' };
      return next();
    }
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
  // Attach referrer if provided and not already set
  const ref = req.header('x-referrer') || null;
  if (ref && !user.referrerId && ref !== user.id) {
    const refUser = await User.findOne({ id: ref });
    if (refUser) {
      user.referrerId = refUser.id;
      await user.save();
      if (!refUser.referrals.includes(user.id)) {
        refUser.referrals.push(user.id);
        await refUser.save();
      }
    }
  }
  res.json({ user });
});

api.get('/tasks', async (req, res) => {
  const tasks = await Task.find({ active: true });
  res.json({ tasks });
});

api.post('/tasks/:id/verify', async (req, res) => {
  const taskId = req.params.id;
  const { code } = req.body || {};
  const task = await Task.findOne({ id: taskId, active: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!code || code.trim() !== task.code) return res.status(400).json({ error: 'Incorrect code' });

  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.completedTaskIds?.includes(task.id)) {
    return res.status(400).json({ error: 'Task already completed' });
  }
  // credit user
  user.balance = (user.balance || 0) + (task.reward || 0);
  user.completedTaskIds = Array.from(new Set([...(user.completedTaskIds||[]), task.id]));
  await user.save();

  // referral 5% lifetime
  if (user.referrerId) {
    const refUser = await User.findOne({ id: user.referrerId });
    if (refUser) {
      const bonus = (task.reward || 0) * 0.05;
      refUser.balance = (refUser.balance || 0) + bonus;
      refUser.referralEarnings = (refUser.referralEarnings || 0) + bonus;
      if (!refUser.referrals.includes(user.id)) refUser.referrals.push(user.id);
      await refUser.save();
    }
  }

  res.json({ ok: true });
});

api.post('/withdraw', async (req, res) => {
  const { method, details } = req.body || {};
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const amount = Math.floor((user.balance || 0) * 100) / 100;
  if (!amount || amount < 5) return res.status(400).json({ error: 'Min $5 to withdraw' });

  const w = await Withdrawal.create({
    id: nanoid(12),
    userId: user.id,
    method: (method||'').toLowerCase(),
    details: details || {},
    amount,
    status: 'pending',
    createdAt: new Date()
  });
  user.balance = 0; // simple: move all funds to pending withdrawal
  await user.save();
  res.json({ ok: true, withdraw: w });
});

api.get('/withdraws', async (req, res) => {
  const list = await Withdrawal.find({ userId: req.tgUser.id }).sort({ createdAt: -1 });
  res.json({ withdraws: list });
});

api.get('/referrals', async (req, res) => {
  const user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const refs = await User.find({ referrerId: user.id }).select('id first_name username');
  res.json({ link: `${req.protocol}://${req.get('host')}/?ref=${user.id}`, referrals: refs, referralEarnings: user.referralEarnings || 0 });
});

// Admin routes
api.get('/admin/tasks', async (req, res) => {
  if ((req.header('x-admin-secret')||'') !== (process.env.ADMIN_SECRET||'')) return res.status(401).json({ error: 'Unauthorized' });
  const tasks = await Task.find({}).sort({ active: -1 });
  res.json({ tasks });
});
api.post('/admin/tasks', async (req, res) => {
  if ((req.header('x-admin-secret')||'') !== (process.env.ADMIN_SECRET||'')) return res.status(401).json({ error: 'Unauthorized' });
  const { title, link, reward, code, active=true } = req.body || {};
  if (!title || !link || !code || typeof reward !== 'number') return res.status(400).json({ error: 'Missing fields' });
  const t = await Task.create({ id: nanoid(8), title, link, reward, code, active });
  res.json({ task: t });
});
api.get('/admin/withdrawals', async (req, res) => {
  if ((req.header('x-admin-secret')||'') !== (process.env.ADMIN_SECRET||'')) return res.status(401).json({ error: 'Unauthorized' });
  const withdrawals = await Withdrawal.find({}).sort({ createdAt: -1 });
  res.json({ withdrawals });
});
api.post('/admin/withdrawals/:id/status', async (req, res) => {
  if ((req.header('x-admin-secret')||'') !== (process.env.ADMIN_SECRET||'')) return res.status(401).json({ error: 'Unauthorized' });
  const { status } = req.body || {};
  const allowed = ['pending','approved','completed','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const w = await Withdrawal.findOne({ id: req.params.id });
  if (!w) return res.status(404).json({ error: 'Not found' });
  w.status = status;
  await w.save();
  res.json({ ok: true, withdrawal: w });
});

app.use('/api', api);

// --- Healthcheck (for Render) ---
app.get('/healthz', (_, res) => res.json({ ok: true }));

// --- Serve Frontend (optional) ---
if (process.env.SERVE_CLIENT === 'true') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
}

// --- Start ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
