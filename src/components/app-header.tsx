import Link from "next/link";
import type { Profile } from "@/types/database";
import { CompanyLogo } from "@/components/company-logo";
import { LogoutButton } from "@/components/logout-button";

interface AppHeaderProps {
  profile: Profile;
}

export function AppHeader({ profile }: AppHeaderProps) {
  return (
    <header className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CompanyLogo size="md" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gera Pedidos</h1>
            <p className="text-sm text-slate-600">
              {profile.full_name} | {profile.role === "manager" ? "Gestor" : "Usuario do CD"}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-medium text-brand-700 hover:underline">
            Dashboard
          </Link>
          <Link href="/mes-atual" className="text-sm font-medium text-brand-700 hover:underline">
            Visao Mensal
          </Link>
          <Link href="/lancamentos" className="text-sm font-medium text-brand-700 hover:underline">
            Lancamentos
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
