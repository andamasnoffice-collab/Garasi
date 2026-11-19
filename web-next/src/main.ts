import "./style.css";
import { loadDashboard, type DashboardData, type Vehicle, type GateTrip } from "./data";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Elemen aplikasi #app tidak ditemukan.");

root.innerHTML = `
  <div class="app-shell">
    <header class="top-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-mark">▤</div>
          <div class="brand-copy"><div class="brand-line"><b>GarasiKu</b><span class="brand-badge">GATE PRO</span><span class="next-badge">NEXT</span></div><small>Sistem Gerbang Armada &amp; Kendali Pengemudi</small></div>
        </div>
        <div class="header-actions">
          <span id="cloud-status" class="cloud"><i></i> Menghubungkan</span>
          <button id="refresh" class="refresh-button" type="button"><span>↻</span> Refresh</button>
        </div>
      </div>
    </header>
    <main class="main">
      <section id="stats" class="stats"><div class="loading-card">Memuat data Firebase…</div></section>
      <nav class="mobile-tabs" aria-label="Navigasi utama">
        <a class="tab-btn active" href="#dashboard" data-view="dashboard"><span class="nav-icon">▦</span><span>Monitoring Garasi</span></a>
        <a class="tab-btn" href="#logbook" data-view="logbook"><span class="nav-icon">▤</span><span>Logbook Gerbang</span></a>
        <a class="tab-btn" href="#vehicles" data-view="vehicles"><span class="nav-icon">🚘</span><span>Daftar Armada</span></a>
        <a class="tab-btn" href="#drivers" data-view="drivers"><span class="nav-icon">♟</span><span>Daftar Driver</span></a>
        <a class="tab-btn etoll-tab" href="#etoll" data-view="etoll"><span class="nav-icon">▣</span><span>Rekap E-Toll</span></a>
      </nav>
      <section id="dashboard-view" class="view">
        <section id="active-section" class="active-section">
          <div class="section-head active-head"><div><h2><span class="section-icon amber">◉</span> Armada Sedang Bertugas di Luar</h2><p id="active-caption">Memuat perjalanan aktif</p></div><span id="active-count" class="pill">— Unit</span></div>
          <div id="active-trips" class="trip-grid"></div>
        </section>
        <section class="fleet-section">
          <div class="fleet-heading"><div><h2><span class="section-icon cyan">▦</span> Status Seluruh Armada</h2><p>Sentuh unit untuk memeriksa status operasional</p></div></div>
          <div class="fleet-toolbar">
            <input id="monitor-search" type="search" placeholder="⌕  Cari plat, unit, model, driver…" autocomplete="off"/>
            <div id="category-filters" class="category-filters"></div>
            <select id="vehicle-sort" aria-label="Urutkan kendaraan"><option value="frequent">Sort: Sering Dipakai</option><option value="unit">Sort: No. Unit</option><option value="category">Sort: Jenis Kendaraan</option><option value="ops">Sort: Mobil Operasional</option><option value="pimpinan">Sort: Mobil Pimpinan</option><option value="plate">Sort: Plat (A-Z)</option><option value="garage">Sort: Siap di Garasi</option><option value="km-asc">Sort: KM Terendah</option><option value="km-desc">Sort: KM Tertinggi</option></select>
          </div>
          <div id="monitoring-vehicles-grid" class="vehicle-grid"></div>
        </section>
      </section>
      <section id="vehicles-view" class="section view hidden">
        <div class="section-head"><div><h2><span class="section-icon cyan">🚘</span> Daftar Armada</h2><p>Master kendaraan dari Index1 • sumber data server</p></div><input id="search" type="search" placeholder="Cari plat, model, kategori…"/></div>
        <div id="vehicle-grid" class="vehicle-grid"></div>
      </section>
      <section id="logbook-view" class="section view hidden">
        <div class="section-head"><div><h2><span class="section-icon cyan">▤</span> Riwayat Catatan Gerbang Keluar &amp; Masuk</h2><p>Riwayat satu bulan terakhir dan semua perjalanan ACTIVE</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Waktu Keluar</th><th>Kendaraan</th><th>Driver</th><th>Tujuan</th><th>KM Awal</th><th>Status</th></tr></thead><tbody id="logbook-rows"></tbody></table></div>
      </section>
      <section id="drivers-view" class="section view hidden">
        <div class="section-head"><div><h2><span class="section-icon cyan">♟</span> Daftar Driver</h2><p>Master driver dari Firestore GarasiKu</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kategori</th><th>Kontak</th><th>Status</th></tr></thead><tbody id="driver-rows"></tbody></table></div>
      </section>
      <section id="etoll-view" class="section view hidden">
        <div class="section-head"><div><h2><span class="section-icon rose">▣</span> Rekap Mutasi E-Toll</h2><p>Master kartu dari RekapToll • status operasional dari Firestore GarasiKu</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Kartu</th><th>Nomor Akhir</th><th>Nopol</th><th>Status</th><th>Pemegang</th><th>Saldo</th></tr></thead><tbody id="etoll-rows"></tbody></table></div><p id="topup-total" class="table-note"></p>
      </section>
      <footer>GarasiKu • GATE PRO • Versi Web Next (Preview Paralel)</footer>
    </main>
  </div>`;

