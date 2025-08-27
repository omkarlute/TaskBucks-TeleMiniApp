
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import crypto from 'crypto'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------- Mongo ----------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teleminiapp'
await mongoose.connect(MONGODB_URI, { dbName: 'teleminiapp' })

const userSchema = new mongoose.Schema({
  telegramId: { type: String, index: true, unique: true },
  firstName: String,
  lastName: String,
  username: String,
  balance: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  referrerId: { type: String, default: null },      // telegramId of referrer
  referrals: [{ type: String }],                    // telegramIds
  referralsCount: { type: Number, default: 0 },
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  createdAt: { type: Date, default: Date.now }
})

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  reward: Number,
  code: String,           // secret verification code
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

const withdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  address: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Task = mongoose.model('Task', taskSchema)
const Withdrawal = mongoose.model('Withdrawal', withdrawSchema)

// ---------- Seed demo tasks if empty ----------
if ((await Task.countDocuments()) === 0) {
  await Task.create([
    { title: 'Join our Telegram Channel', description: 'Stay updated—join and find the code in the pinned post.', url: 'https://t.me/example_channel', reward: 1, code: 'JOIN2025', order: 1 },
    { title: 'Follow our X (Twitter)', description: 'Open the link and find the code in bio.', url: 'https://x.com/example', reward: 1, code: 'FOLLOWX', order: 2 },
    { title: 'Visit our Website', description: 'Open the site and find the footer code.', url: 'https://example.com', reward: 2, code: 'SITEOK', order: 3 }
  ])
  console.log('✅ Seeded demo tasks')
}

// ---------- Telegram WebApp auth (safe + permissive) ----------
// We validate Telegram initData if provided. For local/dev, we also accept anon IDs.
function parseInitData(initData) {
  const params = new URLSearchParams(initData)
  const userStr = params.get('user')
  let user = null
  try { user = userStr ? JSON.parse(userStr) : null } catch {}
  return { params, user }
}

function checkTelegramSignature(initData) {
  // Verification per Telegram docs:
  // https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = new URLSearchParams(initData).get('hash') || ''
  const dataCheckString = Array.from(new URLSearchParams(initData))
    .filter(([k]) => k !== 'hash')
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  return hmac === hash
}

async function getOrCreateUser({ tgUser, anonId, referrer }) {
  // Use telegramId if available; else fallback to anonId for dev
  const telegramId = tgUser?.id ? String(tgUser.id) : null
  const key = telegramId || `anon_${anonId}`
  if (!key) throw new Error('No identity')

  let user = await User.findOne({ telegramId: key })
  if (!user) {
    user = await User.create({
      telegramId: key,
      firstName: tgUser?.first_name || '',
      lastName: tgUser?.last_name || '',
      username: tgUser?.username || '',
      balance: 0
    })
    // Handle referral attribution once on first creation
    if (referrer && referrer !== key) {
      const r = await User.findOne({ telegramId: String(referrer) })
      if (r) {
        user.referrerId = r.telegramId
        await user.save()
        // Unique referral count
        if (!r.referrals.includes(user.telegramId)) {
          r.referrals.push(user.telegramId)
          r.referralsCount = r.referrals.length
          await r.save()
        }
      }
    }
  }
  return user
}

const app = express()
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Attach user to req if possible
app.use(async (req, res, next) => {
  try {
    const initData = req.headers['x-telegram-init-data'] || ''
    const anonId = req.headers['x-anon-id'] || null
    const referrer = req.headers['x-referrer'] || null

    let tgUser = null
    if (initData) {
      const { user } = parseInitData(initData)
      // Only if signature is valid we trust tgUser fully
      if (user && checkTelegramSignature(initData)) {
        tgUser = user
      }
    }
    req.auth = { initDataPresent: !!initData, tgUser, anonId, referrer }
    if (!req.user) {
      // Lazy-load user record (create if needed)
      const u = await getOrCreateUser({ tgUser, anonId, referrer })
      req.user = u
    }
    next()
  } catch (e) {
    console.error('Auth attach error', e)
    return res.status(401).json({ error: 'Unauthorized' })
  }
})

// ---------- Helpers ----------
const REFERRAL_PCT = Number(process.env.REFERRAL_PCT || 0.05)

