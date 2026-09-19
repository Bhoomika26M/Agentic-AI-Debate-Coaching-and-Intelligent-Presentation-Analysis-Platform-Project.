import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { Parcel, TimelineEntry } from "./types";

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "parcels_db.json");

function readLocalParcels(): Parcel[] {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const dir = path.dirname(LOCAL_DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([]), "utf-8");
      return [];
    }
    const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    const raw: any[] = JSON.parse(content || "[]");

    // Standardize & fill defaults for backwards compatibility
    return raw.map((r) => ({
      ...r,
      pickup_type: r.pickup_type || "depot",
      delivery_type: r.delivery_type || "depot",
      pickup_fee: r.pickup_fee || 0,
      delivery_fee: r.delivery_fee || 0,
      scheduled_date: r.scheduled_date || (r.booked_at ? r.booked_at.split("T")[0] : new Date().toISOString().split("T")[0]),
      estimated_arrival_date: r.estimated_arrival_date || (r.booked_at ? r.booked_at.split("T")[0] : new Date().toISOString().split("T")[0]),
    }));
  } catch (err) {
    console.error("Failed to read local DB:", err);
    return [];
  }
}

function writeLocalParcels(parcels: Parcel[]): void {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(parcels, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local DB:", err);
  }
}

export async function initDb(): Promise<void> {
  if (postgresUrl) {
    try {
      const sql = neon(postgresUrl);
      await sql`
        CREATE TABLE IF NOT EXISTS parcels (
          ref TEXT PRIMARY KEY,
          origin TEXT NOT NULL,
          dest TEXT NOT NULL,
          trip_id TEXT NOT NULL,
          trip_time TEXT NOT NULL,
          trip_type TEXT NOT NULL,
          bus_no TEXT NOT NULL,
          size TEXT NOT NULL,
          weight NUMERIC NOT NULL,
          sender_name TEXT NOT NULL,
          sender_phone TEXT NOT NULL,
          receiver_name TEXT NOT NULL,
          receiver_phone TEXT NOT NULL,
          price NUMERIC NOT NULL,
          otp TEXT NOT NULL,
          status TEXT NOT NULL,
          booked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
          pickup_type TEXT NOT NULL DEFAULT 'depot',
          delivery_type TEXT NOT NULL DEFAULT 'depot',
          pickup_locality TEXT,
          pickup_locality_distance_km NUMERIC,
          delivery_locality TEXT,
          delivery_locality_distance_km NUMERIC,
          pickup_fee NUMERIC NOT NULL DEFAULT 0,
          delivery_fee NUMERIC NOT NULL DEFAULT 0,
          scheduled_date TEXT NOT NULL DEFAULT '',
          estimated_arrival_date TEXT NOT NULL DEFAULT ''
        );
      `;
      console.log("Postgres database table `parcels` initialized.");
    } catch (err) {
      console.error("Error initializing Postgres database table:", err);
    }
  } else {
    readLocalParcels();
  }
}

export async function createParcel(parcel: Parcel): Promise<Parcel> {
  if (postgresUrl) {
    const sql = neon(postgresUrl);
    await sql`
      INSERT INTO parcels (
        ref, origin, dest, trip_id, trip_time, trip_type, bus_no,
        size, weight, sender_name, sender_phone, receiver_name, receiver_phone,
        price, otp, status, booked_at, timeline,
        pickup_type, delivery_type, pickup_locality, pickup_locality_distance_km,
        delivery_locality, delivery_locality_distance_km, pickup_fee, delivery_fee,
        scheduled_date, estimated_arrival_date
      ) VALUES (
        ${parcel.ref}, ${parcel.origin}, ${parcel.dest}, ${parcel.trip_id},
        ${parcel.trip_time}, ${parcel.trip_type}, ${parcel.bus_no},
        ${parcel.size}, ${parcel.weight}, ${parcel.sender_name},
        ${parcel.sender_phone || ""}, ${parcel.receiver_name},
        ${parcel.receiver_phone || ""}, ${parcel.price}, ${parcel.otp || ""},
        ${parcel.status}, ${parcel.booked_at}, ${JSON.stringify(parcel.timeline)},
        ${parcel.pickup_type}, ${parcel.delivery_type}, ${parcel.pickup_locality || null},
        ${parcel.pickup_locality_distance_km || null}, ${parcel.delivery_locality || null},
        ${parcel.delivery_locality_distance_km || null}, ${parcel.pickup_fee || 0},
        ${parcel.delivery_fee || 0}, ${parcel.scheduled_date || ""}, ${parcel.estimated_arrival_date || ""}
      );
    `;
    return parcel;
  } else {
    const parcels = readLocalParcels();
    const existingIdx = parcels.findIndex((p) => p.ref === parcel.ref);
    if (existingIdx >= 0) {
      parcels[existingIdx] = parcel;
    } else {
      parcels.push(parcel);
    }
    writeLocalParcels(parcels);
    return parcel;
  }
}

