const fs = require("fs");
const path = require("path");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules", "patches"]);
const jsFiles = [];

const requiredPaths = [
    "database/connection.js",
    "database/helpers.js",
    "database/migrations/001_initial.js",
    "database/migrations/002_indexes.js",
    "database/migrations/index.js",
    "database/migrations/migrationRunner.js",
    "database/repositories/ActivityAdjustmentRepository.js",
    "database/repositories/GameSearchRepository.js",
    "database/repositories/MessageRepository.js",
    "database/repositories/StatusRepository.js",
    "database/repositories/StatisticsRepository.js",
    "database/repositories/StreamRepository.js",
    "database/repositories/VoiceRepository.js",
    "services/ActivityRecoveryService.js",
    "services/DatabaseService.js",
    "services/MessageTrackingService.js",
    "services/StreamTrackingService.js",
    "services/VoiceTrackingService.js",
    "services/index.js",
    "scripts/doctor.js"
];

const forbiddenPatterns = [
    {
        label: "Legacy schema creation outside migrations",
        pattern: "CREATE TABLE IF NOT EXISTS",
        allowedPathIncludes: `${path.sep}database${path.sep}migrations${path.sep}`
    },
    {
        label: "Legacy game search table registration",
        pattern: "registerGameSearchTable",
        allowedPathIncludes: null
    },
    {
        label: "Legacy schema module import",
        pattern: "./schema",
        allowedPathIncludes: null
    }
];

const sqlBoundaryPatterns = ["SELECT ", "INSERT ", "UPDATE ", "DELETE "];
const directDatabaseCallPatterns = ["db.run(", "db.get(", "db.all(", "dbRun(", "dbGet(", "dbAll("];

function isCheckerFile(file) {
    return file.endsWith(`${path.sep}scripts${path.sep}check-project.js`);
}

function isDatabaseLayerFile(file) {
    return file.includes(`${path.sep}database${path.sep}repositories${path.sep}`)
        || file.includes(`${path.sep}database${path.sep}migrations${path.sep}`)
        || file.endsWith(`${path.sep}database${path.sep}helpers.js`)
        || file.endsWith(`${path.sep}database${path.sep}connection.js`)
        || file.endsWith(`${path.sep}services${path.sep}DatabaseService.js`)
        || file.endsWith(`${path.sep}scripts${path.sep}doctor.js`);
}

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (ignoredDirectories.has(entry.name)) continue;

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath);
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".js")) {
            jsFiles.push(fullPath);
        }
    }
}

function checkSyntax() {
    for (const file of jsFiles) {
        childProcess.execFileSync(process.execPath, ["--check", file], {
            stdio: "inherit"
        });
    }

    console.log(`Checked ${jsFiles.length} JavaScript files successfully.`);
}

function checkRequiredFiles() {
    const missing = requiredPaths.filter((relativePath) => {
        return !fs.existsSync(path.join(root, relativePath));
    });

    if (missing.length) {
        console.error("Missing required project files:");
        for (const relativePath of missing) {
            console.error(`- ${relativePath}`);
        }
        process.exit(1);
    }

    console.log(`Architecture files present: ${requiredPaths.length}`);
}

function checkLegacySchemaRemoved() {
    const schemaPath = path.join(root, "database", "schema.js");

    if (fs.existsSync(schemaPath)) {
        console.error("Legacy database/schema.js still exists. Use migrations instead.");
        process.exit(1);
    }

    console.log("Legacy schema module removed.");
}

function checkForbiddenPatterns() {
    const violations = [];

    for (const file of jsFiles) {
        if (isCheckerFile(file)) continue;

        const content = fs.readFileSync(file, "utf8");

        for (const rule of forbiddenPatterns) {
            if (!content.includes(rule.pattern)) continue;
            if (rule.allowedPathIncludes && file.includes(rule.allowedPathIncludes)) continue;

            violations.push({
                file: path.relative(root, file),
                label: rule.label,
                pattern: rule.pattern
            });
        }
    }

    if (violations.length) {
        console.error("Forbidden legacy patterns found:");
        for (const violation of violations) {
            console.error(`- ${violation.file}: ${violation.label} (${violation.pattern})`);
        }
        process.exit(1);
    }

    console.log("No forbidden legacy schema patterns found.");
}

function checkSqlBoundaries() {
    const violations = [];

    for (const file of jsFiles) {
        if (isCheckerFile(file) || isDatabaseLayerFile(file)) continue;

        const content = fs.readFileSync(file, "utf8");
        const matchedSql = sqlBoundaryPatterns.find((pattern) => content.includes(pattern));
        const matchedCall = directDatabaseCallPatterns.find((pattern) => content.includes(pattern));

        if (matchedSql || matchedCall) {
            violations.push({
                file: path.relative(root, file),
                pattern: (matchedSql || matchedCall).trim()
            });
        }
    }

    if (violations.length) {
        console.error("Database access found outside database layer:");
        for (const violation of violations) {
            console.error(`- ${violation.file}: ${violation.pattern}`);
        }
        process.exit(1);
    }

    console.log("SQL boundary check passed.");
}

walk(root);
checkSyntax();
checkRequiredFiles();
checkLegacySchemaRemoved();
checkForbiddenPatterns();
checkSqlBoundaries();
