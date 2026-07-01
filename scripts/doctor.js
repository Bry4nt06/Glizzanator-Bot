const db = require("../database");
const { dbAll, dbGet } = require("../database/helpers");

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

async function runDoctor() {
    const tables = await getTables();
    const indexes = await getIndexes();
    const migrations = await getMigrations();
    const foreignKeys = await getPragma("foreign_keys");
    const journalMode = await getPragma("journal_mode");
    const integrity = await getPragma("integrity_check");

    console.log("Glizzanator Database Doctor");
    console.log("============================");
    console.log(`Tables: ${tables.length}`);
    console.log(`Indexes: ${indexes.length}`);
    console.log(`Migrations: ${migrations.length}`);
    console.log("Foreign keys:", foreignKeys);
    console.log("Journal mode:", journalMode);
    console.log("Integrity:", integrity);

    console.log("\nApplied migrations:");
    for (const migration of migrations) {
        console.log(`- ${migration.name}`);
    }
}

runDoctor()
    .catch((error) => {
        console.error("Database doctor failed", error);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close();
    });
