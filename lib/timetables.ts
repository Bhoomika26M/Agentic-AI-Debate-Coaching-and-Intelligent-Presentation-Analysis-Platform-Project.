import timetableData from "@/data/timetables.json";
import localityData from "@/data/localities.json";
import { BusTrip, LocalityOption } from "./types";

export const KERALA_STATIONS: string[] = timetableData.stations;

const SERVICE_CLASSES = [
  "Ordinary",
  "Fast Passenger",
  "Super Fast",
  "Super Express",
  "Garuda Volvo",
  "Swift Deluxe",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Fetch locality landmarks near a given depot station (sorted by distance, capped <= 5 km)
 */
export function getLocalitiesForStation(stationName: string): LocalityOption[] {
  const norm = stationName.trim();
  const list = (localityData as Record<string, LocalityOption[]>)[norm] || [
    { name: `${norm} Town Center`, distanceKm: 1.0 },
    { name: `${norm} Junction`, distanceKm: 2.2 },
    { name: `${norm} Bypass Corner`, distanceKm: 3.5 },
    { name: `${norm} Civil Station`, distanceKm: 4.5 },
  ];

  return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Format date string e.g. "Tue, 23 Sep 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Single swappable module to fetch trips for any origin-destination route and scheduled date.
 */
export function getTripsForRoute(
  origin: string,
  dest: string,
  scheduledDate: string = new Date().toISOString().split("T")[0]
): BusTrip[] {
  if (!origin || !dest || origin === dest) {
    return [];
  }

  const cleanDate = scheduledDate.replace(/-/g, "");

  // Calculate distance & duration estimate based on station index gap
  const idxOrigin = KERALA_STATIONS.indexOf(origin);
  const idxDest = KERALA_STATIONS.indexOf(dest);
  const stationGap = Math.abs((idxOrigin >= 0 ? idxOrigin : 0) - (idxDest >= 0 ? idxDest : 5));
  const estimatedDurationHours = Math.max(1.5, Math.round((stationGap * 1.2 + 2) * 10) / 10);

  // 1. Search static timetables dataset
  const staticMatches = timetableData.trips.filter(
    (t) =>
      t.origin.toLowerCase() === origin.toLowerCase() &&
      t.dest.toLowerCase() === dest.toLowerCase()
  );

  const formatTrip = (t: any): BusTrip => {
    const tripId = `${t.id}-${cleanDate}`;
    
    // Calculate expected arrival date/time with midnight rollover
    const [depHour, depMin] = t.departureTime.split(":").map(Number);
    const depTotalMin = depHour * 60 + depMin;
    const travelMin = Math.round(estimatedDurationHours * 60);
    const arrTotalMin = depTotalMin + travelMin;

    const daysToAdd = Math.floor(arrTotalMin / (24 * 60));
    const arrMinOfDay = arrTotalMin % (24 * 60);
    const arrHourStr = String(Math.floor(arrMinOfDay / 60)).padStart(2, "0");
    const arrMinStr = String(arrMinOfDay % 60).padStart(2, "0");
    const arrTime = `${arrHourStr}:${arrMinStr}`;

    const baseDate = new Date(scheduledDate);
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const arrivalDateStr = baseDate.toISOString().split("T")[0];
    const formattedArrivalDate = `${formatDateDisplay(arrivalDateStr)} at ${arrTime}`;

    return {
      id: tripId,
      origin: t.origin,
      dest: t.dest,
      departureTime: t.departureTime,
      arrivalTime: arrTime,
      serviceClass: t.serviceClass,
      busNo: t.busNo,
      capacityKg: t.capacityKg,
      estimatedDurationHours,
      estimatedArrivalDate: formattedArrivalDate,
    };
  };

  if (staticMatches.length > 0) {
    return staticMatches.map(formatTrip);
  }

  // 2. Deterministic mock generator fallback
  const seed = hashString(`${origin}-${dest}-${scheduledDate}`);
  const numTrips = 2 + (seed % 2);
  const generatedTrips: BusTrip[] = [];

  const baseHours = [6, 9, 14, 18];

  for (let i = 0; i < numTrips; i++) {
    const tripSeed = seed + i * 17;
    const hour = baseHours[(tripSeed % baseHours.length)] + (i * 2);
    const minute = (tripSeed * 15) % 60;
    
    const depHourStr = String(hour % 24).padStart(2, "0");
    const depMinStr = String(minute).padStart(2, "0");
    const depTime = `${depHourStr}:${depMinStr}`;

    const serviceClass = SERVICE_CLASSES[tripSeed % SERVICE_CLASSES.length];
    
    const districtCode = String((tripSeed % 14) + 1).padStart(2, "0");
    const seriesLetter = String.fromCharCode(65 + (tripSeed % 26));
    const randomDigits = String(1000 + (tripSeed % 8999));
    const busNo = `KL-${districtCode} ${seriesLetter} ${randomDigits}`;

    const baseTripId = `TRIP-${origin.substring(0, 3).toUpperCase()}-${dest.substring(0, 3).toUpperCase()}-${depHourStr}${depMinStr}`;

    generatedTrips.push(
      formatTrip({
        id: baseTripId,
        origin,
        dest,
        departureTime: depTime,
        serviceClass,
        busNo,
        capacityKg: 220 + (tripSeed % 80),
      })
    );
  }

  return generatedTrips;
}
