"use client";

import { Parcel, PublicParcel } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/timetables";
import { Bus, MapPin, ArrowRight, ShieldCheck, Scale, Ticket, Calendar, Clock, User, Home, Printer } from "lucide-react";

interface WaybillCardProps {
  parcel: Parcel | PublicParcel;
  otp?: string;
  showPrintButton?: boolean;
}

export default function WaybillCard({ parcel, otp, showPrintButton = true }: WaybillCardProps) {
  const isFullParcel = "sender_phone" in parcel;

  const hasDoorstepPickup = parcel.pickup_type === "doorstep";
  const hasDoorstepDelivery = parcel.delivery_type === "doorstep";

  let tierLabel = "DEPOT TO DEPOT (STANDARD)";
  if (hasDoorstepPickup && hasDoorstepDelivery) tierLabel = "FULL DOOR-TO-DOOR";
  else if (hasDoorstepPickup) tierLabel = "DOORSTEP PICKUP + DEPOT DROP";
  else if (hasDoorstepDelivery) tierLabel = "DEPOT PICKUP + DOORSTEP DELIVERY";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-ticket overflow-hidden font-sans relative">
      
      {/* Header Banner */}
      <div className="bg-ksrtc-green text-white px-5 py-4 border-b-2 border-ksrtc-amber flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Ticket className="w-5 h-5 text-amber-400" />
          <div>
            <span className="font-mono font-bold text-xs uppercase tracking-widest text-emerald-200 block">
              KSRTC PARCEL WAYBILL
            </span>
            <h2 className="text-xl font-mono font-extrabold text-amber-300 tracking-wider">
              {parcel.ref}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="block text-[10px] uppercase text-emerald-200 font-bold">
              BOOKING TIER
            </span>
            <span className="text-xs bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded">
              {tierLabel}
            </span>
          </div>

          {showPrintButton && (
            <button
              onClick={handlePrint}
              type="button"
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-mono font-bold text-xs px-3 py-1.5 rounded border border-emerald-600 flex items-center gap-1.5 transition-colors print:hidden shadow-sm"
              title="Print waybill ticket"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Print Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* SCHEDULED DATES BANNER */}
      <div className="bg-slate-950 text-white p-4 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
        <div className="flex items-center gap-2.5 bg-slate-900 p-2.5 rounded border border-slate-800">
          <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">SCHEDULED PICKUP DATE</span>
            <span className="font-bold text-emerald-300 text-sm">
              {parcel.scheduled_date ? formatDateDisplay(parcel.scheduled_date) : formatDate(parcel.booked_at)} at {parcel.trip_time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-900 p-2.5 rounded border border-slate-800">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">EXPECTED ARRIVAL DATE / TIME</span>
            <span className="font-bold text-amber-300 text-sm">
              {parcel.estimated_arrival_date || "Same Day"}
            </span>
          </div>
        </div>
      </div>

      {/* OTP Highlight Banner */}
      {otp && (
        <div className="bg-amber-500 text-slate-950 p-4 border-b-2 border-amber-600 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 text-amber-400 p-2 rounded text-xs font-mono font-bold">
              DELIVERY OTP
            </div>
            <div>
              <span className="font-mono text-2xl font-extrabold tracking-widest text-slate-950">
                {otp}
              </span>
              <p className="text-xs font-medium text-slate-900 leading-tight">
                Share this OTP with the receiver. Required at pickup/delivery handover.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-slate-900 text-amber-300 px-2 py-1 rounded">
            CONFIRMATION ONLY
          </span>
        </div>
      )}

      {/* Main Body */}
      <div className="p-6 space-y-6">

        {/* Route Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                ORIGIN DEPOT
              </span>
              <span className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {parcel.origin}
              </span>
              {hasDoorstepPickup && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono block mt-1">
                  📍 Pickup Locality: <strong>{parcel.pickup_locality}</strong> ({parcel.pickup_locality_distance_km} km)
                </span>
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-amber-600 font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 mb-1">
                KSRTC BUS
              </span>
              <ArrowRight className="w-6 h-6 text-slate-400" />
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                DESTINATION DEPOT
              </span>
              <span className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 justify-end">
                <MapPin className="w-4 h-4 text-amber-600" />
                {parcel.dest}
              </span>
              {hasDoorstepDelivery && (
                <span className="text-xs text-amber-700 dark:text-amber-400 font-mono block mt-1">
                  📍 Drop Locality: <strong>{parcel.delivery_locality}</strong> ({parcel.delivery_locality_distance_km} km)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bus Service Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono bg-white dark:bg-slate-900">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">SERVICE CLASS</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
              {parcel.trip_type}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">BUS REGISTRATION</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5 block">
              {parcel.bus_no}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">SCHEDULED TIME</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
              {parcel.trip_time}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">PARCEL WEIGHT & SIZE</span>
            <span className="font-bold text-amber-700 dark:text-amber-400 text-sm mt-0.5 block">
              {parcel.weight} kg ({parcel.size.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Ticket Perforation Divider */}
        <div className="ticket-perforation my-4" />

        {/* Sender & Receiver Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-800">
            <span className="font-mono font-bold text-[10px] text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              SENDER DETAILS
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {parcel.sender_name}
            </p>
            {isFullParcel && (parcel as Parcel).sender_phone && (
              <p className="font-mono text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                {(parcel as Parcel).sender_phone}
              </p>
            )}
          </div>

          <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
            <span className="font-mono font-bold text-[10px] text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1">
              RECEIVER DETAILS
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {parcel.receiver_name}
            </p>
            {isFullParcel && (parcel as Parcel).receiver_phone && (
              <p className="font-mono text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                {(parcel as Parcel).receiver_phone}
              </p>
            )}
          </div>
        </div>

        {/* Total Price & Fee Breakdown Tag */}
        <div className="bg-slate-900 text-white p-4 rounded-md font-mono space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">TOTAL FREIGHT CHARGE</span>
              <span className="text-xs text-amber-400">
                {hasDoorstepPickup || hasDoorstepDelivery
                  ? "Includes Bus Freight + Doorstep Add-ons"
                  : "Depot-to-Depot Bus Freight"}
              </span>
            </div>
            <span className="text-2xl font-bold text-emerald-400">
              ₹{parcel.price}.00
            </span>
          </div>

          {(hasDoorstepPickup || hasDoorstepDelivery) && (
            <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400 flex flex-wrap gap-4">
              <span>Base Freight: ₹{parcel.price - (parcel.pickup_fee || 0) - (parcel.delivery_fee || 0)}</span>
              {hasDoorstepPickup && <span className="text-amber-300">+ Doorstep Pickup Fee: ₹{parcel.pickup_fee}</span>}
              {hasDoorstepDelivery && <span className="text-amber-300">+ Doorstep Delivery Fee: ₹{parcel.delivery_fee}</span>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
