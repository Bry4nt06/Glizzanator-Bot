const fs = require("fs");
const path = require("path");

const sampleDataPath = path.join(__dirname, "sample-data.json");

function readSampleData() {
    return JSON.parse(fs.readFileSync(sampleDataPath, "utf8"));
}

function normalizeAsset(assetPath) {
    if (!assetPath || typeof assetPath !== "string") return assetPath;
    if (assetPath.startsWith("http") || assetPath.startsWith("data:")) return assetPath;
    return path.resolve(__dirname, "..", "..", assetPath);
}

function createMockMember({ username, displayName, avatarURL }) {
    const normalizedAvatar = normalizeAsset(avatarURL);

    return {
        displayName,
        displayAvatarURL: () => normalizedAvatar,
        user: {
            username,
            tag: username,
            displayAvatarURL: () => normalizedAvatar
        }
    };
}

function buildSamples() {
    const raw = readSampleData();
    const stream = raw.stream || {};
    const server = raw.server || {};

    return {
        ...raw,
        server: {
            ...server,
            topStreamer: server.topStreamer
                ? { ...server.topStreamer, avatarURL: normalizeAsset(server.topStreamer.avatarURL) }
                : server.topStreamer,
            topMembers: Array.isArray(server.topMembers)
                ? server.topMembers.map((member) => ({ ...member, avatarURL: normalizeAsset(member.avatarURL) }))
                : server.topMembers,
            game: server.game
                ? { ...server.game, thumbnail: normalizeAsset(server.game.thumbnail), image: normalizeAsset(server.game.image) }
                : server.game
        },
        stream: {
            ...stream,
            member: createMockMember(stream.member || {}),
            startedAt: stream.startedAt === "now" ? Date.now() : stream.startedAt
        }
    };
}

module.exports = {
    sampleDataPath,
    get samples() {
        return buildSamples();
    },
    readSampleData
};
