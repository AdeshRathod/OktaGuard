// src/services/logFetcher.js
// Responsible for fetching Okta system logs since last checkpoint
const okta = require("../oktaClient");
const { db } = require("../storage");
const logger = require("../logger");

async function fetchLogs(sinceISO) {
  // Okta supports pagination. For demo we fetch a page at a time.
  // We'll ask logs since a timestamp (ISO). If sinceISO is null, we fetch the last 100 logs.
  const params = {};
  if (sinceISO) params.since = sinceISO;
  params.limit = 200;

  try {
    const res = await okta.get("/logs", { params });
    // Save last fetched timestamp as the max published timestamp in results
    const logs = res.data || [];
    logger.info(`Fetched ${logs.length} log entries from Okta`);
    return logs;
  } catch (err) {
    logger.error(`Failed to fetch logs: ${err.message}`);
    throw err;
  }
}

module.exports = { fetchLogs };
