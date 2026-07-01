const ActivityRecoveryService = require("./ActivityRecoveryService");
const DatabaseService = require("./DatabaseService");
const MessageTrackingService = require("./MessageTrackingService");
const StreamTrackingService = require("./StreamTrackingService");
const VoiceTrackingService = require("./VoiceTrackingService");

function createServices(dependencies = {}) {
    return {
        activityRecovery: ActivityRecoveryService,
        database: DatabaseService,
        messageTracking: MessageTrackingService,
        streamTracking: StreamTrackingService,
        voiceTracking: VoiceTrackingService,
        dependencies
    };
}

module.exports = {
    createServices,
    ActivityRecoveryService,
    DatabaseService,
    MessageTrackingService,
    StreamTrackingService,
    VoiceTrackingService
};
