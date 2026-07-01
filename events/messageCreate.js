const messageTracking = require("../services/MessageTrackingService");

function registerMessageCreateEvent(client, db) {
    client.on("messageCreate", (message) => {
        messageTracking.track(db, message);
    });
}

module.exports = registerMessageCreateEvent;
