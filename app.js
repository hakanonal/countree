// ── State ─────────────────────────────────────────────────────────────────────
let points = [];       // { id, description, lat, lng, marker }
let nextId = 1;
let tool = 'add';      // 'add' | 'pan' | 'area'
let groups = [];       // { id, name, vertices: [[lat, lng], ...], layer, handles }
let nextGroupId = 1;
let selectedGroupId = null;
let draft = null;      // area being drawn: { vertices, line, start }
let currentTileLayer = null;

// ── Provider configs ──────────────────────────────────────────────────────────
const PROVIDERS = {
  google_unofficial: {
    label:        'Google (no key)',
    needsKey:     false,
    build: () => L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: 'Tiles &copy; Google', subdomains: ['0','1','2','3'],
        maxNativeZoom: 20, maxZoom: 23 }
    ),
  },
  esri: {
    label:        'ESRI World Imagery (no key)',
    needsKey:     false,
    build: () => L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxNativeZoom: 19, maxZoom: 23 }
    ),
    fetchDate: (center, bounds) => {
      const mapExtent = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',');
      const params = new URLSearchParams({
        geometry:       JSON.stringify({ x: center.lng, y: center.lat }),
        geometryType:   'esriGeometryPoint',
        sr:             '4326',
        layers:         'all',
        tolerance:      '0',
        mapExtent,
        imageDisplay:   '800,600,96',
        returnGeometry: 'false',
        f:              'json',
      });
      return fetch(
        `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/identify?${params}`,
        { signal: AbortSignal.timeout(8000) }
      )
        .then(r => r.json())
        .then(data => {
          const results = data?.results ?? [];
          let raw = null;
          for (const r of results) {
            raw = r.attributes?.SRC_DATE2 ?? r.attributes?.SRC_DATE ?? r.attributes?.SDATE ?? null;
            if (raw) break;
          }
          if (!raw) return null;
          const dt = new Date(typeof raw === 'number' ? raw : Number(raw));
          return isNaN(dt.getTime()) ? null : dt;
        });
    },
  },
  mapbox: {
    label:        'Mapbox',
    needsKey:     true,
    keyHint:      'pk.eyJ1Ijoi…  (Mapbox public token)',
    keyDocs:      'https://account.mapbox.com/access-tokens/',
    build: (key) => L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${key}`,
      { attribution: 'Tiles &copy; Mapbox', tileSize: 512, zoomOffset: -1,
        maxNativeZoom: 22, maxZoom: 23 }
    ),
  },
  google: {
    label:        'Google Maps API',
    needsKey:     true,
    keyHint:      'AIza…  (Maps JavaScript API key)',
    keyDocs:      'https://console.cloud.google.com/apis/library/maps-backend.googleapis.com',
    build: (key) => L.tileLayer(
      `https://maps.googleapis.com/maps/vt?lyrs=s&x={x}&y={y}&z={z}&key=${key}`,
      { attribution: 'Tiles &copy; Google', maxNativeZoom: 21, maxZoom: 23 }
    ),
  },
  here: {
    label:        'HERE Maps',
    needsKey:     true,
    keyHint:      'your-here-api-key',
    keyDocs:      'https://platform.here.com/portal/',
    build: (key) => L.tileLayer(
      `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/jpeg?style=satellite.day&apiKey=${key}`,
      { attribution: 'Tiles &copy; HERE', maxNativeZoom: 20, maxZoom: 23 }
    ),
  },
};

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
  center: [20, 0],
  zoom: 3,
  zoomControl: true,
  maxZoom: 23,
});

const markerCluster = L.markerClusterGroup().addTo(map);

let currentProviderId = null;

function applyProvider(providerId, apiKey) {
  const cfg = PROVIDERS[providerId];
  if (!cfg) return;

  if (currentTileLayer) map.removeLayer(currentTileLayer);
  currentTileLayer  = cfg.build(apiKey).addTo(map);
  currentProviderId = providerId;

  // show/hide date badge depending on provider support
  if (cfg.fetchDate) {
    imageryDateEl.style.display = '';
    scheduleDateFetch();
  } else {
    imageryDateEl.style.display = 'none';
    clearTimeout(imageryDateTimer);
  }
}

