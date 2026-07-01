const ActivityAdjustmentRepository = require("../database/repositories/ActivityAdjustmentRepository");

const MANUAL_SOURCE = "discord_command";

function hoursToSeconds(hours) {
    const value = Number(hours);

    if (!Number.isFinite(value)) {
        throw new Error("Hours must be a valid number.");
    }

    return Math.round(value * 3600);
}

function secondsToHours(seconds) {
    return Number((Number(seconds || 0) / 3600).toFixed(2));
}

async function getTrackedSeconds(db, guildId, userId, activityType) {
    return ActivityAdjustmentRepository.getTrackedSeconds(db, guildId, userId, activityType);
}

async function getManualSeconds(db, guildId, userId, activityType) {
    return ActivityAdjustmentRepository.getManualSeconds(db, guildId, userId, activityType);
}

async function getTotals(db, guildId, userId) {
    const [voiceTracked, voiceManual, streamTracked, streamManual] = await Promise.all([
        getTrackedSeconds(db, guildId, userId, "voice"),
        getManualSeconds(db, guildId, userId, "voice"),
        getTrackedSeconds(db, guildId, userId, "stream"),
        getManualSeconds(db, guildId, userId, "stream")
    ]);

    return {
        voice: {
            trackedSeconds: voiceTracked,
            manualSeconds: voiceManual,
            totalSeconds: voiceTracked + voiceManual,
            trackedHours: secondsToHours(voiceTracked),
            manualHours: secondsToHours(voiceManual),
            totalHours: secondsToHours(voiceTracked + voiceManual)
        },
        stream: {
            trackedSeconds: streamTracked,
            manualSeconds: streamManual,
            totalSeconds: streamTracked + streamManual,
            trackedHours: secondsToHours(streamTracked),
            manualHours: secondsToHours(streamManual),
            totalHours: secondsToHours(streamTracked + streamManual)
        }
    };
}

async function changeManualSeconds(db, entry, deltaSeconds) {
    ActivityAdjustmentRepository.assertActivityType(entry.activityType);
    await ActivityAdjustmentRepository.ensureAdjustmentRow(db, entry, MANUAL_SOURCE);
    await ActivityAdjustmentRepository.incrementManualSeconds(db, entry, deltaSeconds, MANUAL_SOURCE);

    await ActivityAdjustmentRepository.recordHistory(db, {
        ...entry,
        action: deltaSeconds >= 0 ? "add" : "remove",
        deltaSeconds,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
}

async function setManualSeconds(db, entry, manualSeconds) {
    ActivityAdjustmentRepository.assertActivityType(entry.activityType);
    await ActivityAdjustmentRepository.ensureAdjustmentRow(db, entry, MANUAL_SOURCE);

    const currentManual = await getManualSeconds(db, entry.guildId, entry.userId, entry.activityType);
    const deltaSeconds = manualSeconds - currentManual;

    await ActivityAdjustmentRepository.setManualSeconds(db, entry, manualSeconds, MANUAL_SOURCE);

    await ActivityAdjustmentRepository.recordHistory(db, {
        ...entry,
        action: "set_manual",
        deltaSeconds,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
}

async function setDisplayedTotalHours(db, entry, targetHours) {
    const trackedSeconds = await getTrackedSeconds(db, entry.guildId, entry.userId, entry.activityType);
    const targetSeconds = hoursToSeconds(targetHours);
    const manualSeconds = targetSeconds - trackedSeconds;

    await setManualSeconds(db, entry, manualSeconds);

    return {
        trackedSeconds,
        manualSeconds,
        totalSeconds: trackedSeconds + manualSeconds
    };
}

async function resetManualAdjustments(db, entry) {
    ActivityAdjustmentRepository.assertActivityType(entry.activityType);

    const currentManual = await getManualSeconds(db, entry.guildId, entry.userId, entry.activityType);

    await ActivityAdjustmentRepository.resetManualSeconds(db, entry, MANUAL_SOURCE);

    await ActivityAdjustmentRepository.recordHistory(db, {
        ...entry,
        action: "reset",
        deltaSeconds: -currentManual,
        createdById: entry.createdById,
        createdByUsername: entry.createdByUsername
    });
}

async function getHistory(db, guildId, userId, limit = 10) {
    return ActivityAdjustmentRepository.getHistory(db, guildId, userId, limit);
}

module.exports = {
    hoursToSeconds,
    secondsToHours,
    getTotals,
    getTrackedSeconds,
    getManualSeconds,
    changeManualSeconds,
    setDisplayedTotalHours,
    resetManualAdjustments,
    getHistory
};
