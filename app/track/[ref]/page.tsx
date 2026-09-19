"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicParcel, getPipelineForParcel } from "@/lib/types";
import { formatDateDisplay } from "@/lib/timetables";
import StatusStepper from "@/components/StatusStepper";
import TimelineLog from "@/components/TimelineLog";
import WaybillCard from "@/components/WaybillCard";
import MultiLegRoute from "@/components/MultiLegRoute";
import {
  Search,
  RefreshCw,
  PackageX,
  ArrowLeft,
  Clock,
  Calendar,
  Ticket,
  Share2,
  Check,
} from "lucide-react";

export default function TrackRefPage({ params }: { params: { ref: string } }) {
  const refParam = params.ref ? params.ref.toUpperCase() : "";
  const [parcel, setParcel] = useState<PublicParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchParcel = async () => {
    if (!refParam) return;
    try {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`/api/parcels/${refParam}`);
      if (res.status === 404) {
        setNotFound(true);
        setParcel(null);
      } else if (res.ok) {
        const data = await res.json();
        setParcel(data);
        setLastRefreshed(new Date().toLocaleTimeString());
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcel();
  }, [refParam]);

  const handleShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const dynamicPipeline = parcel ? getPipelineForParcel(parcel) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search</span>
        </Link>

        {parcel && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLink}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Copy public tracking link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Tracking Link</span>
                </>
              )}
            </button>

            <button
              onClick={fetchParcel}
              disabled={loading}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Refresh latest status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* LOADING STATE */}
      {loading && !parcel && (
        <div className="py-16 text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying central state bus cargo database for {refParam}...</p>
        </div>
      )}

      {/* NOT FOUND STATE */}
      {notFound && !loading && (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 p-8 rounded-lg shadow-ticket text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <PackageX className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
              No Parcel Found
            </h2>
            <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto mt-1">
              No parcel matching reference number <span className="font-mono font-bold text-amber-600">{refParam}</span> was found in the network.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/track"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold px-4 py-2 rounded text-xs transition-colors"
            >
              Try Another Ref
            </Link>
            <Link
              href="/book"
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold px-4 py-2 rounded text-xs transition-colors"
            >
              Book New Parcel
            </Link>
          </div>
        </div>
      )}

      {/* SUCCESS PARCEL TRACKING VIEW */}
      {parcel && (
        <div className="space-y-8">
          
          {/* Header Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-ticket space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                    {parcel.ref}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                      parcel.status === "Delivered"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-400"
                    }`}
                  >
                    {parcel.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-1">
                  Route: <strong className="text-slate-900 dark:text-slate-100">{parcel.origin}</strong> to <strong className="text-slate-900 dark:text-slate-100">{parcel.dest}</strong>
                </p>
              </div>

              <button
                onClick={fetchParcel}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold px-3.5 py-2 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* SCHEDULED DATES TOP BAR */}
            <div className="bg-slate-950 text-white p-4 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">SCHEDULED PICKUP DATE</span>
                  <span className="font-bold text-emerald-300">
                    {parcel.scheduled_date ? formatDateDisplay(parcel.scheduled_date) : "On Schedule"} at {parcel.trip_time}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">EXPECTED ARRIVAL DATE / TIME</span>
                  <span className="font-bold text-amber-300">
                    {parcel.estimated_arrival_date || "Same Day"}
                  </span>
                </div>
              </div>
            </div>

            {/* MULTI-LEG ROUTE DISPLAY */}
            <MultiLegRoute
              origin={parcel.origin}
              dest={parcel.dest}
              pickupType={parcel.pickup_type}
              deliveryType={parcel.delivery_type}
              pickupLocality={parcel.pickup_locality}
              pickupLocalityDistanceKm={parcel.pickup_locality_distance_km}
              deliveryLocality={parcel.delivery_locality}
              deliveryLocalityDistanceKm={parcel.delivery_locality_distance_km}
              busServiceClass={parcel.trip_type}
              busNo={parcel.bus_no}
            />
          </div>

          {/* Dynamic Stepper */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-ticket">
            <h3 className="font-mono font-bold text-xs uppercase text-slate-500 tracking-wider mb-2">
              DYNAMIC HANDOVER PIPELINE STATUS
            </h3>
            <StatusStepper currentStatus={parcel.status} statuses={dynamicPipeline} />
          </div>

          {/* Grid: Waybill Specs & Timestamped Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-mono font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-600" />
                OFFICIAL WAYBILL TICKET
              </h3>
              <WaybillCard parcel={parcel} showPrintButton={true} />
            </div>

            <div className="space-y-4">
              <h3 className="font-mono font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                HANDOVER SCAN LOG (CHRONOLOGICAL)
              </h3>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-ticket">
                <TimelineLog timeline={parcel.timeline} />
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
