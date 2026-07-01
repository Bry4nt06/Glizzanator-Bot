# Refactor Summary

This cleanup keeps Discord card-rendering files untouched while improving the bot code around them.

## Completed

- Removed duplicate backup source files.
- Added central configuration in `config/index.js`.
- Added shared logger in `utils/logger.js`.
- Added shared SQLite Promise helpers in `database/helpers.js`.
- Added shared SQL overlap expression helper in `stats/sqlExpressions.js`.
- Reworked slash command deployment so deploy-only code does not import card/Canvas modules.
- Reworked interaction handling to use a command registry instead of a long `if` chain.
- Improved message tracking error handling.
- Refactored user stats and leaderboard command modules to use shared helpers.
- Updated README and architecture documentation.
- Added `npm run check` to syntax-check all JavaScript files.
- Added a disabled-by-default music-player foundation under `services/music/` and `commands/music/`.

## Card files intentionally left alone

The following areas were not refactored because card work is still active:

- `cards/`
- `assets/`
- `card.js`
- `preview-card.js`
- `watch-card.js`

## Music foundation status

The music code is intentionally a foundation, not a full player yet. It includes per-guild queue management and command wiring, but real voice playback should be added later with `@discordjs/voice` or another selected backend.

`ENABLE_MUSIC` defaults to `false`, so `/music` does not deploy until the backend is ready.

## Local verification

Run these after unzipping:

```bash
npm install
npm run check
npm run deploy
npm start
```
