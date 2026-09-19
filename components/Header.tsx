"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, Package, Search, ShieldAlert, Database, Check } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const navLinks = [
    { href: "/book", label: "Book Parcel", icon: Package },
    { href: "/track", label: "Track Waybill", icon: Search },
    { href: "/staff", label: "Depot Desk", icon: ShieldAlert },
  ];

  return (
    <header className="bg-ksrtc-green text-white border-b-4 border-ksrtc-amber shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-ksrtc-amber text-black p-2.5 rounded-sm font-mono font-bold flex items-center justify-center shadow-inner group-hover:bg-amber-400 transition-colors">
              <Bus className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg sm:text-xl tracking-wider text-amber-300">
                  AANAVANDI
                </span>
                <span className="text-xs bg-emerald-800 text-emerald-100 font-mono px-1.5 py-0.5 rounded border border-emerald-600">
                  KSRTC CARGO
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 font-sans tracking-tight">
                Kerala State Road Transport Corporation
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded text-sm font-medium transition-all ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                      : "text-emerald-100 hover:bg-emerald-800/80 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action / Seed Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              title="Seed 3 sample parcels to quickly test tracking"
              className="flex items-center gap-1.5 text-xs font-mono bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-3 py-1.5 rounded border border-emerald-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {seedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Demo Data Seeded!</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>{seeding ? "Seeding..." : "Load Demo Data"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-emerald-800 py-2 justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-emerald-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