let snapshot: DashboardData | null = null;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
}[c] as string));
const activeTrips = () => (snapshot?.trips || []).filter((trip) => trip.status === "ACTIVE");
const fmt = (value: number) => new Intl.NumberFormat("id-ID").format(value);

function renderStats(data: DashboardData): void {
  const active = activeTrips();
  const activeIds = new Set(active.map((trip) => trip.vehicleId));
  const available = data.vehicles.filter((v) =>
    v.active && v.operational && v.usageCategory === "OPERATIONAL" && v.status === "IN_GARAGE" &&
    !activeIds.has(v.id) && !active.some((trip) => trip.plate.toUpperCase() === v.plate.toUpperCase()),
  );
  const activeFleet = data.vehicles.filter((v) => v.active !== false).length;
  const activeEtolls = data.etollCards.filter((card) => card.active !== false);
  const readyEtolls = activeEtolls.filter((card) => card.status === "AVAILABLE").length;
  const etollBalance = activeEtolls.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
  const operationalDrivers = data.drivers.filter((d) => d.active && !["PIMPINAN", "EXECUTIVE"].includes(d.category));
  const busyDriverIds = new Set(active.map((trip) => trip.driverId).filter(Boolean));
  const busyDriverNames = new Set(active.map((trip) => trip.driverName.trim().toLowerCase()).filter(Boolean));
  const readyDrivers = operationalDrivers.filter((driver) =>
    !busyDriverIds.has(driver.id) && !busyDriverNames.has(driver.name.trim().toLowerCase()),
  );
  const total = data.vehicles.length;
  const stats = [
    ["Total Armada", `${activeFleet} / ${total}`, "Unit aktif / seluruh terdaftar", "cyan"],
    ["Di Garasi (Ready)", available.length, "Siap ditugaskan", "green"],
    ["Sedang Keluar", active.length, "Di luar garasi", "amber"],
    ["Driver Operasional Ready", readyDrivers.length, "Aktif dan tidak bertugas", "violet"],
    ["Kartu E-Toll", data.rekapConnected ? `${readyEtolls} / ${activeEtolls.length}` : "—", !data.rekapConnected ? "Sumber RekapToll belum terbaca" : `Total saldo aktif Rp ${fmt(etollBalance)}`, "rose"],
  ];
  const glyphs: Record<string, string> = { cyan: "🚘", green: "P", amber: "↗", violet: "♟", rose: "▣" };
  const el = $("stats");
  if (el) el.innerHTML = stats.map(([label, value, note, tone]) =>
    `<article class="stat-card ${tone}"><div class="stat-top"><span>${label}</span><i>${glyphs[tone] || "●"}</i></div><strong>${value}</strong><small>${note}</small></article>`,
  ).join("");
  $("active-count")!.textContent = `${active.length} Unit`;
  const activeSection = $("active-section");
  if (activeSection) activeSection.classList.toggle("has-no-trips", active.length === 0);
  $("active-caption")!.textContent = `${active.length} perjalanan berstatus ACTIVE dari Firestore`;
}

function renderTrips(trips: GateTrip[]): void {
  const el = $("active-trips");
  if (!el) return;
  if (!trips.length) {
    el.innerHTML = '<div class="empty">Tidak ada kendaraan yang sedang bertugas.</div>';
    return;
  }
  el.innerHTML = trips.map((trip) => `
    <article class="trip-card"><div class="trip-top"><b>${esc(trip.plate || "Plat belum tersedia")}</b><time>${esc(trip.timeOut ? new Date(trip.timeOut).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "—")}</time></div>
    <strong>${esc(trip.model)}</strong><p>👤 ${esc(trip.driverName)}</p><p>📍 ${esc(trip.destination || "-")}</p><small>Transaksi aktif • ${esc(trip.id)}</small></article>`,
  ).join("");
}

