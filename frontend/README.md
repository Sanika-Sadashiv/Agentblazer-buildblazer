# AgentBlazer Club — Frontend

React + Vite frontend for the AgentBlazer Club (Dept. of CSE, St Joseph Engineering College, Mangaluru).

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build locally
```
Requires Node.js 18+.

## Structure
```
agentblazer-frontend/
├── index.html            page shell + Google Fonts
├── package.json
├── vite.config.js
├── public/favicon.svg
└── src/
    ├── main.jsx          entry point
    ├── App.jsx           all components (header, pages, popovers, canvases)
    ├── data.js           team, guests, events, committee, nav (edit content here)
    ├── styles.css        all styling + Violet / Inferno / Frost themes
    └── assets/           logo.png, ruben.jpg, joyline.jpg, gallery.jpg
```

## Editing
- **Content:** change the arrays in `src/data.js`.
- **Team photos:** drop an image in `src/assets/`, import it in `data.js`, add it to `PHOTOS`,
  and set `photo: "yourKey"` on that person in `TEAM`. People without a photo show an initials placeholder.
- **Event gallery:** each event's `gal` object in `data.js` controls the hover gallery; `real` maps slide index to an image.
- **Themes:** CSS variables at the top of `styles.css` (`[data-theme="inferno"]`, `[data-theme="frost"]`).
- **Logo:** replace `src/assets/logo.png` (used via CSS in `styles.css`).

Fonts (Outfit, Syne, Instrument Serif) load from Google Fonts and need an internet connection.