function taskToClient(task, user) {
  const completed = user.completedTasks?.some(tid => String(tid) === String(task._id))
  return {
    id: String(task._id),
    title: task.title,
    description: task.description,
    url: task.url,
    reward: task.reward,
    status: completed ? 'completed' : 'pending',
    isActive: task.isActive,
    order: task.order
  }
}

// ---------- API ----------

// Health
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }))

// Current user
app.get('/api/me', async (req, res) => {
  const u = await User.findById(req.user._id).lean()
  const completedCount = (u.completedTasks || []).length
  res.json({
    id: u.telegramId,
    username: u.username,
    firstName: u.firstName,
    balance: u.balance,
    referralEarnings: u.referralEarnings,
    referralsCount: u.referralsCount || (u.referrals?.length || 0),
    completedCount
  })
})

// Tasks list (pending first, then completed)
app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find({ isActive: true }).sort({ order: 1, createdAt: 1 })
  const mapped = tasks.map(t => taskToClient(t, req.user))

  // Move completed to bottom or hide based on query
  const mode = (req.query.mode || 'show').toLowerCase() // 'show' | 'hide'
  const pending = mapped.filter(t => t.status !== 'completed')
  const done = mapped.filter(t => t.status === 'completed')

  if (mode === 'hide') return res.json(pending)
  res.json([...pending, ...done])
})

// Verify task by code
app.post('/api/tasks/:id/verify', async (req, res) => {
  const { code } = req.body || {}
  const task = await Task.findById(req.params.id)
  if (!task || !task.isActive) return res.status(404).json({ error: 'Task not found' })

  const u = await User.findById(req.user._id)

  // already completed
  if (u.completedTasks.some(tid => String(tid) === String(task._id))) {
    return res.json({ ok: true, status: 'completed', balance: u.balance })
  }

  if (!code || code.trim().toUpperCase() !== String(task.code).trim().toUpperCase()) {
    return res.status(400).json({ error: 'Invalid code' })
  }

  // credit user
  u.completedTasks.push(task._id)
  u.balance = Number((u.balance + task.reward).toFixed(8))

  // referral earnings
  if (u.referrerId) {
    const ref = await User.findOne({ telegramId: u.referrerId })
    if (ref) {
      const amt = Number((task.reward * REFERRAL_PCT).toFixed(8))
      ref.balance = Number((ref.balance + amt).toFixed(8))
      ref.referralEarnings = Number((ref.referralEarnings + amt).toFixed(8))
      await ref.save()
    }
  }

  await u.save()
  return res.json({
    ok: true,
    status: 'completed',
    taskId: String(task._id),
    newBalance: u.balance
  })
})

// Withdraw create
app.post('/api/withdraw', async (req, res) => {
  const { amount, address } = req.body || {}
  const u = await User.findById(req.user._id)

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })
  if (!address) return res.status(400).json({ error: 'Address required' })
  if (u.balance < amount) return res.status(400).json({ error: 'Insufficient balance' })

  u.balance = Number((u.balance - amount).toFixed(8))
  await u.save()

  const w = await Withdrawal.create({ userId: u._id, amount, address, status: 'pending' })
  res.json({ ok: true, withdrawalId: String(w._id), balance: u.balance })
})

// Withdraw list
app.get('/api/withdraw', async (req, res) => {
  const list = await Withdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()
  res.json(list.map(w => ({
    id: String(w._id),
    amount: w.amount,
    address: w.address,
    status: w.status,
    createdAt: w.createdAt
  })))
})

// Referrals
app.get('/api/referrals', async (req, res) => {
  const u = await User.findById(req.user._id).lean()
  const origin = req.headers['origin'] || ''
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  const proto = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'))
  const base = `${proto}://${host || origin.replace(/^https?:\/\//, '')}`
  const link = `${base}/?ref=${encodeURIComponent(u.telegramId)}`

  res.json({
    link,
    count: u.referralsCount || (u.referrals?.length || 0),
    earnings: u.referralEarnings || 0,
    referrals: (u.referrals || []).map(x => ({ telegramId: x }))
  })
})

// ----------- Serve frontend in production -----------
if (process.env.SERVE_CLIENT === 'true') {
  const dist = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(dist))
  app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')))
}

// ---------- Start ----------
const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`))
