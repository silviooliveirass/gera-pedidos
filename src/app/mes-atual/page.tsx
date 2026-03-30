import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireProfile } from "@/lib/auth";
import type { DailyOrder, DistributionCenter } from "@/types/database";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDateLabel(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

async function fetchAllOrdersByDateRange(supabase: any, start: string, end: string) {
  const pageSize = 1000;
  let from = 0;
  const all: DailyOrder[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("daily_orders")
      .select("id, distribution_center_id, order_date, quantity, created_by, updated_by, created_at, updated_at")
      .gte("order_date", start)
      .lte("order_date", end)
      .range(from, to);

    if (error) {
      return { data: null, error };
    }

    const chunk = (data ?? []) as DailyOrder[];
    all.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: all, error: null };
}

function clampMonth(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(12, Math.max(1, Math.floor(value)));
}

function clampYear(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(2020, Math.floor(value));
}

interface MesAtualSearchParams {
  month?: string;
  year?: string;
  cd?: string;
}

export default async function MesAtualPage({
  searchParams
}: {
  searchParams: Promise<MesAtualSearchParams>;
}) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;

  const now = new Date();
  const selectedYear = clampYear(Number(params.year ?? now.getUTCFullYear()), now.getUTCFullYear());
  const selectedMonth = clampMonth(Number(params.month ?? now.getUTCMonth() + 1));
  const selectedCdId = params.cd ?? "";

  const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const monthEnd = toDateOnly(new Date(Date.UTC(selectedYear, selectedMonth, 0)));

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (centersError || !centers) {
    throw new Error("Nao foi possivel carregar os centros.");
  }

  const typedCenters = centers as DistributionCenter[];
  const centerMap = new Map(typedCenters.map((center) => [center.id, center]));

  const { data: orders, error: ordersError } = await fetchAllOrdersByDateRange(supabase, monthStart, monthEnd);

  if (ordersError || !orders) {
    throw new Error("Nao foi possivel carregar os lancamentos do mes selecionado.");
  }

  const typedOrders = orders as DailyOrder[];

  const ranking = typedCenters
    .map((center) => {
      const totalMonth = typedOrders
        .filter((order) => order.distribution_center_id === center.id)
        .reduce((sum, current) => sum + current.quantity, 0);

      return {
        ...center,
        totalMonth
      };
    })
    .sort((a, b) => b.totalMonth - a.totalMonth);

  const totalMonthAll = ranking.reduce((sum, current) => sum + current.totalMonth, 0);

  const selectedCenter = selectedCdId ? centerMap.get(selectedCdId) : undefined;

  const selectedCdEntries = selectedCdId
    ? typedOrders
        .filter((order) => order.distribution_center_id === selectedCdId)
        .sort((a, b) => a.order_date.localeCompare(b.order_date))
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <AppHeader profile={profile} />

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Visao Mensal</h2>
        <p className="text-sm text-slate-600">Escolha o periodo e clique no CD para ver todos os dias lancados.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Ano</span>
            <input
              name="year"
              defaultValue={String(selectedYear)}
              type="number"
              min={2020}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Mes</span>
            <input
              name="month"
              defaultValue={String(selectedMonth)}
              type="number"
              min={1}
              max={12}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <input type="hidden" name="cd" value="" />

          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">
              Aplicar
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Periodo</p>
            <p className="text-xl font-bold">
              {String(selectedMonth).padStart(2, "0")}/{selectedYear}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total de pedidos no mes</p>
            <p className="text-xl font-bold">{totalMonthAll}</p>
          </article>
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Posicao dos CDs no mes</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                <th className="py-2">Posicao</th>
                <th className="py-2">CD</th>
                <th className="py-2">Pedidos no mes</th>
                <th className="py-2">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">
                    {item.code} - {item.name}
                  </td>
                  <td className="py-2 font-semibold">{item.totalMonth}</td>
                  <td className="py-2">
                    <Link
                      href={`/mes-atual?year=${selectedYear}&month=${selectedMonth}&cd=${item.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      Ver dias do CD
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Lancamentos diarios do CD selecionado</h2>
          {selectedCdId ? (
            <Link href={`/mes-atual?year=${selectedYear}&month=${selectedMonth}`} className="text-sm text-brand-700 hover:underline">
              Limpar selecao
            </Link>
          ) : null}
        </div>

        {!selectedCdId ? (
          <p className="text-sm text-slate-600">Clique em "Ver dias do CD" na tabela de posicao para abrir o detalhe.</p>
        ) : selectedCdEntries.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum lancamento para {selectedCenter?.code ?? "CD"} neste mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                  <th className="py-2">Data</th>
                  <th className="py-2">CD</th>
                  <th className="py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {selectedCdEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 text-sm">
                    <td className="py-2">{toDateLabel(entry.order_date)}</td>
                    <td className="py-2">
                      {selectedCenter?.code} - {selectedCenter?.name}
                    </td>
                    <td className="py-2 font-semibold">{entry.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
