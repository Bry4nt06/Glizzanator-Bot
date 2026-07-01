function formatMeta(meta) {
    if (!meta || typeof meta !== "object") return "";

    const entries = Object.entries(meta)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${value}`);

    return entries.length ? ` ${entries.join(" ")}` : "";
}

function log(level, message, meta) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

    if (level === "error") {
        console.error(line);
        return;
    }

    if (level === "warn") {
        console.warn(line);
        return;
    }

    console.log(line);
}

module.exports = {
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, errorOrMeta) => {
        if (errorOrMeta instanceof Error) {
            log("error", `${message}: ${errorOrMeta.message}`);
            console.error(errorOrMeta.stack);
            return;
        }

        log("error", message, errorOrMeta);
    }
};
