# Countree

A zero-backend, single-page web app for dropping and managing geo-points on a live satellite map. Open `index.html` in a browser — no install, no server, no build step.

## Features

- **Click to drop pins** — map is always in Add Mode; every click places a named marker
- **Auto-named points** — points are named sequentially (e.g. `Tree 1`, `Tree 2`, …); the base label is inferred from the last point so you can rename freely
- **Inline editing** — click any description in the sidebar to rename it in place
- **Sidebar table** — lists all points with coordinates; clicking a row zooms the map to it
- **Delete** — remove points via the table row button or the marker popup
- **CSV export / import** — Save and Load buttons for persisting your session across page reloads
- **Area groups** — use the Draw Area tool to outline a polygon (click to add corners, click the first corner to close it), then name it. Every point inside becomes a member of that group; a point can belong to several groups and areas may overlap
- **Edit & highlight groups** — click an area to rename it, reshape it by dragging its corners, or delete it; the Group dropdown highlights one group and shows only its points
- **Close-points filter** — tick *Close points* in the toolbar and set a distance (0.1–20 m, default 1 m) with the slider; the map and table then show only points that have another point within that distance, which helps spot duplicates. The table count reads `shown / total`
- **Multiple satellite providers** — switch between Google (no key), ESRI World Imagery (no key), Mapbox, Google Maps API, and HERE Maps from a toolbar dropdown
- **Imagery date** — when using ESRI, a badge shows the approximate capture date of the imagery at the current map view

## User Manual

A full illustrated guide is available in [English](docs/manual.en.md) and [Türkçe](docs/manual.tr.md). The app toolbar also links to it (**Help → EN / TR**).

## Getting Started

```bash
# Just open the file — no server needed
open index.html
```

For providers that require an API key (Mapbox, Google Maps API, HERE):

1. Copy `config.example.js` to `config.js`
2. Fill in your key(s)
3. Select the provider from the toolbar dropdown

```js
// config.js
window.COUNTREE_CONFIG = {
  mapbox_key : 'pk.eyJ1IjoiYW...',
  google_key : 'AIzaSy...',
  here_key   : 'your-here-api-key',
};
```

`config.js` is gitignored — your keys stay local.

## File Structure

```
countree/
├── index.html          # App shell — loads Leaflet from CDN, wires DOM
├── app.js              # All logic: map init, point CRUD, area groups, CSV I/O
├── style.css           # Layout and UI
├── docs/               # User manual (manual.en.md, manual.tr.md) and screenshots
├── config.example.js   # API key template (safe to commit)
└── config.js           # Your actual keys (gitignored)
```

## Satellite Providers

| Provider | API Key | Notes |
|---|---|---|
| Google (unofficial) | Not required | Default; high zoom, no guarantees |
| ESRI World Imagery | Not required | Shows imagery capture date |
| Mapbox | Required | [Get a token](https://account.mapbox.com/access-tokens/) |
| Google Maps API | Required | [Enable Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) |
| HERE Maps | Required | [Get an API key](https://platform.here.com/portal/) |

## CSV Format

```csv
type,description,latitude,longitude,vertices
point,"Tree 1",41.01234,28.97654,
point,"Tree 2",41.01100,28.97500,
group,"North orchard",,,"41.02 28.97;41.02 28.98;41.01 28.98;41.01 28.97"
```

- `point` rows use `description`, `latitude`, `longitude`.
- `group` rows use `description` as the group name and `vertices` as `lat lng` pairs joined by `;` (at least 3).
- Group membership is not stored: it is computed from the polygon, so reshaping an area or adding points inside it updates assignments automatically.
- Legacy 3-column files (`description,latitude,longitude`) still load.

Import replaces all current points and groups after a confirmation prompt.

## Tech Stack

Plain HTML + CSS + Vanilla JS (ES modules). No npm, no bundler, no backend.
Uses [Leaflet.js 1.9](https://leafletjs.com/) loaded from CDN.
