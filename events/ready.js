const { dbGet, dbRun } = require("../database/helpers");
const logger = require("../utils/logger");

async function updateGuildHeartbeat(db, guildId, now = Date.now()) {
    await dbRun(
        db,
        `
        INSERT OR REPLACE INTO bot_status (guild_id, last_seen_at)
        VALUES (?, ?)
        `,
        [guildId, now]
    );
}

async function closeOpenVoiceSessionsAt(db, guildId, closeAt) {
    await dbRun(
        db,
        `
        UPDATE voice_sessions
        SET
            left_at = ?,
            duration_seconds = MAX(0, CAST((? - joined_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND left_at IS NULL
        `,
        [closeAt, closeAt, guildId]
    );
}

async function closeOpenStreamSessionsAt(db, guildId, closeAt) {
    await dbRun(
        db,
        `
        UPDATE stream_sessions
        SET
            ended_at = ?,
            duration_seconds = MAX(0, CAST((? - started_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND ended_at IS NULL
        `,
        [closeAt, closeAt, guildId]
    );
}

async function closeUserOpenVoiceSessionAt(db, guildId, userId, closeAt) {
    await dbRun(
        db,
        `
        UPDATE voice_sessions
        SET
            left_at = ?,
            duration_seconds = MAX(0, CAST((? - joined_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND user_id = ?
        AND left_at IS NULL
        `,
        [closeAt, closeAt, guildId, userId]
    );
}

async function closeUserOpenStreamSessionAt(db, guildId, userId, closeAt) {
    await dbRun(
        db,
        `
        UPDATE stream_sessions
        SET
            ended_at = ?,
            duration_seconds = MAX(0, CAST((? - started_at) / 1000 AS INTEGER))
        WHERE guild_id = ?
        AND user_id = ?
        AND ended_at IS NULL
        `,
        [closeAt, closeAt, guildId, userId]
    );
}

async function openCurrentVoiceSessions(db, guild) {
    const now = Date.now();
    const currentStates = guild.voiceStates.cache.filter((voiceState) => {
        return voiceState.channelId && voiceState.member && !voiceState.member.user.bot;
    });

    for (const voiceState of currentStates.values()) {
        const member = voiceState.member;
        const channel = voiceState.channel;

        if (!member || !channel) continue;

        await closeUserOpenVoiceSessionAt(db, guild.id, member.id, now);

        await dbRun(
            db,
            `
            INSERT INTO voice_sessions
            (user_id, username, channel_id, channel_name, guild_id, joined_at)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                member.id,
                member.user.username,
                channel.id,
                channel.name,
                guild.id,
                now
            ]
        );
    }
}

async function openCurrentStreamSessions(db, guild) {
    const now = Date.now();
    const currentStreams = guild.voiceStates.cache.filter((voiceState) => {
        return voiceState.streaming && voiceState.channelId && voiceState.member && !voiceState.member.user.bot;
    });

    for (const voiceState of currentStreams.values()) {
        const member = voiceState.member;
        const channel = voiceState.channel;

        if (!member || !channel) continue;

        await closeUserOpenStreamSessionAt(db, guild.id, member.id, now);

        await dbRun(
            db,
            `
            INSERT INTO stream_sessions
            (user_id, username, channel_id, channel_name, guild_id, started_at)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                member.id,
                member.user.username,
                channel.id,
                channel.name,
                guild.id,
                now
            ]
        );
    }
}

async function recoverActivityTracking(client, db) {
    const now = Date.now();

    for (const guild of client.guilds.cache.values()) {
        try {
            const status = await dbGet(
                db,
                `SELECT last_seen_at FROM bot_status WHERE guild_id = ?`,
                [guild.id]
            );

            const lastSeenAt = Number(status?.last_seen_at || now);
            const safeCloseAt = Math.min(lastSeenAt, now);

            // Discord does not provide historical per-user timers after downtime.
            // Closing stale sessions at the last heartbeat prevents inflated totals.
            await closeOpenVoiceSessionsAt(db, guild.id, safeCloseAt);
            await closeOpenStreamSessionsAt(db, guild.id, safeCloseAt);

            // Start fresh sessions for anyone currently active when the bot comes back.
            await openCurrentVoiceSessions(db, guild);
            await openCurrentStreamSessions(db, guild);
            await updateGuildHeartbeat(db, guild.id, now);
        } catch (error) {
            logger.error(`Activity recovery failed for guild ${guild.id}`, error);
        }
    }
}

module.exports = function registerReadyEvent(client, db) {
    client.once("clientReady", async () => {
        logger.info(`Glizzanator Bot is online as ${client.user.tag}`);

        if (!db) return;

        await recoverActivityTracking(client, db);

        setInterval(() => {
            const now = Date.now();

            for (const guild of client.guilds.cache.values()) {
                updateGuildHeartbeat(db, guild.id, now).catch((error) => {
                    logger.error(`Heartbeat update failed for guild ${guild.id}`, error);
                });
            }
        }, 30_000).unref();
    });
};
