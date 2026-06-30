# Glizzanator Bot

High Society Discord bot focused on server activity stats, user stat cards, leaderboards, RAWG game lookups, stream tracking, welcome cards, and Glizzboard previews.

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

## Available commands

- `/ping`
- `/stats`
- `/serverstats`
- `/leaderboard`
- `/topgames`
- `/recentgames`
- `/glizzboard`
- `/glizzify`
- `/testwelcome`

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

## Project layout

```text
assets/              Image assets used by cards
cards/               Canvas card generators
commands/            Slash command handlers
database/            Feature-specific persistence helpers
docs/                Project documentation
events/              Discord event handlers
gaming/              RAWG API and game embed helpers
stats/               Server/user stat aggregation helpers
index.js             Bot entry point
deploy-commands.js   Slash command deploy script
```

See `docs/PROJECT_STRUCTURE.md` for the larger refactor plan.

## Development notes

Keep `.env`, database files, logs, backups, generated images, and `node_modules/` out of Git.

Recommended local verification before pushing changes:

```bash
npm install
npm run deploy
npm start
```
