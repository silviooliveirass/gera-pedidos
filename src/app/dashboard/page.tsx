import Link from "next/link";
import { SidebarLayout } from "@/components/sidebar-layout";
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

function sumQuantity(orders: DailyOrder[]) {
  return orders.reduce((sum, current) => sum + current.quantity, 0);
}

function previousPeriod(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = toDateOnly(new Date(Date.UTC(year, month, 0)));
  return { start, end };
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
  const { start: monthStart, end: monthEnd } = monthRange(selectedYear, selectedMonth);
  const prev = previousPeriod(selectedYear, selectedMonth);
  const { start: prevMonthStart, end: prevMonthEnd } = monthRange(prev.year, prev.month);
  const today = toDateOnly(now);

  const [yearResult, monthResult, prevMonthResult] = await Promise.all([
    fetchAllOrdersByDateRange(supabase, yearStart, yearEnd),
    fetchAllOrdersByDateRange(supabase, monthStart, monthEnd),
    fetchAllOrdersByDateRange(supabase, prevMonthStart, prevMonthEnd)
  ]);

  if (yearResult.error || !yearResult.data) {
    throw new Error("Nao foi possivel carregar os lancamentos do ano.");
  }

  if (monthResult.error || !monthResult.data) {
    throw new Error("Nao foi possivel carregar os lancamentos do mes.");
  }

  if (prevMonthResult.error || !prevMonthResult.data) {
    throw new Error("Nao foi possivel carregar os lancamentos do mes anterior.");
  }

  const typedYearOrders = yearResult.data;
  const typedMonthOrders = monthResult.data;
  const typedPrevMonthOrders = prevMonthResult.data;

  const filteredCenters = typedCenters.filter((center) => (selectedCenter === "all" ? true : center.id === selectedCenter));
  const filteredCenterIds = new Set(filteredCenters.map((center) => center.id));

  const filteredYearOrders = typedYearOrders.filter((order) => filteredCenterIds.has(order.distribution_center_id));
  const filteredMonthOrders = typedMonthOrders.filter((order) => filteredCenterIds.has(order.distribution_center_id));
  const filteredPrevMonthOrders = typedPrevMonthOrders.filter((order) => filteredCenterIds.has(order.distribution_center_id));

  const totalDayFiltered = filteredYearOrders
    .filter((order) => normalizeDateOnly(order.order_date) === today)
    .reduce((sum, current) => sum + current.quantity, 0);

  const totalMonthFiltered = sumQuantity(filteredMonthOrders);
  const totalYearFiltered = sumQuantity(filteredYearOrders);
  const totalMonthGeneral = sumQuantity(typedMonthOrders);
  const totalYearGeneral = sumQuantity(typedYearOrders);
  const totalPrevMonthFiltered = sumQuantity(filteredPrevMonthOrders);

  const variationPercent =
    totalPrevMonthFiltered > 0
      ? ((totalMonthFiltered - totalPrevMonthFiltered) / totalPrevMonthFiltered) * 100
      : totalMonthFiltered > 0
        ? 100
        : 0;

  const activeCentersCount = new Set(filteredMonthOrders.map((order) => order.distribution_center_id)).size;

  const monthDayCount = Number(monthEnd.slice(-2));
  const dayTotalsMap = new Map<string, number>();

  filteredMonthOrders.forEach((order) => {
    const key = normalizeDateOnly(order.order_date);
    dayTotalsMap.set(key, (dayTotalsMap.get(key) ?? 0) + order.quantity);
  });

  const dailySeries = Array.from({ length: monthDayCount }, (_, index) => {
    const day = index + 1;
    const date = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return {
      day,
      date,
      total: dayTotalsMap.get(date) ?? 0
    };
  });

  const chartWidth = 760;
  const chartHeight = 240;
  const chartPadding = 26;
  const maxDailyValue = Math.max(...dailySeries.map((item) => item.total), 1);

  const linePoints = dailySeries
    .map((item, index) => {
      const x = chartPadding + (index / Math.max(dailySeries.length - 1, 1)) * (chartWidth - chartPadding * 2);
      const y = chartHeight - chartPadding - (item.total / maxDailyValue) * (chartHeight - chartPadding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${chartPadding},${chartHeight - chartPadding} ${linePoints} ${chartWidth - chartPadding},${chartHeight - chartPadding}`;

  const centerSummaries = filteredCenters
    .map((center) => {
      const centerYearOrders = filteredYearOrders.filter((order) => order.distribution_center_id === center.id);
      const centerMonthOrders = filteredMonthOrders.filter((order) => order.distribution_center_id === center.id);

      return {
        ...center,
        totalMonth: sumQuantity(centerMonthOrders),
        totalYear: sumQuantity(centerYearOrders)
      };
    })
    .sort((a, b) => b.totalMonth - a.totalMonth);

  const champion = centerSummaries[0];

  const topForChart = centerSummaries.slice(0, 8);
  const maxTopValue = Math.max(...topForChart.map((item) => item.totalMonth), 1);

  const selectedCdEntries = selectedCdId
    ? filteredMonthOrders
        .filter((order) => order.distribution_center_id === selectedCdId)
        .sort((a, b) => normalizeDateOnly(a.order_date).localeCompare(normalizeDateOnly(b.order_date)))
    : [];

  const selectedCdCenter = selectedCdId ? centerMap.get(selectedCdId) : undefined;

  return (
    <SidebarLayout profile={profile}>
      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">Dashboard Analitico por CD</h1>
          <div className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            Periodo: {String(selectedMonth).padStart(2, "0")}/{selectedYear}
          </div>
        </div>

        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pedidos no mes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalMonthFiltered}</p>
          <p className="text-xs text-slate-500">Total geral do mes: {totalMonthGeneral}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pedidos no ano</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalYearFiltered}</p>
          <p className="text-xs text-slate-500">Total geral do ano: {totalYearGeneral}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Variacao vs mes anterior</p>
          <p className={`mt-2 text-3xl font-bold ${variationPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {variationPercent >= 0 ? "+" : ""}
            {variationPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">
            Mes anterior ({String(prev.month).padStart(2, "0")}/{prev.year}): {totalPrevMonthFiltered}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">CDs ativos no mes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeCentersCount}</p>
          <p className="text-xs text-slate-500">Pedidos no dia ({today}): {totalDayFiltered}</p>
        </article>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Evolucao diaria do mes</h2>
            <p className="text-sm text-slate-500">Media diaria: {(totalMonthFiltered / Math.max(monthDayCount, 1)).toFixed(1)}</p>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full min-w-[640px]">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" />
              <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" />

              <polygon points={areaPoints} fill="url(#areaGradient)" />
              <polyline points={linePoints} fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {dailySeries.filter((item) => item.day % 5 === 0 || item.day === 1 || item.day === monthDayCount).map((item, index) => {
                const x = chartPadding + (index / Math.max(dailySeries.length - 1, 1)) * (chartWidth - chartPadding * 2);
                return (
                  <text key={item.day} x={x} y={chartHeight - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
                    {String(item.day).padStart(2, "0")}
                  </text>
                );
              })}
            </svg>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-bold">Top CDs no mes</h2>
          <div className="space-y-3">
            {topForChart.map((item) => {
              const width = (item.totalMonth / maxTopValue) * 100;
              return (
                <div key={item.id}>
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>{item.code}</span>
                    <span>{item.totalMonth}</span>
                  </div>
                  <Link
                    href={`/dashboard?year=${selectedYear}&month=${selectedMonth}&center=${selectedCenter}&cd=${item.id}`}
                    className="block"
                  >
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-brand-500" style={{ width: `${Math.max(width, 4)}%` }} />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold">CD destaque do mes</h2>
          <span className="text-lg font-bold text-slate-300">|</span>
          <p className="text-lg font-bold">Periodo: {String(selectedMonth).padStart(2, "0")}/{selectedYear}</p>
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

      <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold">Ranking por CD</h2>
          <span className="text-lg font-bold text-slate-300">|</span>
          <p className="text-lg font-bold">Periodo: {String(selectedMonth).padStart(2, "0")}/{selectedYear}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] border-collapse">
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
              {centerSummaries.map((item, index) => (
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

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
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
    </SidebarLayout>
  );
}
