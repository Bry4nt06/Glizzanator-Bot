const logger = require("../utils/logger");

function runStatement(db, sql) {
    db.run(sql, (error) => {
        if (error) {
            logger.error("Database schema statement failed", error);
        }
    });
}

function createCoreTables(db) {
    runStatement(db, `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);

    runStatement(db, `
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

    runStatement(db, `
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

    runStatement(db, `
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

    runStatement(db, `
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

    runStatement(db, `
        CREATE TABLE IF NOT EXISTS bot_status (
            guild_id TEXT PRIMARY KEY,
            last_seen_at INTEGER NOT NULL
        )
    `);
}

function createGameTables(db) {
    runStatement(db, `
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

function createIndexes(db) {
    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_messages_guild_created
        ON messages(guild_id, created_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_messages_guild_user_created
        ON messages(guild_id, user_id, created_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_guild_joined_left
        ON voice_sessions(guild_id, joined_at, left_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_guild_user_joined_left
        ON voice_sessions(guild_id, user_id, joined_at, left_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_open_sessions
        ON voice_sessions(guild_id, user_id, left_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_guild_started_ended
        ON stream_sessions(guild_id, started_at, ended_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_guild_user_started_ended
        ON stream_sessions(guild_id, user_id, started_at, ended_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_open_sessions
        ON stream_sessions(guild_id, user_id, ended_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_activity_adjustments_guild_type_user
        ON activity_adjustments(guild_id, activity_type, user_id)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_activity_adjustment_history_guild_user
        ON activity_adjustment_history(guild_id, user_id, created_at)
    `);

    runStatement(db, `
        CREATE INDEX IF NOT EXISTS idx_latest_game_searches_updated
        ON latest_game_searches(updated_at)
    `);
}

function initializeDatabase(db) {
    db.serialize(() => {
        runStatement(db, "PRAGMA foreign_keys = ON");
        runStatement(db, "PRAGMA journal_mode = WAL");
        runStatement(db, "PRAGMA synchronous = NORMAL");

        createCoreTables(db);
        createGameTables(db);
        createIndexes(db);
    });
}

module.exports = {
    initializeDatabase
};