export async function getParcelByRef(ref: string): Promise<Parcel | null> {
  if (!ref) return null;
  const cleanRef = ref.trim().toUpperCase();

  if (postgresUrl) {
    const sql = neon(postgresUrl);
    const rows = await sql`
      SELECT * FROM parcels WHERE UPPER(ref) = ${cleanRef} LIMIT 1;
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ref: r.ref,
      origin: r.origin,
      dest: r.dest,
      trip_id: r.trip_id,
      trip_time: r.trip_time,
      trip_type: r.trip_type,
      bus_no: r.bus_no,
      size: r.size,
      weight: Number(r.weight),
      sender_name: r.sender_name,
      sender_phone: r.sender_phone,
      receiver_name: r.receiver_name,
      receiver_phone: r.receiver_phone,
      price: Number(r.price),
      otp: r.otp,
      status: r.status,
      booked_at: typeof r.booked_at === "string" ? r.booked_at : new Date(r.booked_at).toISOString(),
      timeline: typeof r.timeline === "string" ? JSON.parse(r.timeline) : r.timeline,
      pickup_type: r.pickup_type || "depot",
      delivery_type: r.delivery_type || "depot",
      pickup_locality: r.pickup_locality || undefined,
      pickup_locality_distance_km: r.pickup_locality_distance_km ? Number(r.pickup_locality_distance_km) : undefined,
      delivery_locality: r.delivery_locality || undefined,
      delivery_locality_distance_km: r.delivery_locality_distance_km ? Number(r.delivery_locality_distance_km) : undefined,
      pickup_fee: Number(r.pickup_fee || 0),
      delivery_fee: Number(r.delivery_fee || 0),
      scheduled_date: r.scheduled_date || "",
      estimated_arrival_date: r.estimated_arrival_date || "",
    };
  } else {
    const parcels = readLocalParcels();
    const found = parcels.find((p) => p.ref.toUpperCase() === cleanRef);
    return found || null;
  }
}

export async function updateParcelStatus(
  ref: string,
  newStatus: string,
  newTimelineEntry: TimelineEntry
): Promise<Parcel | null> {
  const parcel = await getParcelByRef(ref);
  if (!parcel) return null;

  const updatedTimeline = [...parcel.timeline, newTimelineEntry];
  parcel.status = newStatus as any;
  parcel.timeline = updatedTimeline;

  if (postgresUrl) {
    const sql = neon(postgresUrl);
    await sql`
      UPDATE parcels
      SET status = ${newStatus}, timeline = ${JSON.stringify(updatedTimeline)}
      WHERE UPPER(ref) = ${ref.toUpperCase()};
    `;
    return parcel;
  } else {
    const parcels = readLocalParcels();
    const idx = parcels.findIndex((p) => p.ref.toUpperCase() === ref.toUpperCase());
    if (idx >= 0) {
      parcels[idx] = parcel;
      writeLocalParcels(parcels);
    }
    return parcel;
  }
}

export async function getBookedWeightForTrip(tripId: string): Promise<number> {
  if (postgresUrl) {
    const sql = neon(postgresUrl);
    const rows = await sql`
      SELECT SUM(weight) as total_weight FROM parcels WHERE trip_id = ${tripId};
    `;
    return Number(rows[0]?.total_weight || 0);
  } else {
    const parcels = readLocalParcels();
    return parcels
      .filter((p) => p.trip_id === tripId)
      .reduce((sum, p) => sum + p.weight, 0);
  }
}

export async function getStationManifest(stationName: string): Promise<{
  departing: Parcel[];
  arriving: Parcel[];
}> {
  const norm = stationName.trim().toLowerCase();

  if (postgresUrl) {
    const sql = neon(postgresUrl);
    const rows = await sql`
      SELECT * FROM parcels 
      WHERE LOWER(origin) = ${norm} OR LOWER(dest) = ${norm};
    `;
    const all: Parcel[] = rows.map((r: any) => ({
      ref: r.ref,
      origin: r.origin,
      dest: r.dest,
      trip_id: r.trip_id,
      trip_time: r.trip_time,
      trip_type: r.trip_type,
      bus_no: r.bus_no,
      size: r.size,
      weight: Number(r.weight),
      sender_name: r.sender_name,
      sender_phone: r.sender_phone,
      receiver_name: r.receiver_name,
      receiver_phone: r.receiver_phone,
      price: Number(r.price),
      otp: r.otp,
      status: r.status,
      booked_at: typeof r.booked_at === "string" ? r.booked_at : new Date(r.booked_at).toISOString(),
      timeline: typeof r.timeline === "string" ? JSON.parse(r.timeline) : r.timeline,
      pickup_type: r.pickup_type || "depot",
      delivery_type: r.delivery_type || "depot",
      pickup_locality: r.pickup_locality || undefined,
      pickup_locality_distance_km: r.pickup_locality_distance_km ? Number(r.pickup_locality_distance_km) : undefined,
      delivery_locality: r.delivery_locality || undefined,
      delivery_locality_distance_km: r.delivery_locality_distance_km ? Number(r.delivery_locality_distance_km) : undefined,
      pickup_fee: Number(r.pickup_fee || 0),
      delivery_fee: Number(r.delivery_fee || 0),
      scheduled_date: r.scheduled_date || "",
      estimated_arrival_date: r.estimated_arrival_date || "",
    }));

    return {
      departing: all.filter((p) => p.origin.toLowerCase() === norm),
      arriving: all.filter((p) => p.dest.toLowerCase() === norm),
    };
  } else {
    const parcels = readLocalParcels();
    return {
      departing: parcels.filter((p) => p.origin.toLowerCase() === norm),
      arriving: parcels.filter((p) => p.dest.toLowerCase() === norm),
    };
  }
}

export async function seedDatabase(demoParcels: Parcel[]): Promise<void> {
  await initDb();
  for (const p of demoParcels) {
    await createParcel(p);
  }
}
