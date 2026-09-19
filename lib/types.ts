export type ParcelStatus =
  | "Booked"
  | "Rider assigned for pickup"
  | "Picked up from sender"
  | "Accepted at origin depot"
  | "Loaded on bus"
  | "In transit"
  | "Arrived at destination depot"
  | "Out for delivery"
  | "Delivered";

export const DEFAULT_PARCEL_STATUSES: ParcelStatus[] = [
  "Booked",
  "Accepted at origin depot",
  "Loaded on bus",
  "In transit",
  "Arrived at destination depot",
  "Delivered",
];

export function getPipelineForParcel(parcel: {
  pickup_type?: "depot" | "doorstep";
  delivery_type?: "depot" | "doorstep";
}): ParcelStatus[] {
  const pipeline: ParcelStatus[] = ["Booked"];

  if (parcel?.pickup_type === "doorstep") {
    pipeline.push("Rider assigned for pickup");
    pipeline.push("Picked up from sender");
  }

  pipeline.push("Accepted at origin depot");
  pipeline.push("Loaded on bus");
  pipeline.push("In transit");
  pipeline.push("Arrived at destination depot");

  if (parcel?.delivery_type === "doorstep") {
    pipeline.push("Out for delivery");
  }

  pipeline.push("Delivered");
  return pipeline;
}

export interface TimelineEntry {
  status: ParcelStatus;
  at: string;
  note: string;
}

export interface Parcel {
  ref: string;
  origin: string;
  dest: string;
  trip_id: string;
  trip_time: string;
  trip_type: string;
  bus_no: string;
  size: "small" | "medium" | "large";
  weight: number;
  sender_name: string;
  sender_phone?: string;
  receiver_name: string;
  receiver_phone?: string;
  price: number;
  otp?: string;
  status: ParcelStatus;
  booked_at: string;
  timeline: TimelineEntry[];

  // Doorstep & Date extension fields
  pickup_type: "depot" | "doorstep";
  delivery_type: "depot" | "doorstep";
  pickup_locality?: string;
  pickup_locality_distance_km?: number;
  delivery_locality?: string;
  delivery_locality_distance_km?: number;
  pickup_fee: number;
  delivery_fee: number;
  scheduled_date: string; // YYYY-MM-DD
  estimated_arrival_date: string; // YYYY-MM-DD or formatted string
}

export interface PublicParcel {
  ref: string;
  origin: string;
  dest: string;
  trip_id: string;
  trip_time: string;
  trip_type: string;
  bus_no: string;
  size: "small" | "medium" | "large";
  weight: number;
  sender_name: string;
  receiver_name: string;
  price: number;
  status: ParcelStatus;
  booked_at: string;
  timeline: TimelineEntry[];

  // Doorstep & Date extension fields
  pickup_type: "depot" | "doorstep";
  delivery_type: "depot" | "doorstep";
  pickup_locality?: string;
  pickup_locality_distance_km?: number;
  delivery_locality?: string;
  delivery_locality_distance_km?: number;
  pickup_fee: number;
  delivery_fee: number;
  scheduled_date: string;
  estimated_arrival_date: string;
}

export interface BusTrip {
  id: string;
  origin: string;
  dest: string;
  departureTime: string;
  arrivalTime: string;
  serviceClass: string;
  busNo: string;
  capacityKg: number;
  remainingCapacityKg?: number;
  estimatedDurationHours?: number;
  estimatedArrivalDate?: string;
}

export interface LocalityOption {
  name: string;
  distanceKm: number;
}
