const ActivityRecoveryService = require("../services/ActivityRecoveryService");
const logger = require("../utils/logger");

module.exports = function registerReadyEvent(client, db) {
    client.once("clientReady", async () => {
        logger.info(`Glizzanator Bot is online as ${client.user.tag}`);

        if (!db) return;

        await ActivityRecoveryService.initialize(db, client);
    });
};
