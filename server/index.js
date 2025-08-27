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

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));

// --- Mongo ---
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasktoearn';
mongoose.connect(mongoUri, {})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// --- Schemas ---
const TaskSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  link: String,
  description: { type: String, default: '' }, // Added description field
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

// --- Seed Tasks helper ---
async function seedTasks() {
  try {
    const count = await Task.countDocuments();
    if (count === 0) {
      console.log('Seeding sample tasks...');
      const samples = [
        { 
          id: nanoid(8), 
          title: 'Join our Telegram group', 
          link: 'https://t.me/example', 
          description: 'Join our community and stay updated',
          reward: 10, 
          code: '1111', 
          active: true 
        },
        { 
          id: nanoid(8), 
          title: 'Visit our website', 
          link: 'https://example.com', 
          description: 'Check out our amazing website',
          reward: 5, 
          code: '2222', 
          active: true 
        },
        { 
          id: nanoid(8), 
          title: 'Visit our test', 
          link: 'https://example.com', 
          description: 'Check out our amazing website',
          reward: 5, 
          code: '1212', 
          active: true 
        },
        { 
          id: nanoid(8), 
          title: 'Follow on Twitter', 
          link: 'https://twitter.com/example', 
          description: 'Follow us for the latest updates',
          reward: 2, 
          code: '3333', 
          active: true 
        }
      ];
      await Task.insertMany(samples);
      console.log('Seeded tasks:', samples.length);
    }
  } catch (e) {
    console.error('seedTasks error', e);
  }
}
seedTasks().catch(console.error);

// --- Telegram init helpers ---
function getCheckString(params) {
  const keys = Object.keys(params).sort();
  return keys.filter(k => k !== 'hash').map(k => `${k}=${params[k]}`).join('\n');
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
    req.tgUser = { id: "dev_anon", first_name: "Dev", username: "localtester" };
    return next();
  }

  // Allow anonymous web users via x-anon-id header
  if (!initData) {
    const anon = req.header('x-anon-id') || null;
    if (anon) {
      req.tgUser = { id: anon, first_name: 'WebUser', username: `web_${anon}` };
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

// Admin auth middleware
function adminAuth(req, res, next) {
  try {
    const token = req.cookies?.admin_token || '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'dev_jwt_secret');
    if (payload?.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    req.admin = { username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// --- API Routes (Apply directly to app) ---

// Admin auth endpoints
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const u = process.env.ADMIN_USERNAME || 'admin';
  const p = process.env.ADMIN_PASSWORD || 'password';
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (username !== u || password !== p) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ role: 'admin', username }, process.env.ADMIN_JWT_SECRET || 'dev_jwt_secret', { expiresIn: '7d' });
  res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });
  return res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

// User endpoints (with telegram auth) - Handle both /api and direct routes
const meHandler = async (req, res) => {
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) {
    user = await User.create({
      id: req.tgUser.id,
      first_name: req.tgUser.first_name,
      username: req.tgUser.username
    });
  }
  // attach referrer if provided via header or query param (only once)
  const ref = req.header('x-referrer') || req.query.ref || null;
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
};

const tasksHandler = async (req, res) => {
  console.log('📋 GET /tasks called');
  
  // Get current user to check completed tasks
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) {
    user = await User.create({
      id: req.tgUser.id,
      first_name: req.tgUser.first_name,
      username: req.tgUser.username
    });
  }

  const tasks = await Task.find({ active: true });
  console.log('📊 Found', tasks.length, 'active tasks');
  
  // Add completion status and transform data for frontend
  const transformedTasks = tasks.map(task => ({
    id: task.id,
    title: task.title,
    url: task.link, // Transform link -> url for frontend
    description: task.description || `Complete this task to earn $${task.reward}`,
    reward: task.reward,
    code: task.code,
    active: task.active,
    status: (user.completedTaskIds || []).includes(task.id) ? 'completed' : 'pending'
  }));

  console.log('📋 Sending tasks:', transformedTasks.map(t => `${t.title} (${t.status})`));
  res.json({ tasks: transformedTasks });
};

