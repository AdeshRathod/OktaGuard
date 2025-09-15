// Wire together fetcher and detector and provide an immediate-run method for the rescan endpoint
const { fetchLogs } = require("./services/logFetcher");
const detector = require("./services/detector");
const { db } = require("./storage");
const logger = require("./logger");
const { SCAN_INTERVAL_SECONDS } = require("./config");

async function runOnce() {
  await db.read();

  // Ensure state exists
  if (!db.get("state").value()) {
    db.set("state", { lastFetchISO: null, failedAttempts: {}, userCountries: {} }).write();
  }
  if (!db.get("alerts").value()) {
    db.set("alerts", []).write();
  }

  const since = db.get("state.lastFetchISO").value() || null;
  logger.info("Running scan. since=" + since);

  const logs = await fetchLogs(since);
  const alerts = await detector.processLogs(logs);

  logger.info(`Scan completed: ${alerts.length} new alerts`);
  return alerts;
}

let intervalHandle = null;

function startLoop() {
  // run immediately then on interval
  runOnce().catch((e) => logger.error("Initial scan failed: " + e.message));

  intervalHandle = setInterval(() => {
    runOnce().catch((e) => logger.error("Scheduled scan failed: " + e.message));
  }, SCAN_INTERVAL_SECONDS * 1000);
}

function stopLoop() {
  if (intervalHandle) clearInterval(intervalHandle);
}

module.exports = { runOnce, startLoop, stopLoop, fetchAndProcessNow: runOnce };
