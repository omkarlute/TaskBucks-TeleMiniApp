
const express = require('express');
const router = express.Router();
// Simple referrals route to avoid 404s and provide debug info
router.get('/', async (req, res) => {
  console.log('GET /referrals hit (fallback route)', { query: req.query, headers: { x_referrer: req.headers['x-referrer'] } });
  try {
    // placeholder: real logic should fetch from DB
    return res.json({ referrals: [], earnings: 0 });
  } catch (err) {
    console.error('referrals error', err);
    return res.status(500).json({ error: 'referrals_error' });
  }
});
module.exports = router;
