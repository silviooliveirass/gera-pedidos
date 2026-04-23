"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppSidebarProps {
  collapsed: boolean;
}

type IconName = "dashboard" | "orders" | "monthly" | "entries";

interface SidebarLink {
  href: string;
  label: string;
  icon: IconName;
}

const links: SidebarLink[] = [
  { href: "/dashboard", label: "Inicio", icon: "dashboard" },
  { href: "/pedidos", label: "Pedidos", icon: "orders" },
  { href: "/mes-atual", label: "Visao Mensal", icon: "monthly" },
  { href: "/lancamentos", label: "Lancamentos", icon: "entries" }
];

function NavIcon({ icon, active }: { icon: IconName; active: boolean }) {
  const colorClass = active ? "text-brand-700" : "text-slate-500";

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.8V21h14V9.8" />
      </svg>
    );
  }

  if (icon === "orders") {
    return (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M7 9h10M7 13h10M7 17h6" />
      </svg>
    );
  }

  if (icon === "monthly") {
    return (
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 9h18" />
        <path d="M8 13h3M8 17h3M14 13h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16M4 12h16M4 19h10" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-[var(--sidebar-width)] border-r border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm transition-[width] duration-200">
      <div className="flex h-full flex-col">
        <nav className="space-y-1">
          {links.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-xl py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(234,88,12,0.15)]"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                } ${collapsed ? "justify-center px-2" : "gap-2.5 px-3"}`}
                title={item.label}
                aria-label={item.label}
              >
                <NavIcon icon={item.icon} active={isActive} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
