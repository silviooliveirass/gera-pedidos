import { SidebarLayout } from "@/components/sidebar-layout";
import { PedidosFilters } from "@/components/pedidos-filters";
import { requireProfile } from "@/lib/auth";
import type { DailyOrder, DistributionCenter } from "@/types/database";

interface PedidosSearchParams {
  cd?: string;
  year?: string;
  month?: string;
}

async function fetchAllOrdersByCdAndYear(supabase: any, cdId: string, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const pageSize = 1000;
  let from = 0;
  const all: DailyOrder[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("daily_orders")
      .select("id, distribution_center_id, order_date, quantity, created_by, updated_by, created_at, updated_at")
      .eq("distribution_center_id", cdId)
      .gte("order_date", start)
      .lte("order_date", end)
      .order("order_date", { ascending: false })
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

async function fetchAllOrdersByYear(supabase: any, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

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
      .order("order_date", { ascending: false })
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

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function PedidosPage({ searchParams }: { searchParams: Promise<PedidosSearchParams> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const selectedYear = Number(params.year ?? currentYear);
  const selectedMonthRaw = Number(params.month ?? currentMonth);
  const selectedMonth = Math.min(12, Math.max(1, Number.isFinite(selectedMonthRaw) ? selectedMonthRaw : currentMonth));

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (centersError || !centers) {
    throw new Error("Nao foi possivel carregar os centros.");
  }

  const typedCenters = centers as DistributionCenter[];
  const selectedCdId = profile.role === "manager" ? params.cd ?? typedCenters[0]?.id ?? "" : profile.distribution_center_id ?? "";
  const selectedCenter = typedCenters.find((center) => center.id === selectedCdId);

  let orders: DailyOrder[] = [];
  let allYearOrders: DailyOrder[] = [];

  if (selectedCdId) {
    const ordersResult = await fetchAllOrdersByCdAndYear(supabase, selectedCdId, selectedYear);

    if (ordersResult.error || !ordersResult.data) {
      throw new Error("Nao foi possivel carregar os pedidos do CD selecionado.");
    }

    orders = ordersResult.data;
  }

  const allOrdersResult = await fetchAllOrdersByYear(supabase, selectedYear);
  if (allOrdersResult.error || !allOrdersResult.data) {
    throw new Error("Nao foi possivel carregar a visao geral dos CDs.");
  }
  allYearOrders = allOrdersResult.data;

  const monthlyTotals = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, label: monthLabels[index], total: 0 }));

  orders.forEach((row) => {
    const month = Number(row.order_date.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthlyTotals[month - 1].total += row.quantity;
    }
  });

  const totalOrders = monthlyTotals.reduce((sum, item) => sum + item.total, 0);
  const maxMonthlyValue = Math.max(...monthlyTotals.map((item) => item.total), 1);
  const bestMonth = monthlyTotals.reduce((best, item) => (item.total > best.total ? item : best), monthlyTotals[0]);

  const distinctDays = new Set(orders.map((row) => row.order_date)).size;
  const averageByDay = distinctDays > 0 ? totalOrders / distinctDays : 0;
  const bestDay = orders.reduce(
    (best, row) => (row.quantity > best.quantity ? { date: row.order_date, quantity: row.quantity } : best),
    { date: "-", quantity: 0 }
  );
  const lastLaunch = orders[0]?.order_date ?? "-";
  const lastLaunchQuantity = orders[0]?.quantity ?? 0;

  const selectedMonthOrders = orders.filter((order) => Number(order.order_date.slice(5, 7)) === selectedMonth);
  const selectedMonthLabel = `${monthLabels[selectedMonth - 1]}/${selectedYear}`;

const monthlyTotalsAllCds = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, label: monthLabels[index], total: 0 }));

  allYearOrders.forEach((row) => {
    const month = Number(row.order_date.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthlyTotalsAllCds[month - 1].total += row.quantity;
    }
  });

  const maxMonthlyAllCdsValue = Math.max(...monthlyTotalsAllCds.map((item) => item.total), 1);
  const totalOrdersAllCds = monthlyTotalsAllCds.reduce((sum, item) => sum + item.total, 0);

  const totalsByCdMap = new Map<string, number>();
  allYearOrders.forEach((row) => {
    const rowMonth = Number(row.order_date.slice(5, 7));
    if (rowMonth === selectedMonth) {
      totalsByCdMap.set(row.distribution_center_id, (totalsByCdMap.get(row.distribution_center_id) ?? 0) + row.quantity);
    }
  });

  const totalsByCdForSelectedMonth = typedCenters
    .map((center) => ({
      id: center.id,
      code: center.code,
      name: center.name,
      total: totalsByCdMap.get(center.id) ?? 0
    }))
    .sort((a, b) => b.total - a.total);

  const maxCdMonthTotal = Math.max(...totalsByCdForSelectedMonth.map((item) => item.total), 1);
  return (
    <SidebarLayout profile={profile}>
      <section className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-r from-white to-brand-50/40 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Visao Geral por CD</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Pedidos do Ano referencia</h2>
            <p className="mt-1 text-sm text-slate-600">Acompanhe rapidamente os totais mensais e desempenho do CD.</p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            {selectedCenter ? `${selectedCenter.code} - ${selectedCenter.name}` : "CD nao definido"} | {selectedYear}
          </div>
        </div>

        <div className="mt-4">
          <PedidosFilters
            options={typedCenters}
            selectedCdId={selectedCdId}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            showCdSelect={profile.role === "manager"}
          />
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Anual - Geral CDS</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalOrdersAllCds}</p>
          <p className="mt-1 text-xs text-slate-500">Ano referencia: {selectedYear}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Media por dia lancado</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{averageByDay.toFixed(1)}</p>
          <p className="mt-1 text-xs text-slate-500">Dias com registro: {distinctDays}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Melhor dia</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{bestDay.date}</p>
          <p className="mt-1 text-sm text-slate-600">{bestDay.quantity} pedidos</p>
          <p className="mt-1 text-xs text-slate-500">
            CD: {selectedCenter ? `${selectedCenter.code} - ${selectedCenter.name}` : "Nao definido"}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Destaque mensal</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{bestMonth.label}</p>
          <p className="mt-1 text-sm text-slate-600">{bestMonth.total} pedidos</p>
        </article>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Quantidade de Pedidos Mensal {selectedYear} - {selectedCenter ? selectedCenter.name : "CD nao definido"}</h3>
          </div>


          <div className="space-y-2">
            {monthlyTotals.map((item) => {
              const width = (item.total / maxMonthlyValue) * 100;
              return (
                <div key={item.month} className="grid grid-cols-[44px_1fr_72px] items-center gap-3">
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-brand-500" style={{ width: `${Math.max(width, item.total > 0 ? 4 : 0)}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold text-slate-800">{item.total}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Total Anual - Geral CDS</h3>
            <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{selectedMonthLabel}</p>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {totalsByCdForSelectedMonth.map((item) => {
              const width = (item.total / maxCdMonthTotal) * 100;
              return (
                <div key={item.id} className="grid grid-cols-[58px_1fr_84px] items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">{item.code}</span>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-brand-500" style={{ width: `${Math.max(width, item.total > 0 ? 4 : 0)}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold text-slate-800">{item.total}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Quantidade Geral Mensal {selectedYear} - Todos os CDs</h3>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {monthlyTotalsAllCds.map((item) => {
              const width = (item.total / maxMonthlyAllCdsValue) * 100;
              return (
                <div key={item.month} className="grid grid-cols-[44px_1fr_72px] items-center gap-3">
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-brand-500" style={{ width: `${Math.max(width, item.total > 0 ? 4 : 0)}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold text-slate-800">{item.total}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-base font-bold text-slate-900">Resumo rapido</h3>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Ultimo lancamento</p>
            <p className="mt-1 font-semibold text-slate-900">{lastLaunch}</p>
            <p className="mt-1 text-sm text-slate-600">{lastLaunchQuantity} pedidos</p>
            <p className="mt-1 text-xs text-slate-500">CD: {selectedCenter ? `${selectedCenter.code} - ${selectedCenter.name}` : "Nao definido"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Mes com maior volume</p>
            <p className="mt-1 font-semibold text-slate-900">{bestMonth.label}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Pedidos no mes destaque</p>
            <p className="mt-1 font-semibold text-slate-900">{bestMonth.total}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-1 text-base font-bold text-slate-900">
          Lancamentos do mes selecionado ({monthLabels[selectedMonth - 1]}/{selectedYear})
        </h3>
        <p className="mb-3 text-sm text-slate-600">A tabela abaixo mostra somente os registros do mes escolhido no filtro.</p>

        {selectedMonthOrders.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum pedido encontrado para o CD no mes selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                  <th className="py-2">Data</th>
                  <th className="py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthOrders.slice(0, 31).map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 text-sm">
                    <td className="py-2">{order.order_date}</td>
                    <td className="py-2 font-semibold">{order.quantity}</td>
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












