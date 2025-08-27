
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const BOT_TOKEN = process.env.BOT_TOKEN || 'TEST_BOT_TOKEN';
const CLIENT_URL = process.env.CLIENT_URL || '*';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tele-miniapp';
const COMMISSION_RATE = Number(process.env.COMMISSION_RATE || '0.05'); // 5%

// --- DB ---
mongoose.set('strictQuery', true);
await mongoose.connect(MONGODB_URI);

// --- Schemas ---
const TaskSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  description: String,
  reward: { type: Number, default: 0 },
  type: { type: String, enum: ['code', 'visit', 'follow', 'join', 'other'], default: 'other' },
  code: { type: String, default: null }, // for 'code' type verification
  url: { type: String, default: null },
  active: { type: Boolean, default: true },
});

const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // telegram id or anon id
  first_name: String,
  last_name: String,
  username: String,
  balance: { type: Number, default: 0 },
  completedTaskIds: { type: [String], default: [] },
  referrerId: { type: String, default: null },
  referrals: { type: [String], default: [] },
  referralEarnings: { type: Number, default: 0 },
}, { timestamps: true });

const WithdrawalSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  method: String,
  details: Object,
  amount: Number,
  status: { type: String, default: 'pending' },
  createdAt: Date
});

const Task = mongoose.model('Task', TaskSchema);
const User = mongoose.model('User', UserSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// --- Helpers ---
function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const obj = {};
  for (const [k, v] of params) obj[k] = v;
  return obj;
}
function getCheckString(obj) {
  return Object.keys(obj)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${obj[k]}`)
    .join('\n');
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
  } catch {
    return false;
  }
}

async function upsertUserFromHeaders(req) {
  const initData = req.header('x-telegram-init-data') || '';
  const anonId = req.header('x-anon-id') || null;
  const refHeader = (req.header('x-referrer') || '').trim() || null;

  let userId = null;
  let tg = null;

  if (initData && verifyTelegramInitData(initData, BOT_TOKEN)) {
    const dataObj = parseInitData(initData);
    if (dataObj.user) {
      tg = JSON.parse(dataObj.user);
      userId = String(tg.id);
    }
  }

  if (!userId && anonId) {
    userId = String(anonId);
  }
  if (!userId) {
    // last resort, issue a cookie id
    userId = req.cookies.uid || `web_${nanoid(10)}`;
    if (!req.cookies.uid) {
      req._setCookieUid = userId;
    }
  }

  // create or update profile basics
  let user = await User.findOne({ id: userId });
  if (!user) {
    user = await User.create({
      id: userId,
      first_name: tg?.first_name || null,
      last_name: tg?.last_name || null,
      username: tg?.username || null,
    });
  } else if (tg) {
    user.first_name = tg.first_name || user.first_name;
    user.last_name = tg.last_name || user.last_name;
    user.username = tg.username || user.username;
    await user.save();
  }

  // handle referrer only once (on first touch when user has no referrer)
  if (refHeader && !user.referrerId && refHeader !== user.id) {
    const refUser = await User.findOne({ id: String(refHeader) });
    if (refUser) {
      user.referrerId = refUser.id;
      await user.save();
      if (!refUser.referrals.includes(user.id)) {
        refUser.referrals.push(user.id);
        await refUser.save();
      }
    }
  }

  return user;
}

// --- Express app ---
const app = express();
app.use(helmet());
app.use(cors({ origin: CLIENT_URL === '*' ? true : [CLIENT_URL], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// attach current user for /api routes
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  try {
    const user = await upsertUserFromHeaders(req);
    if (req._setCookieUid) {
      res.cookie('uid', req._setCookieUid, { httpOnly: true, sameSite: 'lax' });
    }
    req.user = user;
    next();
  } catch (e) {
    console.error('auth error', e);
    res.status(500).json({ error: 'auth_failed' });
  }
});

// --- Seed default tasks (idempotent) ---
async function seedTasks() {
  const presets = [
    { id: 't1', title: 'Follow our X', description: 'Click follow and submit code 1234', type: 'code', code: '1234', reward: 1.0, url: 'https://x.com' },
    { id: 't2', title: 'Join Telegram', description: 'Join the channel', type: 'visit', reward: 0.5, url: 'https://t.me' },
    { id: 't3', title: 'Visit the website', description: 'Take a quick look', type: 'visit', reward: 0.25, url: 'https://example.com' },
  ];
  for (const t of presets) {
    await Task.updateOne({ id: t.id }, { $set: t }, { upsert: true });
  }
}

// --- API: Me ---
function toPublicUser(u) {
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    username: u.username,
    balance: u.balance,
    referralEarnings: u.referralEarnings,
    referrerId: u.referrerId,
  };
}
app.get(['/api/me','/me'], async (req, res) => {
  const me = await User.findOne({ id: req.user.id });
  res.json(toPublicUser(me));
});

// --- API: Tasks list ---
app.get(['/api/tasks','/tasks'], async (req, res) => {
  const tasks = await Task.find({ active: true }).lean();
  const completed = new Set(req.user.completedTaskIds || []);
  const mapped = tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    reward: t.reward,
    type: t.type,
    url: t.url,
    status: completed.has(t.id) ? 'completed' : 'pending'
  }));
  res.json({ tasks: mapped });
});

// --- API: Verify task ---
app.post(['/api/tasks/:id/verify', '/tasks/:id/verify'], async (req, res) => {
  const { id } = req.params;
  const { code } = req.body || {};
  const task = await Task.findOne({ id });
  if (!task || !task.active) return res.status(404).json({ error: 'task_not_found' });

  // Simple verification rules
  if (task.type === 'code') {
    if (!code || String(code).trim() !== String(task.code)) {
      return res.status(400).json({ error: 'invalid_code' });
    }
  }
  // other task types would have their own checks in real life

  const user = await User.findOne({ id: req.user.id });
  if (user.completedTaskIds.includes(task.id)) {
    return res.json({ ok: true, alreadyCompleted: true, balance: user.balance, reward: 0 });
  }

  // mark as completed
  user.completedTaskIds.push(task.id);
  user.balance += Number(task.reward);

  // referral commission
  if (user.referrerId) {
    const ref = await User.findOne({ id: user.referrerId });
    if (ref) {
      const commission = Number((Number(task.reward) * COMMISSION_RATE).toFixed(8));
      ref.referralEarnings += commission;
      ref.balance += commission;
      await ref.save();
    }
  }
  await user.save();

  res.json({ ok: true, reward: task.reward, balance: user.balance });
});

// --- API: Referrals ---
app.get(['/api/referrals','/referrals'], async (req, res) => {
  const me = await User.findOne({ id: req.user.id });
  const ids = me.referrals || [];
  const users = await User.find({ id: { $in: ids } }).lean();
  const referrals = users.map(u => ({ id: u.id, first_name: u.first_name, username: u.username }));
  const link = `https://t.me/${process.env.VITE_BOT_USERNAME || 'your_bot'}?start=${me.id}`;
  const webLink = `${process.env.WEB_BASE || ''}/?ref=${me.id}`;
  res.json({
    link, webLink,
    count: referrals.length,
    referrals,
    referralEarnings: me.referralEarnings,
    earnings: me.referralEarnings,
  });
});

// --- API: Withdrawals ---
app.post(['/api/withdraw','/withdraw'], async (req, res) => {
  const { method, details, amount } = req.body || {};
  const me = await User.findOne({ id: req.user.id });
  const amt = Number(amount || 0);
  if (!(amt > 0) || amt > me.balance) return res.status(400).json({ error: 'invalid_amount' });

  me.balance -= amt;
  await me.save();

  const w = await Withdrawal.create({
    id: nanoid(12),
    userId: me.id,
    method, details, amount: amt,
    status: 'pending',
    createdAt: new Date()
  });
  res.json({ ok: true, withdrawal: { id: w.id, amount: w.amount, status: w.status } });
});

app.get(['/api/withdraws','/withdraws'], async (req, res) => {
  const list = await Withdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ items: list.map(w => ({ id: w.id, amount: w.amount, status: w.status, createdAt: w.createdAt })) });
});

// --- Admin: seed ---
app.post(['/api/admin/seed','/admin/seed'], async (req, res) => {
  await seedTasks();
  res.json({ ok: true });
});

// --- Serve client build if configured ---
if (process.env.SERVE_CLIENT === 'true') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('✅ Server running on', PORT);
});
