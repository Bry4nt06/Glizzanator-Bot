const { dbRun } = require("../helpers");

async function up(db) {
    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_messages_guild_created
        ON messages(guild_id, created_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_messages_guild_user_created
        ON messages(guild_id, user_id, created_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_guild_joined_left
        ON voice_sessions(guild_id, joined_at, left_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_guild_user_joined_left
        ON voice_sessions(guild_id, user_id, joined_at, left_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_voice_open_sessions
        ON voice_sessions(guild_id, user_id, left_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_guild_started_ended
        ON stream_sessions(guild_id, started_at, ended_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_guild_user_started_ended
        ON stream_sessions(guild_id, user_id, started_at, ended_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_stream_open_sessions
        ON stream_sessions(guild_id, user_id, ended_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_activity_adjustments_guild_type_user
        ON activity_adjustments(guild_id, activity_type, user_id)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_activity_adjustment_history_guild_user
        ON activity_adjustment_history(guild_id, user_id, created_at)
    `);

    await dbRun(db, `
        CREATE INDEX IF NOT EXISTS idx_latest_game_searches_updated
        ON latest_game_searches(updated_at)
    `);
}

module.exports = {
    name: "002_indexes",
    up
};
