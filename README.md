# Task-to-Earn — Fullstack (MongoDB) Ready to Deploy (Referral Enabled)

This repo contains a fullstack Telegram Mini App:
- `client/` — React + Vite frontend
- `server/` — Express backend (uses MongoDB via Mongoose) and serves frontend in production

## Referral Program
- New users can be linked via a referral parameter `?ref=<telegram_user_id>` in the WebApp URL.
- When a referred user completes tasks, the referrer receives **5%** of each task reward (credited to their balance).
- The server stores `referrerId`, `referrals[]`, and `referralEarnings` per user.

Example deep link: `https://yourwebapp.example.com/?ref=123456789`

## Quickstart (local dev)

### 1) Get MongoDB
Use MongoDB Atlas (free tier) and create a cluster. Copy the connection string (MONGODB_URI).

### 2) Backend
```bash
cd server
cp .env.example .env
# Edit .env and set MONGODB_URI and TELEGRAM_BOT_TOKEN
npm install
npm run dev
```
Backend runs on port 8080 by default.

### 3) Frontend
```bash
cd client
npm install
npm run dev
```
Frontend dev runs on port 5173. When running locally, `server` accepts `x-telegram-init-data` header; WebApp.initData is provided when running inside Telegram.

## Deploying to Render (single service)
- Build the frontend: `cd client && npm run build` which outputs `client/dist`
- Deploy the server folder to Render (Node service). Make sure `MONGODB_URI` and `TELEGRAM_BOT_TOKEN` are set in Render env.
- The server serves the built frontend automatically.

## Notes
- Tasks are seeded on first server run if none exist.
- Verification works via secret `code` per task (user must paste code shown on destination).
- Withdrawals create a pending record and deduct full balance (you can change logic later).
- Keep your bot token secret and server-side only.

### Referral UI
- Dashboard "Referral Program" card with Copy Link and Share on Telegram.
- Dedicated "Referrals" tab showing your link, referral list, and lifetime earnings.