// ── Imagery date ──────────────────────────────────────────────────────────────
let imageryDateTimer = null;

function fetchImageryDate() {
  const cfg = PROVIDERS[currentProviderId];
  if (!cfg?.fetchDate) return;

  imageryDateVal.textContent = '…';
  imageryDateVal.classList.add('loading');

  cfg.fetchDate(map.getCenter(), map.getBounds())
    .then(dt => {
      imageryDateVal.classList.remove('loading');
      imageryDateVal.textContent = dt
        ? dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : 'No date info';
    })
    .catch(() => {
      imageryDateVal.classList.remove('loading');
      imageryDateVal.textContent = 'Unavailable';
    });
}

function scheduleDateFetch() {
  clearTimeout(imageryDateTimer);
  imageryDateTimer = setTimeout(fetchImageryDate, 800);
}

map.on('moveend', scheduleDateFetch);
map.on('zoomend', scheduleDateFetch);

// ── DOM refs ──────────────────────────────────────────────────────────────────
const mapEl           = document.getElementById('map');
const tbody           = document.getElementById('points-tbody');
const countEl         = document.getElementById('point-count');
const emptyEl         = document.getElementById('empty-state');
const btnMode         = document.getElementById('btn-mode');
const btnSave         = document.getElementById('btn-save');
const btnLoad         = document.getElementById('btn-load');
const fileInput       = document.getElementById('file-input');
const toastEl         = document.getElementById('toast');
const providerSelect  = document.getElementById('provider-select');
const apiKeyInput     = document.getElementById('api-key-input');
const apiKeyApply     = document.getElementById('api-key-apply');
const imageryDateEl   = document.getElementById('imagery-date');
const imageryDateVal  = document.getElementById('imagery-date-value');
const dupEnable       = document.getElementById('dup-enable');
const dupDistance     = document.getElementById('dup-distance');
const dupDistanceVal  = document.getElementById('dup-distance-value');
const btnArea         = document.getElementById('btn-area');
const groupSelect     = document.getElementById('group-select');
const btnGroupList    = document.getElementById('btn-group-list');
const groupModal      = document.getElementById('group-modal');
const groupModalBody  = document.getElementById('group-modal-tbody');
const groupModalEmpty = document.getElementById('group-modal-empty');

// ── Read keys from config.js ──────────────────────────────────────────────────
const CFG = window.COUNTREE_CONFIG || {};

function keyForProvider(providerId) {
  const map = { mapbox: 'mapbox_key', google: 'google_key', here: 'here_key' };
  return CFG[map[providerId]] || null;
}

// ── Provider UI ───────────────────────────────────────────────────────────────
function updateProviderUI(providerId) {
  const cfg = PROVIDERS[providerId];
  if (cfg.needsKey) {
    const key = keyForProvider(providerId);
    apiKeyInput.value       = key ? '(set in config.js)' : '';
    apiKeyInput.placeholder = cfg.keyHint || 'Set in config.js…';
    apiKeyInput.title       = cfg.keyDocs ? `Get key: ${cfg.keyDocs}` : '';
    apiKeyInput.readOnly    = !!key;
    apiKeyInput.style.display  = '';
    apiKeyApply.style.display  = 'none'; // key comes from config.js, no Apply needed
  } else {
    apiKeyInput.style.display  = 'none';
    apiKeyApply.style.display  = 'none';
  }
}

providerSelect.addEventListener('change', () => {
  const id  = providerSelect.value;
  const cfg = PROVIDERS[id];
  updateProviderUI(id);

  if (!cfg.needsKey) {
    applyProvider(id, null);
    showToast(`Switched to ${cfg.label}`);
  } else {
    const key = keyForProvider(id);
    if (key) {
      applyProvider(id, key);
      showToast(`Switched to ${cfg.label}`);
    } else {
      showToast(`Add your key to config.js → ${cfg.keyHint || id}`);
    }
  }
});

