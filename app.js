const CATEGORY_COLORS = {
  "Theft": "#2563eb",
  "Burglary": "#7c3aed",
  "Robbery": "#b3261e",
  "Assault": "#dc2626",
  "Motor Vehicle Theft": "#0891b2",
  "Vandalism": "#ca8a04",
  "Narcotics": "#059669",
  "Domestic Incident": "#db2777",
};

let allIncidents = [];
let map, markersLayer;

async function init() {
  const res = await fetch("data/incidents.json");
  const data = await res.json();
  allIncidents = data.incidents;

  document.getElementById("last-updated").textContent =
    `Data generated: ${data.meta.generated} (sample dataset)`;

  populateFilterOptions();
  initMap();
  render();

  document.getElementById("filter-category").addEventListener("change", render);
  document.getElementById("filter-district").addEventListener("change", render);
  document.getElementById("filter-range").addEventListener("change", render);
}

function populateFilterOptions() {
  const categories = [...new Set(allIncidents.map(i => i.category))].sort();
  const districts = [...new Set(allIncidents.map(i => i.district))].sort();

  const catSelect = document.getElementById("filter-category");
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });

  const distSelect = document.getElementById("filter-district");
  districts.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `${d} District`;
    distSelect.appendChild(opt);
  });
}

function initMap() {
  map = L.map("map").setView([40.8859, -74.0435], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function getDateBounds(rangeValue) {
  const now = new Date("2026-09-08");
  let start;
  if (rangeValue === "ytd") {
    start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  } else if (rangeValue === "30") {
    start = new Date(now.getTime()); start.setUTCDate(start.getUTCDate() - 30);
  } else if (rangeValue === "90") {
    start = new Date(now.getTime()); start.setUTCDate(start.getUTCDate() - 90);
  } else {
    start = new Date(Date.UTC(2000, 0, 1));
  }
  return { start, end: now };
}

function filteredIncidents() {
  const category = document.getElementById("filter-category").value;
  const district = document.getElementById("filter-district").value;
  const rangeValue = document.getElementById("filter-range").value;
  const { start, end } = getDateBounds(rangeValue);

  return allIncidents.filter(i => {
    const d = new Date(i.date);
    if (d < start || d > end) return false;
    if (category && i.category !== category) return false;
    if (district && i.district !== district) return false;
    return true;
  });
}

function priorPeriodIncidents(current) {
  const rangeValue = document.getElementById("filter-range").value;
  const { start, end } = getDateBounds(rangeValue);
  const spanMs = end - start;
  const priorStart = new Date(start.getTime() - spanMs);
  const priorEnd = new Date(start.getTime() - 1);

  const category = document.getElementById("filter-category").value;
  const district = document.getElementById("filter-district").value;

  return allIncidents.filter(i => {
    const d = new Date(i.date);
    if (d < priorStart || d > priorEnd) return false;
    if (category && i.category !== category) return false;
    if (district && i.district !== district) return false;
    return true;
  });
}

function render() {
  const current = filteredIncidents();
  const prior = priorPeriodIncidents(current);
  renderStatCards(current, prior);
  renderMap(current);
  renderTable(current, prior);
}

function pctChange(curr, prev) {
  // No prior-period baseline to compare against — a raw percentage here
  // would be fabricated (e.g. 0 -> 23 is not a meaningful "100% increase").
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

function deltaLabel(delta, suffix = "") {
  if (delta === null) return { text: "New this period", cls: "flat" };
  const cls = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  return { text: `${arrow} ${Math.abs(delta)}%${suffix}`, cls };
}

function renderStatCards(current, prior) {
  const container = document.getElementById("stat-cards");
  container.innerHTML = "";

  const totalCurr = current.length;
  const totalPrior = prior.length;
  const totalDelta = pctChange(totalCurr, totalPrior);

  container.appendChild(makeStatCard("Total Incidents", totalCurr, totalDelta));

  const topCategories = ["Theft", "Burglary", "Robbery", "Assault"];
  topCategories.forEach(cat => {
    const c = current.filter(i => i.category === cat).length;
    const p = prior.filter(i => i.category === cat).length;
    container.appendChild(makeStatCard(cat, c, pctChange(c, p)));
  });
}

function makeStatCard(label, value, delta) {
  const div = document.createElement("div");
  div.className = "stat-card";
  const { text, cls } = deltaLabel(delta, " vs prior period");
  div.innerHTML = `
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="delta ${cls}">${text}</div>
  `;
  return div;
}

function renderMap(current) {
  markersLayer.clearLayers();
  current.forEach(i => {
    const color = CATEGORY_COLORS[i.category] || "#555";
    const marker = L.circleMarker([i.lat, i.lng], {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 0.7,
      weight: 1,
    });
    marker.bindPopup(
      `<strong>${i.category}</strong><br>${i.block_address}<br>${i.district} District<br>${i.date}`
    );
    marker.addTo(markersLayer);
  });
}

function renderTable(current, prior) {
  const tbody = document.querySelector("#category-table tbody");
  tbody.innerHTML = "";

  const categories = [...new Set(allIncidents.map(i => i.category))].sort();
  categories.forEach(cat => {
    const c = current.filter(i => i.category === cat);
    const p = prior.filter(i => i.category === cat);
    if (c.length === 0 && p.length === 0) return;

    const delta = pctChange(c.length, p.length);
    const { text, cls } = deltaLabel(delta);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cat}</td>
      <td class="definition">${c[0]?.definition || p[0]?.definition || ""}</td>
      <td>${c.length}</td>
      <td class="delta ${cls}">${text}</td>
    `;
    tbody.appendChild(tr);
  });
}

init();
