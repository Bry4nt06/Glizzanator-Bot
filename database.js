const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "glizzanator.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS voice_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            joined_at INTEGER NOT NULL,
            left_at INTEGER,
            duration_seconds INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS stream_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            duration_seconds INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bot_status (
            guild_id TEXT PRIMARY KEY,
            last_seen_at INTEGER NOT NULL
        )
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_messages_guild_created
        ON messages(guild_id, created_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_messages_guild_user_created
        ON messages(guild_id, user_id, created_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_voice_guild_joined_left
        ON voice_sessions(guild_id, joined_at, left_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_voice_guild_user_joined_left
        ON voice_sessions(guild_id, user_id, joined_at, left_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_voice_open_sessions
        ON voice_sessions(guild_id, user_id, left_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_stream_guild_started_ended
        ON stream_sessions(guild_id, started_at, ended_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_stream_guild_user_started_ended
        ON stream_sessions(guild_id, user_id, started_at, ended_at)
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_stream_open_sessions
        ON stream_sessions(guild_id, user_id, ended_at)
    `);
});

module.exports = db;
