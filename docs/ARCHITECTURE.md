# Glizzanator Architecture

## Overview

Glizzanator uses a layered architecture designed to keep Discord-specific orchestration separate from business logic, database access, and presentation.

The main architectural rule is:

> Commands and events should orchestrate. Services should handle behavior. Repositories should access the database. Cards should render visuals.

## Folder Responsibilities

### `commands/`

Slash command handlers and the command registry.

Command files should:

- Read interaction options
- Defer/reply to interactions
- Call services, repositories, or helpers indirectly through provided dependencies
- Format user-facing command responses

Command files should not:

- Create database tables
- Run raw SQL directly
- Manage bot startup/shutdown

### `events/`

Discord event registration.

Event files should:

- Register Discord client listeners
- Validate event inputs
- Call service-layer functions
- Handle/log event-level errors

Examples:

- `messageCreate.js` tracks messages through `MessageTrackingService`
- `voiceStateUpdate.js` tracks voice and stream sessions through services
- `ready.js` initializes activity recovery through the service registry
- `guildMemberAdd.js` builds and sends welcome cards

### `services/`

Business logic and workflow orchestration.

Services include:

- `DatabaseService`
- `MessageTrackingService`
- `VoiceTrackingService`
- `StreamTrackingService`
- `ActivityRecoveryService`

`services/index.js` acts as the central service registry.

Services should:

- Coordinate repositories
- Contain reusable workflow logic
- Stay independent from Discord command response formatting where possible

### `database/`

Database connection, migrations, helpers, and repositories.

Key files:

- `connection.js` creates the SQLite connection and exposes `db.ready`
- `helpers.js` provides promise wrappers for sqlite operations
- `migrations/` owns schema creation and database upgrades
- `repositories/` owns direct database queries

Runtime table creation should not happen outside migrations.

### `database/repositories/`

Repository modules are the only normal application layer that should contain SQL.

Current repositories:

- `ActivityAdjustmentRepository.js`
- `GameSearchRepository.js`
- `MessageRepository.js`
- `StatusRepository.js`
- `StatisticsRepository.js`
- `StreamRepository.js`
- `VoiceRepository.js`

Repositories should:

- Use `dbRun`, `dbGet`, and `dbAll`
- Hide SQL from commands/events/services
- Return plain JavaScript data objects

### `cards/`

Image/card generation.

Cards should:

- Receive already-prepared data
- Render images/buffers
- Avoid database access
- Avoid Discord client lifecycle concerns

### `config/`

Centralized environment configuration.

`config/index.js` reads and normalizes environment values.

Application code should prefer `config` over direct `process.env` access when possible.

### `utils/`

Shared utilities.

Current key utility:

- `logger.js`

Modules should use the centralized logger instead of `console.log` or `console.error` for runtime output.

### `scripts/`

Maintenance and validation tools.

Current important scripts:

- `check-project.js` validates syntax, required architecture files, legacy schema removal, and SQL boundaries
- `doctor.js` inspects database health
- `apply-activity-adjustments.js` applies manual activity adjustments through the repository layer

## Startup Flow

1. `index.js` validates required bot config.
2. `database/connection.js` creates the SQLite connection.
3. `DatabaseService.initialize()` runs migrations through `db.ready`.
4. `index.js` waits for `db.ready` before registering events.
5. Events and commands are registered.
6. Discord client logs in.
7. `ready.js` initializes activity recovery.

## Shutdown Flow

`index.js` listens for:

- `SIGINT`
- `SIGTERM`

On shutdown:

1. The Discord client is destroyed.
2. The database connection is closed.
3. The process exits with success or failure depending on close result.

## Database Rules

Schema ownership:

- Migrations own table creation.
- Repositories own SQL queries.
- Services call repositories.
- Commands/events call services or command helpers.

The project checker enforces these rules by blocking:

- Legacy table creation outside migrations
- Legacy schema imports
- Direct SQL outside approved database-layer files
- Direct sqlite helper calls outside approved database-layer files

## Command Flow

1. Discord interaction arrives in `events/interactionCreate.js`.
2. The command registry resolves the command handler.
3. The interaction handler awaits command execution.
4. Errors are logged and converted into a standard user-facing error reply.

## Activity Tracking Flow

### Messages

`messageCreate` -> `MessageTrackingService` -> `MessageRepository`

### Voice

`voiceStateUpdate` -> `VoiceTrackingService` -> `VoiceRepository`

### Streams

`voiceStateUpdate` -> `StreamTrackingService` -> `StreamRepository`

### Recovery

`ready` -> `ActivityRecoveryService` -> voice/stream repositories and services

## Statistics Flow

Stats commands use `StatisticsRepository` for data access.

Examples:

- `/stats` gets user message and voice totals from `StatisticsRepository`
- `/leaderboard` gets message/voice leaderboards from `StatisticsRepository`
- `/serverstats` builds server card data from `StatisticsRepository`

## Gaming Flow

Game search persistence is split into:

- `database/gameSearches.js` for cache/orchestration
- `GameSearchRepository.js` for database persistence

RAWG lookups are handled separately through the gaming integration layer.

## Validation

Use:

```bash
npm run check
```

Expected checks:

- JavaScript syntax
- Required architecture files
- Legacy schema removal
- Forbidden legacy patterns
- SQL/database boundary enforcement

Use the doctor utility to inspect database health:

```bash
node scripts/doctor.js
```

## Future Architecture Areas

Planned expansion areas:

- Music service layer
- Queue/session persistence
- Web dashboard services
- Admin tooling
- Backup/restore utilities
- Health checks
- Test suite
- Deployment automation
