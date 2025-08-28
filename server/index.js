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
  referralEarnings: { type: Number, default: 0 },
  referralRewardsPaidFor: [String]
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

// --- Helper to find or create user ---
async function findOrCreateUser(tgUser, referrerId = null) {
  try {
    // Try to find existing user first
    let user = await User.findOne({ id: tgUser.id });
    
    if (!user) {
      // Create new user with referrer if provided
      const userData = {
        id: tgUser.id,
        first_name: tgUser.first_name || '',
        last_name: tgUser.last_name || '',
        username: tgUser.username || '',
        balance: 0,
        completedTaskIds: [],
        referrals: [],
        referralEarnings: 0,
        referralRewardsPaidFor: []
      };

      // Set referrer if provided and valid
      if (referrerId && referrerId !== tgUser.id) {
        const referrer = await User.findOne({ id: referrerId });
        if (referrer) {
          userData.referrerId = referrerId;
          console.log(`✅ New user ${tgUser.id} will be referred by ${referrerId}`);
        }
      }

      user = await User.create(userData);

      // Add to referrer's referrals array
      if (user.referrerId) {
        await User.updateOne(
          { id: user.referrerId },
          { $addToSet: { referrals: user.id } }
        );
        console.log(`✅ Added ${user.id} to referrer ${user.referrerId}'s referrals`);
      }
    } else {
      // Update existing user info but don't change referrer
      let updated = false;
      if (user.first_name !== tgUser.first_name) {
        user.first_name = tgUser.first_name || user.first_name;
        updated = true;
      }
      if (user.username !== tgUser.username) {
        user.username = tgUser.username || user.username;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    return user;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error, try to find the existing user
      return await User.findOne({ id: tgUser.id });
    }
    throw error;
  }
}

// --- Extract referrer from request ---
function extractReferrerId(req) {
  // Check multiple sources for referrer
  let referrerId = null;
  
  // 1. Check start_param (from Telegram deep links)
  if (req.tgStartParam) {
    referrerId = req.tgStartParam;
    console.log(`📱 Referrer from start_param: ${referrerId}`);
  }
  
  // 2. Check x-referrer header
  if (!referrerId && req.header('x-referrer')) {
    referrerId = req.header('x-referrer');
    console.log(`🌐 Referrer from header: ${referrerId}`);
  }
  
  // 3. Check query parameter
  if (!referrerId && req.query.ref) {
    referrerId = req.query.ref;
    console.log(`🔗 Referrer from query: ${referrerId}`);
  }

  if (referrerId) {
    // Clean and validate referrer ID
    referrerId = String(referrerId).trim().replace(/^@/, '');
    
    // Don't allow self-referral
    if (referrerId === req.tgUser?.id) {
      console.log(`⚠️ Self-referral blocked for user ${req.tgUser.id}`);
      return null;
    }
  }

  return referrerId;
}

// --- API Auth Middleware ---
async function telegramAuth(req, res, next) {
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
    const parsedUser = JSON.parse(parsed.user || '{}');
    req.tgUser = parsedUser;
  } catch {
    req.tgUser = null;
  }

  // Expose start_param (for referrals via deep links)
  try {
    req.tgStartParam = parsed.start_param || parsed.startParam || null;
    if (req.tgStartParam) {
      console.log(`📱 Detected start_param: ${req.tgStartParam} for user ${req.tgUser?.id}`);
    }
  } catch {
    req.tgStartParam = null;
  }

  // Merge anon <-> telegram user (avoid duplicates)
  try {
    const anonId = req.header('x-anon-id') || null;
    if (anonId && req.tgUser && anonId !== req.tgUser.id) {
      const anonUser = await User.findOne({ id: anonId });
      const tgUser = await User.findOne({ id: req.tgUser.id });

      if (anonUser) {
        if (tgUser) {
          tgUser.balance = (tgUser.balance || 0) + (anonUser.balance || 0);
          tgUser.completedTaskIds = Array.from(new Set([...(tgUser.completedTaskIds||[]), ...(anonUser.completedTaskIds||[])]));
          tgUser.referrals = Array.from(new Set([...(tgUser.referrals||[]), ...(anonUser.referrals||[])]));
          tgUser.referralEarnings = (tgUser.referralEarnings || 0) + (anonUser.referralEarnings || 0);
          await tgUser.save();
          await User.updateMany({ referrerId: anonUser.id }, { $set: { referrerId: tgUser.id } });
          await User.deleteOne({ id: anonUser.id });
        } else {
          anonUser.id = req.tgUser.id;
          anonUser.first_name = req.tgUser.first_name || anonUser.first_name;
          anonUser.username = req.tgUser.username || anonUser.username;
          await anonUser.save();
        }
      }
    }
  } catch (e) {
    console.error('Error merging anon user with telegram user', e);
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

// --- API Routes ---
const meHandler = async (req, res) => {
  try {
    const referrerId = extractReferrerId(req);
    const user = await findOrCreateUser(req.tgUser, referrerId);
    res.json({ user });
  } catch (error) {
    console.error('Error in meHandler:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const tasksHandler = async (req, res) => {
  try {
    const referrerId = extractReferrerId(req);
    const user = await findOrCreateUser(req.tgUser, referrerId);
    
    const tasks = await Task.find({ active: true });
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      url: task.link,
      description: task.description || `Complete this task to earn $${task.reward}`,
      reward: task.reward,
      code: task.code,
      active: task.active,
      status: (user.completedTaskIds || []).includes(task.id) ? 'completed' : 'pending'
    }));
    res.json({ tasks: transformedTasks });
  } catch (error) {
    console.error('Error in tasksHandler:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const taskVerifyHandler = async (req, res) => {
  const taskId = req.params.id;
  const { code } = req.body || {};
  
  try {
    const task = await Task.findOne({ id: taskId, active: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!code || String(code).trim() !== String(task.code).trim()) {
      return res.status(400).json({ error: 'Incorrect code' });
    }

    // Get user
    const referrerId = extractReferrerId(req);
    let user = await findOrCreateUser(req.tgUser, referrerId);
    
    if (user.completedTaskIds && user.completedTaskIds.includes(task.id)) {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Use transaction for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Reload user within transaction
      user = await User.findOne({ id: req.tgUser.id }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'User not found' });
      }

      // Double-check task completion
      if (user.completedTaskIds && user.completedTaskIds.includes(task.id)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Task already completed' });
      }

      // Add reward to user
      user.balance = (user.balance || 0) + (task.reward || 0);
      user.completedTaskIds = Array.from(new Set([...(user.completedTaskIds||[]), task.id]));
      await user.save({ session });

      // Process referral bonus
      if (user.referrerId) {
        const refUser = await User.findOne({ id: user.referrerId }).session(session);
        if (refUser) {
          // Check if bonus already paid
          user.referralRewardsPaidFor = user.referralRewardsPaidFor || [];
          if (!user.referralRewardsPaidFor.includes(task.id)) {
            const bonus = Math.floor((task.reward || 0) * 0.05 * 100) / 100;
            
            // Credit referrer
            refUser.balance = Math.floor(((refUser.balance || 0) + bonus) * 100) / 100;
            refUser.referralEarnings = Math.floor(((refUser.referralEarnings || 0) + bonus) * 100) / 100;

            // Ensure user is in referrer's referrals array
            refUser.referrals = refUser.referrals || [];
            if (!refUser.referrals.includes(user.id)) {
              refUser.referrals.push(user.id);
            }

            await refUser.save({ session });

            // Mark as paid
            user.referralRewardsPaidFor.push(task.id);
            await user.save({ session });

            console.log(`✅ Referral bonus: ${refUser.id} earned $${bonus} from ${user.id} completing task ${task.id}`);
          }
        }
      }

      await session.commitTransaction();
      session.endSession();
      
      res.json({ ok: true });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    console.error('❌ Error in taskVerifyHandler:', error);
    res.status(500).json({ error: 'Server error processing task' });
  }
};

const withdrawHandler = async (req, res) => {
  try {
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
      id: nanoid(12),
      userId: user.id,
      method: method || 'manual',
      details: details || { address: req.body?.address || '' },
      amount,
      status: 'pending',
      createdAt: new Date()
    });

    user.balance = Math.floor(((user.balance || 0) - amount) * 100) / 100;
    await user.save();
    res.json({ ok: true, withdraw: w });
  } catch (error) {
    console.error('Error in withdrawHandler:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const withdrawsHandler = async (req, res) => {
  try {
    const list = await Withdrawal.find({ userId: req.tgUser.id }).sort({ createdAt: -1 });
    res.json({ withdraws: list });
  } catch (error) {
    console.error('Error in withdrawsHandler:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const referralsHandler = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.tgUser.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get all users who have this user as their referrer
    const referredUsers = await User.find({ referrerId: user.id }).select('id first_name username');
    
    // Also check the referrals array (for backward compatibility)
    const referralIds = user.referrals || [];
    const referralsFromArray = await User.find({ id: { $in: referralIds } }).select('id first_name username');
    
    // Merge and deduplicate
    const allRefs = [...referredUsers];
    referralsFromArray.forEach(ref => {
      if (!allRefs.find(r => r.id === ref.id)) {
        allRefs.push(ref);
      }
    });
    
    // Update user's referrals array if needed
    const currentRefIds = allRefs.map(r => r.id);
    if (JSON.stringify(currentRefIds.sort()) !== JSON.stringify((user.referrals || []).sort())) {
      user.referrals = currentRefIds;
      await user.save();
    }
    
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'Taskbucksbot';
    const botLink = `https://t.me/${botUsername}?start=${user.id}`;
    const webLink = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}/?ref=${user.id}`;
    
    console.log(`📊 Referrals for ${user.id}: ${allRefs.length} referrals, earnings: $${user.referralEarnings || 0}`);
    
    res.json({
      link: botLink,
      webLink,
      referrals: allRefs,
      count: allRefs.length,
      referralEarnings: user.referralEarnings || 0,
      earnings: user.referralEarnings || 0
    });
  } catch (error) {
    console.error('Error in referralsHandler:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Apply routes
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

// --- Admin routes ---
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
  const t = await Task.create({ id: nanoid(8), title, link, description: description || '', reward, code, active });
  res.json({ task: t });
});

app.put('/api/admin/tasks/:id', adminAuth, async (req, res) => {
  const { title, link, reward, code, description, active } = req.body || {};
  const t = await Task.findOne({ id: req.params.id });
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (title !== undefined) t.title = title;
  if (link !== undefined) t.link = link;
  if (description !== undefined) t.description = description;
  if (code !== undefined) t.code = code;
  if (active !== undefined) t.active = !!active;
  if (reward !== undefined) {
    const num = Number(reward);
    if (Number.isNaN(num)) return res.status(500).json({ error: 'Invalid reward' });
    t.reward = num;
  }
  await t.save();
  res.json({ task: t });
});

app.delete('/api/admin/tasks/:id', adminAuth, async (req, res) => {
  const t = await Task.findOneAndDelete({ id: req.params.id });
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

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

// Database fix endpoint for existing referral issues
app.post('/api/admin/fix-referrals', adminAuth, async (req, res) => {
  try {
    console.log('🔧 Starting referral relationships fix...');
    
    // Find all users with referrerId but not in their referrer's referrals array
    const usersWithReferrers = await User.find({ referrerId: { $exists: true, $ne: null } });
    
    let fixedCount = 0;
    
    for (const user of usersWithReferrers) {
      const referrer = await User.findOne({ id: user.referrerId });
      
      if (referrer) {
        // Ensure user is in referrer's referrals array
        if (!referrer.referrals.includes(user.id)) {
          referrer.referrals.push(user.id);
          await referrer.save();
          fixedCount++;
          console.log(`✅ Added ${user.id} to ${referrer.id}'s referrals`);
        }
      } else {
        console.warn(`⚠️ Referrer ${user.referrerId} not found for user ${user.id}`);
        // Clear invalid referrer
        user.referrerId = null;
        await user.save();
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} referral relationships`);
    res.json({ ok: true, message: `Fixed ${fixedCount} referral relationships` });
    
  } catch (error) {
    console.error('❌ Error fixing referral relationships:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Healthcheck ---
app.get('/healthz', (_, res) => res.json({ ok: true }));

// --- Redirect helper ---
const redirectToClient = (req, res) => {
  try {
    const q = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    const client = process.env.CLIENT_URL || (process.env.SERVE_CLIENT === 'true' ? '/' : '/');
    const base = client.endsWith('/') ? client : client + '/';
    return res.redirect(302, base + (q || ''));
  } catch (e) {
    console.error('Redirect error', e);
    return res.redirect(302, '/');
  }
};

// --- Ensure Telegram "Open" button works ---
app.all(['/start', '/start/*'], redirectToClient);

// --- Root fallback ---
app.all(['/', '/index.html'], redirectToClient);

// --- Serve frontend locally if enabled ---
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
