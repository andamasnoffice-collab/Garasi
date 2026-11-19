import "./style.css";
import { connectAnonymousSession, db } from "./firebase";
import { doc, getDocFromServer } from "firebase/firestore";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Elemen aplikasi #app tidak ditemukan.");

root.innerHTML = `
  <main class="shell">
    <header><div class="brand">GarasiKu <span>NEXT</span></div><small>Platform Web Modern • Preview Paralel</small></header>
    <section class="panel">
      <p class="eyebrow">KONEKSI DATABASE PRODUKSI — READ ONLY CHECK</p>
      <h1>Fondasi GarasiKu Next</h1>
      <p class="muted">Versi baru berjalan terpisah. Aplikasi produksi dan data tidak diubah.</p>
      <div id="connection" class="status">Memeriksa konfigurasi…</div>
      <p class="muted note">Tahap awal hanya menguji autentikasi dan membaca metadata dokumen shared_state. Belum ada transaksi tulis.</p>
    </section>
  </main>`;

const status = document.querySelector<HTMLDivElement>("#connection");
async function start(): Promise<void> {
  if (!status) return;
  try {
    await connectAnonymousSession();
    const snapshot = await getDocFromServer(doc(db, "garasiku_fleet", "shared_state"));
    status.className = "status online";
    status.textContent = snapshot.exists()
      ? "Terhubung • shared_state terbaca dari server"
      : "Terhubung • shared_state belum ditemukan";
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Koneksi gagal";
  }
}
void start();