// ── Load default provider on startup ─────────────────────────────────────────
{
  const defaultId = 'google_unofficial';
  providerSelect.value = defaultId;
  updateProviderUI(defaultId);
  applyProvider(defaultId, null);
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
function setTool(t) {
  tool = t;
  if (t !== 'area') cancelDraft();
  btnMode.textContent = t === 'add' ? '+ Add Mode' : '✥ Pan Mode';
  btnMode.classList.toggle('active', t === 'add');
  btnArea.classList.toggle('active', t === 'area');
  mapEl.classList.toggle('add-mode', t === 'add');
  mapEl.classList.toggle('area-mode', t === 'area');
  mapEl.classList.toggle('pan-mode', t === 'pan');
}

setTool('add');

btnMode.addEventListener('click', () => setTool(tool === 'add' ? 'pan' : 'add'));
btnArea.addEventListener('click', () => setTool(tool === 'area' ? 'pan' : 'area'));

// ── Auto-description logic ────────────────────────────────────────────────────
function nextDescription() {
  if (points.length === 0) return 'Point 1';

  const last = points[points.length - 1].description;
  const match = last.match(/^(.*?)(\s+(\d+))?$/);
  const base    = match[1].trim();
  const current = match[3] ? parseInt(match[3], 10) : 0;
  return `${base} ${current + 1}`;
}

// ── Add point ─────────────────────────────────────────────────────────────────
map.on('click', (e) => {
  if (tool === 'area') { areaClick(e.latlng); return; }
  if (tool !== 'add') return;

  const { lat, lng } = e.latlng;
  const description  = nextDescription();
  addPoint({ id: nextId++, description, lat, lng });
});

function addPoint({ id, description, lat, lng }) {
  const marker = L.marker([lat, lng]);
  markerCluster.addLayer(marker);
  bindPopup(marker, { id, description, lat, lng });

  const point = { id, description, lat, lng, marker, shown: true, groups: groups.filter(g => inGroup({ lat, lng }, g)) };
  points.push(point);

  if (filtersActive()) renderTable();
  else { updateCount(); scrollTableToEnd(); }
  return point;
}

function bindPopup(marker, point) {
  marker.bindPopup(() => {
    // look up current description in case it was edited
    const p = points.find(pt => pt.id === point.id) || point;
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="popup-desc">${escHtml(p.description)}</div>
      <div class="popup-coords">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
      <button class="popup-delete">Delete point</button>
    `;
    div.querySelector('.popup-delete').addEventListener('click', () => {
      map.closePopup();
      deletePoint(p.id);
    });
    return div;
  });
}

// ── Delete point ──────────────────────────────────────────────────────────────
function deletePoint(id) {
  const idx = points.findIndex(p => p.id === id);
  if (idx === -1) return;
  markerCluster.removeLayer(points[idx].marker);
  points.splice(idx, 1);
  if (filtersActive()) renderTable();
  else { updateCount(); renderRows(true); }
}

// ── Close-points filter ───────────────────────────────────────────────────────
function distanceMeters(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Points that have at least one other point within `meters`.
function findClosePoints(meters) {
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  const maxDLat = meters / 111000; // 1° latitude ≈ 111 km
  const close = new Set();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].lat - sorted[i].lat <= maxDLat; j++) {
      if (distanceMeters(sorted[i], sorted[j]) <= meters) {
        close.add(sorted[i]);
        close.add(sorted[j]);
      }
    }
  }
  return close;
}

function visiblePoints() {
  let list = points;
  const sel = groups.find(g => g.id === selectedGroupId);
  if (sel) list = list.filter(p => p.groups.includes(sel));
  if (dupEnable.checked) {
    const close = findClosePoints(parseFloat(dupDistance.value));
    list = list.filter(p => close.has(p));
  }
  return list;
}

function syncMarkers(visible) {
  const show = new Set(visible);
  const toAdd = [], toRemove = [];
  points.forEach(p => {
    const want = show.has(p);
    if (want && !p.shown) toAdd.push(p.marker);
    else if (!want && p.shown) toRemove.push(p.marker);
    p.shown = want;
  });
  markerCluster.removeLayers(toRemove);
  markerCluster.addLayers(toAdd);
}

dupEnable.addEventListener('change', () => {
  dupDistance.disabled = !dupEnable.checked;
  renderTable();
});
dupDistance.addEventListener('input', () => {
  dupDistanceVal.textContent = `${parseFloat(dupDistance.value).toFixed(1)} m`;
  if (dupEnable.checked) renderTable();
});

// ── Areas (groups) ────────────────────────────────────────────────────────────
const GROUP_COLORS = ['#e94560', '#3a7bd5', '#f5a623', '#50c878', '#b57bee', '#00c2c7'];
const defaultIcon  = new L.Icon.Default();
const hlIcon       = L.divIcon({ className: 'marker-hl', iconSize: [20, 20], iconAnchor: [10, 10] });
const handleIcon   = L.divIcon({ className: 'vertex-handle', iconSize: [12, 12], iconAnchor: [6, 6] });

// Ray casting; x = lng, y = lat
function pointInPolygon(lat, lng, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [latI, lngI] = verts[i], [latJ, lngJ] = verts[j];
    if ((latI > lat) !== (latJ > lat) &&
        lng < (lngJ - lngI) * (lat - latI) / (latJ - latI) + lngI) {
      inside = !inside;
    }
  }
  return inside;
}

function inGroup(p, g) {
  return pointInPolygon(p.lat, p.lng, g.vertices);
}

// Draw: first click starts, each click adds an edge, clicking the first vertex closes.
function areaClick(latlng) {
  if (draft) {
    draft.vertices.push(latlng);
    draft.line.setLatLngs(draft.vertices);
    return;
  }
  draft = {
    vertices: [latlng],
    line: L.polyline([latlng], { color: '#e94560', dashArray: '6', interactive: false }).addTo(map),
    start: L.circleMarker(latlng, {
      radius: 8, color: '#fff', weight: 2, fillColor: '#e94560', fillOpacity: 1,
      bubblingMouseEvents: false,
    }).addTo(map),
  };
  draft.start.on('click', () => { if (draft.vertices.length >= 3) finishDraft(); });
}

map.on('mousemove', (e) => {
  if (draft) draft.line.setLatLngs([...draft.vertices, e.latlng]);
});

function cancelDraft() {
  if (!draft) return;
  map.removeLayer(draft.line);
  map.removeLayer(draft.start);
  draft = null;
}

function finishDraft() {
  const vertices = draft.vertices.map(v => [v.lat, v.lng]);
  cancelDraft();

  const preview = L.polygon(vertices, { color: '#e94560', dashArray: '6', interactive: false }).addTo(map);
  const div = document.createElement('div');
  div.innerHTML = `
    <input class="popup-input" placeholder="Group name" />
    <div class="popup-actions">
      <button class="popup-btn">Save</button>
      <button class="popup-delete">Cancel</button>
    </div>
  `;
  const input = div.querySelector('input');
  const popup = L.popup({ closeOnClick: false, autoClose: false, closeButton: false })
    .setLatLng(vertices[0])
    .setContent(div)
    .openOn(map);
  popup.on('remove', () => map.removeLayer(preview));

  const save = () => {
    const name = input.value.trim() || `Group ${nextGroupId}`;
    addGroup({ id: nextGroupId++, name, vertices });
    groupsChanged();
    map.closePopup(popup);
  };
  div.querySelector('.popup-btn').addEventListener('click', save);
  div.querySelector('.popup-delete').addEventListener('click', () => map.closePopup(popup));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') map.closePopup(popup);
    e.stopPropagation();
  });
  input.focus();
}

function addGroup({ id, name, vertices, description = '' }) {
  const color = GROUP_COLORS[(id - 1) % GROUP_COLORS.length];
  const layer = L.polygon(vertices, { color, className: 'group-poly' }).addTo(map);
  const g = { id, name, description, vertices, layer, color, handles: null };
  layer.bindPopup(() => groupPopupContent(g));
  groups.push(g);
  return g;
}

function groupPopupContent(g) {
  const count = points.filter(p => inGroup(p, g)).length;
  const selected = selectedGroupId === g.id;
  const div = document.createElement('div');
  div.innerHTML = `
    <input class="popup-input" value="${escHtml(g.name)}" />
    <div class="popup-coords">${count} point${count !== 1 ? 's' : ''}</div>
    <div class="popup-actions">
      <button class="popup-btn" data-act="select">${selected ? 'Show all' : 'Highlight'}</button>
      <button class="popup-btn" data-act="edit">${g.handles ? 'Done' : 'Edit shape'}</button>
      <button class="popup-delete" data-act="delete">Delete</button>
    </div>
  `;
  const input = div.querySelector('input');
  input.addEventListener('change', () => {
    g.name = input.value.trim() || g.name;
    groupsChanged();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    e.stopPropagation();
  });
  div.querySelector('[data-act="select"]').addEventListener('click', () => {
    map.closePopup();
    selectGroup(selected ? null : g.id);
  });
  div.querySelector('[data-act="edit"]').addEventListener('click', () => {
    map.closePopup();
    if (g.handles) stopEdit(); else startEdit(g);
  });
  div.querySelector('[data-act="delete"]').addEventListener('click', () => {
    map.closePopup();
    deleteGroup(g.id);
  });
  return div;
}

// Edit shape: drag the vertex handles
function startEdit(g) {
  stopEdit();
  g.handles = g.vertices.map((v, i) =>
    L.marker(v, { draggable: true, icon: handleIcon })
      .on('drag', (e) => {
        const { lat, lng } = e.target.getLatLng();
        g.vertices[i] = [lat, lng];
        g.layer.setLatLngs(g.vertices);
      })
      .on('dragend', groupsChanged)
      .addTo(map)
  );
}

function stopEdit() {
  groups.forEach(g => {
    if (!g.handles) return;
    g.handles.forEach(h => map.removeLayer(h));
    g.handles = null;
  });
}

function deleteGroup(id) {
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) return;
  stopEdit();
  map.removeLayer(groups[idx].layer);
  groups.splice(idx, 1);
  if (selectedGroupId === id) selectedGroupId = null;
  groupsChanged();
}

function selectGroup(id) {
  selectedGroupId = id;
  groupSelect.value = id === null ? '' : String(id);
  const g = groups.find(gr => gr.id === id);
  if (g) map.fitBounds(g.layer.getBounds().pad(0.2));
  groupsChanged();
}

// Refresh everything derived from groups: selector, polygon styling, membership
function groupsChanged() {
  groupSelect.innerHTML = '<option value="">All groups</option>';
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });
  groupSelect.value = selectedGroupId === null ? '' : String(selectedGroupId);

  groups.forEach(g => {
    const on = g.id === selectedGroupId;
    g.layer.setStyle(on
      ? { weight: 4, opacity: 1, fillOpacity: 0.35 }
      : selectedGroupId !== null
        ? { weight: 1, opacity: 0.4, fillOpacity: 0.05 }
        : { weight: 2, opacity: 0.9, fillOpacity: 0.15 });
    if (on) g.layer.bringToFront();
  });
  points.forEach(p => { p.groups = groups.filter(g => inGroup(p, g)); });
  renderTable();
}

groupSelect.addEventListener('change', () => {
  selectGroup(groupSelect.value === '' ? null : parseInt(groupSelect.value, 10));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { cancelDraft(); stopEdit(); closeGroupModal(); }
});

// ── Group list modal ──────────────────────────────────────────────────────────
function openGroupModal() {
  groupModalBody.innerHTML = '';
  groups.forEach(g => {
    const count = points.filter(p => inGroup(p, g)).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escHtml(g.name)}</td><td>${count}</td><td><input class="popup-input" /></td>`;
    const input = tr.querySelector('input');
    input.value = g.description;
    input.addEventListener('input', () => { g.description = input.value; });
    groupModalBody.appendChild(tr);
  });
  groupModalEmpty.style.display = groups.length ? 'none' : 'block';
  groupModal.style.display = 'flex';
}

function closeGroupModal() {
  groupModal.style.display = 'none';
}

btnGroupList.addEventListener('click', openGroupModal);
document.getElementById('group-modal-close').addEventListener('click', closeGroupModal);
groupModal.addEventListener('click', (e) => { if (e.target === groupModal) closeGroupModal(); });

// ── Render table ──────────────────────────────────────────────────────────────
// The table is virtualized: only rows near the viewport exist in the DOM,
// with spacer rows standing in for the rest so the scrollbar stays accurate.
const tableWrap = document.querySelector('.table-wrapper');
const ROW_H = 36, ROW_BUFFER = 10;
let visible = points;
let rowRange = [-1, -1];

function filtersActive() {
  return selectedGroupId !== null || dupEnable.checked;
}

function updateCount() {
  countEl.textContent = filtersActive() ? `${visible.length} / ${points.length}` : points.length;
  emptyEl.classList.toggle('visible', points.length === 0);
}

// Full refresh: recompute the visible set, sync markers, redraw rows.
function renderTable() {
  visible = visiblePoints();
  syncMarkers(visible);
  const highlight = selectedGroupId !== null;
  visible.forEach(p => {
    if (!!p.hl !== highlight) { p.hl = highlight; p.marker.setIcon(highlight ? hlIcon : defaultIcon); }
  });
  updateCount();
  renderRows(true);
}

function spacerRow(rows) {
  const tr = document.createElement('tr');
  tr.className = 'spacer';
  const td = document.createElement('td');
  td.colSpan = 6;
  td.style.height = `${rows * ROW_H}px`;
  tr.appendChild(td);
  return tr;
}

function renderRows(force) {
  const start = Math.max(0, Math.floor(tableWrap.scrollTop / ROW_H) - ROW_BUFFER);
  const end   = Math.min(visible.length, Math.ceil((tableWrap.scrollTop + tableWrap.clientHeight) / ROW_H) + ROW_BUFFER);
  if (!force && start === rowRange[0] && end === rowRange[1]) return;
  rowRange = [start, end];

  const fragment = document.createDocumentFragment();
  fragment.appendChild(spacerRow(start));
  for (let i = start; i < end; i++) fragment.appendChild(makeRow(visible[i], i));
  fragment.appendChild(spacerRow(visible.length - end));
  tbody.innerHTML = '';
  tbody.appendChild(fragment);
}

function scrollTableToEnd() {
  tableWrap.scrollTop = visible.length * ROW_H;
  renderRows(true);
}

let scrollQueued = false;
tableWrap.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    if (!tbody.contains(document.activeElement)) renderRows(false); // don't drop a row being edited
  });
});

