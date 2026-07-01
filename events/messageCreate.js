const { MessageTrackingService } = require("../services");
const logger = require("../utils/logger");

function registerMessageCreateEvent(client, db) {
    client.on("messageCreate", async (message) => {
        try {
            await MessageTrackingService.track(db, message);
        } catch (error) {
            logger.error("Message tracking error", error);
        }
    });
}

module.exports = registerMessageCreateEvent;
