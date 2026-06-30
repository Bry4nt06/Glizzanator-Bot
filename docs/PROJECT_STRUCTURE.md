# Glizzanator Bot Project Structure

Recommended layout:

- index.js: bot entry point. Load environment variables, create the Discord client, initialize database tables, register events, and log in.
- deploy-commands.js: slash command deployment script.
- database.js: SQLite connection and core schema setup.
- cards/: image and canvas card builders.
- commands/: command handlers grouped by feature.
- database/: feature-specific database helpers.
- events/: Discord event handlers.
- services/: API clients and reusable business logic.
- utils/: small reusable helpers.
- scripts/: local-only preview, watch, and maintenance scripts.
- docs/: project documentation.

Cleanup priorities:

1. Keep index.js small and avoid placing command logic there.
2. Keep each file in events/ focused on a single Discord event.
3. Move shared SQLite callback wrappers into database/helpers.js.
4. Keep generated files out of Git, including .env, node_modules, logs, cache folders, and local databases.
5. Avoid committing backup copies such as files ending in (1).js.
6. Move preview-card.js and watch-card.js into scripts/ after checking imports.
7. Keep channel IDs and tokens in .env rather than hard-coding them.

Safe next refactor:

Create database/helpers.js with dbRun, dbGet, and dbAll helper functions. Then import those helpers from events and commands instead of redefining them in multiple files.
