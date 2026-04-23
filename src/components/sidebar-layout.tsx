"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/types/database";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { BrandLockup } from "@/components/brand-lockup";

interface SidebarLayoutProps {
  profile: Profile;
  children: ReactNode;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarLayout({ profile, children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const sidebarWidth = collapsed ? "5.5rem" : "15rem";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100" style={{ ["--sidebar-width" as string]: sidebarWidth }}>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <Link href="/dashboard" className="inline-flex rounded-md px-1 py-0.5" aria-label="Ir para inicio">
              <BrandLockup />
            </Link>
          </div>

          <div className="mx-2 hidden w-full max-w-xl items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 sm:flex">
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              readOnly
              value="Pesquise CDs, periodos e lancamentos"
              className="w-full bg-transparent text-sm text-slate-600 outline-none"
              aria-label="Busca rapida"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50"
              aria-label="Abrir menu do usuario"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {getInitials(profile.full_name)}
              </span>
            </button>

            {profileMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="truncate text-sm font-semibold text-slate-800">{profile.full_name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {profile.role === "manager" ? "Gestor" : "Usuario do CD"}
                </p>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <LogoutButton />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <AppSidebar collapsed={collapsed} />

      <div className="pt-16 transition-[padding] duration-200 lg:pl-[var(--sidebar-width)]">
        <main className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
