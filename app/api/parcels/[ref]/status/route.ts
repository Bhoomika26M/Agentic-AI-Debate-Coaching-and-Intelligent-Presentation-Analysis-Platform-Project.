import { NextRequest, NextResponse } from "next/server";
import { getParcelByRef, initDb, updateParcelStatus } from "@/lib/db";
import { getPipelineForParcel, ParcelStatus, TimelineEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
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
        { error: "No parcel found with this reference number." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { otp, note: customNote } = body;

    // Use parcel's dynamic pipeline!
    const pipeline = getPipelineForParcel(parcel);

    const currentIndex = pipeline.indexOf(parcel.status);
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: "Invalid current parcel status." },
        { status: 400 }
      );
    }

    if (currentIndex >= pipeline.length - 1) {
      return NextResponse.json(
        { error: "Parcel has already reached final status ('Delivered')." },
        { status: 400 }
      );
    }

    const nextStatus: ParcelStatus = pipeline[currentIndex + 1];

    // OTP validation if advancing to "Delivered"
    if (nextStatus === "Delivered") {
      if (!otp || String(otp).trim() !== String(parcel.otp).trim()) {
        return NextResponse.json(
          { error: "Invalid receiver OTP. Delivery requires the correct 4-digit code." },
          { status: 401 }
        );
      }
    }

    // Default note messages per dynamic status stage
    let defaultNote = customNote;
    if (!defaultNote) {
      switch (nextStatus) {
        case "Rider assigned for pickup":
          defaultNote = `Rider dispatched to collect parcel from sender at ${parcel.pickup_locality || parcel.origin}.`;
          break;
        case "Picked up from sender":
          defaultNote = `Parcel collected from sender by rider and en route to ${parcel.origin} depot.`;
          break;
        case "Accepted at origin depot":
          defaultNote = `Scanned & accepted into ${parcel.origin} depot cargo hold.`;
          break;
        case "Loaded on bus":
          defaultNote = `Loaded onto bus ${parcel.bus_no} (${parcel.trip_type}).`;
          break;
        case "In transit":
          defaultNote = `Bus ${parcel.bus_no} departed ${parcel.origin} en route to ${parcel.dest}.`;
          break;
        case "Arrived at destination depot":
          defaultNote = `Unloaded at ${parcel.dest} depot.`;
          break;
        case "Out for delivery":
          defaultNote = `Rider dispatched for doorstep delivery to ${parcel.delivery_locality || parcel.dest}.`;
          break;
        case "Delivered":
          defaultNote = `Handed over to receiver (${parcel.receiver_name}) with OTP verification.`;
          break;
        default:
          defaultNote = `Status updated to ${nextStatus}.`;
      }
    }

    const timelineEntry: TimelineEntry = {
      status: nextStatus,
      at: new Date().toISOString(),
      note: defaultNote,
    };

    const updated = await updateParcelStatus(ref, nextStatus, timelineEntry);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update parcel status." },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/parcels/[ref]/status error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
