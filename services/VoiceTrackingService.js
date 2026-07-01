const VoiceRepository = require("../database/repositories/VoiceRepository");

function getDurationSeconds(startedAt, endedAt) {
    return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

async function closeOpenSession(db, userId, guildId, leftAt) {
    const session = await VoiceRepository.getOpenSession(db, userId, guildId);

    if (!session) return;

    await VoiceRepository.closeSessionById(
        db,
        session.id,
        leftAt,
        getDurationSeconds(session.joined_at, leftAt)
    );
}

async function openSession(db, member, channel, joinedAt) {
    if (!member || !channel || member.user.bot) return;

    await closeOpenSession(db, member.id, member.guild.id, joinedAt);

    await VoiceRepository.openSession(db, {
        userId: member.id,
        username: member.user.username,
        channelId: channel.id,
        channelName: channel.name,
        guildId: member.guild.id,
        joinedAt
    });
}

async function track(db, oldState, newState, now = Date.now()) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    if (!oldChannelId && newChannelId) {
        await openSession(db, member, newState.channel, now);
        return;
    }

    if (oldChannelId && !newChannelId) {
        await closeOpenSession(db, member.id, member.guild.id, now);
        return;
    }

    if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
        await closeOpenSession(db, member.id, member.guild.id, now);
        await openSession(db, member, newState.channel, now);
    }
}

module.exports = {
    track,
    openSession,
    closeOpenSession
};
