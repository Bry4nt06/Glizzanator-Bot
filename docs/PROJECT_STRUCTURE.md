# Glizzanator Bot Project Structure

This project is organized around small, focused modules. Card-rendering files under `cards/` are intentionally isolated so visual card work can continue without touching the bot architecture.

```text
Glizzanator-Bot/
├─ index.js                    # Small bot entry point
├─ deploy-commands.js           # Slash command deploy script
├─ database.js                  # SQLite connection and base schema
├─ config/                      # Environment and feature flags
├─ utils/                       # Logger and small shared helpers
├─ database/                    # SQLite Promise helpers and feature-specific persistence
├─ commands/                    # Slash command definitions, registry, and handlers
│  ├─ definitions.js            # Slash command data only; safe for deploy
│  ├─ registry.js               # Runtime command routing
│  ├─ music/                    # Future music command foundation
│  ├─ stats/
│  └─ utility/
├─ events/                      # Discord event handlers
├─ gaming/                      # RAWG API and game embed helpers
├─ services/                    # Reusable service foundations
│  └─ music/                    # Queue and manager foundation for future player
├─ stats/                       # Stats aggregation helpers and SQL expressions
├─ cards/                       # Card renderers; left unchanged during cleanup
├─ assets/                      # Card and welcome assets
├─ scripts/                     # Local scripts
└─ docs/                        # Project documentation
```

## Current architecture improvements

- `config/index.js` centralizes environment variables and feature flags.
- `commands/definitions.js` contains slash command JSON builders without importing card modules, so deployment does not depend on Canvas loading.
- `commands/registry.js` maps Discord command names to handlers and lazy-loads heavier modules only when commands run.
- `database/helpers.js` centralizes `dbRun`, `dbGet`, and `dbAll`.
- `stats/sqlExpressions.js` centralizes overlap-duration SQL used by voice and stream stats.
- `utils/logger.js` standardizes console output.
- `services/music/` provides a queue/manager foundation without enabling voice playback yet.

## Music-player foundation

The music foundation is intentionally backend-neutral. It currently provides:

- per-guild queues
- queue size limits
- current/upcoming snapshots
- skip and stop operations
- disabled-by-default `/music` command wiring

Recommended next step when you are ready for real playback:

1. Add `@discordjs/voice` and an audio source library.
2. Add a `MusicVoiceAdapter` service responsible only for voice connections and audio resources.
3. Keep queue state in `services/music/musicManager.js`.
4. Keep Discord command handling in `commands/music/musicCommand.js`.
5. Set `ENABLE_MUSIC=true` only after the backend is implemented and tested.

## Maintenance rules

1. Keep `index.js` small.
2. Keep slash command data in `commands/definitions.js`.
3. Keep runtime command logic in command handler files.
4. Do not import Canvas/card modules from deploy-only code.
5. Keep `.env`, local databases, `node_modules`, logs, backups, and generated files out of Git.
6. Avoid backup source files like `(1).js`, `(2).js`, or `(3).js`.
7. Run `npm run check` after refactoring JavaScript files.