let selectedCategory = "Semua";
function renderCategoryFilters(vehicles: Vehicle[]): void {
  const host = $("category-filters");
  if (!host) return;
  const categories = ["Semua", "MPV", "Sedan", "Bus", "Hiace", "PickUP"];
  host.innerHTML = categories.map((category) => {
    const count = category === "Semua" ? vehicles.filter((v) => v.active).length
      : vehicles.filter((v) => v.active && v.category.toLowerCase() === category.toLowerCase()).length;
    if (!count && category !== "Semua") return "";
    return `<button type="button" class="filter-chip ${selectedCategory === category ? "active" : ""}" data-category="${esc(category)}">${esc(category)} <span>${count}</span></button>`;
  }).join("");
  host.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category || "Semua";
      if (snapshot) renderVehicleCards("monitoring-vehicles-grid", snapshot.vehicles, "monitor-search", true);
    });
  });
}
function renderVehicleCards(containerId: string, vehicles: Vehicle[], searchId: string, monitoring = false): void {
  const active = activeTrips();
  const activeIds = new Set(active.map((trip) => trip.vehicleId));
  const activePlates = new Set(active.map((trip) => trip.plate.toUpperCase()));
  const term = ($<HTMLInputElement>(searchId)?.value || "").trim().toLowerCase();
  let list = vehicles.filter((v) => v.active !== false)
    .filter((v) => !monitoring || selectedCategory === "Semua" || v.category.toLowerCase() === selectedCategory.toLowerCase())
    .filter((v) => [v.plate,v.model,v.category,v.unitNo,v.odometer].join(" ").toLowerCase().includes(term));
  const sort = monitoring ? ($<HTMLSelectElement>("vehicle-sort")?.value || "frequent") : "unit";
  if (sort === "plate") list.sort((a,b) => a.plate.localeCompare(b.plate));
  else if (sort === "km-asc") list.sort((a,b) => a.odometer-b.odometer);
  else if (sort === "km-desc") list.sort((a,b) => b.odometer-a.odometer);
  else if (sort === "category") list.sort((a,b) => a.category.localeCompare(b.category));
  else if (sort === "ops") list.sort((a,b) => Number(b.usageCategory === "OPERATIONAL")-Number(a.usageCategory === "OPERATIONAL"));
  else if (sort === "pimpinan") list.sort((a,b) => Number(b.usageCategory === "PIMPINAN")-Number(a.usageCategory === "PIMPINAN"));
  else if (sort === "garage") list.sort((a,b) => Number(b.status === "IN_GARAGE")-Number(a.status === "IN_GARAGE"));
  else list.sort((a,b) => (a.unitNo || 999)-(b.unitNo || 999));
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = list.length ? list.map((v) => {
    const trip = active.find((item) => item.vehicleId === v.id || item.plate.toUpperCase() === v.plate.toUpperCase());
    const isOut = Boolean(trip || activeIds.has(v.id) || activePlates.has(v.plate.toUpperCase()));
    const stateClass = isOut ? "vehicle-card-out" : v.operational ? "vehicle-card-in" : "vehicle-card-maintenance";
    const stateLabel = isOut ? "SEDANG BERTUGAS" : v.operational ? "DI GARASI" : "NON-OPERASIONAL";
    return `<article class="vehicle-card ${stateClass}">
      <div class="vehicle-top"><b>${esc(v.plate)}</b><span class="vehicle-status-badge">${stateLabel}</span></div>
      <h3>${esc(v.model)}</h3>
      <div class="tags"><span>${esc(v.category)}</span><span>${v.usageCategory === "PIMPINAN" ? "Pimpinan" : "Operasional"}</span></div>
      <div class="km"><span>ODO</span><b>${fmt(v.odometer)} KM</b></div>
      <small>${trip ? "👤 " + esc(trip.driverName) + " • 📍 " + esc(trip.destination || "-") : "Unit " + esc(v.unitNo ?? "—") + " • " + (v.operational ? "Siap operasional" : "Dalam perbaikan")}</small>
    </article>`;
  }).join("") : '<div class="empty">Tidak ada kendaraan yang sesuai dengan pencarian.</div>';
}
function renderVehicles(vehicles: Vehicle[]): void {
  renderCategoryFilters(vehicles);
  renderVehicleCards("monitoring-vehicles-grid", vehicles, "monitor-search", true);
  renderVehicleCards("vehicle-grid", vehicles, "search", false);
}
function renderTables(data: DashboardData): void {
  const logRows = $("logbook-rows");
  if (logRows) logRows.innerHTML = [...data.trips].sort((a,b) => Date.parse(b.timeOut || "") - Date.parse(a.timeOut || "")).map((trip) =>
    `<tr><td>${esc(trip.timeOut ? new Date(trip.timeOut).toLocaleString("id-ID") : "—")}</td><td><b>${esc(trip.plate)}</b><small>${esc(trip.model)}</small></td><td>${esc(trip.driverName)}</td><td>${esc(trip.destination || "-")}</td><td>${fmt(trip.kmStart || 0)}</td><td><span class="state ${trip.status === "ACTIVE" ? "state-active" : "state-done"}">${esc(trip.status)}</span></td></tr>`,
  ).join("") || '<tr><td colspan="6" class="empty-cell">Belum ada data logbook pada rentang baca.</td></tr>';
  const driverRows = $("driver-rows");
  if (driverRows) driverRows.innerHTML = data.drivers.map((driver) =>
    `<tr><td><b>${esc(driver.name)}</b></td><td>${esc(driver.category)}</td><td>${esc(driver.cp || "-")}</td><td>${driver.active ? "Aktif" : "Nonaktif"}</td></tr>`,
  ).join("") || '<tr><td colspan="4" class="empty-cell">Master driver kosong.</td></tr>';
  const etollRows = $("etoll-rows");
  if (etollRows) etollRows.innerHTML = data.etollCards.map((card) =>
    `<tr><td><b>${esc(card.last4 ? `Kartu •••• ${card.last4}` : card.id)}</b></td><td>${esc(card.last4 || "-")}</td><td>${esc(card.nopol || "-")}</td><td><span class="state ${card.active ? "state-active" : "state-muted"}">${card.active ? "ON" : "OFF"} • ${card.status}</span></td><td>${esc(card.holderName || "-")}</td><td>Rp ${fmt(card.balance)}</td></tr>`,
  ).join("") || '<tr><td colspan="6" class="empty-cell">Master kartu E-Toll tidak terbaca.</td></tr>';
  const topup = $("topup-total");
  if (topup) topup.textContent = data.monthlyTopupTotal === null ? "Total top up bulan berjalan belum dapat dibaca dari RekapToll." : `Total top up bulan berjalan: Rp ${fmt(data.monthlyTopupTotal)}`;
}

