const logger = require("../../utils/logger");
const { dbAll, dbRun } = require("../helpers");

async function ensureMigrationsTable(db) {
    await dbRun(
        db,
        `
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at INTEGER NOT NULL
        )
        `
    );
}

async function getAppliedMigrationNames(db) {
    const rows = await dbAll(
        db,
        `
        SELECT name
        FROM schema_migrations
        ORDER BY id ASC
        `
    );

    return new Set(rows.map((row) => row.name));
}

async function recordMigration(db, name) {
    await dbRun(
        db,
        `
        INSERT INTO schema_migrations (name, applied_at)
        VALUES (?, ?)
        `,
        [name, Date.now()]
    );
}

async function runMigrations(db, migrations = []) {
    await ensureMigrationsTable(db);

    const applied = await getAppliedMigrationNames(db);

    for (const migration of migrations) {
        if (applied.has(migration.name)) continue;

        logger.info(`Applying database migration: ${migration.name}`);
        await migration.up(db);
        await recordMigration(db, migration.name);
    }
}

module.exports = {
    runMigrations,
    ensureMigrationsTable,
    getAppliedMigrationNames
};
