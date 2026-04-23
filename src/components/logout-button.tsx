"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  compact?: boolean;
  tone?: "light" | "dark";
}

export function LogoutButton({ compact = false, tone = "light" }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const toneClass =
    tone === "dark"
      ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`rounded-lg border text-sm font-semibold ${toneClass} ${compact ? "w-full px-2 py-2" : "px-4 py-2"}`}
      title="Sair"
      aria-label="Sair"
    >
      Sair
    </button>
  );
}
