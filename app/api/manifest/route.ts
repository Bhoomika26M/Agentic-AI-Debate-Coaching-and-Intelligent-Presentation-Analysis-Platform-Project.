import { NextRequest, NextResponse } from "next/server";
import { getStationManifest, initDb } from "@/lib/db";
import { Parcel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const station = searchParams.get("station") || "";

    if (!station) {
      return NextResponse.json(
        { error: "Station query parameter is required." },
        { status: 400 }
      );
    }

    const { departing, arriving } = await getStationManifest(station);

    // Group departing by scheduled_date & trip_id
    const departingByDate: Record<string, Record<string, { serviceInfo: any; parcels: Parcel[] }>> = {};
    for (const p of departing) {
      const dateKey = p.scheduled_date || (p.booked_at ? p.booked_at.split("T")[0] : "Undated");
      if (!departingByDate[dateKey]) {
        departingByDate[dateKey] = {};
      }
      if (!departingByDate[dateKey][p.trip_id]) {
        departingByDate[dateKey][p.trip_id] = {
          serviceInfo: {
            trip_id: p.trip_id,
            trip_time: p.trip_time,
            bus_no: p.bus_no,
            trip_type: p.trip_type,
            origin: p.origin,
            dest: p.dest,
            scheduled_date: dateKey,
          },
          parcels: [],
        };
      }
      departingByDate[dateKey][p.trip_id].parcels.push(p);
    }

    // Group arriving by scheduled_date & trip_id
    const arrivingByDate: Record<string, Record<string, { serviceInfo: any; parcels: Parcel[]; waitingCount: number; deliveredCount: number }>> = {};

    let totalArrivingWaiting = 0;
    let totalArrivingDelivered = 0;

    for (const p of arriving) {
      const dateKey = p.scheduled_date || (p.booked_at ? p.booked_at.split("T")[0] : "Undated");
      if (!arrivingByDate[dateKey]) {
        arrivingByDate[dateKey] = {};
      }
      if (!arrivingByDate[dateKey][p.trip_id]) {
        arrivingByDate[dateKey][p.trip_id] = {
          serviceInfo: {
            trip_id: p.trip_id,
            trip_time: p.trip_time,
            bus_no: p.bus_no,
            trip_type: p.trip_type,
            origin: p.origin,
            dest: p.dest,
            scheduled_date: dateKey,
          },
          parcels: [],
          waitingCount: 0,
          deliveredCount: 0,
        };
      }
      arrivingByDate[dateKey][p.trip_id].parcels.push(p);

      if (p.status === "Delivered") {
        arrivingByDate[dateKey][p.trip_id].deliveredCount++;
        totalArrivingDelivered++;
      } else {
        arrivingByDate[dateKey][p.trip_id].waitingCount++;
        totalArrivingWaiting++;
      }
    }

    // Flatten into date-grouped lists
    const departingGroups = Object.entries(departingByDate).map(([date, trips]) => ({
      date,
      trips: Object.values(trips),
    }));

    const arrivingGroups = Object.entries(arrivingByDate).map(([date, trips]) => ({
      date,
      trips: Object.values(trips),
    }));

    return NextResponse.json({
      station,
      summary: {
        totalDeparting: departing.length,
        totalArriving: arriving.length,
        arrivingWaitingForPickup: totalArrivingWaiting,
        arrivingDelivered: totalArrivingDelivered,
      },
      departingGroups,
      arrivingGroups,
    });
  } catch (error: any) {
    console.error("GET /api/manifest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
