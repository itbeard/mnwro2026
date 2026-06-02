/* =======================================================================
   ЛОГІКА МАПЫ — звычайна тут нічога мяняць не трэба.
   Дадзеныя зон і катэгорыі жывуць у zones.js
   (зьменныя ZONES, CATEGORIES, MAP_CONFIG).
======================================================================== */

/* --- 1) Мапа і падложкі --- */
const map = L.map('map', {
  zoomControl: true,
  center: MAP_CONFIG.center,
  zoom: MAP_CONFIG.zoom
});
map.zoomControl.setPosition('bottomright');

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
});
const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
});
sat.addTo(map); // па-змаўчаньні спадарожнік (відаць будынак замка)

L.control.layers(
  { "Спадарожнік": sat, "Схема": osm },
  null,
  { position: 'bottomright' }
).addTo(map);

/* --- 2) Дапаможныя функцыі --- */
function isPolygon(coords) {
  return Array.isArray(coords[0]);
}

// Калі катэгорыя зоны невядомая — лічым яе за "other" (Іншае).
function catKeyOf(z) {
  return CATEGORIES[z.category] ? z.category : 'other';
}

function zoneColor(z) {
  return CATEGORIES[catKeyOf(z)].color;
}

function popupHtml(z) {
  const info = z.info ? `<div>${z.info}</div>` : "";
  return `<h3>${z.name}</h3>${info}`;
}

/* --- 3) Малюем зоны --- */
const markersById = {};

ZONES.forEach((z, i) => {
  const color = zoneColor(z);
  let layer;
  if (isPolygon(z.coords)) {
    layer = L.polygon(z.coords, {
      color: color, weight: 2, fillColor: color, fillOpacity: 0.30
    });
    // подпіс пасярэдзіне вобласьці
    L.marker(layer.getBounds().getCenter(), {
      icon: L.divIcon({
        className: '',
        html: `<div class="zone-label" style="background:${color}">${z.name}</div>`,
        iconSize: null
      }),
      interactive: false
    }).addTo(map);
  } else {
    layer = L.circleMarker(z.coords, {
      radius: 11, color: '#fff', weight: 2,
      fillColor: color, fillOpacity: 1
    });
  }
  layer.bindPopup(popupHtml(z));
  layer.addTo(map);
  markersById[i] = layer;
});

/* --- 4) Сьпіс зон (ніжняя панэль), згрупаваны па катэгорыях --- */
const zoneListEl = document.getElementById('zoneList');
document.getElementById('zoneCount').textContent = `(${ZONES.length})`;

Object.keys(CATEGORIES).forEach((catKey) => {
  const cat = CATEGORIES[catKey];
  const inCat = ZONES
    .map((z, i) => ({ z, i }))
    .filter(({ z }) => catKeyOf(z) === catKey);
  if (inCat.length === 0) return;

  const header = document.createElement('div');
  header.className = 'zone-group';
  header.textContent = cat.label;
  zoneListEl.appendChild(header);

  inCat.forEach(({ z, i }) => {
    const item = document.createElement('div');
    item.className = 'zone-item';
    item.innerHTML = `
      <span class="dot" style="background:${cat.color}"></span>
      <div>
        <div class="name">${z.name}</div>
        <div class="meta">${z.info || ''}</div>
      </div>`;
    item.addEventListener('click', () => focusZone(i));
    zoneListEl.appendChild(item);
  });
});

function focusZone(i) {
  const layer = markersById[i];
  const z = ZONES[i];
  if (isPolygon(z.coords)) {
    map.flyToBounds(layer.getBounds().pad(0.4), { maxZoom: 18 });
  } else {
    map.flyTo(z.coords, 18, { duration: 0.6 });
  }
  setTimeout(() => layer.openPopup(), 650);
  closeSheet();
}

/* --- 5) Легенда катэгорый --- */
const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = Object.keys(CATEGORIES).map((k) => {
    const c = CATEGORIES[k];
    return `<div class="legend-row"><span class="dot" style="background:${c.color}"></span>${c.label}</div>`;
  }).join('');
  return div;
};
legend.addTo(map);

/* --- 6) Ніжняя панэль: адкрыць/закрыць --- */
const sheet = document.getElementById('sheet');
function closeSheet() { sheet.classList.remove('open'); }
function toggleSheet() { sheet.classList.toggle('open'); }
document.getElementById('toggleList').addEventListener('click', toggleSheet);
document.getElementById('sheetHandle').addEventListener('click', toggleSheet);

/* --- 7) «Дзе я» — GPS карыстальніка --- */
const LocateControl = L.Control.extend({
  options: { position: 'bottomright' },
  onAdd: function () {
    const btn = L.DomUtil.create('button', 'leaflet-bar locate-btn');
    btn.innerHTML = '📍';
    btn.title = 'Паказаць, дзе я';
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.stop(e);
      map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    });
    return btn;
  }
});
map.addControl(new LocateControl());

let meMarker;
map.on('locationfound', (e) => {
  if (meMarker) map.removeLayer(meMarker);
  meMarker = L.circleMarker(e.latlng, {
    radius: 8, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1
  }).addTo(map).bindPopup('Вы тут').openPopup();
});
map.on('locationerror', () => {
  alert('Не атрымалася вызначыць месцазнаходжаньне. Дазвольце доступ да геалякацыі ў браўзеры.');
});
