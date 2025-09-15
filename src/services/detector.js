// src/services/detector.js
// Core detection logic — takes log entries and emits normalized alerts
const { db } = require("../storage");
const {
  BRUTE_FORCE_THRESHOLD,
  BRUTE_FORCE_WINDOW_MIN,
  WORK_HOUR_START,
  WORK_HOUR_END,
  SUSPEND_ON_HIGH_RISK,
} = require("../config");
const logger = require("../logger");
const remediator = require("./remediator");

// Helper: parse Okta log event outcome
function isSuccess(log) {
  return (
    log.outcome &&
    log.outcome.result &&
    log.outcome.result.toLowerCase() === "success"
  );
}

function isFailure(log) {
  return (
    log.outcome &&
    log.outcome.result &&
    log.outcome.result.toLowerCase() === "failure"
  );
}

function getUserFromLog(log) {
  const username =
    (log.actor && log.actor.alternateId) ||
    (log.target && log.target[0] && log.target[0].displayName) ||
    null;
  const userId =
    (log.actor && log.actor.id) ||
    (log.target && log.target[0] && log.target[0].id) ||
    null;
  return { username, userId };
}

function normalizeAlert({
  userId,
  username,
  riskType,
  description,
  severity = "medium",
  actionTaken = null,
  timestamp = new Date().toISOString(),
}) {
  return {
    id: `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    user_id: userId,
    username,
    risk_type: riskType,
    description,
    timestamp,
    severity,
    action_taken: actionTaken,
  };
}

async function processLogs(logs) {
  if (!logs || logs.length === 0) return [];

  const alerts = [];
  const nowISO = new Date().toISOString();

  // Update last fetch time
  db.set("state.lastFetchISO", nowISO).write();

  // Ensure objects exist
  const failedAttempts = db.get("state.failedAttempts").value() || {};
  const userCountries = db.get("state.userCountries").value() || {};

  for (const log of logs) {
    try {
      const ts = log.published || new Date().toISOString();
      const { username, userId } = getUserFromLog(log);
      const ip =
        log.client && log.client.ip
          ? log.client.ip
          : (log.request && log.request.ip) || null;
      const country =
        (log.client &&
          log.client.geographicalContext &&
          log.client.geographicalContext.country) ||
        (log.client && log.client.geo && log.client.geo.country) ||
        (log.geographicalContext && log.geographicalContext.country) ||
        null;

      // 1) Brute-force detection
      if (isFailure(log)) {
        if (!username) continue;

        failedAttempts[username] = failedAttempts[username] || [];
        failedAttempts[username].push({ ts, ip });

        // prune old entries
        const windowMillis = BRUTE_FORCE_WINDOW_MIN * 60 * 1000;
        const cutoff = Date.now() - windowMillis;
        failedAttempts[username] = failedAttempts[username].filter(
          (f) => new Date(f.ts).getTime() >= cutoff
        );

        if (failedAttempts[username].length >= BRUTE_FORCE_THRESHOLD) {
          const a = normalizeAlert({
            userId,
            username,
            riskType: "brute_force_suspected",
            description: `Detected ${failedAttempts[username].length} failed attempts within ${BRUTE_FORCE_WINDOW_MIN}m`,
            severity: "high",
            timestamp: ts,
          });
          alerts.push(a);
          db.get("alerts").push(a).write();
        }
      }

      if (isSuccess(log)) {
        // On successful login check for the prior failed attempts
        if (username && failedAttempts[username] && failedAttempts[username].length > 0) {
          const count = failedAttempts[username].length;
          if (count >= BRUTE_FORCE_THRESHOLD) {
            const a = normalizeAlert({
              userId,
              username,
              riskType: "brute_force_account_compromise",
              description: `Succeeded after ${count} recent failures — possible credential stuffing or brute-force.`,
              severity: "critical",
              timestamp: ts,
            });
            alerts.push(a);
            db.get("alerts").push(a).write();

            if (SUSPEND_ON_HIGH_RISK && userId) {
              try {
                await remediator.suspendUser(userId);
                a.action_taken = "suspended";
              } catch (e) {
                logger.error("Remediation failed: " + e.message);
                a.action_taken = "suspend-failed";
              }
            }

            failedAttempts[username] = [];
          }
        }

        // 2) Unusual geography
        if (userId) {
          userCountries[userId] = userCountries[userId] || [];
          const known = userCountries[userId];

          if (country && !known.includes(country)) {
            const a = normalizeAlert({
              userId,
              username,
              riskType: "unusual_geography",
              description: `Login from new country: ${country}`,
              severity: "high",
              timestamp: ts,
            });
            alerts.push(a);
            db.get("alerts").push(a).write();

            known.push(country);
            userCountries[userId] = known.slice(-10);
          }
        }

        // 3) Out-of-hours login
        try {
          const dt = new Date(ts);
          const hour = dt.getHours();
          if (hour < WORK_HOUR_START || hour >= WORK_HOUR_END) {
            const a = normalizeAlert({
              userId,
              username,
              riskType: "outside_business_hours",
              description: `Login at ${hour}:00 which is outside working hours (${WORK_HOUR_START}-${WORK_HOUR_END})`,
              severity: "medium",
              timestamp: ts,
            });
            alerts.push(a);
            db.get("alerts").push(a).write();
          }
        } catch (e) {
          // ignore date parse issues
        }
      }
    } catch (err) {
      logger.error("Error processing a log entry: " + err.message);
    }
  }

  // Persist updated state back to DB
  db.set("state.failedAttempts", failedAttempts).write();
  db.set("state.userCountries", userCountries).write();

  return alerts;
}

module.exports = { processLogs };
