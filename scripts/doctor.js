require("dotenv").config();

const db = require("../database");
const expectedMigrations = require("../database/migrations");
const { dbAll, dbGet } = require("../database/helpers");

const REQUIRED_TABLES = [
    "activity_adjustment_history",
    "activity_adjustments",
    "bot_status",
    "latest_game_searches",
    "messages",
    "schema_migrations",
    "stream_sessions",
    "voice_sessions"
];

const REQUIRED_INDEXES = [
    "idx_activity_adjustment_history_guild_user",
    "idx_activity_adjustments_guild_type_user",
    "idx_latest_game_searches_updated",
    "idx_messages_guild_created",
    "idx_messages_guild_user_created",
    "idx_stream_guild_started_ended",
    "idx_stream_guild_user_started_ended",
    "idx_stream_open_sessions",
    "idx_voice_guild_joined_left",
    "idx_voice_guild_user_joined_left",
    "idx_voice_open_sessions"
];

function pass(label, detail = "") {
    console.log(`PASS ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label, detail = "") {
    console.log(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
    process.exitCode = 1;
}

function warn(label, detail = "") {
    console.log(`WARN ${label}${detail ? ` - ${detail}` : ""}`);
}

async function getPragma(name) {
    return dbGet(db, `PRAGMA ${name}`);
}

async function getTables() {
    return dbAll(
        db,
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name ASC
        `
    );
}

async function getIndexes() {
    return dbAll(
        db,
        `
        SELECT name, tbl_name
        FROM sqlite_master
        WHERE type = 'index'
        ORDER BY name ASC
        `
    );
}

async function getMigrations() {
    return dbAll(
        db,
        `
        SELECT name, applied_at
        FROM schema_migrations
        ORDER BY id ASC
        `
    ).catch(() => []);
}

function checkRequiredNames(label, actualRows, requiredNames) {
    const actualNames = new Set(actualRows.map((row) => row.name));
    const missing = requiredNames.filter((name) => !actualNames.has(name));

    if (missing.length) {
        fail(label, `missing ${missing.join(", ")}`);
        return;
    }

    pass(label, `${requiredNames.length} required found`);
}

function checkMigrations(appliedMigrations) {
    const appliedNames = new Set(appliedMigrations.map((migration) => migration.name));
    const missing = expectedMigrations
        .map((migration) => migration.name)
        .filter((name) => !appliedNames.has(name));

    if (missing.length) {
        fail("Migrations", `missing ${missing.join(", ")}`);
        return;
    }

    pass("Migrations", `${expectedMigrations.length} expected applied`);
}

function checkConfig() {
    if (process.env.DISCORD_TOKEN) pass("Config DISCORD_TOKEN");
    else warn("Config DISCORD_TOKEN", "not set in current environment");

    if (process.env.CLIENT_ID) pass("Config CLIENT_ID");
    else warn("Config CLIENT_ID", "not set in current environment");

    if (process.env.GUILD_ID) pass("Config GUILD_ID");
    else warn("Config GUILD_ID", "not set in current environment");
}

async function runDoctor() {
    if (db.ready) {
        await db.ready;
    }

    const tables = await getTables();
    const indexes = await getIndexes();
    const migrations = await getMigrations();
    const foreignKeys = await getPragma("foreign_keys");
    const journalMode = await getPragma("journal_mode");
    const integrity = await getPragma("integrity_check");

    console.log("Glizzanator Database Doctor");
    console.log("============================");

    checkRequiredNames("Tables", tables, REQUIRED_TABLES);
    checkRequiredNames("Indexes", indexes, REQUIRED_INDEXES);
    checkMigrations(migrations);

    if (foreignKeys?.foreign_keys === 1) pass("Foreign keys", "enabled");
    else fail("Foreign keys", "disabled");

    if (journalMode?.journal_mode === "wal") pass("Journal mode", "wal");
    else warn("Journal mode", JSON.stringify(journalMode));

    if (integrity?.integrity_check === "ok") pass("Integrity", "ok");
    else fail("Integrity", JSON.stringify(integrity));

    checkConfig();

    console.log("\nSummary");
    console.log(`Tables: ${tables.length}`);
    console.log(`Indexes: ${indexes.length}`);
    console.log(`Migrations: ${migrations.length}`);
}

runDoctor()
    .catch((error) => {
        console.error("Database doctor failed", error);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close();
    });