const taskVerifyHandler = async (req, res) => {
  const taskId = req.params.id;
  const { code } = req.body || {};
  const task = await Task.findOne({ id: taskId, active: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!code || String(code).trim() !== String(task.code).trim()) return res.status(400).json({ error: 'Incorrect code' });

  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.completedTaskIds && user.completedTaskIds.includes(task.id)) {
    return res.status(400).json({ error: 'Task already completed' });
  }

  // credit user
  user.balance = (user.balance || 0) + (task.reward || 0);
  user.completedTaskIds = Array.from(new Set([...(user.completedTaskIds||[]), task.id]));
  await user.save();

  // referral 5% lifetime bonus
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
};

const withdrawHandler = async (req, res) => {
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
  user.balance = 0;
  await user.save();
  res.json({ ok: true, withdraw: w });
};

const withdrawsHandler = async (req, res) => {
  const list = await Withdrawal.find({ userId: req.tgUser.id }).sort({ createdAt: -1 });
  res.json({ withdraws: list });
};

const referralsHandler = async (req, res) => {
  const user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const refs = await User.find({ referrerId: user.id }).select('id first_name username');
  res.json({ link: `${req.protocol}://${req.get('host')}/?ref=${user.id}`, referrals: refs, referralEarnings: user.referralEarnings || 0 });
};

// Apply routes to both /api and direct paths
app.get('/api/me', telegramAuth, meHandler);
app.get('/me', telegramAuth, meHandler);

app.get('/api/tasks', telegramAuth, tasksHandler);
app.get('/tasks', telegramAuth, tasksHandler);

app.post('/api/tasks/:id/verify', telegramAuth, taskVerifyHandler);
app.post('/tasks/:id/verify', telegramAuth, taskVerifyHandler);

app.post('/api/withdraw', telegramAuth, withdrawHandler);
app.post('/withdraw', telegramAuth, withdrawHandler);

app.get('/api/withdraws', telegramAuth, withdrawsHandler);
app.get('/withdraws', telegramAuth, withdrawsHandler);

app.get('/api/referrals', telegramAuth, referralsHandler);
app.get('/referrals', telegramAuth, referralsHandler);

// Admin routes
app.post('/api/admin/seed', adminAuth, async (req, res) => {
  await seedTasks();
  res.json({ ok: true });
});

app.get('/api/admin/tasks', adminAuth, async (req, res) => {
  const tasks = await Task.find({}).sort({ active: -1 });
  res.json({ tasks });
});

app.post('/api/admin/tasks', adminAuth, async (req, res) => {
  const { title, link, reward, code, description, active=true } = req.body || {};
  if (!title || !link || !code || typeof reward !== 'number') return res.status(400).json({ error: 'Missing fields' });
  const t = await Task.create({ 
    id: nanoid(8), 
    title, 
    link, 
    description: description || '', 
    reward, 
    code, 
    active 
  });
  res.json({ task: t });
});


// --- Additional admin endpoints (added) ---
// Update a task
app.put('/api/admin/tasks/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const t = await Task.findOneAndUpdate({ id }, update, { new: true });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, task: t });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a task
app.delete('/api/admin/tasks/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const t = await Task.findOneAndDelete({ id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List users
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const users = await User.find({}).sort({ id: 1 });
  res.json({ users });
});

// Stats: task completions, total users, total balance
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  const tasks = await Task.find({});
  const users = await User.find({});
  const withdrawals = await Withdrawal.find({});
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const totalWithdrawals = withdrawals.length;
  const totalBalance = users.reduce((s,u)=>s+(u.balance||0),0);
  // task completions per task
  const completions = tasks.map(t=>({ id: t.id, title: t.title, completed: users.filter(u=>(u.completedTaskIds||[]).includes(t.id)).length }));
  res.json({ totalUsers, totalTasks, totalWithdrawals, totalBalance, completions });
});

// Referral list (from users)
app.get('/api/admin/referrals', adminAuth, async (req, res) => {
  const users = await User.find({}).select('id username referrals referralEarnings');
  res.json({ referrals: users });
});
// --- end added endpoints ---

app.get('/api/admin/withdrawals', adminAuth, async (req, res) => {
  const withdrawals = await Withdrawal.find({}).sort({ createdAt: -1 });
  res.json({ withdrawals });
});

app.post('/api/admin/withdrawals/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['pending','approved','completed','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const w = await Withdrawal.findOne({ id: req.params.id });
  if (!w) return res.status(404).json({ error: 'Not found' });
  w.status = status;
  await w.save();
  res.json({ ok: true, withdrawal: w });
});

// --- Healthcheck ---
app.get('/healthz', (_, res) => res.json({ ok: true }));

// --- Serve Frontend (optional) ---
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
