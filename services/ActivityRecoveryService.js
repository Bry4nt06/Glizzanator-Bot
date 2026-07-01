const VoiceRepository = require("../database/repositories/VoiceRepository");
const StreamRepository = require("../database/repositories/StreamRepository");
const StatusRepository = require("../database/repositories/StatusRepository");
const VoiceTrackingService = require("./VoiceTrackingService");
const StreamTrackingService = require("./StreamTrackingService");
const logger = require("../utils/logger");

async function openCurrentVoiceSessions(db, guild, now = Date.now()) {
    const currentStates = guild.voiceStates.cache.filter((voiceState) => {
        return voiceState.channelId && voiceState.member && !voiceState.member.user.bot;
    });

    for (const voiceState of currentStates.values()) {
        const member = voiceState.member;
        const channel = voiceState.channel;

        if (!member || !channel) continue;
        await VoiceTrackingService.openSession(db, member, channel, now);
    }
}

async function openCurrentStreamSessions(db, guild, now = Date.now()) {
    const currentStreams = guild.voiceStates.cache.filter((voiceState) => {
        return voiceState.streaming && voiceState.channelId && voiceState.member && !voiceState.member.user.bot;
    });

    for (const voiceState of currentStreams.values()) {
        const member = voiceState.member;
        const channel = voiceState.channel;

        if (!member || !channel) continue;
        await StreamTrackingService.openSession(db, member, channel, now);
    }
}

async function recoverGuild(db, guild, now = Date.now()) {
    const status = await StatusRepository.getGuildStatus(db, guild.id);
    const lastSeenAt = Number(status?.last_seen_at || now);
    const safeCloseAt = Math.min(lastSeenAt, now);

    await VoiceRepository.closeOpenSessionsAt(db, guild.id, safeCloseAt);
    await StreamRepository.closeOpenSessionsAt(db, guild.id, safeCloseAt);

    await openCurrentVoiceSessions(db, guild, now);
    await openCurrentStreamSessions(db, guild, now);
    await StatusRepository.updateGuildHeartbeat(db, guild.id, now);
}

async function recoverClient(db, client) {
    const now = Date.now();

    for (const guild of client.guilds.cache.values()) {
        try {
            await recoverGuild(db, guild, now);
        } catch (error) {
            logger.error(`Activity recovery failed for guild ${guild.id}`, error);
        }
    }
}

function startHeartbeat(db, client, intervalMs = 30_000) {
    const interval = setInterval(() => {
        const now = Date.now();

        for (const guild of client.guilds.cache.values()) {
            StatusRepository.updateGuildHeartbeat(db, guild.id, now).catch((error) => {
                logger.error(`Heartbeat update failed for guild ${guild.id}`, error);
            });
        }
    }, intervalMs);

    interval.unref();
    return interval;
}

async function initialize(db, client) {
    await recoverClient(db, client);
    return startHeartbeat(db, client);
}

module.exports = {
    initialize,
    recoverClient,
    recoverGuild,
    startHeartbeat,
    openCurrentVoiceSessions,
    openCurrentStreamSessions
};
