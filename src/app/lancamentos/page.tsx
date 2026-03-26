import { AppHeader } from "@/components/app-header";
import { CsvImportForm } from "@/components/csv-import-form";
import { LaunchForm } from "@/components/launch-form";
import { requireProfile } from "@/lib/auth";
import type { DistributionCenter } from "@/types/database";

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export default async function LancamentosPage() {
  const { supabase, profile } = await requireProfile();

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (centersError || !centers) {
    throw new Error("Nao foi possivel carregar os centros.");
  }

  const typedCenters = centers as DistributionCenter[];

  const selectedCdId = profile.role === "manager" ? typedCenters[0]?.id ?? null : profile.distribution_center_id;
  const date = todayDateOnly();

  let initialQuantity = 0;

  if (selectedCdId) {
    const { data: todayEntry } = await supabase
      .from("daily_orders")
      .select("quantity")
      .eq("distribution_center_id", selectedCdId)
      .eq("order_date", date)
      .maybeSingle();

    initialQuantity = todayEntry?.quantity ?? 0;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <AppHeader profile={profile} />

      <section className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Lancamento diario</h2>
        <p className="text-sm text-slate-600">Regra: um lancamento por CD por dia (com edicao em qualquer dia passado).</p>
      </section>

      <div className="space-y-4">
        <LaunchForm
          initialQuantity={initialQuantity}
          initialDate={date}
          initialCdId={selectedCdId}
          availableCenters={typedCenters}
          isManager={profile.role === "manager"}
        />

        {profile.role === "manager" ? <CsvImportForm /> : null}
      </div>
    </main>
  );
}
