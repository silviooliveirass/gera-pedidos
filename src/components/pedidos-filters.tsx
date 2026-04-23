"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CdOption {
  id: string;
  code: string;
  name: string;
}

interface PedidosFiltersProps {
  options?: CdOption[];
  selectedCdId?: string;
  selectedYear: number;
  selectedMonth: number;
  showCdSelect: boolean;
}

const monthOptions = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Marco" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" }
];

export function PedidosFilters({
  options = [],
  selectedCdId = "",
  selectedYear,
  selectedMonth,
  showCdSelect
}: PedidosFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: "cd" | "year" | "month", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {showCdSelect ? (
        <label className="text-sm">
          <span className="mb-1 block font-medium">Centro de distribuicao</span>
          <select
            value={selectedCdId}
            onChange={(event) => updateParam("cd", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {options.map((center) => (
              <option key={center.id} value={center.id}>
                {center.code} - {center.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="text-sm">
        <span className="mb-1 block font-medium">Ano referencia</span>
        <select
          value={String(selectedYear)}
          onChange={(event) => updateParam("year", event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {Array.from({ length: 7 }).map((_, index) => {
            const year = new Date().getFullYear() - index;
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Mes</span>
        <select
          value={String(selectedMonth)}
          onChange={(event) => updateParam("month", event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
