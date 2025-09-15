// src/config.js
const dotenv = require('dotenv');
dotenv.config();


module.exports = {
OKTA_ORG_URL: process.env.OKTA_ORG_URL,
OKTA_API_TOKEN: process.env.OKTA_API_TOKEN,
PORT: process.env.PORT || 3000,
SCAN_INTERVAL_SECONDS: Number(process.env.SCAN_INTERVAL_SECONDS || 60),
ALERTS_DB_FILE: process.env.ALERTS_DB_FILE || './data/db.json',
BRUTE_FORCE_THRESHOLD: Number(process.env.BRUTE_FORCE_THRESHOLD || 5),
BRUTE_FORCE_WINDOW_MIN: Number(process.env.BRUTE_FORCE_WINDOW_MIN || 5),
WORK_HOUR_START: Number(process.env.WORK_HOUR_START || 9),
WORK_HOUR_END: Number(process.env.WORK_HOUR_END || 18),
SUSPEND_ON_HIGH_RISK: (process.env.SUSPEND_ON_HIGH_RISK || 'true') === 'true',
LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};