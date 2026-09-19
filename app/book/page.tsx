"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KERALA_STATIONS, getLocalitiesForStation, formatDateDisplay } from "@/lib/timetables";
import { BusTrip, LocalityOption, Parcel } from "@/lib/types";
import { calculateFareDetails } from "@/lib/fare";
import WaybillCard from "@/components/WaybillCard";
import MultiLegRoute from "@/components/MultiLegRoute";
import {
  Package,
  Bus,
  ArrowRight,
  User,
  Scale,
  AlertCircle,
  CheckCircle2,
  Ticket,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  Home,
  Bike,
  Clock,
} from "lucide-react";

export default function BookPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  const [origin, setOrigin] = useState("Thiruvananthapuram Central");
  const [dest, setDest] = useState("Ernakulam / Kochi");
  const [scheduledDate, setScheduledDate] = useState(todayStr);

  // Booking Tiers: 'depot_to_depot' | 'doorstep_pickup' | 'full_door_to_door'
  const [bookingTier, setBookingTier] = useState<"depot_to_depot" | "doorstep_pickup" | "full_door_to_door">("depot_to_depot");

  // Locality selections for doorstep
  const [originLocalities, setOriginLocalities] = useState<LocalityOption[]>([]);
  const [destLocalities, setDestLocalities] = useState<LocalityOption[]>([]);
  const [selectedPickupLocality, setSelectedPickupLocality] = useState<LocalityOption | null>(null);
  const [selectedDeliveryLocality, setSelectedDeliveryLocality] = useState<LocalityOption | null>(null);

  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [weight, setWeight] = useState<number>(5);

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [availableTrips, setAvailableTrips] = useState<BusTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdParcel, setCreatedParcel] = useState<Parcel | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Update locality lists whenever origin or dest changes
  useEffect(() => {
    const oLocs = getLocalitiesForStation(origin);
    setOriginLocalities(oLocs);
    if (oLocs.length > 0) setSelectedPickupLocality(oLocs[0]);

    const dLocs = getLocalitiesForStation(dest);
    setDestLocalities(dLocs);
    if (dLocs.length > 0) setSelectedDeliveryLocality(dLocs[0]);
  }, [origin, dest]);

  // Fetch available trips for route and date
  useEffect(() => {
    if (!origin || !dest || origin === dest) {
      setAvailableTrips([]);
      setSelectedTrip(null);
      return;
    }

    async function fetchTrips() {
      try {
        setLoadingTrips(true);
        setErrorMsg("");
        const res = await fetch(
          `/api/trips?origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(dest)}&date=${scheduledDate}`
        );
        const data = await res.json();
        if (res.ok && data.trips) {
          setAvailableTrips(data.trips);
          const validTrip = data.trips.find(
            (t: BusTrip) => (t.remainingCapacityKg ?? t.capacityKg) >= weight
          );
          setSelectedTrip(validTrip || data.trips[0] || null);
        } else {
          setAvailableTrips([]);
        }
      } catch (err) {
        console.error("Failed to fetch trips:", err);
      } finally {
        setLoadingTrips(false);
      }
    }

    fetchTrips();
  }, [origin, dest, scheduledDate]);

  // Derived Doorstep Types
  const pickupType: "depot" | "doorstep" = bookingTier !== "depot_to_depot" ? "doorstep" : "depot";
  const deliveryType: "depot" | "doorstep" = bookingTier === "full_door_to_door" ? "doorstep" : "depot";

  // Calculated Fare Details
  const fareDetails = calculateFareDetails(
    weight,
    size,
    selectedTrip?.serviceClass || "Super Fast",
    pickupType,
    deliveryType
  );

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!origin || !dest || origin === dest) {
      setErrorMsg("Please select distinct origin and destination stations.");
      return;
    }

    if (!selectedTrip) {
      setErrorMsg("Please select an available bus service.");
      return;
    }

    const remCap = selectedTrip.remainingCapacityKg ?? selectedTrip.capacityKg;
    if (weight > remCap) {
      setErrorMsg(
        `Selected bus service has only ${remCap} kg cargo capacity remaining on ${scheduledDate}.`
      );
      return;
    }

    if (!senderName.trim() || !receiverName.trim()) {
      setErrorMsg("Sender name and receiver name are required.");
      return;
    }

    if (pickupType === "doorstep" && !selectedPickupLocality) {
      setErrorMsg("Please select a doorstep pickup locality near the origin depot.");
      return;
    }

    if (deliveryType === "doorstep" && !selectedDeliveryLocality) {
      setErrorMsg("Please select a doorstep delivery locality near the destination depot.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          dest,
          tripId: selectedTrip.id,
          tripTime: selectedTrip.departureTime,
          tripType: selectedTrip.serviceClass,
          busNo: selectedTrip.busNo,
          size,
          weight,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          scheduledDate,
          pickupType,
          deliveryType,
          pickupLocality: selectedPickupLocality?.name,
          deliveryLocality: selectedDeliveryLocality?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed.");
      }

      setCreatedParcel(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (createdParcel?.ref) {
      navigator.clipboard.writeText(createdParcel.ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 3000);
    }
  };

  const handleReset = () => {
    setCreatedParcel(null);
    setSenderName("");
    setSenderPhone("");
    setReceiverName("");
    setReceiverPhone("");
    setErrorMsg("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Title Header */}
      <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block">
            KSRTC LOGISTICS TICKET DESK
          </span>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-amber-500" />
            Book a Bus Parcel
          </h1>
        </div>
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div className="bg-ksrtc-rust-bg dark:bg-ksrtc-rust-bgDark border-2 border-ksrtc-rust text-ksrtc-rust-dark dark:text-red-300 p-4 rounded-md text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-ksrtc-rust flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CONFIRMATION SCREEN */}
      {createdParcel ? (
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 p-6 rounded-lg text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="font-mono font-extrabold text-2xl text-emerald-950 dark:text-emerald-200">
              Parcel Waybill Created Successfully!
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-lg mx-auto">
              Your parcel is registered in the state bus network. Below is your official waybill ticket and receiver delivery code.
            </p>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-lg border-2 border-amber-500 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                WAYBILL REFERENCE NUMBER
              </span>
              <span className="font-mono text-3xl font-black text-white tracking-wider">
                {createdParcel.ref}
              </span>
              <p className="text-xs text-slate-300 mt-1">
                Share this reference number with the receiver for public tracking.
              </p>
            </div>

            <button
              onClick={handleCopyRef}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold px-4 py-2.5 rounded text-xs flex items-center gap-2 transition-colors shadow"
            >
              {copiedRef ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Reference</span>
                </>
              )}
            </button>
          </div>

          <WaybillCard parcel={createdParcel} otp={createdParcel.otp} />

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              href={`/track/${createdParcel.ref}`}
              className="w-full sm:w-auto flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold py-3 px-6 rounded text-sm text-center flex items-center justify-center gap-2 transition-colors shadow"
            >
              <span>Track This Parcel Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleReset}
              className="w-full sm:w-auto bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono font-semibold py-3 px-6 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Book Another Parcel</span>
            </button>
          </div>
        </div>
      ) : (
        /* BOOKING FORM */
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: ROUTE & SCHEDULED DATE SELECTION */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Bus className="w-4 h-4 text-emerald-600" />
              1. Route & Scheduled Date
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ORIGIN DEPOT (PICKUP)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-sm font-sans font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {KERALA_STATIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  DESTINATION DEPOT (DROP)
                </label>
                <select
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-sm font-sans font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {KERALA_STATIONS.map((st) => (
                    <option key={st} value={st} disabled={st === origin}>
                      {st} {st === origin ? "(Current Origin)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  SCHEDULED DATE *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: 3 BOOKING TIERS (DEPOT VS DOORSTEP) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-600" />
                2. Choose Delivery Tier & Localities
              </h3>
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-bold">
                Doorstep radius capped at 5 km from depot
              </span>
            </div>

            {/* 3 Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Tier 1: Depot to Depot */}
              <div
                onClick={() => setBookingTier("depot_to_depot")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  bookingTier === "depot_to_depot"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase block">
                    DEFAULT (CHEAPEST)
                  </span>
                  <h4 className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                    Depot to Depot
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Sender brings parcel to {origin} depot; receiver collects from {dest} depot.
                  </p>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  Standard Bus Freight
                </div>
              </div>

              {/* Tier 2: Doorstep Pickup */}
              <div
                onClick={() => setBookingTier("doorstep_pickup")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  bookingTier === "doorstep_pickup"
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-400 uppercase block">
                    MEDIUM CONVENIENCE
                  </span>
                  <h4 className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-amber-600" />
                    Doorstep Pickup Only
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Rider collects from sender's doorstep landmark; receiver collects at destination depot.
                  </p>
                </div>
                <div className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 pt-2 border-t border-amber-200 dark:border-amber-800">
                  + ₹40 Pickup Fee Add-on
                </div>
              </div>

              {/* Tier 3: Full Door to Door */}
              <div
                onClick={() => setBookingTier("full_door_to_door")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  bookingTier === "full_door_to_door"
                    ? "bg-amber-500 text-slate-950 border-amber-600 shadow-md font-bold"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono uppercase block opacity-80">
                    MAXIMUM CONVENIENCE
                  </span>
                  <h4 className="font-mono font-bold text-sm mt-0.5 flex items-center gap-1.5">
                    <Home className="w-4 h-4" />
                    Full Door-to-Door
                  </h4>
                  <p className="text-xs opacity-90 mt-1">
                    Rider pickup from sender AND rider delivery to receiver's doorstep.
                  </p>
                </div>
                <div className="font-mono text-xs pt-2 border-t border-black/20 font-black">
                  + ₹80 (+₹40 Pickup & +₹40 Drop)
                </div>
              </div>

            </div>

            {/* LOCALITY DROPDOWNS (Conditioned on doorstep tier) */}
            {(pickupType === "doorstep" || deliveryType === "doorstep") && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 pt-4">
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  SELECT LOCALITY LANDMARKS (WITHIN 5 KM RADIUS)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pickupType === "doorstep" && (
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                        SENDER PICKUP LOCALITY ({origin} DEPOT)
                      </label>
                      <select
                        value={selectedPickupLocality?.name || ""}
                        onChange={(e) => {
                          const matched = originLocalities.find((l) => l.name === e.target.value);
                          if (matched) setSelectedPickupLocality(matched);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm font-sans font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {originLocalities.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name} — {loc.distanceKm} km from depot
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {deliveryType === "doorstep" && (
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                        RECEIVER DROP LOCALITY ({dest} DEPOT)
                      </label>
                      <select
                        value={selectedDeliveryLocality?.name || ""}
                        onChange={(e) => {
                          const matched = destLocalities.find((l) => l.name === e.target.value);
                          if (matched) setSelectedDeliveryLocality(matched);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm font-sans font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {destLocalities.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name} — {loc.distanceKm} km from depot
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MULTI-LEG ROUTE JOURNEY PREVIEW */}
            <MultiLegRoute
              origin={origin}
              dest={dest}
              pickupType={pickupType}
              deliveryType={deliveryType}
              pickupLocality={selectedPickupLocality?.name}
              pickupLocalityDistanceKm={selectedPickupLocality?.distanceKm}
              deliveryLocality={selectedDeliveryLocality?.name}
              deliveryLocalityDistanceKm={selectedDeliveryLocality?.distanceKm}
              busServiceClass={selectedTrip?.serviceClass || "Super Fast"}
              busNo={selectedTrip?.busNo}
              estimatedBusDurationHours={selectedTrip?.estimatedDurationHours || 3.5}
            />

          </div>

          {/* STEP 3: PARCEL SPECS & WEIGHT */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Scale className="w-4 h-4 text-amber-600" />
              3. Parcel Specs & Weight
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-2">
                  PARCEL SIZE CATEGORY
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSize(sz)}
                      className={`py-2 px-3 rounded text-xs font-mono font-bold capitalize border transition-all ${
                        size === sz
                          ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  WEIGHT (KG): <span className="text-amber-600 font-bold">{weight} kg</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>0.5 kg</span>
                  <span>25 kg</span>
                  <span>50 kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: AVAILABLE BUS TRIPS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                <Bus className="w-4 h-4 text-emerald-600" />
                4. Available KSRTC Bus Services ({formatDateDisplay(scheduledDate)})
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {loadingTrips ? "Loading..." : `${availableTrips.length} trips found`}
              </span>
            </div>

            {loadingTrips ? (
              <div className="py-8 text-center font-mono text-xs text-slate-500">
                Fetching bus timetables for {formatDateDisplay(scheduledDate)}...
              </div>
            ) : availableTrips.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic">
                No trips scheduled for this route on {formatDateDisplay(scheduledDate)}.
              </p>
            ) : (
              <div className="space-y-3">
                {availableTrips.map((trip) => {
                  const remaining = trip.remainingCapacityKg ?? trip.capacityKg;
                  const hasCapacity = remaining >= weight;
                  const isSelected = selectedTrip?.id === trip.id;

                  return (
                    <div
                      key={trip.id}
                      onClick={() => hasCapacity && setSelectedTrip(trip)}
                      className={`p-4 rounded-md border-2 transition-all cursor-pointer flex flex-wrap items-center justify-between gap-4 ${
                        !hasCapacity
                          ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                          : isSelected
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-slate-400"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                              {trip.departureTime} Departure
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                              {trip.serviceClass}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-500 block mt-0.5">
                            Bus: {trip.busNo} • {trip.estimatedArrivalDate}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`text-xs font-bold block ${
                            hasCapacity
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-ksrtc-rust"
                          }`}
                        >
                          {remaining} kg capacity remaining
                        </span>
                        {!hasCapacity && (
                          <span className="text-[10px] text-ksrtc-rust block">
                            (Insufficient space)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 5: CONTACT DETAILS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-4 h-4 text-emerald-600" />
              5. Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Sender Details */}
              <div className="space-y-3 p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="font-mono font-bold text-xs text-emerald-900 dark:text-emerald-300 uppercase block">
                  SENDER INFO (DISPATCHER)
                </span>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                    SENDER NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anu Nair"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                    SENDER PHONE (OPTIONAL)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98470 12345"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Receiver Details */}
              <div className="space-y-3 p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                <span className="font-mono font-bold text-xs text-amber-900 dark:text-amber-300 uppercase block">
                  RECEIVER INFO (PICKUP PERSON)
                </span>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                    RECEIVER NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">
                    RECEIVER PHONE (OPTIONAL)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 94471 67890"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* STEP 6: PRICE BREAKDOWN & CONFIRM */}
          <div className="bg-slate-900 text-white p-6 rounded-lg border-2 border-ksrtc-amber shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 font-mono">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                TOTAL FARE BREAKDOWN ({formatDateDisplay(scheduledDate)})
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">
                  ₹{fareDetails.totalFare}.00
                </span>
                <span className="text-xs text-slate-400">
                  (Base: ₹{fareDetails.baseFreightFare}
                  {fareDetails.pickupFee ? ` + ₹${fareDetails.pickupFee} pickup` : ""}
                  {fareDetails.deliveryFee ? ` + ₹${fareDetails.deliveryFee} delivery` : ""})
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedTrip}
              className="w-full sm:w-auto bg-ksrtc-amber hover:bg-amber-400 text-slate-950 font-mono font-bold text-base px-8 py-3.5 rounded shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span>{submitting ? "Booking Ticket..." : "Confirm Booking & Get Reference Number"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
