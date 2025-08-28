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
  description: { type: String, default: '' },
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
        { id: nanoid(8), title: 'Join our Telegram group', link: 'https://t.me/example', description: 'Join our community and stay updated', reward: 10, code: '1111', active: true },
        { id: nanoid(8), title: 'Visit our website', link: 'https://example.com', description: 'Check out our amazing website', reward: 5, code: '2222', active: true },
        { id: nanoid(8), title: 'Visit our test', link: 'https://example.com', description: 'Check out our amazing website', reward: 5, code: '1212', active: true },
        { id: nanoid(8), title: 'Follow on Twitter', link: 'https://twitter.com/example', description: 'Follow us for the latest updates', reward: 2, code: '3333', active: true }
      ];
      await Task.insertMany(samples);
      console.log('Seeded tasks:', samples.length);
    }
  } catch (e) {
    console.error('seedTasks error', e);
  }
}
seedTasks().catch(console.error);

// --- Middleware: Telegram Auth ---
function verifyTelegramInitData(initData, botToken) {
  if (!initData) return false;
  return true;
}
function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  let result = {};
  for (const [k, v] of params.entries()) {
    result[k] = v;
  }
  return result;
}

// --- Auth middleware ---
app.use(async (req, res, next) => {
  const initData = req.header('x-telegram-init') || req.query.initData;

  if ((!initData || initData === '') && process.env.NODE_ENV !== 'production') {
    req.tgUser = { id: "dev_anon", first_name: "Dev", username: "localtester" };
    return next();
  }

  if (!initData) {
    const anon = req.header('x-anon-id') || null;
    if (anon) {
      req.tgUser = { id: anon, first_name: 'WebUser', username: `web_${anon}` };
      return next();
    }
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  const ok = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');
  if (!ok) return res.status(401).json({ error: 'Invalid Telegram init data' });

  const parsed = parseInitData(initData);
  try {
    const parsedUser = JSON.parse(parsed.user || '{}');
    req.tgUser = parsedUser;
  } catch {
    req.tgUser = null;
  }

  try {
    req.tgStartParam = parsed.start_param || parsed.startParam || null;
  } catch {
    req.tgStartParam = null;
  }

  next();
});

// --- Handlers ---
const meHandler = async (req, res) => {
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) {
    user = await User.create({
      id: req.tgUser.id,
      first_name: req.tgUser.first_name,
      last_name: req.tgUser.last_name,
      username: req.tgUser.username,
    });

    // ✅ Referral assignment
    if (req.tgStartParam && req.tgStartParam !== user.id) {
      const refUser = await User.findOne({ id: req.tgStartParam });
      if (refUser) {
        user.referrerId = refUser.id;
        await user.save();
        if (!refUser.referrals.includes(user.id)) {
          refUser.referrals.push(user.id);
          await refUser.save();
        }
      }
    }
  }

  const referralLink = `${process.env.WEBAPP_URL || 'http://localhost:5173'}?ref=${user.id}`;
  res.json({
    id: user.id,
    first_name: user.first_name,
    username: user.username,
    balance: user.balance,
    referrals: user.referrals,
    referralEarnings: user.referralEarnings,
    referral: {
      link: referralLink,
      count: user.referrals.length,
      earnings: user.referralEarnings
    }
  });
};

const tasksHandler = async (req, res) => {
  const tasks = await Task.find({ active: true });
  res.json(tasks);
};

const completeTaskHandler = async (req, res) => {
  const { taskId } = req.body;
  let user = await User.findOne({ id: req.tgUser.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const task = await Task.findOne({ id: taskId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (user.completedTaskIds.includes(task.id)) {
    return res.json({ ok: true, message: 'Already completed' });
  }

  user.balance = (user.balance || 0) + (task.reward || 0);
  user.completedTaskIds = Array.from(new Set([...(user.completedTaskIds||[]), task.id]));
  await user.save();

  if (user.referrerId) {
    const refUser = await User.findOne({ id: user.referrerId });
    if (refUser) {
      let bonus = Number((task.reward || 0) * 0.05) || 0;
      bonus = Math.floor(bonus * 100) / 100;
      refUser.balance = Math.floor(((refUser.balance || 0) + bonus) * 100) / 100;
      refUser.referralEarnings = Math.floor(((refUser.referralEarnings || 0) + bonus) * 100) / 100;
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

  let requested = req.body?.amount;
  if (typeof requested === 'string') requested = parseFloat(requested);
  if (typeof requested !== 'number' || isNaN(requested)) return res.status(400).json({ error: 'Invalid amount' });

  const amount = Math.floor(requested * 100) / 100;
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount < 5) return res.status(400).json({ error: 'Min $5 to withdraw' });
  if ((user.balance || 0) < amount) return res.status(400).json({ error: 'Insufficient balance' });

  const w = await Withdrawal.create({
    id: nanoid(10),
    userId: user.id,
    method,
    details,
    amount,
    status: 'pending',
    createdAt: new Date()
  });

  user.balance -= amount;
  await user.save();

  res.json({ ok: true, withdrawal: w });
};

// --- Routes ---
app.get('/api/me', meHandler);
app.get('/api/tasks', tasksHandler);
app.post('/api/complete-task', completeTaskHandler);
app.post('/api/withdraw', withdrawHandler);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`🚀 Server running on ${port}`));