function makeRow(p, i) {
  const tr = document.createElement('tr');
  tr.dataset.id = p.id;

  const tdNum = document.createElement('td');
  tdNum.textContent = i + 1;

  const tdDesc = document.createElement('td');
  const descSpan = document.createElement('span');
  descSpan.className = 'desc-cell';
  descSpan.contentEditable = 'true';
  descSpan.textContent = p.description;
  descSpan.title = 'Click to edit';
  descSpan.addEventListener('blur', () => {
    const newDesc = descSpan.textContent.trim() || p.description;
    descSpan.textContent = newDesc;
    p.description = newDesc;
    p.marker.closePopup();
    bindPopup(p.marker, p);
  });
  descSpan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); descSpan.blur(); }
    e.stopPropagation();
  });
  descSpan.addEventListener('click', (e) => e.stopPropagation());
  tdDesc.appendChild(descSpan);

  const tdLat = document.createElement('td');
  tdLat.className = 'coord-cell';
  tdLat.textContent = p.lat.toFixed(5);

  const tdLng = document.createElement('td');
  tdLng.className = 'coord-cell';
  tdLng.textContent = p.lng.toFixed(5);

  const tdDel = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete';
  delBtn.textContent = '✕';
  delBtn.title = 'Delete point';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deletePoint(p.id);
  });
  tdDel.appendChild(delBtn);

  const tdGroups = document.createElement('td');
  tdGroups.className = 'group-cell';
  tdGroups.textContent = p.groups.map(g => g.name).join(', ');

  tr.append(tdNum, tdDesc, tdLat, tdLng, tdGroups, tdDel);

  tr.addEventListener('click', () => {
    map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14));
    p.marker.openPopup();
  });

  return tr;
}

