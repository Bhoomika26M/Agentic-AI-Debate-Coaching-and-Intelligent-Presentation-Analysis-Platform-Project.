"use client";

import { useState, useEffect } from "react";
import { KERALA_STATIONS, formatDateDisplay } from "@/lib/timetables";
import { Parcel, ParcelStatus, getPipelineForParcel } from "@/lib/types";
import StatusStepper from "@/components/StatusStepper";
import TimelineLog from "@/components/TimelineLog";
import MultiLegRoute from "@/components/MultiLegRoute";
import {
  ShieldAlert,
  Search,
  Scan,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Bus,
  MapPin,
  Lock,
  Key,
  Layers,
  RefreshCw,
  Calendar,
  Clock,
  Home,
  Bike,
} from "lucide-react";

export default function StaffDeskPage() {
  const [activeTab, setActiveTab] = useState<"scan" | "manifest">("scan");

  // Tab 1: Scan & Status Update State
  const [scanRef, setScanRef] = useState("");
  const [searchedRef, setSearchedRef] = useState("");
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanError, setScanError] = useState("");
  const [advanceSuccess, setAdvanceSuccess] = useState("");

  // OTP Modal for Delivery
  const [otpInput, setOtpInput] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Tab 2: Station Manifest State
  const [selectedStation, setSelectedStation] = useState("Ernakulam / Kochi");
  const [manifestData, setManifestData] = useState<any>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const handleLookupParcel = async (refToFetch?: string) => {
    const targetRef = refToFetch || scanRef.trim().toUpperCase();
    if (!targetRef) return;

    try {
      setLoadingScan(true);
      setScanError("");
      setAdvanceSuccess("");
      const res = await fetch(`/api/parcels/${targetRef}`);
      if (res.status === 404) {
        setScanError(`No parcel found matching reference number ${targetRef}.`);
        setParcel(null);
      } else if (res.ok) {
        const data = await res.json();
        setParcel(data);
        setSearchedRef(targetRef);
      } else {
        setScanError("Error looking up parcel.");
      }
    } catch (err) {
      console.error(err);
      setScanError("Failed to connect to database server.");
    } finally {
      setLoadingScan(false);
    }
  };

  const dynamicPipeline = parcel ? getPipelineForParcel(parcel) : [];
  const currentIndex = parcel ? dynamicPipeline.indexOf(parcel.status) : -1;
  const nextStatus = currentIndex >= 0 && currentIndex < dynamicPipeline.length - 1
    ? dynamicPipeline[currentIndex + 1]
    : null;

  const handleAdvanceStatusClick = () => {
    if (!parcel || !nextStatus) return;

    if (nextStatus === "Delivered") {
      setOtpInput("");
      setShowOtpModal(true);
    } else {
      executeAdvanceStatus();
    }
  };

  const executeAdvanceStatus = async (otpValue?: string) => {
    if (!parcel) return;

    try {
      setAdvancing(true);
      setScanError("");
      setAdvanceSuccess("");

      const res = await fetch(`/api/parcels/${parcel.ref}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update parcel status.");
      }

      setParcel(data);
      setAdvanceSuccess(`Successfully advanced status to "${data.status}"!`);
      setShowOtpModal(false);
      if (activeTab === "manifest") {
        fetchManifest(selectedStation);
      }
    } catch (err: any) {
      setScanError(err.message || "Status update failed.");
    } finally {
      setAdvancing(false);
    }
  };

  const fetchManifest = async (station: string) => {
    try {
      setLoadingManifest(true);
      const res = await fetch(`/api/manifest?station=${encodeURIComponent(station)}`);
      if (res.ok) {
        const data = await res.json();
        setManifestData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingManifest(false);
    }
  };

  const handleInspectFromManifest = (refToInspect: string) => {
    setScanRef(refToInspect);
    setActiveTab("scan");
    handleLookupParcel(refToInspect);
  };

  useEffect(() => {
    if (activeTab === "manifest") {
      fetchManifest(selectedStation);
    }
  }, [activeTab, selectedStation]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border-b-4 border-amber-500 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-mono font-bold px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            STAFF & DEPOT DESK OPERATIONS
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white">
            KSRTC Cargo Terminal
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Simulated handheld terminal for QR scans, parcel handover status updates, and date-grouped station manifests.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold transition-colors ${
              activeTab === "scan"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>1. Scan / Update Status</span>
          </button>
          <button
            onClick={() => setActiveTab("manifest")}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold transition-colors ${
              activeTab === "manifest"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Station Manifest</span>
          </button>
        </div>
      </div>

      {/* ALERT MESSAGES */}
      {scanError && (
        <div className="bg-ksrtc-rust-bg dark:bg-ksrtc-rust-bgDark border-2 border-ksrtc-rust text-ksrtc-rust-dark dark:text-red-300 p-4 rounded-md text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-ksrtc-rust flex-shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {advanceSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-300 p-4 rounded-md text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{advanceSuccess}</span>
        </div>
      )}

      {/* TAB 1: SCAN & STATUS UPDATE */}
      {activeTab === "scan" && (
        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket space-y-4">
            <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-600" />
              Simulated Barcode / Reference Scan
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupParcel();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Scan or type ref (e.g. KSRTC-7A8B9C)"
                  value={scanRef}
                  onChange={(e) => setScanRef(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 text-sm font-mono tracking-wider border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loadingScan}
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-mono font-bold px-6 py-2.5 rounded text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loadingScan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch Parcel</span>
              </button>
            </form>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span>Quick Test Demo Refs:</span>
              {["KSRTC-7A8B9C", "KSRTC-3X4Y5Z", "KSRTC-9K8J7H"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setScanRef(r);
                    handleLookupParcel(r);
                  }}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* SCANNED PARCEL TERMINAL VIEW */}
          {parcel && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-ticket overflow-hidden space-y-6 p-6">
              
              {/* SCHEDULED DATES STAFF ALERT BANNER */}
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

              {/* Header Status & Action Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-md border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    CURRENT PARCEL STATUS
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100">
                      {parcel.ref}
                    </span>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500 text-slate-950">
                      {parcel.status}
                    </span>
                  </div>
                </div>

                {nextStatus ? (
                  <button
                    onClick={handleAdvanceStatusClick}
                    disabled={advancing}
                    className="bg-ksrtc-amber hover:bg-amber-400 text-slate-950 font-mono font-bold px-6 py-3 rounded text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {advancing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Scan className="w-4 h-4" />
                    )}
                    <span>Advance to "{nextStatus}"</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs px-4 py-2.5 rounded border border-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>FINAL STATUS REACHED (DELIVERED)</span>
                  </div>
                )}
              </div>

              {/* Multi-Leg Route Preview */}
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

              {/* Dynamic Status Stepper */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-500 mb-2">
                  PIPELINE PROGRESS
                </h4>
                <StatusStepper currentStatus={parcel.status} statuses={dynamicPipeline} />
              </div>

              {/* Details & Handover Log */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded border border-slate-200 dark:border-slate-800 font-mono">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase block border-b pb-1">
                    MANIFEST SUMMARY
                  </span>
                  <p>
                    <strong>Route:</strong> {parcel.origin} → {parcel.dest}
                  </p>
                  <p>
                    <strong>Bus Assigned:</strong> {parcel.bus_no} ({parcel.trip_type})
                  </p>
                  <p>
                    <strong>Sender:</strong> {parcel.sender_name} ({parcel.sender_phone || "No phone"})
                  </p>
                  <p>
                    <strong>Receiver:</strong> {parcel.receiver_name} ({parcel.receiver_phone || "No phone"})
                  </p>
                  <p>
                    <strong>Price Breakdown:</strong> ₹{parcel.price} (Base + ₹{parcel.pickup_fee} pickup + ₹{parcel.delivery_fee} drop)
                  </p>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 uppercase block border-b pb-1">
                    RECENT DISPATCH LOGS
                  </span>
                  <TimelineLog timeline={parcel.timeline} />
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: STATION MANIFEST (GROUPED BY CALENDAR DATE) */}
      {activeTab === "manifest" && (
        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-ticket flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                SELECT TERMINAL / DEPOT STATION
              </label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-sm font-sans font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none min-w-[240px]"
              >
                {KERALA_STATIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {manifestData && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-300 dark:border-amber-800 text-center">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block uppercase font-bold">ARRIVING WAITING PICKUP</span>
                  <span className="text-xl font-bold text-amber-900 dark:text-amber-200">
                    {manifestData.summary.arrivingWaitingForPickup}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-300 dark:border-emerald-800 text-center">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">ARRIVING DELIVERED</span>
                  <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    {manifestData.summary.arrivingDelivered}
                  </span>
                </div>
              </div>
            )}
          </div>

          {loadingManifest ? (
            <div className="py-12 text-center font-mono text-xs text-slate-500">
              Loading station cargo manifest for {selectedStation}...
            </div>
          ) : !manifestData ? (
            <div className="py-8 text-center text-xs text-slate-500">No data.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* ARRIVING PARCELS GROUPED BY DATE & SERVICE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-ticket space-y-4">
                <h3 className="font-mono font-bold text-amber-600 text-sm uppercase tracking-wider flex items-center justify-between border-b pb-3">
                  <span className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-amber-600" />
                    Parcels Arriving at {selectedStation}
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                    {manifestData.summary.totalArriving} total
                  </span>
                </h3>

                {manifestData.arrivingGroups.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono italic">
                    No parcels scheduled to arrive at this station.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {manifestData.arrivingGroups.map((dateGroup: any) => (
                      <div key={dateGroup.date} className="space-y-3">
                        <div className="bg-slate-900 text-amber-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>DATE: {formatDateDisplay(dateGroup.date)}</span>
                        </div>

                        {dateGroup.trips.map((group: any) => (
                          <div
                            key={group.serviceInfo.trip_id}
                            className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/30"
                          >
                            <div className="flex items-center justify-between font-mono text-xs border-b pb-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {group.serviceInfo.trip_type} ({group.serviceInfo.bus_no}) at {group.serviceInfo.trip_time}
                              </span>
                              <span className="text-slate-500">
                                {group.waitingCount} waiting • {group.deliveredCount} delivered
                              </span>
                            </div>

                            <div className="space-y-2">
                              {group.parcels.map((p: Parcel) => (
                                <div
                                  key={p.ref}
                                  className="p-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                                >
                                  <div>
                                    <span className="font-bold text-amber-600 block">{p.ref}</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                                      From: {p.origin} • Recv: {p.receiver_name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        p.status === "Delivered"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-900"
                                      }`}
                                    >
                                      {p.status}
                                    </span>

                                    <button
                                      onClick={() => handleInspectFromManifest(p.ref)}
                                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                                      title="Load into scanner terminal"
                                    >
                                      <Scan className="w-3 h-3" />
                                      <span>Inspect</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DEPARTING PARCELS GROUPED BY DATE & SERVICE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-ticket space-y-4">
                <h3 className="font-mono font-bold text-emerald-600 text-sm uppercase tracking-wider flex items-center justify-between border-b pb-3">
                  <span className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-emerald-600" />
                    Parcels Departing from {selectedStation}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                    {manifestData.summary.totalDeparting} total
                  </span>
                </h3>

                {manifestData.departingGroups.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono italic">
                    No parcels scheduled to depart from this station.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {manifestData.departingGroups.map((dateGroup: any) => (
                      <div key={dateGroup.date} className="space-y-3">
                        <div className="bg-slate-900 text-emerald-400 px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>DATE: {formatDateDisplay(dateGroup.date)}</span>
                        </div>

                        {dateGroup.trips.map((group: any) => (
                          <div
                            key={group.serviceInfo.trip_id}
                            className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/30"
                          >
                            <div className="flex items-center justify-between font-mono text-xs border-b pb-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {group.serviceInfo.trip_type} ({group.serviceInfo.bus_no}) at {group.serviceInfo.trip_time}
                              </span>
                              <span className="text-slate-500">
                                {group.parcels.length} parcels queued
                              </span>
                            </div>

                            <div className="space-y-2">
                              {group.parcels.map((p: Parcel) => (
                                <div
                                  key={p.ref}
                                  className="p-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                                >
                                  <div>
                                    <span className="font-bold text-emerald-700 block">{p.ref}</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                                      Dest: {p.dest} • Sender: {p.sender_name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      {p.status}
                                    </span>

                                    <button
                                      onClick={() => handleInspectFromManifest(p.ref)}
                                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                                      title="Load into scanner terminal"
                                    >
                                      <Scan className="w-3 h-3" />
                                      <span>Inspect</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* RECEIVER OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="bg-amber-500 text-slate-950 p-2 rounded font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base">
                  Enter Receiver Delivery OTP
                </h3>
                <p className="text-xs text-slate-500">
                  Required for final handover confirmation.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Parcel <strong className="font-mono font-bold text-amber-600">{parcel?.ref}</strong> is being delivered to receiver <strong>{parcel?.receiver_name}</strong>. Enter the 4-digit OTP provided by the receiver.
            </p>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                4-DIGIT RECEIVER OTP *
              </label>
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="e.g. 4829"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 font-mono font-extrabold text-2xl tracking-widest text-center border-2 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold py-2.5 rounded text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={advancing || otpInput.trim().length !== 4}
                onClick={() => executeAdvanceStatus(otpInput.trim())}
                className="flex-1 bg-ksrtc-amber hover:bg-amber-400 text-slate-950 font-mono font-bold py-2.5 rounded text-xs shadow flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {advancing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Verify OTP & Deliver</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