function render(data: DashboardData): void {
  snapshot = data;
  renderStats(data);
  renderTrips(activeTrips());
  renderVehicles(data.vehicles);
  renderTables(data);
  const status = $("cloud-status");
  if (status) {
    status.className = "cloud online";
    status.textContent = data.firestoreConnected && data.index1Connected && data.rekapConnected
      ? "● Cloud Online • 3 sumber data"
      : "● Terhubung sebagian";
  }
}

async function refresh(): Promise<void> {
  const status = $("cloud-status");
  const button = $<HTMLButtonElement>("refresh");
  if (button) { button.disabled = true; button.textContent = "Memuat…"; }
  if (status) { status.className = "cloud"; status.textContent = "● Memuat data server"; }
  try {
    const data = await loadDashboard();
    render(data);
  } catch (error) {
    if (status) { status.className = "cloud error"; status.textContent = "● Gagal membaca data"; }
    const message = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    const stats = $("stats");
    if (stats) stats.innerHTML = `<div class="error-panel"><b>Data belum berhasil dimuat</b><p>${esc(message)}</p><small>Data lokal tidak digunakan sebagai pengganti data server.</small></div>`;
  } finally {
    if (button) { button.disabled = false; button.textContent = "↻ Refresh"; }
  }
}
document.querySelectorAll<HTMLAnchorElement>("[data-view]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const target = link.dataset.view || "dashboard";
    document.querySelectorAll<HTMLElement>(".view").forEach((view) => view.classList.add("hidden"));
    document.getElementById(`${target}-view`)?.classList.remove("hidden");
    document.querySelectorAll<HTMLAnchorElement>("[data-view]").forEach((item) => item.classList.toggle("active", item === link));
    if (snapshot && target === "vehicles") renderVehicles(snapshot.vehicles);
  });
});
$("refresh")?.addEventListener("click", () => void refresh());
$("search")?.addEventListener("input", () => { if (snapshot) renderVehicleCards("vehicle-grid", snapshot.vehicles, "search", false); });
$("monitor-search")?.addEventListener("input", () => { if (snapshot) renderVehicleCards("monitoring-vehicles-grid", snapshot.vehicles, "monitor-search", true); });
$("vehicle-sort")?.addEventListener("change", () => { if (snapshot) renderVehicleCards("monitoring-vehicles-grid", snapshot.vehicles, "monitor-search", true); });
void refresh();
