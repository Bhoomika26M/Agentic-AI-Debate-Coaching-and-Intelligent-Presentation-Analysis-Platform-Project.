'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useModel } from '@/lib/model-context';
import { UserRole } from '@/lib/types';
import {
  ChevronDown,
  Cpu,
  UserCheck,
  Settings
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { role, setRole } = useAuth();
  const { selectedModel, setIsSettingsOpen } = useModel();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const rolesList: { id: UserRole; label: string; desc: string }[] = [
    { id: 'learner', label: 'Learner', desc: 'Practice & track debate skills' },
    { id: 'coach', label: 'Debate Coach', desc: 'Monitor student progress & evaluations' },
    { id: 'educator', label: 'Educator', desc: 'Class analytics & student rankings' },
    { id: 'admin', label: 'Administrator', desc: 'System reports & model latency' }
  ];

  const navLinks = [
    { href: '/', label: 'OVERVIEW' },
    { href: '/debate', label: 'DEBATE ARENA' },
    { href: '/presentation', label: 'PRESENTATION' },
    { href: '/rebuttal-lab', label: 'REBUTTAL LAB' },
    { href: '/arena', label: 'AI ARENA' },
    { href: '/coach', label: 'TELEPROMPTER' },
    { href: '/dashboard', label: 'DASHBOARD' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b-2 border-black">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-8 lg:px-12">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-black text-3xl tracking-tighter text-black uppercase font-mono">
            VERBAL<span className="bg-black text-white px-2 py-0.5 ml-1.5 text-2xl font-black">ARENA</span>
          </span>
        </Link>

        {/* Spacious Uppercase Links */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-black tracking-widest transition-all uppercase ${
                  isActive
                    ? 'text-black border-b-4 border-black pb-1'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden sm:flex items-center gap-2 border-2 border-black bg-white px-4 py-2.5 text-sm font-black tracking-wider uppercase text-black hover:bg-black hover:text-white transition-all shadow"
          >
            <Cpu className="h-4 w-4" />
            <span className="max-w-[130px] truncate">{selectedModel.name}</span>
            <Settings className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 border-2 border-black bg-black px-5 py-2.5 text-sm font-black tracking-wider uppercase text-white hover:bg-neutral-800 transition-all shadow"
            >
              <span>ROLE: {role}</span>
              <ChevronDown className="h-4 w-4 text-neutral-300" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-3 w-72 border-2 border-black bg-white p-3 shadow-2xl z-50">
                <div className="px-3 py-2 border-b-2 border-black">
                  <p className="text-xs font-black font-mono text-neutral-400 uppercase tracking-widest">Select Workspace Role</p>
                </div>
                <div className="mt-2 space-y-1">
                  {rolesList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRole(r.id);
                        setShowRoleDropdown(false);
                      }}
                      className={`flex w-full items-start justify-between p-3 text-left text-sm transition-all uppercase font-bold ${
                        role === r.id
                          ? 'bg-black text-white'
                          : 'text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      <div>
                        <p className="font-extrabold">{r.label}</p>
                        <p className="text-xs text-neutral-400 font-normal capitalize">{r.desc}</p>
                      </div>
                      {role === r.id && <UserCheck className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
