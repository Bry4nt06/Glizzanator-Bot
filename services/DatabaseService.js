const migrations = require("../database/migrations");
const { runMigrations } = require("../database/migrations/migrationRunner");
const logger = require("../utils/logger");

async function initialize(db) {
    db.configure("busyTimeout", 5000);
    db.run("PRAGMA foreign_keys = ON");
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");

    await runMigrations(db, migrations);
    logger.info("Database initialized");

    return db;
}

module.exports = {
    initialize
};
