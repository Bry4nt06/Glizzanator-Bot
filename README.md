# Glizzanator Bot

High Society Discord bot focused on server activity stats, user stat cards, leaderboards, RAWG game lookups, stream tracking, welcome cards, Glizzboard previews, and a future-ready music-player foundation.

The card rendering files under `cards/` were intentionally left alone so card work can continue separately.

## Requirements

- Node.js 18 or newer
- A Discord bot application
- A Discord server for slash command deployment
- RAWG API key for game lookup features

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in your Discord and RAWG values.
3. Install dependencies:

```bash
npm install
```

4. Deploy slash commands:

```bash
npm run deploy
```

5. Start the bot:

```bash
npm start
```

## Useful scripts

```bash
npm start          # Start the bot
npm run deploy     # Register slash commands
npm run check      # Syntax-check project JavaScript files
npm run preview    # Preview cards locally
npm run watch:card # Watch a card file and regenerate previews
```

## Environment variables

Required:

```text
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
RAWG_API_KEY=
```

Optional:

```text
WELCOME_CHANNEL_ID=
STREAM_ALERT_CHANNEL_ID=
STREAM_LOG_CHANNEL_ID=
BOT_LOG_CHANNEL_ID=
ENABLE_WELCOME_NICKNAME=false
```

Future music-player foundation:

```text
ENABLE_MUSIC=false
MUSIC_MAX_QUEUE_SIZE=50
MUSIC_IDLE_DISCONNECT_MS=300000
```

Leave `ENABLE_MUSIC=false` until the actual voice/audio backend is added.

## Available commands

- `/ping`
- `/stats`
- `/serverstats`
- `/leaderboard`
- `/topgames`
- `/glizzboard`
- `/recentgames`
- `/glizzify`
- `/testwelcome`

The `/music` command is present in the code foundation but only deploys when `ENABLE_MUSIC=true`.

## Project layout

```text
assets/              Image assets used by cards
cards/               Canvas card generators; intentionally not refactored here
commands/            Slash command handlers and command registry
config/              Central environment/config loader
database/            SQLite helpers and feature persistence helpers
docs/                Project documentation
events/              Discord event handlers
gaming/              RAWG API and game embed helpers
services/            Reusable service foundations, including music
stats/               Server/user stat aggregation helpers
utils/               Logging and small shared utilities
scripts/             Local project scripts
index.js             Bot entry point
deploy-commands.js   Slash command deploy script
```

## Refactor notes

This cleanup focused on making the project easier to navigate without changing the card-rendering code:

- central config loader
- command registry for routing and deployment
- shared SQLite Promise helpers
- shared stats SQL expressions
- shared logger
- safer message/event error handling
- music queue/player foundation for future voice support
- duplicate backup files removed

## Card previews

Generate a one-time preview:

```bash
npm run preview -- cards/glizzboardCard.js
npm run preview -- cards/serverCard.js
npm run preview -- cards/userCard.js
```

Start the live preview watcher:

```bash
npm run watch:card -- cards/streamProfileCard.js
```

## Development notes

Keep `.env`, database files, logs, backups, generated images, and `node_modules/` out of Git.

Recommended local verification before pushing changes:

```bash
npm install
npm run check
npm run deploy
npm start
```


## Manual activity catch-up

Voice and stream leaderboards use the SQLite database plus optional manual adjustments.
This is useful when the bot was offline and missed voice or streaming time.

1. Copy the example file:

```bash
copy data\activity-adjustments.example.json data\activity-adjustments.json
```

2. Edit `data/activity-adjustments.json` and add each member's missing hours:

```json
[
  {
    "guildId": "123456789012345678",
    "userId": "123456789012345678",
    "username": "Example Member",
    "voiceHours": 10.5,
    "streamHours": 2.25,
    "reason": "Catch-up from outage"
  }
]
```

3. Apply the adjustments to the local database:

```bash
npm run apply:activity
```

The server card uses these adjustments for total top voice members and total top streamer time. Re-running the script updates the same manual adjustment rows instead of duplicating them.


## Activity admin commands

Use `/activity` to correct voice and stream hours directly from Discord. See `docs/ACTIVITY_ADMIN.md` for the full command guide.
