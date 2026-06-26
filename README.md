# Glizzanator Bot

High Society Discord bot focused on server activity stats, user stat cards, leaderboards, RAWG game lookups, and Glizzboard card previews.

This build is focused on stats, cards, and game features.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, and `RAWG_API_KEY`.
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

## Available commands

- `/ping`
- `/stats`
- `/serverstats`
- `/leaderboard`
- `/topgames`
- `/recentgames`

## Glizzboard preview

Generate a one-time preview:

```bash
node preview-card.js cards/glizzboardCard.js
node preview-card.js cards/serverCard.js
node preview-card.js cards/userCard.js

node watch-card.js cards/serverCard.js
```

Start the live preview watcher:

```bash
npm run preview
npm run watch:card -- cards/streamProfileCard.js
```

The preview watcher regenerates `glizzboard-output.png` when card, test, or asset files change.

## Project layout

```text
assets/              Image assets used by cards
cards/               Canvas card generators
commands/            Slash command handlers
database/            Game search persistence helpers
events/              Discord event handlers
gaming/              RAWG API and game embed helpers
stats/               Server/user stat aggregation helpers
index.js             Bot entry point
deploy-commands.js   Slash command deploy script
```

## Notes

Keep `.env`, database files, logs, and `node_modules/` out of Git.

Local backup to my Drive
$project = "E:\Discord Bot\Glizzanator-Bot"
$backupRoot = "E:\Discord Bot\Backups"
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "Glizzanator-Bot-Backup_$stamp"
$backupFolder = Join-Path $backupRoot $backupName
$backupZip = "$backupFolder.zip"

New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null

robocopy $project $backupFolder /E /XD node_modules .git /R:1 /W:1

Compress-Archive -Path "$backupFolder\*" -DestinationPath $backupZip -Force

Write-Host "Backup created:"
Write-Host $backupZip
