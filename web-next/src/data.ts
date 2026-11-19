import {
  collection, doc, getDocFromServer, getDocsFromServer, query, where,
  type DocumentData,
} from "firebase/firestore";
import { get, ref } from "firebase/database";
import {
  connectAnonymousSession, connectIndex1Session, connectRekapSession,
  db, index1Db, rekapDb,
} from "./firebase";

export interface Vehicle {
  id: string; plate: string; model: string; category: string; unitNo?: number;
  currentKm: number; odometer: number; active: boolean; operational: boolean;
  usageCategory: "PIMPINAN" | "OPERATIONAL"; status: string;
}
export interface Driver { id: string; name: string; category: string; active: boolean; cp?: string }
export interface GateTrip {
  id: string; vehicleId: string; driverId?: string; plate: string; model: string;
  driverName: string; destination?: string; timeOut?: string; timeIn?: string;
  kmStart?: number; kmEnd?: number; purpose?: string; status: string;
}
export interface EtollCard {
  id: string; number: string; last4: string; active: boolean;
  status: "AVAILABLE" | "BORROWED"; holderName: string; nopol: string; balance: number;
}
export interface DashboardData {
  vehicles: Vehicle[]; drivers: Driver[]; trips: GateTrip[]; etollCards: EtollCard[];
  monthlyTopupTotal: number | null;
  firestoreConnected: boolean; index1Connected: boolean; rekapConnected: boolean;
}

const normalizeCategory = (value: unknown): string => {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "PICKUP" || text === "PICK UP") return "PickUP";
  if (["MPV", "SEDAN", "BUS", "HIACE"].includes(text)) return text;
  return text || "Armada";
};
const normalizePlate = (value: unknown) => String(value ?? "").trim().toUpperCase();
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function mapVehicle(id: string, raw: Record<string, unknown>, settings: Record<string, unknown>): Vehicle {
  const plate = normalizePlate(raw.plate || raw.id || id);
  const key = plate.replace(/[^A-Z0-9]/g, "");
  const setting = asRecord(settings[key]);
  const km = Number(raw.currentKm ?? raw.odometer ?? 0) || 0;
  return {
    id: String(raw.id || id), plate, model: String(raw.model || "Mobil Dinas"),
    category: normalizeCategory(raw.category), unitNo: Number(raw.unitNo) || undefined,
    currentKm: km, odometer: km,
    active: setting.active !== false, operational: setting.operational !== false,
    usageCategory: setting.usageCategory === "PIMPINAN" ? "PIMPINAN" : "OPERATIONAL",
    status: String(raw.status || "IN_GARAGE"),
  };
}

