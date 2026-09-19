import { DEFAULT_PARCEL_STATUSES, ParcelStatus } from "@/lib/types";
import {
  Check,
  Clock,
  Bus,
  PackageCheck,
  MapPin,
  Sparkles,
  UserCheck,
  Bike,
  Truck,
} from "lucide-react";

interface StatusStepperProps {
  currentStatus: ParcelStatus;
  statuses?: ParcelStatus[];
  className?: string;
}

const STATUS_ICONS: Record<string, any> = {
  "Booked": MapPin,
  "Rider assigned for pickup": UserCheck,
  "Picked up from sender": Bike,
  "Accepted at origin depot": PackageCheck,
  "Loaded on bus": Bus,
  "In transit": Bus,
  "Arrived at destination depot": MapPin,
  "Out for delivery": Truck,
  "Delivered": Sparkles,
};

export default function StatusStepper({
  currentStatus,
  statuses = DEFAULT_PARCEL_STATUSES,
  className = "",
}: StatusStepperProps) {
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className={`w-full py-4 ${className}`}>
      {/* Desktop & Tablet Stepper */}
      <div className="hidden md:block relative">
        {/* Background Connecting Line */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-200 dark:bg-slate-800 -z-0" />
        
        {/* Active Progress Line */}
        <div
          className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 transition-all duration-500 -z-0"
          style={{
            width: `${Math.max(0, (currentIndex / (statuses.length - 1)) * 90)}%`,
          }}
        />

        <div className="flex justify-between items-start relative z-10">
          {statuses.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = STATUS_ICONS[status] || Clock;

            return (
              <div key={status} className="flex flex-col items-center max-w-[110px] text-center">
                {/* Node Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all duration-300 border-2 ${
                    isCompleted
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : isCurrent
                      ? "bg-amber-500 border-amber-600 text-slate-950 active-pulse shadow-md font-extrabold scale-110"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Status Label */}
                <div className="mt-2.5">
                  <span
                    className={`block text-[11px] leading-snug font-medium ${
                      isCurrent
                        ? "text-amber-700 dark:text-amber-400 font-bold"
                        : isCompleted
                        ? "text-emerald-800 dark:text-emerald-300 font-semibold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {status}
                  </span>
                  {isCurrent && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold uppercase rounded border border-amber-300 dark:border-amber-800">
                      CURRENT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper (Vertical Sequence) */}
      <div className="block md:hidden space-y-3">
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = STATUS_ICONS[status] || Clock;

          return (
            <div
              key={status}
              className={`flex items-center gap-3 p-3 rounded-md border ${
                isCurrent
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200"
                  : isCompleted
                  ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs flex-shrink-0 ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-amber-500 text-slate-950 font-bold active-pulse"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1 flex items-center justify-between">
                <span className={`text-xs font-semibold ${isCurrent ? "font-bold" : ""}`}>
                  {status}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    DONE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
