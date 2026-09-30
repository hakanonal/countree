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
- Columns: `#` | `Description` | `Latitude` | `Longitude` | `Groups` | `Delete`
- Clicking a row zooms the map to that point
- Description cells are inline-editable (`contenteditable`)

### 7. Point Deletion
- Each row in the sidebar table has a `✕` delete button
- Clicking it removes the point from the in-memory array and removes its marker from the map
- Clicking the marker on the map also shows a popup with a delete option

### 5. CSV Export (`Save`)
- Header: `type,description,latitude,longitude,vertices` (point rows followed by group rows, see §8)
- Triggers `<a download>` pattern — browser downloads `countree_points.csv`
- No server call

### 6. CSV Import (`Load`)
- Hidden `<input type="file" accept=".csv">` triggered by Load button
- Parses file with `FileReader`, validates header row, loads points and groups; legacy 3-column files (`description,latitude,longitude`) are still accepted
- Replaces current points and groups (with a confirmation dialog if there are unsaved points)

### 8. Area Groups
- Tool state is `tool = 'add' | 'pan' | 'area'`; a **Draw Area** toolbar button selects `area`
- Drawing: first click starts, each further click adds an edge (dashed preview follows the cursor), clicking the first vertex (≥3 vertices) closes the polygon; `Esc` cancels
- On close a popup asks for the group name (empty → `Group N`)
- Each area is an independent group; areas may overlap and a point may belong to many groups
- Membership is **derived**, never stored: `inGroup(point, group)` runs a ray-casting point-in-polygon test, so points added, loaded or areas reshaped later update automatically
- Clicking a polygon (Pan mode) opens a popup: rename, Highlight, Edit shape (drag vertex handles), Delete. Polygons ignore pointer events in Add/Draw modes so they never swallow clicks
- Toolbar **Group** dropdown selects a group: its polygon is emphasised, other polygons dimmed, and `visiblePoints()` limits map markers and table rows to its members (member markers use a highlight icon); it composes with the close-points filter
- CSV: one file with mixed rows, `type` = `point` or `group`. Group rows store the name in `description` and `vertices` as `lat lng` pairs joined by `;`:
  ```
  type,description,latitude,longitude,vertices
  point,"Tree 1",41.01234,28.97654,
  group,"North orchard",,,"41.02 28.97;41.02 28.98;41.01 28.98"
  ```

### 9. Close-Points Filter
- Toolbar checkbox **Close points** plus a range slider (0.1–20 m, step 0.1, default 1 m; disabled until checked) with a live value label
- `findClosePoints(meters)` returns every point that has at least one other point within the distance: points are sorted by latitude and the inner loop stops once the latitude gap exceeds `meters / 111000`, then `distanceMeters()` (haversine) confirms
- `visiblePoints()` applies the filter; `renderTable()` uses it to sync map markers (`syncMarkers`, add/remove on the cluster layer) and table rows, and shows the count as `shown / total`
- Purpose: quickly find duplicate or near-duplicate points; it composes with the group filter

---

## Data Model

```js
// In-memory array, no localStorage persistence
points = [
  { id: 1, description: "Tree 1", lat: 41.015, lng: 28.979 },
  ...
]

// Areas; membership is computed from vertices, not stored on points
groups = [
  { id: 1, name: "North orchard", vertices: [[41.02, 28.97], [41.02, 28.98], [41.01, 28.98]] },
  ...
]
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Countree]  [+ Add Mode] [▱ Draw Area] [Save] [Load]  [Group ▼] │  ← top bar
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
| 12 | Area groups — polygon drawing, naming popup, point-in-polygon membership |
| 13 | Group editing (vertex drag), group filter/highlight, Groups table column |
| 14 | CSV format extended with `type` column and `group` rows (legacy files still load) |
| 15 | Close-points filter — distance slider, haversine proximity check, marker/table filtering |
