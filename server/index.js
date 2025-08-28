
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.disable('x-powered-by');

// --- Mongo ---
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasktoearn';
mongoose.connect(mongoUri, {}).then(() => console.log('✅ MongoDB connected')).catch(err => console.error('MongoDB error:', err));

// --- Schemas ---
const TaskSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  link: String,
  description: { type: String, default: '' },
  reward: { type: Number, default: 0 },
  code: String,
  active: { type: Boolean, default: true }
});
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  first_name: String,
  username: String,
  balance: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  referrals: { type: [String], default: [] }, // IDs of referred users
  referrerId: { type: String, default: null },
  completedTaskIds: { type: [String], default: [] }
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

// --- Helpers ---
function getCheckString(params) {
  const keys = Object.keys(params).sort();
  return keys.filter(k => k !== 'hash').map(k => `${k}=${params[k]}`).join('\n');
}
function parseInitData(initData) {
  const pairs = (initData || '').split('&');
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
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken || '').digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
  } catch {
    return false;
  }
}

// Establish referral relationship if a valid ref is present.
// Returns the user document (created or existing).
async function ensureReferralTracking(req) {
  let ref = req.header('x-referrer') || req.query.ref || null;

  // Try Telegram initData start_param, which can be base64 JSON or a raw id/username
  const initData = req.header('x-telegram-init-data') || req.query.initData || '';
  if (!ref && initData) {
    const parsed = parseInitData(initData);
    if (parsed.start_param) {
      try {
        const decoded = Buffer.from(parsed.start_param, 'base64').toString('utf-8');
        const obj = JSON.parse(decoded);
        ref = obj.ref || obj.referredBy || obj.u || null;
      } catch {
        ref = parsed.start_param;
      }
    }
  }
  if (ref) {
    ref = String(ref).trim().replace(/^tg:\/\/user\?id=/i, '').replace(/^@/, '');
  }

  // Ensure user record exists first
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) {
    user = await User.create({
      id: req.tgUser.id,
      first_name: req.tgUser.first_name || '',
      username: req.tgUser.username || ''
    });
  }

  if (!ref) return user; // nothing to do

  // Don't self-refer
  if (ref === user.id || ('@' + ref) === user.username) return user;

  // Find referrer by id or username
  let refUser = await User.findOne({ id: ref });
  if (!refUser) refUser = await User.findOne({ username: ref });

  if (!refUser) {
    // Maybe ref is base64 JSON
    try {
      const decoded = Buffer.from(ref, 'base64').toString('utf-8');
      const obj = JSON.parse(decoded);
      const cand = obj.ref || obj.referredBy || obj.u;
      if (cand) {
        refUser = await (await User.findOne({ id: cand })) || await User.findOne({ username: String(cand).replace(/^@/, '') });
      }
    } catch {}
  }

  if (!refUser) return user;

  // If not already assigned, set user's referrerId
  if (!user.referrerId) {
    user.referrerId = refUser.id;
    await user.save();
  }

  // Push user.id into refUser.referrals if missing
  if (!Array.isArray(refUser.referrals)) refUser.referrals = [];
  if (!refUser.referrals.includes(user.id)) {
    refUser.referrals.push(user.id);
    await refUser.save();
  }

  return user;
}

// --- Auth middleware ---
async function telegramAuth(req, res, next) {
  const initData = req.header('x-telegram-init-data') || req.query.initData;
  // Allow anon for web preview/dev
  if ((!initData || initData === '') && process.env.NODE_ENV !== 'production') {
    req.tgUser = { id: req.header('x-anon-id') || 'web_anon', first_name: 'Web', username: 'web_user' };
    return next();
  }
  if (!initData) {
    const anon = req.header('x-anon-id') || null;
    if (anon) {
      req.tgUser = { id: anon, first_name: 'Web', username: `web_${anon}` };
      return next();
    }
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }
  const ok = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');
  if (!ok) return res.status(401).json({ error: 'Invalid Telegram init data' });

  const parsed = parseInitData(initData);
  try {
    const userJson = parsed.user ? JSON.parse(parsed.user) : {};
    req.tgUser = { id: String(userJson.id), first_name: userJson.first_name, username: userJson.username };
  } catch {
    return res.status(401).json({ error: 'Bad Telegram user data' });
  }
  return next();
}

// --- Seed some tasks (first run) ---
async function seedTasks() {
  const count = await Task.countDocuments();
  if (count > 0) return;
  await Task.insertMany([
    { id: nanoid(8), title: 'Join our Telegram group', link: 'https://t.me/', description: 'Stay updated', reward: 0.1, code: '1111' },
    { id: nanoid(8), title: 'Visit website', link: 'https://example.com', description: 'Check us out', reward: 0.05, code: '2222' }
  ]);
}
seedTasks().catch(console.error);

