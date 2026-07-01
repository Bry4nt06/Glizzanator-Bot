const { dbGet, dbRun } = require("../helpers");

async function getGuildStatus(db, guildId) {
    return dbGet(
        db,
        `
        SELECT last_seen_at
        FROM bot_status
        WHERE guild_id = ?
        `,
        [guildId]
    );
}

async function updateGuildHeartbeat(db, guildId, lastSeenAt = Date.now()) {
    return dbRun(
        db,
        `
        INSERT OR REPLACE INTO bot_status (guild_id, last_seen_at)
        VALUES (?, ?)
        `,
        [guildId, lastSeenAt]
    );
}

module.exports = {
    getGuildStatus,
    updateGuildHeartbeat
};
