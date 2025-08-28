import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App & DB ---
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teleminiapp';
await mongoose.connect(MONGODB_URI, { autoIndex: true });

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true }, // telegram id or anon id
  first_name: String,
  username: String,
  photo_url: String,
  is_premium: Boolean,

  balance: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },

  referrerId: { type: String, default: null, index: true },
  referrals: { type: [String], default: [] },

  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
}, { minimize: true });

UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const TaskSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  title: String,
  description: String,
  link: String,
  reward: { type: Number, default: 0 },
  code: String, // verification code
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => new Date() }
});

const CompletionSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  taskId: { type: String, index: true, unique: true, sparse: false },
  // unique across a specific user+task; we'll enforce via compound index below
  status: { type: String, enum: ['completed'], default: 'completed' },
  createdAt: { type: Date, default: () => new Date() }
});
CompletionSchema.index({ userId: 1, taskId: 1 }, { unique: true });

const WithdrawalSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  userId: { type: String, index: true },
  amount: Number,
  method: String,
  details: Object,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: () => new Date() }
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);
const Completion = mongoose.model('Completion', CompletionSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// --- Helpers ---
function getBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

async function seedTasks() {
  const count = await Task.countDocuments();
  if (count === 0) {
    await Task.insertMany([
      { id: 't1', title: 'Follow our X', description: 'Open and follow.', link: 'https://x.com/', reward: 0.5, code: 'FOLLOW', active: true },
      { id: 't2', title: 'Join Discord', description: 'Join and verify.', link: 'https://discord.com/', reward: 0.75, code: 'DISCORD', active: true },
      { id: 't3', title: 'Visit website', description: 'Browse site and copy code.', link: 'https://example.com/', reward: 0.25, code: 'SITE', active: true },
    ]);
  }
}
await seedTasks();

// --- Auth-ish middleware ---
// We accept either Telegram init data (parsed upstream) or an anon id header.
// We also capture a referrer header and set referrerId only once.
app.use(async (req, res, next) => {
  try {
    const anonId = req.headers['x-anon-id'];
    const tgInit = req.headers['x-telegram-init-data'] || '';
    // Extremely simplified parse; in production verify hash!
    let tgUser = null;
    if (tgInit && typeof tgInit === 'string' && tgInit.includes('user=')) {
      try {
        const params = new URLSearchParams(tgInit);
        const userStr = params.get('user');
        if (userStr) tgUser = JSON.parse(userStr);
      } catch {}
    }

    const id = tgUser?.id?.toString() || (anonId ? String(anonId) : null);
    if (!id) {
      return res.status(400).json({ error: 'Missing user identity' });
    }

    const refHeader = req.headers['x-referrer'];
    const referrerId = refHeader ? String(refHeader) : null;

    // Upsert user
    let user = await User.findOne({ id });
    if (!user) {
      user = await User.create({
        id,
        first_name: tgUser?.first_name || '',
        username: tgUser?.username || '',
        photo_url: tgUser?.photo_url || '',
        is_premium: !!tgUser?.is_premium,
      });
    } else {
      // update profile fields opportunistically
      const up = {};
      if (tgUser?.first_name && tgUser.first_name !== user.first_name) up.first_name = tgUser.first_name;
      if (tgUser?.username && tgUser.username !== user.username) up.username = tgUser.username;
      if (Object.keys(up).length) {
        await User.updateOne({ id }, { $set: up, $currentDate: { updatedAt: true } });
        user = await User.findOne({ id });
      }
    }

    // Attach referrer if present and not set before and not self
    if (referrerId && !user.referrerId && referrerId !== id) {
      // ensure referrer exists
      const ref = await User.findOne({ id: referrerId });
      if (ref) {
        user.referrerId = referrerId;
        await user.save();
        // add to referrer's referrals list if not already there
        await User.updateOne(
          { id: referrerId },
          { $addToSet: { referrals: id }, $currentDate: { updatedAt: true } }
        );
      }
    }

    req.user = user;
    next();
  } catch (e) {
    console.error('auth middleware error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// --- Routes ---
app.get('/api/me', async (req, res) => {
  const u = req.user;
  const base = getBaseUrl(req);
  const link = `${base}/?ref=${encodeURIComponent(u.id)}`;
  res.json({
    id: u.id,
    first_name: u.first_name,
    username: u.username,
    balance: u.balance ?? 0,
    referralEarnings: u.referralEarnings ?? 0,
    referrerId: u.referrerId || null,
    link,
  });
});

// Tasks with per-user status
app.get('/api/tasks', async (req, res) => {
  const all = await Task.find({ active: true }).lean();
  const done = await Completion.find({ userId: req.user.id }).lean();
  const doneSet = new Set(done.map(c => c.taskId));
  const tasks = all.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    link: t.link,
    reward: t.reward,
    status: doneSet.has(t.id) ? 'completed' : 'pending'
  }));
  res.json({ tasks });
});

// Verify task
app.post('/api/tasks/:id/verify', async (req, res) => {
  const taskId = String(req.params.id);
  const { code } = req.body || {};
  const task = await Task.findOne({ id: taskId });
  if (!task || !task.active) return res.status(404).json({ error: 'Task not found' });
  if (!code || String(code).trim().toUpperCase() !== String(task.code).trim().toUpperCase()) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  // If already completed, return ok
  const exists = await Completion.findOne({ userId: req.user.id, taskId });
  if (exists) return res.json({ ok: true, already: true });

  // Create completion and credit user
  await Completion.create({ userId: req.user.id, taskId, status: 'completed' });
  const reward = Number(task.reward) || 0;
  await User.updateOne({ id: req.user.id }, { $inc: { balance: reward }, $currentDate: { updatedAt: true } });

  // Referral bonus 5% lifetime to referrer
  const freshUser = await User.findOne({ id: req.user.id });
  if (freshUser?.referrerId) {
    const bonus = +(reward * 0.05).toFixed(8);
    await User.updateOne(
      { id: freshUser.referrerId },
      { $inc: { balance: bonus, referralEarnings: bonus }, $addToSet: { referrals: req.user.id }, $currentDate: { updatedAt: true } }
    );
  }

  res.json({ ok: true, reward });
});

// Referrals view
app.get('/api/referrals', async (req, res) => {
  const u = await User.findOne({ id: req.user.id }).lean();
  const base = getBaseUrl(req);
  const link = `${base}/?ref=${encodeURIComponent(u.id)}`;
  let referrals = [];
  if (Array.isArray(u.referrals) && u.referrals.length) {
    const refs = await User.find({ id: { $in: u.referrals } }).lean();
    referrals = refs.map(r => ({ id: r.id, first_name: r.first_name, username: r.username }));
  }
  res.json({
    link,
    webLink: link,
    count: referrals.length,
    referrals,
    referralEarnings: u.referralEarnings || 0
  });
});

// Withdraw
app.post('/api/withdraw', async (req, res) => {
  const { amount, method, details } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const u = await User.findOne({ id: req.user.id });
  if (!u || (u.balance || 0) < amt) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const w = await Withdrawal.create({
    id: new mongoose.Types.ObjectId().toString(),
    userId: u.id,
    amount: amt,
    method: method || 'unknown',
    details: details || {},
    status: 'pending'
  });

  await User.updateOne({ id: u.id }, { $inc: { balance: -amt }, $currentDate: { updatedAt: true } });

  res.json({ ok: true, withdrawal: { id: w.id, amount: w.amount, status: w.status } });
});

app.get('/api/withdrawals', async (req, res) => {
  const items = await Withdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ withdrawals: items.map(w => ({ id: w.id, amount: w.amount, status: w.status, createdAt: w.createdAt })) });
});

// --- Admin (minimal) ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.cookie('admin', '1', { httpOnly: true, sameSite: 'none', secure: true });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Unauthorized' });
});

app.get('/api/admin/tasks', async (req, res) => {
  const tasks = await Task.find({}).lean();
  res.json({ tasks });
});

app.post('/api/admin/tasks', async (req, res) => {
  const { title, link, reward, code } = req.body || {};
  if (!title || !link || !code) return res.status(400).json({ error: 'Missing fields' });
  const id = new mongoose.Types.ObjectId().toString();
  const doc = await Task.create({ id, title, description: '', link, reward: Number(reward) || 0, code, active: true });
  res.json({ ok: true, task: { id: doc.id } });
});

// --- Serve frontend if built ---
if (process.env.SERVE_CLIENT === 'true') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
}

// --- Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
