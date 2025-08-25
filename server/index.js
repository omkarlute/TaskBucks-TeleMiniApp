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

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || '';
if (!mongoUri) {
  console.warn('⚠️ MONGODB_URI is not set. The server will not function properly without it.');
}
mongoose.connect(mongoUri, {})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== Schemas (with referral fields) =====
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

// ===== Seed tasks if none exist =====
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

// ===== Telegram initData verification =====
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
  } catch {
    return false;
  }
}

// ===== Middleware: validate Telegram user =====
app.use((req, res, next) => {
  const initData = req.header('x-telegram-init-data') || req.query.initData;
  if (!initData) return res.status(401).json({ error: 'Missing Telegram init data' });

  const ok = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || '');
  if (!ok) return res.status(401).json({ error: 'Invalid Telegram init data' });

  const parsed = parseInitData(initData);
  try {
    req.tgUser = JSON.parse(parsed.user || '{}');
  } catch {
    req.tgUser = null;
  }
  next();
});

// ===== Ensure User + Referrals =====
async function ensureUser(tgUser, req) {
  const uid = String(tgUser?.id || '');
  if (!uid) throw new Error('No Telegram user id');

  let user = await User.findOne({ id: uid });
  if (!user) {
    const refHeader = req?.header('x-referrer') || req?.query?.ref || req?.query?.referrer;
    let referrerId = refHeader ? String(refHeader).replace(/[^0-9]/g, '') : null;

    user = await User.create({
      id: uid,
      first_name: tgUser.first_name || '',
      last_name: tgUser.last_name || '',
      username: tgUser.username || '',
      balance: 0,
      completedTaskIds: [],
      referrerId: null,
      referrals: [],
      referralEarnings: 0
    });

    if (referrerId && referrerId !== uid) {
      const refUser = await User.findOne({ id: referrerId });
      if (refUser) {
        user.referrerId = referrerId;
        await user.save();
        if (!refUser.referrals.includes(uid)) {
          refUser.referrals.push(uid);
          await refUser.save();
        }
      }
    }
  }
  return user;
}

// ===== API Routes =====
app.get('/api/me', async (req, res) => {
  try {
    const user = await ensureUser(req.tgUser, req);
    res.json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const user = await ensureUser(req.tgUser, req);
    const tasks = await Task.find({ active: true }).lean();
    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        link: t.link,
        reward: t.reward,
        status: user.completedTaskIds.includes(t.id) ? 'completed' : 'pending'
      }))
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { code } = req.body || {};
  try {
    const user = await ensureUser(req.tgUser, req);
    const task = await Task.findOne({ id, active: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (user.completedTaskIds.includes(id)) return res.status(400).json({ error: 'Task already completed' });
    if (String(code).trim() !== task.code) return res.status(400).json({ error: 'Incorrect code' });

    user.completedTaskIds.push(id);
    user.balance = +(user.balance + task.reward).toFixed(2);
    await user.save();

    if (user.referrerId) {
      const ref = await User.findOne({ id: user.referrerId });
      if (ref) {
        const bonus = +(task.reward * 0.05).toFixed(2);
        ref.balance = +(ref.balance + bonus).toFixed(2);
        ref.referralEarnings = +(ref.referralEarnings + bonus).toFixed(2);
        await ref.save();
      }
    }

    res.json({ success: true, balance: user.balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/withdraw', async (req, res) => {
  const { method, details } = req.body || {};
  try {
    const user = await ensureUser(req.tgUser, req);
    if (user.balance < 5) return res.status(400).json({ error: 'Minimum withdraw is $5' });
    if (!['paypal', 'crypto'].includes(method)) return res.status(400).json({ error: 'Invalid method' });

    const amount = user.balance;
    user.balance = 0;
    await user.save();

    const w = await Withdrawal.create({
      id: nanoid(),
      userId: user.id,
      method,
      details,
      amount,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({ success: true, withdrawal: w });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/withdrawals', async (req, res) => {
  try {
    const user = await ensureUser(req.tgUser, req);
    const my = await Withdrawal.find({ userId: user.id }).lean();
    res.json({ withdrawals: my });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ===== Serve frontend (production) =====
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
