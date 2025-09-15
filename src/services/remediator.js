const okta = require('../oktaClient');
 const logger = require('../logger');
 async function suspendUser(userId) {
 if (!userId) throw new Error('userId required');
 try {
 // Okta suspend endpoint
 const res = await okta.post(`/users/${userId}/lifecycle/suspend`);
 logger.info(`Suspended user ${userId}`);
 return res.data;
 } catch (err) {
 logger.error(`Failed to suspend ${userId}: ${err.message}`);
 throw err;
 }
 }
 module.exports = { suspendUser };