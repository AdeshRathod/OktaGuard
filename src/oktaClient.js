const axios = require('axios');
const { OKTA_ORG_URL, OKTA_API_TOKEN } = require('./config');
const logger = require('./logger');


if (!OKTA_ORG_URL || !OKTA_API_TOKEN) {
logger.error('OKTA_ORG_URL and OKTA_API_TOKEN must be provided in env');
}


const client = axios.create({
baseURL: `${OKTA_ORG_URL}/api/v1`,
headers: {
Authorization: `SSWS ${OKTA_API_TOKEN}`,
'Content-Type': 'application/json',
Accept: 'application/json'
},
timeout: 20000
});


module.exports = client;