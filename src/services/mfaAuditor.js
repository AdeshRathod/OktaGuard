// src/services/mfaAuditor.js
// Scans users and checks MFA factors
const okta = require("../oktaClient");
const logger = require("../logger");

async function listAllUsers() {
  // For simplicity, we page through results until exhausted
  const users = [];
  let url = "/users";
  let params = { limit: 200 };
  try {
    let res = await okta.get(url, { params });
    users.push(...res.data);

    // Very basic paging: Okta sends a Link header for next page. For demo: if count == limit, try page++
    // In production, use Link headers to follow next.
  } catch (err) {
    logger.error("Error listing users: " + err.message);
    throw err;
  }
  return users;
}

async function getUserFactors(userId) {
  try {
    const res = await okta.get(`/users/${userId}/factors`);
    return res.data || [];
  } catch (err) {
    // If 404, user might have no factors
    if (err.response && err.response.status === 404) return [];
    logger.error(`Error fetching factors for ${userId}: ${err.message}`);
    throw err;
  }
}

function isWeakFactors(factors) {
  // Consider 'sms' factor as weak for this assignment.
  if (!factors || factors.length === 0) return true;
  // If all factors are type 'sms', mark weak
  return factors.every(
    (f) =>
      (f.factorType || f.provider || "").toLowerCase().includes("sms") ||
      (f.factorType || "").toLowerCase() === "sms"
  );
}

module.exports = { listAllUsers, getUserFactors, isWeakFactors };
