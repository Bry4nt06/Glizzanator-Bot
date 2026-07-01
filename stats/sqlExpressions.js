function overlapSecondsExpression({
    startColumn = "joined_at",
    endColumn = "left_at",
    alias = ""
} = {}) {
    const prefix = alias ? `${alias}.` : "";
    const startedAt = `${prefix}${startColumn}`;
    const endedAt = `${prefix}${endColumn}`;

    return `
        CASE
            WHEN COALESCE(${endedAt}, ?) <= ? THEN 0
            WHEN ${startedAt} >= ? THEN 0
            ELSE CAST((MIN(COALESCE(${endedAt}, ?), ?) - MAX(${startedAt}, ?)) / 1000 AS INTEGER)
        END
    `;
}

module.exports = {
    overlapSecondsExpression
};
