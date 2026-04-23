"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CdOption {
  id: string;
  code: string;
  name: string;
}

interface PedidosCdSelectProps {
  options: CdOption[];
  selectedCdId: string;
}

export function PedidosCdSelect({ options, selectedCdId }: PedidosCdSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextCdId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cd", nextCdId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">Centro de distribuicao</span>
      <select
        value={selectedCdId}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
      >
        {options.map((center) => (
          <option key={center.id} value={center.id}>
            {center.code} - {center.name}
          </option>
        ))}
      </select>
    </label>
  );
}