// ── Bulk point loader ─────────────────────────────────────────────────────────
async function addPointsInChunks(rows) {
  const CHUNK = 150;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const markers = rows.slice(i, i + CHUNK).map(row => {
      const marker = L.marker([row.lat, row.lng]);
      const point = { id: nextId++, description: row.description, lat: row.lat, lng: row.lng, marker, shown: true, groups: [] };
      bindPopup(marker, point);
      points.push(point);
      return marker;
    });
    markerCluster.addLayers(markers);
    // yield to browser every chunk so it doesn't freeze
    await new Promise(r => setTimeout(r, 0));
  }
}

// ── CSV export ────────────────────────────────────────────────────────────────
btnSave.addEventListener('click', () => {
  if (points.length === 0 && groups.length === 0) { showToast('Nothing to save.'); return; }

  const q = (str) => `"${str.replace(/"/g, '""')}"`;
  const rows = ['type,description,latitude,longitude,vertices,group_description'];
  points.forEach(p => rows.push(`point,${q(p.description)},${p.lat},${p.lng},,`));
  groups.forEach(g => rows.push(`group,${q(g.name)},,,${q(g.vertices.map(v => v.join(' ')).join(';'))},${q(g.description)}`));

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'countree_points.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Saved ${points.length} point${points.length !== 1 ? 's' : ''}, ${groups.length} group${groups.length !== 1 ? 's' : ''}.`);
});

