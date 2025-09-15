// src/logger.js
const { createLogger, transports, format } = require('winston');
const { LOG_LEVEL } = require('./config');


const logger = createLogger({
level: LOG_LEVEL,
format: format.combine(
format.timestamp(),
format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
),
transports: [
new transports.Console(),
new transports.File({ filename: 'logs/app.log' })
]
});


module.exports = logger;