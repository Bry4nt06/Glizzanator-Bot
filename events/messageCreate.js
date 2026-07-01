const { MessageTrackingService } = require("../services");

function registerMessageCreateEvent(client, db) {
    client.on("messageCreate", (message) => {
        MessageTrackingService.track(db, message);
    });
}

module.exports = registerMessageCreateEvent;
