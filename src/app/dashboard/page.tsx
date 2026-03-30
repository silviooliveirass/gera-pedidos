import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireProfile } from "@/lib/auth";
import type { DailyOrder, DistributionCenter } from "@/types/database";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeDateOnly(value: string) {
  return value.slice(0, 10);
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

interface DashboardSearchParams {
  month?: string;
  year?: string;
  center?: string;
  cd?: string;
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;

  const now = new Date();
  const selectedYear = Number(params.year ?? now.getUTCFullYear());
  const selectedMonth = Number(params.month ?? now.getUTCMonth() + 1);
  const selectedCenter = params.center ?? "all";
  const selectedCdId = params.cd ?? "";

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (centersError || !centers) {
    throw new Error("Nao foi possivel carregar os centros de distribuicao.");
  }

  const typedCenters = centers as DistributionCenter[];
  const centerMap = new Map(typedCenters.map((center) => [center.id, center]));

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(selectedYear, selectedMonth, 0));
  const monthEnd = toDateOnly(monthEndDate);
  const today = toDateOnly(now);

  const { data: yearOrders, error: yearOrdersError } = await fetchAllOrdersByDateRange(supabase, yearStart, yearEnd);
  if (yearOrdersError || !yearOrders) {
    throw new Error("Nao foi possivel carregar os lancamentos.");
  }

  const { data: monthOrders, error: monthOrdersError } = await fetchAllOrdersByDateRange(supabase, monthStart, monthEnd);
  if (monthOrdersError || !monthOrders) {
    throw new Error("Nao foi possivel carregar os lancamentos do mes.");
  }

  const typedYearOrders = yearOrders as DailyOrder[];
  const typedMonthOrders = monthOrders as DailyOrder[];

  const filteredCenters = typedCenters.filter((center) => (selectedCenter === "all" ? true : center.id === selectedCenter));

  const centerSummaries = filteredCenters.map((center) => {
    const centerYearOrders = typedYearOrders.filter((order) => order.distribution_center_id === center.id);
    const centerMonthOrders = typedMonthOrders.filter((order) => order.distribution_center_id === center.id);

    const totalDay = centerYearOrders
      .filter((order) => normalizeDateOnly(order.order_date) === today)
      .reduce((sum, current) => sum + current.quantity, 0);

    const totalMonth = centerMonthOrders.reduce((sum, current) => sum + current.quantity, 0);
    const totalYear = centerYearOrders.reduce((sum, current) => sum + current.quantity, 0);

    return {
      ...center,
      totalDay,
      totalMonth,
      totalYear
    };
  });

  const ranking = [...centerSummaries].sort((a, b) => b.totalMonth - a.totalMonth);
  const champion = ranking[0];

  const totalDayAll = centerSummaries.reduce((sum, current) => sum + current.totalDay, 0);
  const totalMonthFiltered = centerSummaries.reduce((sum, current) => sum + current.totalMonth, 0);
  const totalYearFiltered = centerSummaries.reduce((sum, current) => sum + current.totalYear, 0);

  const totalMonthGeneral = typedMonthOrders.reduce((sum, current) => sum + current.quantity, 0);
  const totalYearGeneral = typedYearOrders.reduce((sum, current) => sum + current.quantity, 0);

  const selectedCdEntries = selectedCdId
    ? typedMonthOrders
        .filter((order) => order.distribution_center_id === selectedCdId)
        .sort((a, b) => normalizeDateOnly(a.order_date).localeCompare(normalizeDateOnly(b.order_date)))
    : [];

  const selectedCdCenter = selectedCdId ? centerMap.get(selectedCdId) : undefined;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <AppHeader profile={profile} />

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-4">
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

          <label className="text-sm">
            <span className="mb-1 block font-medium">Centro de distribuicao</span>
            <select
              name="center"
              defaultValue={selectedCenter}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todos</option>
              {typedCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code} - {center.name}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="cd" value="" />

          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">
              Filtrar
            </button>
          </div>
        </form>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Pedidos no dia ({today})</p>
          <p className="mt-2 text-3xl font-bold">{totalDayAll}</p>
        </article>
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Pedidos no mes ({String(selectedMonth).padStart(2, "0")}/{selectedYear})
          </p>
          <p className="mt-2 text-3xl font-bold">{totalMonthFiltered}</p>
          <p className="mt-1 text-xs text-slate-500">Total geral do mes: {totalMonthGeneral}</p>
        </article>
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Pedidos no ano ({selectedYear})</p>
          <p className="mt-2 text-3xl font-bold">{totalYearFiltered}</p>
          <p className="mt-1 text-xs text-slate-500">Total geral do ano: {totalYearGeneral}</p>
        </article>
      </section>

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold">CD destaque do mes</h2>
          <span className="text-lg font-bold text-slate-400">|</span>
          <p className="text-lg font-bold">
            Periodo: {String(selectedMonth).padStart(2, "0")}/{selectedYear}
          </p>
        </div>
        {champion ? (
          <p className="mt-2 text-sm text-slate-700">
            <strong>
              {champion.code} - {champion.name}
            </strong>{" "}
            com <strong>{champion.totalMonth}</strong> pedidos no mes selecionado.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">Sem dados no periodo selecionado.</p>
        )}
      </section>

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold">Ranking mensal por CD</h2>
          <span className="text-lg font-bold text-slate-400">|</span>
          <p className="text-lg font-bold">
            Periodo: {String(selectedMonth).padStart(2, "0")}/{selectedYear}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                <th className="py-2">Posicao</th>
                <th className="py-2">CD</th>
                <th className="py-2">Mes</th>
                <th className="py-2">Ano</th>
                <th className="py-2">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2 font-medium">
                    {item.code} - {item.name}
                  </td>
                  <td className="py-2 font-semibold">{item.totalMonth}</td>
                  <td className="py-2">{item.totalYear}</td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard?year=${selectedYear}&month=${selectedMonth}&center=${selectedCenter}&cd=${item.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      Ver lancamentos
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Lancamentos diarios do CD selecionado</h2>
          {selectedCdId ? (
            <Link
              href={`/dashboard?year=${selectedYear}&month=${selectedMonth}&center=${selectedCenter}`}
              className="text-sm text-brand-700 hover:underline"
            >
              Limpar selecao
            </Link>
          ) : null}
        </div>

        {!selectedCdId ? (
          <p className="text-sm text-slate-600">Clique em "Ver lancamentos" no ranking para abrir o detalhamento diario.</p>
        ) : selectedCdEntries.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum lancamento para {selectedCdCenter?.code ?? "CD"} neste mes.</p>
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
                    <td className="py-2">{toDateLabel(normalizeDateOnly(entry.order_date))}</td>
                    <td className="py-2">
                      {selectedCdCenter?.code} - {selectedCdCenter?.name}
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
