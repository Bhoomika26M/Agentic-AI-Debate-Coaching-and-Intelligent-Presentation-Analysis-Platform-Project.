import { NextRequest, NextResponse } from "next/server";
import { getParcelByRef, initDb } from "@/lib/db";
import { PublicParcel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { ref: string } }
) {
  try {
    await initDb();
    const ref = params.ref;
    if (!ref) {
      return NextResponse.json(
        { error: "Reference number is required." },
        { status: 400 }
      );
    }

    const parcel = await getParcelByRef(ref);
    if (!parcel) {
      return NextResponse.json(
        { message: "No parcel found with this reference number.", parcel: null },
        { status: 404 }
      );
    }

    const publicParcel: PublicParcel = {
      ref: parcel.ref,
      origin: parcel.origin,
      dest: parcel.dest,
      trip_id: parcel.trip_id,
      trip_time: parcel.trip_time,
      trip_type: parcel.trip_type,
      bus_no: parcel.bus_no,
      size: parcel.size,
      weight: parcel.weight,
      sender_name: parcel.sender_name,
      receiver_name: parcel.receiver_name,
      price: parcel.price,
      status: parcel.status,
      booked_at: parcel.booked_at,
      timeline: parcel.timeline,
      pickup_type: parcel.pickup_type || "depot",
      delivery_type: parcel.delivery_type || "depot",
      pickup_locality: parcel.pickup_locality,
      pickup_locality_distance_km: parcel.pickup_locality_distance_km,
      delivery_locality: parcel.delivery_locality,
      delivery_locality_distance_km: parcel.delivery_locality_distance_km,
      pickup_fee: parcel.pickup_fee || 0,
      delivery_fee: parcel.delivery_fee || 0,
      scheduled_date: parcel.scheduled_date || "",
      estimated_arrival_date: parcel.estimated_arrival_date || "",
    };

    return NextResponse.json(publicParcel);
  } catch (error: any) {
    console.error("GET /api/parcels/[ref] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
