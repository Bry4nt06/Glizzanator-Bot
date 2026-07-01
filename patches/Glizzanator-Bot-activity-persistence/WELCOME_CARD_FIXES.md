# Welcome Card Fixes Applied

The welcome card files were cleaned up and renamed to use the same naming convention everywhere:

- `cards/welcomeCard.js`
- `commands/utility/testWelcomeCommand.js`
- `commands/utility/glizzifyCommand.js`
- `events/guildMemberAdd.js`
- `events/interactionCreate.js`
- `deploy-commands.js`
- `index.js`
- `assets/welcome_template.png`

## Fixed Problems

- Removed bad `TEMPLATE_CANDIDATES` references.
- Removed wrong `Welcome_template` card import.
- Removed duplicate `getRandomGlizzyName` import in `guildMemberAdd.js`.
- Fixed `testWelcomeCommand.js` so it does not require itself.
- Fixed command registration to use `testWelcomeCommand`, matching the file name.
- Fixed `interactionCreate.js` to import and handle `/testwelcome` correctly.
- Added `guildMemberAdd` registration to `index.js`.
- Made `welcomeCard.js` work with both real Discord members and preview/mock data.
- Added an avatar placeholder if no live Discord avatar is available.

## Test Steps

1. Install dependencies if needed:

```bash
npm install
```

2. Register slash commands:

```bash
npm run deploy
```

3. Start the bot:

```bash
npm start
```

4. In Discord, run:

```txt
/testwelcome
```

or:

```txt
/testwelcome user:@Someone
```

5. Preview locally:

```bash
node preview-card.js cards/welcomeCard.js
```

The output should appear in:

```txt
preview-output/welcomeCard-output.png
```

## Environment Variables

Add these to `.env` if you want the live welcome event:

```env
WELCOME_CHANNEL_ID=your_welcome_channel_id_here
ENABLE_WELCOME_NICKNAME=true
```

`ENABLE_WELCOME_NICKNAME=true` lets the bot nickname new members on join. The bot must have Manage Nicknames and its role must be above the member's role.
