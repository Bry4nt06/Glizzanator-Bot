const MusicQueue = require("./musicQueue");

class MusicManager {
    constructor(options = {}) {
        this.options = {
            maxQueueSize: options.maxQueueSize || 50,
            idleDisconnectMs: options.idleDisconnectMs || 300000
        };

        this.guildQueues = new Map();
    }

    getQueue(guildId) {
        if (!this.guildQueues.has(guildId)) {
            this.guildQueues.set(guildId, new MusicQueue({
                maxSize: this.options.maxQueueSize
            }));
        }

        return this.guildQueues.get(guildId);
    }

    enqueue(guildId, track) {
        const queue = this.getQueue(guildId);
        return queue.add(track);
    }

    getSnapshot(guildId) {
        return this.getQueue(guildId).snapshot();
    }

    skip(guildId) {
        return this.getQueue(guildId).next();
    }

    stop(guildId) {
        const queue = this.getQueue(guildId);
        queue.clear();
        return true;
    }
}

module.exports = MusicManager;
