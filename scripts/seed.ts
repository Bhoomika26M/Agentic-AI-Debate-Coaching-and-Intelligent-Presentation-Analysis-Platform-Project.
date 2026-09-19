import { seedDatabase } from "../lib/db";
import { Parcel } from "../lib/types";

const todayStr = new Date().toISOString().split("T")[0];

const DEMO_PARCELS: Parcel[] = [
  {
    ref: "KSRTC-7A8B9C",
    origin: "Thiruvananthapuram Central",
    dest: "Ernakulam / Kochi",
    trip_id: `TRIP-TVM-EKM-0530-${todayStr.replace(/-/g, "")}`,
    trip_time: "05:30 AM",
    trip_type: "Super Fast",
    bus_no: "KL-15 X 1420",
    size: "medium",
    weight: 8.5,
    sender_name: "Anu Nair",
    sender_phone: "+91 98470 12345",
    receiver_name: "Suresh Kumar",
    receiver_phone: "+91 94471 67890",
    price: 225,
    otp: "4829",
    status: "In transit",
    booked_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    timeline: [
      {
        status: "Booked",
        at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        note: "Waybill created. Rider assigned for doorstep pickup at Statue Junction (1.2 km).",
      },
      {
        status: "Rider assigned for pickup",
        at: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
        note: "Rider dispatched to collect parcel from sender at Statue Junction.",
      },
      {
        status: "Picked up from sender",
        at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        note: "Parcel collected from sender by rider and brought to TVM Central depot.",
      },
      {
        status: "Accepted at origin depot",
        at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
        note: "Scanned & accepted into TVM Central cargo hold.",
      },
      {
        status: "Loaded on bus",
        at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        note: "Loaded onto bus KL-15 X 1420 (Super Fast).",
      },
      {
        status: "In transit",
        at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        note: "Bus KL-15 X 1420 departed TVM en route to Ernakulam / Kochi.",
      },
    ],
    pickup_type: "doorstep",
    delivery_type: "depot",
    pickup_locality: "Statue Junction",
    pickup_locality_distance_km: 1.2,
    pickup_fee: 40,
    delivery_fee: 0,
    scheduled_date: todayStr,
    estimated_arrival_date: `${todayStr} around 10:00 AM`,
  },
  {
    ref: "KSRTC-3X4Y5Z",
    origin: "Kozhikode",
    dest: "Kannur",
    trip_id: `TRIP-CLT-KNR-1000-${todayStr.replace(/-/g, "")}`,
    trip_time: "10:00 AM",
    trip_type: "Super Fast",
    bus_no: "KL-11 BD 9002",
    size: "small",
    weight: 3.0,
    sender_name: "Fahad Rahman",
    sender_phone: "+91 98950 54321",
    receiver_name: "Asha Menon",
    receiver_phone: "+91 97440 98765",
    price: 190,
    otp: "1923",
    status: "Arrived at destination depot",
    booked_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    timeline: [
      {
        status: "Booked",
        at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        note: "Waybill created at Kozhikode depot.",
      },
      {
        status: "Accepted at origin depot",
        at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
        note: "Scanned & accepted at Kozhikode depot.",
      },
      {
        status: "Loaded on bus",
        at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        note: "Loaded onto bus KL-11 BD 9002.",
      },
      {
        status: "In transit",
        at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        note: "Bus departed Kozhikode en route to Kannur.",
      },
      {
        status: "Arrived at destination depot",
        at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        note: "Unloaded at Kannur depot. Out for delivery rider dispatch to Caltex Junction.",
      },
    ],
    pickup_type: "depot",
    delivery_type: "doorstep",
    delivery_locality: "Caltex Junction",
    delivery_locality_distance_km: 1.2,
    pickup_fee: 0,
    delivery_fee: 40,
    scheduled_date: todayStr,
    estimated_arrival_date: `${todayStr} around 12:30 PM`,
  },
  {
    ref: "KSRTC-9K8J7H",
    origin: "Kollam",
    dest: "Ernakulam / Kochi",
    trip_id: `TRIP-QLN-EKM-0615-${todayStr.replace(/-/g, "")}`,
    trip_time: "06:15 AM",
    trip_type: "Super Express",
    bus_no: "KL-02 AQ 4421",
    size: "large",
    weight: 15.0,
    sender_name: "Rahul Varma",
    sender_phone: "+91 94460 11223",
    receiver_name: "Meera Pillai",
    receiver_phone: "+91 98461 44556",
    price: 320,
    otp: "8821",
    status: "Booked",
    booked_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    timeline: [
      {
        status: "Booked",
        at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        note: "Waybill created at Kollam depot.",
      },
    ],
    pickup_type: "depot",
    delivery_type: "depot",
    pickup_fee: 0,
    delivery_fee: 0,
    scheduled_date: todayStr,
    estimated_arrival_date: `${todayStr} around 09:30 AM`,
  },
];

async function main() {
  console.log("Seeding database with demo parcels...");
  await seedDatabase(DEMO_PARCELS);
  console.log("Database successfully seeded!");
  console.log("Demo Reference Numbers:");
  DEMO_PARCELS.forEach((p) => {
    console.log(`- ${p.ref} (${p.origin} -> ${p.dest}) [Status: ${p.status}] [OTP: ${p.otp}]`);
  });
}

main().catch(console.error);