function mapTrip(id: string, raw: DocumentData): GateTrip {
  return {
    id, vehicleId: String(raw.vehicleId || ""), driverId: String(raw.driverId || ""),
    plate: normalizePlate(raw.plate), model: String(raw.model || "Mobil Dinas"),
    driverName: String(raw.driverName || "-"), destination: String(raw.destination || ""),
    timeOut: String(raw.timeOut || ""), timeIn: String(raw.timeIn || ""),
    kmStart: Number(raw.kmStart) || 0, kmEnd: Number(raw.kmEnd) || 0, purpose: String(raw.purpose || ""), status: String(raw.status || ""),
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  await Promise.all([connectAnonymousSession(), connectIndex1Session(), connectRekapSession()]);

  const sharedRef = doc(db, "garasiku_fleet", "shared_state");
  const sharedSnap = await getDocFromServer(sharedRef);
  const shared = sharedSnap.exists() ? sharedSnap.data() : {};
  const settings = asRecord(shared.vehicleSettings);

  const path = "artifacts/uns-fleet-service/public/data_v2/vehicles";
  const monthKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
  const [vehicleSnap, driversSnap, recentSnap, activeSnap, cardsSnap, topupsSnap] = await Promise.all([
    get(ref(index1Db, path)),
    getDocsFromServer(collection(db, "garasiku_drivers")),
    getDocsFromServer(query(
      collection(db, "garasiku_fleet", "shared_state", "gate_logs"),
      where("timeOut", ">=", new Date(Date.now() - 31 * 86400000).toISOString()),
    )),
    getDocsFromServer(query(
      collection(db, "garasiku_fleet", "shared_state", "gate_logs"),
      where("status", "==", "ACTIVE"),
    )),
    get(ref(rekapDb, "cards")).catch(() => null),
    get(ref(rekapDb, `transactionsByMonth/${monthKey}`)).catch(() => null),
  ]);

  const rawValue: unknown = vehicleSnap.val();
  const rawEntries: Array<[string, unknown]> = rawValue && typeof rawValue === "object"
    ? Object.entries(rawValue as Record<string, unknown>)
    : [];
  if (!vehicleSnap.exists() || rawEntries.length === 0) {
    throw new Error("Master kendaraan Index1 kosong/tidak dapat dibaca dari server. Dashboard tidak akan mengganti data dengan cache lokal.");
  }
  const vehicles = rawEntries.map(([key, value]) =>
    mapVehicle(key, asRecord(value), settings),
  );
  const driverRows = driversSnap.docs.map((item) => ({
    id: item.id, ...item.data(),
  })) as Array<Record<string, unknown>>;
  const drivers: Driver[] = driverRows
    .filter((driver) => String(driver.name || "").trim())
    .map((driver) => ({
      id: String(driver.id), name: String(driver.name),
      category: String(driver.category || "OPERATIONAL").toUpperCase(),
      active: driver.active !== false, cp: String(driver.cp || ""),
    }));

  const tripMap = new Map<string, GateTrip>();
  [...recentSnap.docs, ...activeSnap.docs].forEach((item) =>
    tripMap.set(item.id, mapTrip(item.id, item.data())),
  );
  const trips = [...tripMap.values()].sort((a, b) =>
    Date.parse(b.timeOut || b.timeIn || "") - Date.parse(a.timeOut || a.timeIn || ""),
  );

  const cloudEtollState = asRecord(shared.etollState);
  const rawCards: unknown = cardsSnap?.val();
  const cardRows = Array.isArray(rawCards) ? rawCards : rawCards && typeof rawCards === "object" ? Object.values(rawCards as Record<string, unknown>) : [];
  const seenCards = new Set<string>();
  const etollCards: EtollCard[] = cardRows.map((value, index) => {
    const card = asRecord(value);
    const number = String(card.number || card.cardNo || "").replace(/\\D/g, "");
    const sourceId = String(card.id || `source-${index + 1}`);
    const key = number ? `number:${number}` : `id:${sourceId}`;
    if (seenCards.has(key)) return null;
    seenCards.add(key);
    const state = asRecord(cloudEtollState[sourceId] || (number ? cloudEtollState[number] : undefined));
    const status = state.status === "BORROWED" ? "BORROWED" : "AVAILABLE";
    return {
      id: sourceId, number, last4: number.slice(-4), active: state.active === true,
      status, holderName: status === "BORROWED" ? String(state.holderName || "") : "",
      nopol: String(card.nopol || state.nopol || ""), balance: Number(state.balance) || 0,
    } as EtollCard;
  }).filter((card): card is EtollCard => card !== null);
  const rawTopups: unknown = topupsSnap?.val();
  const topupRows = Array.isArray(rawTopups) ? rawTopups : rawTopups && typeof rawTopups === "object" ? Object.values(rawTopups as Record<string, unknown>) : [];
  const seenInvoices = new Set<string>();
  let monthlyTopupTotal: number | null = topupsSnap ? 0 : null;
  topupRows.forEach((value) => {
    const tx = asRecord(value);
    const date = String(tx.date || tx.createdAt || tx.timestamp || "").slice(0, 10);
    const amount = Number(tx.amount ?? tx.nominal ?? tx.topupAmount);
    if (!date.startsWith(monthKey) || !Number.isFinite(amount) || amount <= 0) return;
    const id = String(tx.id || tx.invoiceNumber || tx.invoice || "");
    const dedupe = id ? `id:${id}` : `${date}|${amount}|${String(tx.etollNumber || tx.cardNumber || tx.number || "")}`;
    if (seenInvoices.has(dedupe)) return;
    seenInvoices.add(dedupe);
    if (monthlyTopupTotal !== null) monthlyTopupTotal += amount;
  });

  // Preserve the exact distinction between successful server reads and partial failures.
  return {
    vehicles, drivers, trips, etollCards, monthlyTopupTotal,
    firestoreConnected: true,
    index1Connected: vehicleSnap.exists(),
    rekapConnected: cardsSnap?.exists() ?? false,
  };
}
