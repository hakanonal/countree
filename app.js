// ── State ─────────────────────────────────────────────────────────────────────
let points = [];       // { id, description, lat, lng, marker }
let nextId = 1;
let addMode = true;
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
function setAddMode(on) {
  addMode = on;
  btnMode.textContent = on ? '+ Add Mode' : '✥ Pan Mode';
  btnMode.classList.toggle('active', on);
  mapEl.classList.toggle('add-mode', on);
}

setAddMode(true);

btnMode.addEventListener('click', () => setAddMode(!addMode));

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
  if (!addMode) return;

  const { lat, lng } = e.latlng;
  const description  = nextDescription();
  addPoint({ id: nextId++, description, lat, lng });
});

function addPoint({ id, description, lat, lng }) {
  const marker = L.marker([lat, lng]).addTo(map);
  bindPopup(marker, { id, description, lat, lng });

  const point = { id, description, lat, lng, marker };
  points.push(point);

  renderTable();
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
  map.removeLayer(points[idx].marker);
  points.splice(idx, 1);
  renderTable();
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable() {
  countEl.textContent = points.length;
  emptyEl.classList.toggle('visible', points.length === 0);

  tbody.innerHTML = '';
  points.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;

    // row number
    const tdNum = document.createElement('td');
    tdNum.textContent = i + 1;

    // description — inline editable
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
      // refresh popup with new description
      p.marker.closePopup();
      bindPopup(p.marker, p);
    });
    descSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); descSpan.blur(); }
      e.stopPropagation(); // prevent map shortcuts
    });
    // stop click-on-cell from triggering row zoom
    descSpan.addEventListener('click', (e) => e.stopPropagation());
    tdDesc.appendChild(descSpan);

    // lat / lng
    const tdLat = document.createElement('td');
    tdLat.className = 'coord-cell';
    tdLat.textContent = p.lat.toFixed(5);

    const tdLng = document.createElement('td');
    tdLng.className = 'coord-cell';
    tdLng.textContent = p.lng.toFixed(5);

    // delete button
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

    tr.append(tdNum, tdDesc, tdLat, tdLng, tdDel);

    // row click → zoom to marker
    tr.addEventListener('click', () => {
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14));
      p.marker.openPopup();
    });

    tbody.appendChild(tr);
  });
}

// ── CSV export ────────────────────────────────────────────────────────────────
btnSave.addEventListener('click', () => {
  if (points.length === 0) { showToast('No points to save.'); return; }

  const rows = ['description,latitude,longitude'];
  points.forEach(p => {
    const desc = `"${p.description.replace(/"/g, '""')}"`;
    rows.push(`${desc},${p.lat},${p.lng}`);
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'countree_points.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Saved ${points.length} point${points.length !== 1 ? 's' : ''}.`);
});

// ── CSV import ────────────────────────────────────────────────────────────────
btnLoad.addEventListener('click', () => {
  if (points.length > 0) {
    if (!confirm('Loading a file will replace all current points. Continue?')) return;
  }
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const result = parseCSV(text);

    if (result.error) {
      showToast(`Error: ${result.error}`);
      return;
    }
    if (result.rows.length === 0) {
      showToast('CSV file contains no points.');
      return;
    }

    // clear existing
    points.forEach(p => map.removeLayer(p.marker));
    points = [];
    nextId = 1;

    result.rows.forEach(row => {
      addPoint({ id: nextId++, description: row.description, lat: row.lat, lng: row.lng });
    });

    // fit map to loaded points
    const latlngs = points.map(p => [p.lat, p.lng]);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.2));

    showToast(`Loaded ${points.length} point${points.length !== 1 ? 's' : ''}.`);
  };
  reader.readAsText(file);
});

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { error: 'File is empty or missing header.' };

  const header = lines[0].toLowerCase().replace(/\s/g, '');
  if (!header.includes('description') || !header.includes('latitude') || !header.includes('longitude')) {
    return { error: 'Invalid header. Expected: description,latitude,longitude' };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCSVLine(line);
    if (cols.length < 3) { return { error: `Invalid row at line ${i + 1}.` }; }

    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    if (isNaN(lat) || isNaN(lng)) { return { error: `Invalid coordinates at line ${i + 1}.` }; }

    rows.push({ description: cols[0], lat, lng });
  }
  return { rows };
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
