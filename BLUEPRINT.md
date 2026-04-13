# Blueprint: Countree — Satellite Map Point Manager

## Project Summary

A single-page, zero-backend web application that displays a live satellite map, lets the user drop geo-points with one click, auto-names them sequentially, and persists them by exporting/importing CSV files.

---

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | **Plain HTML + CSS + Vanilla JS** (ES modules) | No build step, no server, opens straight from `index.html` |
| Map engine | **Leaflet.js 1.9** (CDN) | Lightweight (~150 KB), battle-tested, huge plugin ecosystem |
| Satellite tiles | **ESRI World Imagery** | Free, no API key, globally available, updated regularly |
| CSV handling | **Native browser File API** | No library needed for RFC-4180 CSV at this scale |
| Styling | **Single `style.css`** | No framework needed; clean custom UI |

No npm, no bundler, no backend. The whole app is three files: `index.html`, `app.js`, `style.css`.

---

## File Structure

```
countree/
├── index.html      # Shell: loads Leaflet from CDN, wires DOM
├── app.js          # All logic: map init, point CRUD, CSV I/O
└── style.css       # Layout and UI polish
```

---

## Core Features & Design Decisions

### 1. Satellite Map (Leaflet + ESRI)
- Tile URL: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- Default view: world zoom, centered on 20°N 0°E
- No API key required

### 2. One-click Point Addition
- Map is always in "add mode" — every map click drops a marker
- A small toggle button lets user switch to "pan mode" if needed
- Cursor changes to crosshair in add mode

### 3. Auto-generated Descriptions
- The app tracks a `baseLabel` (default `"Point"`) and a `counter`
- Last added point: `"Tree 3"` → next becomes `"Tree 4"`
- Detection: strip trailing ` <number>` from last description to get base, increment counter
- Description is editable in a sidebar table row after creation

### 4. Point Table (Sidebar)
- Columns: `#` | `Description` | `Latitude` | `Longitude` | `Delete`
- Clicking a row zooms the map to that point
- Description cells are inline-editable (`contenteditable`)

### 7. Point Deletion
- Each row in the sidebar table has a `✕` delete button
- Clicking it removes the point from the in-memory array and removes its marker from the map
- Clicking the marker on the map also shows a popup with a delete option

### 5. CSV Export (`Save`)
- Header: `description,latitude,longitude`
- Triggers `<a download>` pattern — browser downloads `countree_points.csv`
- No server call

### 6. CSV Import (`Load`)
- Hidden `<input type="file" accept=".csv">` triggered by Load button
- Parses file with `FileReader`, validates header row, loads points
- Replaces current points (with a confirmation dialog if there are unsaved points)

---

## Data Model

```js
// In-memory array, no localStorage persistence
points = [
  { id: 1, description: "Tree 1", lat: 41.015, lng: 28.979 },
  ...
]
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Countree]   [+ Add Mode ▼]   [Save CSV]  [Load CSV]   │  ← top bar
├──────────────────────────────┬──────────────────────────┤
│                              │  # │ Description │ Lat   │
│         LEAFLET MAP          │  1 │ Tree 1      │ 41.0  │
│                              │  2 │ Tree 2      │ 40.9  │
│    (click to drop a pin)     │  ...                     │
│                              │                          │
└──────────────────────────────┴──────────────────────────┘
```

---

## Roadmap (Implementation Order)

| Step | Task |
|---|---|
| 1 | `index.html` shell with Leaflet CDN, layout skeleton |
| 2 | `style.css` — two-panel layout, toolbar styling |
| 3 | Map initialization with ESRI satellite tiles |
| 4 | Add-mode click handler, marker creation |
| 5 | Auto-description logic (base + counter) |
| 6 | Sidebar table — render, inline edit, delete, row-click zoom |
| 7 | Point deletion — table row button + marker popup delete |
| 8 | CSV export (Save button) |
| 9 | CSV import (Load button + FileReader) |
| 10 | Pan/Add mode toggle + cursor indicator |
| 11 | Edge cases: empty import, malformed CSV warning |
