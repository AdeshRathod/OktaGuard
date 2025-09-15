// src/services/poller.js
const axios = require("axios");
const { db } = require("../storage");
const detector = require("./detector");
const logger = require("../logger");
const {
  OKTA_ORG_URL,
  OKTA_API_TOKEN,
  POLL_INTERVAL_SEC,
} = require("../config");

// Build Okta headers
function getHeaders() {
  return {
    Authorization: `SSWS ${OKTA_API_TOKEN}`,
    Accept: "application/json",
  };
}

async function fetchLogs(sinceISO) {
  const url = `${OKTA_ORG_URL}/api/v1/logs`;
  const params = sinceISO ? { since: sinceISO } : {};
  try {
    const res = await axios.get(url, { headers: getHeaders(), params });
    return res.data || [];
  } catch (err) {
    logger.error("Failed to fetch logs from Okta: " + err.message);
    return [];
  }
}

async function runPoll() {
  try {
    await db.read();

    // Ensure state exists
    if (!db.get("state").value()) {
      db.set("state", { lastFetchISO: null, failedAttempts: {}, userCountries: {} }).write();
    }
    if (!db.get("alerts").value()) {
      db.set("alerts", []).write();
    }

    const lastFetchISO = db.get("state.lastFetchISO").value();
    const logs = await fetchLogs(lastFetchISO);

    if (logs.length > 0) {
      logger.info(`Fetched ${logs.length} new logs from Okta`);

      // Process with detector
      const alerts = await detector.processLogs(logs);

      if (alerts.length > 0) {
        logger.warn(`Detected ${alerts.length} new alerts`);
      }

      // Update lastFetchISO to newest log timestamp
      const newest = logs[0].published || new Date().toISOString();
      db.set("state.lastFetchISO", newest).write();
    } else {
      logger.info("No new logs.");
    }
  } catch (err) {
    logger.error("Poller run failed: " + err.message);
  }
}

function startPoller() {
  logger.info(`Starting poller every ${POLL_INTERVAL_SEC}s...`);
  runPoll(); // initial run
  setInterval(runPoll, POLL_INTERVAL_SEC * 1000);
}

module.exports = { startPoller };
