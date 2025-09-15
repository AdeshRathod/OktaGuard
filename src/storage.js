const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');
const path = require('path');
const { ALERTS_DB_FILE } = require('./config');

// Ensure db directory exists
const dbFile = path.resolve(ALERTS_DB_FILE);
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Setup lowdb with FileSync adapter
const adapter = new FileSync(dbFile);
const db = low(adapter);

// Initialize defaults
function init() {
  db.defaults({
    alerts: [],
    state: { lastFetchISO: null, userCountries: {} }
  }).write();
}

module.exports = { db, init };