// --- Handlers ---
const meHandler = async (req, res) => {
  const user = await ensureReferralTracking(req);
  res.json({
    id: user.id,
    first_name: user.first_name,
    username: user.username,
    balance: user.balance || 0,
    referralEarnings: user.referralEarnings || 0,
    referralsCount: (user.referrals || []).length
  });
};

const tasksHandler = async (req, res) => {
  const tasks = await Task.find({ active: true }).sort({ title: 1 });
  const user = await User.findOne({ id: req.tgUser.id }) || {};
  const transformed = tasks.map(t => ({
    id: t.id, title: t.title, url: t.link, description: t.description, reward: t.reward, code: t.code, active: t.active,
    status: (user.completedTaskIds || []).includes(t.id) ? 'completed' : 'pending'
  }));
  res.json({ tasks: transformed });
};

const taskVerifyHandler = async (req, res) => {
  const { id } = req.params;
  const { code } = req.body || {};
  const task = await Task.findOne({ id, active: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (String(code || '').trim() !== String(task.code || '').trim()) return res.status(400).json({ error: 'Incorrect code' });

  // Ensure referral relationship exists first
  let user = await ensureReferralTracking(req);

  // Atomic update
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    user = await User.findOne({ id: req.tgUser.id }).session(session);

    if (!user.completedTaskIds.includes(task.id)) {
      user.completedTaskIds.push(task.id);
      user.balance = Math.round((user.balance + task.reward) * 100) / 100;

      // Referral bonus: 10% to referrer if exists
      if (user.referrerId) {
        const refUser = await User.findOne({ id: user.referrerId }).session(session);
        if (refUser) {
          const bonus = Math.round((task.reward * 0.10) * 100) / 100;
          refUser.referralEarnings = Math.round((refUser.referralEarnings + bonus) * 100) / 100;
          refUser.balance = Math.round((refUser.balance + bonus) * 100) / 100;
          await refUser.save({ session });
        }
      }
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }

  res.json({ ok: true });
};

const referralsHandler = async (req, res) => {
  const user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Users who have this user as referrerId OR appear in referrals array
  const referredA = await User.find({ referrerId: user.id }).select('id first_name username');
  const referredB = await User.find({ id: { $in: user.referrals || [] } }).select('id first_name username');

  const map = new Map();
  for (const u of [...referredA, ...referredB]) map.set(u.id, u);
  const list = Array.from(map.values());

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'Taskbucksbot';
  const payload = Buffer.from(JSON.stringify({ ref: user.id })).toString('base64');
  const botLink = `https://t.me/${botUsername}?startapp=${encodeURIComponent(payload)}`;
  const webLink = (process.env.CLIENT_URL || '') || `${req.protocol}://${req.get('host')}/?ref=${user.id}`;

  res.json({
    link: botLink,
    webLink,
    referrals: list,
    count: list.length,
    referralEarnings: user.referralEarnings || 0,
    earnings: user.referralEarnings || 0
  });
};

const withdrawHandler = async (req, res) => {
  const { amount, method, details } = req.body || {};
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  const w = await Withdrawal.create({
    id: nanoid(12),
    userId: user.id,
    method: method || 'manual',
    details: details || {},
    amount,
    status: 'pending',
    createdAt: new Date()
  });
  user.balance = Math.round((user.balance - amount) * 100) / 100;
  await user.save();
  res.json({ withdraw: w });
};

const withdrawsHandler = async (req, res) => {
  const list = await Withdrawal.find({ userId: req.tgUser.id }).sort({ createdAt: -1 });
  res.json({ withdraws: list });
};

// --- Routes ---
app.get('/api/me', telegramAuth, meHandler);
app.get('/me', telegramAuth, meHandler);
app.get('/api/tasks', telegramAuth, tasksHandler);
app.get('/tasks', telegramAuth, tasksHandler);
app.post('/api/tasks/:id/verify', telegramAuth, taskVerifyHandler);
app.post('/tasks/:id/verify', telegramAuth, taskVerifyHandler);
app.get('/api/referrals', telegramAuth, referralsHandler);
app.get('/referrals', telegramAuth, referralsHandler);
app.post('/api/withdraw', telegramAuth, withdrawHandler);
app.post('/withdraw', telegramAuth, withdrawHandler);
app.get('/api/withdraws', telegramAuth, withdrawsHandler);
app.get('/withdraws', telegramAuth, withdrawsHandler);

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get('/healthz', (_, res) => res.json({ ok: true }));

// error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: String(err && err.message) || 'Internal Server Error' });
});

// --- Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
