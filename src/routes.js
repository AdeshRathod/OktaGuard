const express = require("express");
const router = express.Router();
const { db } = require("./storage");
const remediator = require("./services/remediator");
const { fetchAndProcessNow } = require("./worker");

// GET /alerts
router.get("/alerts", async (req, res) => {
  await db.read();

  // ensure alerts array exists
  const alerts = db.get("alerts").value() || [];
  res.json(alerts);
});

// POST /remediate/:userId
router.post("/remediate/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    await remediator.suspendUser(userId);

    // Update alerts with action_taken for matching user(s)
    await db.read();
    const alerts = db.get("alerts").value() || [];

    alerts.forEach((a) => {
      if (a.user_id === userId) {
        a.action_taken = "suspended-manual";
      }
    });

    db.set("alerts", alerts).write();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rescan - trigger an immediate scan
router.post("/rescan", async (req, res) => {
  try {
    const results = await fetchAndProcessNow();
    res.json({ success: true, found: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
