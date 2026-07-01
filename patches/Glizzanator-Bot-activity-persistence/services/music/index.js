const { config } = require("../../config");
const MusicManager = require("./musicManager");

const musicManager = new MusicManager({
    maxQueueSize: config.music.maxQueueSize,
    idleDisconnectMs: config.music.idleDisconnectMs
});

module.exports = {
    musicManager,
    MusicManager
};
