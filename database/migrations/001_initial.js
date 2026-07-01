const { dbRun } = require("../helpers");

async function up(db) {
    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);

    await dbRun(db, `
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

    await dbRun(db, `
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

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS activity_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT,
            activity_type TEXT NOT NULL,
            seconds INTEGER NOT NULL DEFAULT 0,
            reason TEXT,
            source TEXT NOT NULL DEFAULT 'manual_config',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(guild_id, user_id, activity_type, source)
        )
    `);

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS activity_adjustment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT,
            activity_type TEXT NOT NULL,
            action TEXT NOT NULL,
            delta_seconds INTEGER NOT NULL DEFAULT 0,
            reason TEXT,
            created_by_id TEXT,
            created_by_username TEXT,
            created_at INTEGER NOT NULL
        )
    `);

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS bot_status (
            guild_id TEXT PRIMARY KEY,
            last_seen_at INTEGER NOT NULL
        )
    `);

    await dbRun(db, `
        CREATE TABLE IF NOT EXISTS latest_game_searches (
            guild_id TEXT PRIMARY KEY,
            genre TEXT,
            top_pick TEXT,
            rating TEXT,
            metacritic TEXT,
            released TEXT,
            platforms TEXT,
            top_three TEXT,
            updated_at INTEGER
        )
    `);
}

module.exports = {
    name: "001_initial",
    up
};