// ── CSV import ────────────────────────────────────────────────────────────────
btnLoad.addEventListener('click', () => {
  if (points.length > 0 || groups.length > 0) {
    if (!confirm('Loading a file will replace all current points and groups. Continue?')) return;
  }
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const result = parseCSV(text);

    if (result.error) {
      showToast(`Error: ${result.error}`);
      return;
    }
    if (result.rows.length === 0 && result.groups.length === 0) {
      showToast('CSV file contains no points.');
      return;
    }

    // clear existing
    markerCluster.clearLayers();
    points = [];
    nextId = 1;
    stopEdit();
    groups.forEach(g => map.removeLayer(g.layer));
    groups = [];
    nextGroupId = 1;
    selectedGroupId = null;

    result.groups.forEach(g => addGroup({ id: nextGroupId++, ...g }));
    await addPointsInChunks(result.rows);
    groupsChanged();

    // fit map to loaded points and areas
    const latlngs = [...points.map(p => [p.lat, p.lng]), ...groups.flatMap(g => g.vertices)];
    map.fitBounds(L.latLngBounds(latlngs).pad(0.2));

    showToast(`Loaded ${points.length} point${points.length !== 1 ? 's' : ''}, ${groups.length} group${groups.length !== 1 ? 's' : ''}.`);
  };
  reader.readAsText(file);
});

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { error: 'File is empty or missing header.' };

  const header = lines[0].toLowerCase().replace(/\s/g, '');
  // new format: type,description,latitude,longitude,vertices (legacy: description,latitude,longitude)
  const typed = header.startsWith('type,');
  if (!header.includes('description') || !header.includes('latitude') || !header.includes('longitude')) {
    return { error: 'Invalid header. Expected: type,description,latitude,longitude,vertices' };
  }

  const rows = [], groupRows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCSVLine(line);
    const type = typed ? cols.shift().toLowerCase() : 'point';
    if (type === 'group') {
      const vertices = (cols[3] || '').split(';').map(v => v.trim().split(/\s+/).map(Number));
      if (vertices.length < 3 || vertices.some(v => v.length !== 2 || v.some(isNaN))) {
        return { error: `Invalid area at line ${i + 1}.` };
      }
      groupRows.push({ name: cols[0], vertices, description: cols[4] || '' });
      continue;
    }
    if (cols.length < 3) { return { error: `Invalid row at line ${i + 1}.` }; }

    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    if (isNaN(lat) || isNaN(lng)) { return { error: `Invalid coordinates at line ${i + 1}.` }; }

    rows.push({ description: cols[0], lat, lng });
  }
  return { rows, groups: groupRows };
}

// Handles quoted fields (RFC-4180)
function splitCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  cols.push(cur.trim());
  return cols;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ── Initial render ────────────────────────────────────────────────────────────
renderTable();
