# Glizzanator Card Studio

Card Studio is the visual dashboard for designing and testing Glizzanator card images.

## Start

```bash
npm run studio
```

Open:

```text
http://localhost:3001
```

## Open launcher

```bash
npm run studio:open
```

The launcher opens the Studio config in your editor when possible and starts the dashboard server.

## What it does

- Browser-based card preview
- Sidebar card selection
- Live regeneration on save
- Visual controls for layout values
- JSON editor for layouts
- JSON editor for sample data
- Image upload support
- Quick apply uploaded assets to sample data
- Layout guide overlay
- PNG output in `preview-output/`

## Key files

- `dev/card-studio/server.js` - Studio backend/API
- `dev/card-studio/public/dashboard.html` - Studio UI
- `dev/card-studio/public/app.js` - Browser logic
- `dev/card-studio/public/styles.css` - Studio styling
- `dev/card-studio/card-studio.config.json` - Studio configuration
- `dev/card-studio/sample-data.json` - Editable sample data
- `dev/card-studio/layouts/*.json` - Editable card layout controls
- `dev/card-studio/uploads/` - Uploaded preview assets

## Current cards

- Server Stats Card
- Stream Alert Card

## Next upgrades

- Wire server card renderer directly to layout JSON
- Add welcome/profile/music cards
- Add real SQLite data mode
- Add drag-and-drop positioning
- Add theme presets
