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

// Спасылка на маршрут праз штатны навігатар тэлефона.
// iOS — Apple Maps, астатнія — Google Maps (адкрывае дадатак, калі ўсталяваны).
function navUrl(lat, lng) {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Цэнтр зоны: для кропкі — самі каардынаты, для палігона — цэнтр межаў.
function centerOf(z) {
  if (!isPolygon(z.coords)) return z.coords;
  let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity;
  for (const [la, ln] of z.coords) {
    if (la < latMin) latMin = la;
    if (la > latMax) latMax = la;
    if (ln < lngMin) lngMin = ln;
    if (ln > lngMax) lngMax = ln;
  }
  return [(latMin + latMax) / 2, (lngMin + lngMax) / 2];
}

function popupHtml(z) {
  const info = z.info ? `<div>${z.info}</div>` : "";
  // Маршрут і для кропак, і для зон (для зоны — у яе цэнтр).
  const [lat, lng] = centerOf(z);
  const route = `<a class="route-link" href="${navUrl(lat, lng)}" target="_blank" rel="noopener">🧭 Пракласьці маршрут</a>`;
  return `<h3>${z.name}</h3>${info}${route}`;
}

/* --- 3) Малюем зоны --- */
const markersById = {};
const pointLayers = [];   // кропкі — каб потым падняць іх над палігонамі

ZONES.forEach((z, i) => {
  const color = zoneColor(z);
  let layer;
  if (isPolygon(z.coords)) {
    layer = L.polygon(z.coords, {
      color: color, weight: 2, fillColor: color, fillOpacity: 0.30
    });
    // подпіс пасярэдзіне вобласьці — клік па ім таксама адкрывае падказку
    const center = layer.getBounds().getCenter();
    L.marker(center, {
      icon: L.divIcon({
        className: '',
        html: `<div class="zone-label" style="background:${color}">${z.name}</div>`,
        iconSize: null
      }),
      interactive: true
    }).addTo(map).on('click', () => layer.openPopup(center));
  } else {
    layer = L.circleMarker(z.coords, {
      radius: 11, color: '#fff', weight: 2,
      fillColor: color, fillOpacity: 1
    });
    pointLayers.push(layer);
  }
  layer.bindPopup(popupHtml(z));
  layer.addTo(map);
  markersById[i] = layer;
});

// Кропкі заўжды над палігонамі (інакш, напр., біяпрыбіральні
// хаваюцца пад зонай намётаў).
pointLayers.forEach((p) => p.bringToFront());

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

  // Кароткі пульс на месцы зоны — падказвае, куды глядзець
  const c = isPolygon(z.coords) ? layer.getBounds().getCenter() : z.coords;
  const ring = L.marker(c, {
    icon: L.divIcon({ className: '', html: '<div class="pulse-ring"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    interactive: false
  }).addTo(map);
  setTimeout(() => map.removeLayer(ring), 1150);

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
const sheetHandle = document.getElementById('sheetHandle');
function closeSheet() { sheet.classList.remove('open'); }
function toggleSheet() { sheet.classList.toggle('open'); }
document.getElementById('toggleList').addEventListener('click', toggleSheet);

/* Перацягванне шторкі пальцам уверх/уніз (pointer events = тач + мыш) */
function sheetTranslateY() {
  const t = getComputedStyle(sheet).transform;
  if (!t || t === 'none') return 0;
  try { return new DOMMatrixReadOnly(t).m42; }
  catch (e) {
    const m = t.match(/matrix[^(]*\(([^)]+)\)/);
    return m ? parseFloat(m[1].split(',').pop()) : 0;
  }
}

let closedY = sheetTranslateY();   // зрух панэлі ў згорнутым стане (px)
let dragging = false, startY = 0, startT = 0, curT = 0, moved = false;

sheetHandle.addEventListener('pointerdown', (e) => {
  dragging = true; moved = false;
  startY = e.clientY;
  if (sheet.classList.contains('open')) {
    startT = 0;
  } else {
    const m = sheetTranslateY();
    if (m) closedY = m;
    startT = closedY;
  }
  curT = startT;
  sheet.style.transition = 'none';
  sheetHandle.setPointerCapture(e.pointerId);
});

sheetHandle.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dy = e.clientY - startY;
  if (Math.abs(dy) > 4) moved = true;
  curT = Math.min(Math.max(startT + dy, 0), closedY);
  sheet.style.transform = `translateY(${curT}px)`;
});

function endDrag() {
  if (!dragging) return;
  dragging = false;
  sheet.style.transition = '';      // вяртаем плаўную анімацыю
  sheet.style.transform = '';       // далей становішчам кіруе клас .open
  if (!moved) {
    toggleSheet();                  // звычайны тап — проста пераключыць
  } else {
    sheet.classList.toggle('open', curT < closedY * 0.5);
  }
}
sheetHandle.addEventListener('pointerup', endDrag);
sheetHandle.addEventListener('pointercancel', endDrag);

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

/* --- 8) Сплэш: знікае сам праз 1.3 с (ці па тапе) --- */
(function () {
  const splash = document.getElementById('splash');
  if (!splash) return;
  let done = false;
  const hide = () => { if (done) return; done = true; splash.classList.add('hide'); setTimeout(() => splash.remove(), 520); };
  setTimeout(hide, 1300);
  splash.addEventListener('click', hide);
})();

/* --- 9) Пошук па сьпісе зон --- */
(function () {
  const input = document.getElementById('zoneSearch');
  const clear = document.getElementById('zoneSearchClear');
  const list  = document.getElementById('zoneList');
  if (!input || !list) return;

  // плашка «нічога не знойдзена»
  const empty = document.createElement('div');
  empty.className = 'zone-empty'; empty.textContent = 'Нічога не знойдзена 🤍'; empty.hidden = true;
  list.appendChild(empty);

  function apply() {
    const q = input.value.trim().toLowerCase();
    clear.hidden = !q;
    const children = Array.from(list.children).filter(el => el !== empty);
    let anyVisible = false;
    // 1) паказваем/хаваем кожны радок зоны
    children.forEach(el => {
      if (!el.classList.contains('zone-item')) return;
      const text = el.textContent.toLowerCase();
      const show = !q || text.includes(q);
      el.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    // 2) хаваем загаловак групы, калі ўсе яе радкі схаваныя
    children.forEach((el, idx) => {
      if (!el.classList.contains('zone-group')) return;
      let hasVisible = false;
      for (let j = idx + 1; j < children.length; j++) {
        const n = children[j];
        if (n.classList.contains('zone-group')) break;
        if (n.classList.contains('zone-item') && n.style.display !== 'none') { hasVisible = true; break; }
      }
      el.style.display = hasVisible ? '' : 'none';
    });
    empty.hidden = anyVisible;
  }
  input.addEventListener('input', apply);
  clear.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
})();
