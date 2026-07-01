const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const logger = require("../utils/logger");
const DatabaseService = require("../services/DatabaseService");

const DEFAULT_DATABASE_FILE = "glizzanator.db";

function resolveDatabasePath() {
    return process.env.GLIZZANATOR_DB_PATH || path.join(__dirname, "..", DEFAULT_DATABASE_FILE);
}

function createDatabaseConnection() {
    const dbPath = resolveDatabasePath();
    const db = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            logger.error("SQLite connection failed", error);
            return;
        }

        logger.info(`SQLite database connected: ${dbPath}`);
    });

    db.ready = DatabaseService.initialize(db).catch((error) => {
        logger.error("Database initialization failed", error);
        throw error;
    });

    return db;
}

module.exports = createDatabaseConnection();
module.exports.createDatabaseConnection = createDatabaseConnection;
module.exports.resolveDatabasePath = resolveDatabasePath;
