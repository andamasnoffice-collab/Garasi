import {
  collection, doc, getDocFromServer, getDocsFromServer, query, where,
  type DocumentData,
} from "firebase/firestore";
import { get, ref } from "firebase/database";
import { connectAnonymousSession, connectIndex1Session, db, index1Db } from "./firebase";

export interface Vehicle {
  id: string; plate: string; model: string; category: string; unitNo?: number;
  currentKm: number; odometer: number; active: boolean; operational: boolean;
  usageCategory: "PIMPINAN" | "OPERATIONAL"; status: string;
}
export interface Driver { id: string; name: string; category: string; active: boolean; cp?: string }
export interface GateTrip {
  id: string; vehicleId: string; driverId?: string; plate: string; model: string;
  driverName: string; destination?: string; timeOut?: string; timeIn?: string;
  kmStart?: number; status: string;
}
export interface DashboardData {
  vehicles: Vehicle[]; drivers: Driver[]; trips: GateTrip[];
  firestoreConnected: boolean; index1Connected: boolean;
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
    kmStart: Number(raw.kmStart) || 0, status: String(raw.status || ""),
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  await connectAnonymousSession();
  await connectIndex1Session();

  const sharedRef = doc(db, "garasiku_fleet", "shared_state");
  const sharedSnap = await getDocFromServer(sharedRef);
  const shared = sharedSnap.exists() ? sharedSnap.data() : {};
  const settings = asRecord(shared.vehicleSettings);

  const path = "artifacts/uns-fleet-service/public/data_v2/vehicles";
  const [vehicleSnap, driversSnap, recentSnap, activeSnap] = await Promise.all([
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
  ]);

  const rawVehicles = asRecord(vehicleSnap.val());
  const vehicles = Object.entries(rawVehicles).map(([key, value]) =>
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

  // Preserve the exact distinction between successful server reads and partial failures.
  return {
    vehicles, drivers, trips,
    firestoreConnected: true,
    index1Connected: vehicleSnap.exists(),
  };
}
