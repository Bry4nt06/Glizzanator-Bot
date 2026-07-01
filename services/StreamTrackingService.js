const StreamRepository = require("../database/repositories/StreamRepository");

function getDurationSeconds(startedAt, endedAt) {
    return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

async function closeOpenSession(db, userId, guildId, endedAt) {
    const session = await StreamRepository.getOpenSession(db, userId, guildId);

    if (!session) return;

    await StreamRepository.closeSessionById(
        db,
        session.id,
        endedAt,
        getDurationSeconds(session.started_at, endedAt)
    );
}

async function openSession(db, member, channel, startedAt) {
    if (!member || !channel || member.user.bot) return;

    await closeOpenSession(db, member.id, member.guild.id, startedAt);

    await StreamRepository.openSession(db, {
        userId: member.id,
        username: member.user.username,
        channelId: channel.id,
        channelName: channel.name,
        guildId: member.guild.id,
        startedAt
    });
}

async function track(db, oldState, newState, now = Date.now()) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return false;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const oldStreaming = Boolean(oldState.streaming);
    const newStreaming = Boolean(newState.streaming);

    if (!oldStreaming && newStreaming && newState.channel) {
        await openSession(db, member, newState.channel, now);
        return true;
    }

    if (oldStreaming && !newStreaming) {
        await closeOpenSession(db, member.id, member.guild.id, now);
        return false;
    }

    if (oldStreaming && newStreaming && oldChannelId && newChannelId && oldChannelId !== newChannelId) {
        await closeOpenSession(db, member.id, member.guild.id, now);
        await openSession(db, member, newState.channel, now);
    }

    return false;
}

module.exports = {
    track,
    openSession,
    closeOpenSession
};
