# Glizzanator Project Context

## Project

Glizzanator is a modular Discord bot for the High Society community.

The long-term goal is to build a polished, production-quality platform for activity tracking, statistics, cards, gaming integrations, music, logging, administration, and a future web dashboard.

## Current Version

2.4.1 Incremental Cleanup

## Current Phase

Phase 1 Foundation Cleanup / Phase 2 Architecture Stabilization

## Current Branch

`refactor/database-cleanup`

## Current Status

The project has completed the major database and architecture refactor.

Completed in this branch:

- Migration-driven SQLite initialization
- Centralized database connection lifecycle
- Database readiness promise through `db.ready`
- Graceful shutdown handling for SIGINT and SIGTERM
- Repository layer for database access
- Service layer for activity, voice, stream, database, and recovery logic
- Service registry through `services/index.js`
- Centralized configuration through `config/index.js`
- Centralized logging through `utils/logger.js`
- SQL boundary checks through `scripts/check-project.js`
- Database Doctor utility through `scripts/doctor.js`
- Repository-backed statistics commands
- Repository-backed server statistics
- Repository-backed activity adjustments
- Repository-backed game search persistence
- Event handler error hardening
- Interaction command error hardening
- Welcome event logging/config cleanup
- Stream alert channel config cleanup

## Active Work

The project is now in production stabilization.

Current work focuses on:

- Running architecture validation
- Fixing any remaining checker violations
- End-to-end command regression testing
- Activity and stream recovery verification
- Card rendering verification
- RAWG/game fallback verification
- Documentation updates
- Final readiness checklist before merge

## Current Architecture Summary

Primary folders:

- `commands/` - slash command handlers and registry
- `events/` - Discord event registration
- `services/` - business logic and lifecycle services
- `database/` - connection, migrations, helpers, and repositories
- `cards/` - card generation modules
- `config/` - centralized environment/config parsing
- `utils/` - shared utilities such as logging
- `stats/` - stats-specific formatting/build helpers
- `scripts/` - maintenance and validation tools
- `docs/` - living project documentation

## Important Decisions

### SQLite remains the database

Reason: simple deployment, local persistence, and sufficient performance for current bot scope.

### Migrations own schema creation

Reason: prevents table creation logic from being scattered across runtime modules.

### Repositories own database access

Reason: keeps commands, events, and services focused on orchestration and business logic.

### Services own business behavior

Reason: allows commands/events to stay small and reusable.

### Centralized config and logging

Reason: avoids duplicated environment parsing and inconsistent runtime output.

## Next Validation Checklist

Before merging or doing the next refactor pass:

1. Run `npm run check`.
2. Run the database doctor script.
3. Start the bot locally.
4. Test slash command registration/deployment.
5. Test `/ping`.
6. Test `/stats`.
7. Test `/serverstats`.
8. Test `/leaderboard`.
9. Test `/topgames` and RAWG fallback.
10. Test message tracking.
11. Test voice tracking.
12. Test stream tracking and stream start card.
13. Restart the bot during active voice/stream sessions and verify recovery.
14. Test welcome card generation.
15. Review logs for warnings/errors.

## Next Planned Pass

After user validation, loop back for another cleanup pass focused on:

- Dead code removal
- Performance polish
- More tests/tooling
- Documentation expansion
- Music foundation planning
- Dashboard planning
