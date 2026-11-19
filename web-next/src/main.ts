import "./style.css";
import { loadDashboard, type DashboardData, type Vehicle, type GateTrip } from "./data";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Elemen aplikasi #app tidak ditemukan.");

root.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">G</div><div><b>GarasiKu</b><small>GATE PRO • NEXT</small></div></div>
      <nav><a class="selected">▦ <span>Monitoring Garasi</span></a><a>▤ <span>Logbook Gerbang</span></a><a>🚘 <span>Daftar Armada</span></a><a>♟ <span>Daftar Driver</span></a><a>▣ <span>Rekap E-Toll</span></a></nav>
      <div class="sidebar-foot">Versi baru • Preview paralel</div>
    </aside>
    <main class="main">
      <header class="topbar"><div><h1>Monitoring Garasi</h1><p>Ringkasan operasional armada secara langsung</p></div><div class="top-actions"><span id="cloud-status" class="cloud">● Menghubungkan</span><button id="refresh" class="secondary">↻ Refresh</button></div></header>
      <section id="stats" class="stats"><div class="stat">Memuat data…</div></section>
      <section class="section"><div class="section-head"><div><h2>Armada Sedang Bertugas di Luar</h2><p id="active-caption">Memuat perjalanan aktif</p></div><span id="active-count" class="pill">—</span></div><div id="active-trips" class="trip-grid"></div></section>
      <section class="section"><div class="section-head"><div><h2>Status Seluruh Armada</h2><p>Kendaraan nonaktif tidak ditampilkan</p></div><input id="search" placeholder="Cari plat, unit, model…"/></div><div id="vehicle-grid" class="vehicle-grid"></div></section>
      <footer>GarasiKu Next • Data dibaca langsung dari Firebase Server • Mode read-only</footer>
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
  const available = data.vehicles.filter((v) => v.active && v.operational && !activeIds.has(v.id));
  const operationalDrivers = data.drivers.filter((d) => d.active && !["PIMPINAN", "EXECUTIVE"].includes(d.category));
  const busyDriverIds = new Set(active.map((trip) => trip.driverId));
  const readyDrivers = operationalDrivers.filter((driver) => !busyDriverIds.has(driver.id));
  const total = data.vehicles.filter((v) => v.active).length;
  const stats = [
    ["Total Armada", total, "Unit terdaftar", "cyan"],
    ["Di Garasi (Ready)", available.length, "Siap ditugaskan", "green"],
    ["Sedang Keluar", active.length, "Di luar garasi", "amber"],
    ["Driver Operasional Ready", readyDrivers.length, "Aktif dan tidak bertugas", "violet"],
    ["Kartu E-Toll", `${data.etollCards.filter((card) => card.active).length} / ${data.etollCards.length}`, data.monthlyTopupTotal === null ? "Total top up belum terbaca" : `Top up bulan ini Rp ${fmt(data.monthlyTopupTotal)}`, "rose"],
  ];
  const el = $("stats");
  if (el) el.innerHTML = stats.map(([label, value, note, tone]) =>
    `<article class="stat-card ${tone}"><div class="stat-top"><span>${label}</span><i>●</i></div><strong>${value}</strong><small>${note}</small></article>`,
  ).join("");
  $("active-count")!.textContent = `${active.length} Unit`;
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

function renderVehicles(vehicles: Vehicle[]): void {
  const active = activeTrips();
  const activeIds = new Set(active.map((trip) => trip.vehicleId));
  const activePlates = new Set(active.map((trip) => trip.plate.toUpperCase()));
  const term = ($<HTMLInputElement>("search")?.value || "").trim().toLowerCase();
  const list = vehicles.filter((v) => v.active && !activeIds.has(v.id) && !activePlates.has(v.plate.toUpperCase()))
    .filter((v) => [v.plate,v.model,v.category,v.unitNo,v.odometer].join(" ").toLowerCase().includes(term))
    .sort((a,b) => (a.unitNo || 999) - (b.unitNo || 999));
  const el = $("vehicle-grid");
  if (!el) return;
  el.innerHTML = list.length ? list.map((v) => `
    <article class="vehicle-card"><div class="vehicle-top"><b>${esc(v.plate)}</b><span class="ready">DI GARASI</span></div>
      <h3>${esc(v.model)}</h3><div class="tags"><span>${esc(v.category)}</span><span>${v.usageCategory === "PIMPINAN" ? "Pimpinan" : "Operasional"}</span></div>
      <div class="km">ODO <b>${fmt(v.odometer)} KM</b></div>
      <small>Unit ${esc(v.unitNo ?? "—")} • ${v.operational ? "Operasional" : "Dalam perbaikan"}</small>
    </article>`,
  ).join("") : '<div class="empty">Tidak ada kendaraan yang cocok dengan pencarian.</div>';
}

function render(data: DashboardData): void {
  snapshot = data;
  renderStats(data);
  renderTrips(activeTrips());
  renderVehicles(data.vehicles);
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
$("refresh")?.addEventListener("click", () => void refresh());
$("search")?.addEventListener("input", () => { if (snapshot) renderVehicles(snapshot.vehicles); });
void refresh();
