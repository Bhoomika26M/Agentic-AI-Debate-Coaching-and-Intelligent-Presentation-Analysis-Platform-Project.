import { NextRequest, NextResponse } from "next/server";
import { getTripsForRoute } from "@/lib/timetables";
import { getBookedWeightForTrip, initDb } from "@/lib/db";
import { BusTrip } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get("origin") || "";
    const dest = searchParams.get("dest") || "";
    const scheduledDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!origin || !dest) {
      return NextResponse.json(
        { error: "Origin and destination query parameters are required." },
        { status: 400 }
      );
    }

    const baseTrips = getTripsForRoute(origin, dest, scheduledDate);

    // Annotate each trip with date-scoped remaining cargo capacity
    const annotatedTrips: BusTrip[] = await Promise.all(
      baseTrips.map(async (trip) => {
        const bookedWeight = await getBookedWeightForTrip(trip.id);
        const remaining = Math.max(0, trip.capacityKg - bookedWeight);
        return {
          ...trip,
          remainingCapacityKg: Math.round(remaining * 10) / 10,
        };
      })
    );

    return NextResponse.json({ trips: annotatedTrips, date: scheduledDate });
  } catch (error: any) {
    console.error("GET /api/trips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
