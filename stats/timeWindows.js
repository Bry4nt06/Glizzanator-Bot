const DAY_MS = 24 * 60 * 60 * 1000;

function getTimeWindows(now = Date.now()) {
    return {
        now,
        oneDayAgo: now - DAY_MS,
        sevenDaysAgo: now - 7 * DAY_MS,
        thirtyDaysAgo: now - 30 * DAY_MS
    };
}

function getPeriodStart(period, now = Date.now()) {
    const windows = getTimeWindows(now);

    if (period === "1d") return windows.oneDayAgo;
    if (period === "7d") return windows.sevenDaysAgo;
    if (period === "30d") return windows.thirtyDaysAgo;

    return windows.sevenDaysAgo;
}

module.exports = {
    DAY_MS,
    getTimeWindows,
    getPeriodStart
};
