import { MapPin, Bus, User, ArrowRight, Clock } from "lucide-react";

interface MultiLegRouteProps {
  origin: string;
  dest: string;
  pickupType?: "depot" | "doorstep";
  deliveryType?: "depot" | "doorstep";
  pickupLocality?: string;
  pickupLocalityDistanceKm?: number;
  deliveryLocality?: string;
  deliveryLocalityDistanceKm?: number;
  busServiceClass?: string;
  busNo?: string;
  estimatedBusDurationHours?: number;
}

export default function MultiLegRoute({
  origin,
  dest,
  pickupType = "depot",
  deliveryType = "depot",
  pickupLocality,
  pickupLocalityDistanceKm,
  deliveryLocality,
  deliveryLocalityDistanceKm,
  busServiceClass = "KSRTC Bus",
  busNo,
  estimatedBusDurationHours = 3.5,
}: MultiLegRouteProps) {
  // Compute leg time estimates
  const pickupRiderMin = pickupLocalityDistanceKm ? Math.round(pickupLocalityDistanceKm * 5 + 8) : 15;
  const deliveryRiderMin = deliveryLocalityDistanceKm ? Math.round(deliveryLocalityDistanceKm * 5 + 8) : 20;
  const busMin = Math.round(estimatedBusDurationHours * 60);

  const totalMin =
    (pickupType === "doorstep" ? pickupRiderMin : 0) +
    busMin +
    (deliveryType === "doorstep" ? deliveryRiderMin : 0);

  const totalHoursStr =
    totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
      : `${totalMin} mins`;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 font-sans">
      <div className="flex items-center justify-between text-xs font-mono font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
        <span className="text-amber-800 dark:text-amber-400 uppercase">
          MULTI-LEG TRANSIT ROUTE & TIMING
        </span>
        <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          EST. TOTAL TRANSIT: {totalHoursStr}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        
        {/* Leg 1: Pickup Locality (if doorstep) */}
        {pickupType === "doorstep" && (
          <>
            <div className="flex flex-col items-center text-center max-w-[110px]">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-tight">
                {pickupLocality || "Sender Doorstep"}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                ({pickupLocalityDistanceKm || 3} km • Doorstep)
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-500 font-semibold mb-0.5">
                ~{pickupRiderMin} mins (Rider)
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </div>
          </>
        )}

        {/* Leg 2: Origin Depot */}
        <div className="flex flex-col items-center text-center max-w-[120px]">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-tight">
            {origin}
          </span>
          <span className="text-[10px] font-mono text-slate-500">Origin Depot</span>
        </div>

        {/* Leg 3: Bus Transit */}
        <div className="flex flex-col items-center flex-1 min-w-[120px]">
          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 mb-0.5">
            {busServiceClass} {busNo ? `(${busNo})` : ""}
          </span>
          <div className="w-full flex items-center gap-1">
            <div className="h-0.5 flex-1 bg-amber-500" />
            <Bus className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="h-0.5 flex-1 bg-amber-500" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-0.5">
            ~{estimatedBusDurationHours} hrs bus trip
          </span>
        </div>

        {/* Leg 4: Destination Depot */}
        <div className="flex flex-col items-center text-center max-w-[120px]">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-tight">
            {dest}
          </span>
          <span className="text-[10px] font-mono text-slate-500">Destination Depot</span>
        </div>

        {/* Leg 5: Delivery Locality (if doorstep) */}
        {deliveryType === "doorstep" && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-500 font-semibold mb-0.5">
                ~{deliveryRiderMin} mins (Rider)
              </span>
              <ArrowRight className="w-4 h-4 text-amber-600" />
            </div>

            <div className="flex flex-col items-center text-center max-w-[110px]">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs mb-1 shadow-sm">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-tight">
                {deliveryLocality || "Receiver Doorstep"}
              </span>
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                ({deliveryLocalityDistanceKm || 3} km • Doorstep)
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
