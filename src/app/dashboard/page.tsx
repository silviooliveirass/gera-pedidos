import { AppHeader } from "@/components/app-header";
import { requireProfile } from "@/lib/auth";
import type { DailyOrder, DistributionCenter } from "@/types/database";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

interface DashboardSearchParams {
  month?: string;
  year?: string;
  center?: string;
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

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (centersError || !centers) {
    throw new Error("Nao foi possivel carregar os centros de distribuicao.");
  }

  const typedCenters = centers as DistributionCenter[];

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const { data: orders, error: ordersError } = await supabase
    .from("daily_orders")
    .select("id, distribution_center_id, order_date, quantity, created_by, updated_by, created_at, updated_at")
    .gte("order_date", yearStart)
    .lte("order_date", yearEnd);

  if (ordersError || !orders) {
    throw new Error("Nao foi possivel carregar os lancamentos.");
  }

  const typedOrders = orders as DailyOrder[];
  const today = toDateOnly(now);

  const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(selectedYear, selectedMonth, 0));
  const monthEnd = toDateOnly(monthEndDate);

  const centerSummaries = typedCenters
    .filter((center) => (selectedCenter === "all" ? true : center.id === selectedCenter))
    .map((center) => {
      const centerOrders = typedOrders.filter((order) => order.distribution_center_id === center.id);

      const totalDay = centerOrders
        .filter((order) => order.order_date === today)
        .reduce((sum, current) => sum + current.quantity, 0);

      const totalMonth = centerOrders
        .filter((order) => order.order_date >= monthStart && order.order_date <= monthEnd)
        .reduce((sum, current) => sum + current.quantity, 0);

      const totalYear = centerOrders.reduce((sum, current) => sum + current.quantity, 0);

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
  const totalMonthAll = centerSummaries.reduce((sum, current) => sum + current.totalMonth, 0);
  const totalYearAll = centerSummaries.reduce((sum, current) => sum + current.totalYear, 0);

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
          <p className="mt-2 text-3xl font-bold">{totalMonthAll}</p>
        </article>
        <article className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Pedidos no ano ({selectedYear})</p>
          <p className="mt-2 text-3xl font-bold">{totalYearAll}</p>
        </article>
      </section>

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">CD destaque do mes</h2>
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

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Ranking mensal por CD</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                <th className="py-2">Posicao</th>
                <th className="py-2">CD</th>
                <th className="py-2">Dia</th>
                <th className="py-2">Mes</th>
                <th className="py-2">Ano</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">
                    {item.code} - {item.name}
                  </td>
                  <td className="py-2">{item.totalDay}</td>
                  <td className="py-2 font-semibold">{item.totalMonth}</td>
                  <td className="py-2">{item.totalYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
