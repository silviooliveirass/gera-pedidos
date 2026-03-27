import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { LoginForm } from "@/components/login-form";
import type { Profile } from "@/types/database";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "id">>();

    if (profile) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
        <div className="grid md:grid-cols-2">
          <aside className="border-b border-slate-200 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white md:border-b-0 md:border-r md:border-r-brand-400/40 md:p-10">
            <CompanyLogo size="lg" className="brightness-0 invert" />
            <p className="mt-5 text-3xl font-extrabold tracking-tight">Gera Pedidos</p>
            <p className="mt-3 text-sm text-white/90">Painel de controle de pedidos por centro de distribuicao.</p>
            <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white/95">
              Consolidacao diaria, mensal e anual com visao por CD em um unico lugar.
            </div>
          </aside>

          <div className="p-8 md:p-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Entrar no sistema</h1>
            <p className="mt-2 text-sm text-slate-600">Acesse com seu e-mail corporativo e senha.</p>
            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
