
// index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import User from "./models/User.js";
import Task from "./models/Task.js";
import Referral from "./models/Referral.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Create or update user
app.post("/me", async (req, res) => {
  try {
    const { id, first_name, last_name, username, ref } = req.body;
    if (!id) return res.status(400).json({ error: "Missing user id" });

    let user = await User.findOne({ id });

    if (!user) {
      // Create new user
      user = new User({
        id,
        first_name,
        last_name,
        username,
        balance: 0,
        referredBy: ref || null,
      });
      await user.save();

      // If referral exists, link referral + give reward
      if (ref) {
        const referrer = await User.findOne({ id: ref });
        if (referrer) {
          await Referral.create({
            referrer: referrer.id,
            referee: id,
            reward: 0,
          });
          referrer.balance += 0.5; // initial bonus for inviting
          await referrer.save();
        }
      }
    } else {
      // Update existing user info (safe update)
      user.first_name = first_name;
      user.last_name = last_name;
      user.username = username;
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user profile
app.get("/me", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing user id" });

    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error in GET /me:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    console.error("Error in /tasks:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify task
app.post("/tasks/:id/verify", async (req, res) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;

    const user = await User.findOne({ id: userId });
    const task = await Task.findById(id);
    if (!user || !task) return res.status(404).json({ error: "Not found" });

    // Add reward
    user.balance += task.reward;
    await user.save();

    // Referral lifetime bonus (10% of task reward)
    if (user.referredBy) {
      const referrer = await User.findOne({ id: user.referredBy });
      if (referrer) {
        const bonus = task.reward * 0.1;
        referrer.balance += bonus;
        await referrer.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error in /tasks/:id/verify:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get referrals
app.get("/referrals", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing user id" });

    const referrals = await Referral.find({ referrer: id });
    res.json(referrals);
  } catch (err) {
    console.error("Error in /referrals:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
