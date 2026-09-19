import { NextRequest, NextResponse } from "next/server";
import { createParcel, initDb } from "@/lib/db";
import { generateOtp, generateRef } from "@/lib/utils";
import { calculateFareDetails } from "@/lib/fare";
import { KERALA_STATIONS, getLocalitiesForStation, formatDateDisplay } from "@/lib/timetables";
import { Parcel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();

    const {
      origin,
      dest,
      tripId,
      tripTime,
      tripType,
      busNo,
      size,
      weight,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      scheduledDate,
      pickupType = "depot",
      deliveryType = "depot",
      pickupLocality,
      deliveryLocality,
    } = body;

    // Server-side validations
    if (!origin || !dest || origin === dest) {
      return NextResponse.json(
        { error: "Origin and Destination must be valid and distinct stations." },
        { status: 400 }
      );
    }

    if (!KERALA_STATIONS.includes(origin) || !KERALA_STATIONS.includes(dest)) {
      return NextResponse.json(
        { error: "Selected station is not recognized in the KSRTC network." },
        { status: 400 }
      );
    }

    const parsedWeight = Number(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100) {
      return NextResponse.json(
        { error: "Parcel weight must be between 0.1 kg and 100 kg." },
        { status: 400 }
      );
    }

    if (!["small", "medium", "large"].includes(size)) {
      return NextResponse.json(
        { error: "Size must be small, medium, or large." },
        { status: 400 }
      );
    }

    if (!senderName || !receiverName) {
      return NextResponse.json(
        { error: "Sender and receiver names are required." },
        { status: 400 }
      );
    }

    // Validate scheduled date
    const cleanScheduledDate = scheduledDate || new Date().toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    if (cleanScheduledDate < todayStr) {
      return NextResponse.json(
        { error: "Scheduled date cannot be in the past." },
        { status: 400 }
      );
    }

    // Doorstep locality lookup
    let pickupDist: number | undefined;
    if (pickupType === "doorstep") {
      if (!pickupLocality) {
        return NextResponse.json(
          { error: "Please select a pickup locality for doorstep pickup." },
          { status: 400 }
        );
      }
      const locs = getLocalitiesForStation(origin);
      const matched = locs.find((l) => l.name === pickupLocality);
      pickupDist = matched ? matched.distanceKm : 2.5;
    }

    let deliveryDist: number | undefined;
    if (deliveryType === "doorstep") {
      if (!deliveryLocality) {
        return NextResponse.json(
          { error: "Please select a delivery locality for doorstep delivery." },
          { status: 400 }
        );
      }
      const locs = getLocalitiesForStation(dest);
      const matched = locs.find((l) => l.name === deliveryLocality);
      deliveryDist = matched ? matched.distanceKm : 3.0;
    }

    const ref = generateRef();
    const otp = generateOtp();

    const fareDetails = calculateFareDetails(
      parsedWeight,
      size,
      tripType || "Super Fast",
      pickupType,
      deliveryType
    );

    const now = new Date().toISOString();

    // Compute estimated arrival date
    const baseDate = new Date(cleanScheduledDate);
    baseDate.setDate(baseDate.getDate() + (origin === dest ? 0 : 1));
    const estimatedArrivalDateStr = `${formatDateDisplay(baseDate.toISOString().split("T")[0])} around 06:00 PM`;

    const initialNote = pickupType === "doorstep"
      ? `Waybill created. Rider assigned for doorstep pickup at ${pickupLocality} (${pickupDist} km from ${origin} depot).`
      : `Waybill created at ${origin} depot for destination ${dest}.`;

    const parcel: Parcel = {
      ref,
      origin,
      dest,
      trip_id: tripId || `TRIP-${origin.substring(0, 3)}-${dest.substring(0, 3)}-${cleanScheduledDate}`,
      trip_time: tripTime || "08:00 AM",
      trip_type: tripType || "Super Fast",
      bus_no: busNo || "KL-15 X 1420",
      size,
      weight: parsedWeight,
      sender_name: senderName,
      sender_phone: senderPhone || "",
      receiver_name: receiverName,
      receiver_phone: receiverPhone || "",
      price: fareDetails.totalFare,
      otp,
      status: "Booked",
      booked_at: now,
      timeline: [
        {
          status: "Booked",
          at: now,
          note: initialNote,
        },
      ],
      pickup_type: pickupType,
      delivery_type: deliveryType,
      pickup_locality: pickupLocality,
      pickup_locality_distance_km: pickupDist,
      delivery_locality: deliveryLocality,
      delivery_locality_distance_km: deliveryDist,
      pickup_fee: fareDetails.pickupFee,
      delivery_fee: fareDetails.deliveryFee,
      scheduled_date: cleanScheduledDate,
      estimated_arrival_date: estimatedArrivalDateStr,
    };

    const created = await createParcel(parcel);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/parcels error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
