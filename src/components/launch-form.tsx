"use client";

import { FormEvent, useState } from "react";

interface DistributionCenterOption {
  id: string;
  code: string;
  name: string;
}

interface LaunchFormProps {
  initialQuantity: number;
  initialCdId: string | null;
  availableCenters: DistributionCenterOption[];
  isManager: boolean;
}

export function LaunchForm({ initialQuantity, initialCdId, availableCenters, isManager }: LaunchFormProps) {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [centerId, setCenterId] = useState(initialCdId ?? availableCenters[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!centerId) {
      setStatus("Selecione um centro de distribuicao.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setStatus("Informe uma quantidade valida maior ou igual a zero.");
      return;
    }

    setIsLoading(true);
    setStatus(null);

    const response = await fetch("/api/lancamentos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        distributionCenterId: centerId,
        quantity: parsedQuantity
      })
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setStatus(payload.message ?? "Erro ao salvar lancamento.");
      setIsLoading(false);
      return;
    }

    setStatus("Lancamento salvo com sucesso.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="center" className="mb-1 block text-sm font-medium text-slate-700">
          Centro de distribuicao
        </label>
        <select
          id="center"
          value={centerId}
          disabled={!isManager}
          onChange={(event) => setCenterId(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
        >
          {availableCenters.map((center) => (
            <option key={center.id} value={center.id}>
              {center.code} - {center.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-slate-700">
          Quantidade de pedidos de hoje
        </label>
        <input
          id="quantity"
          type="number"
          min={0}
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
      >
        {isLoading ? "Salvando..." : "Salvar lancamento"}
      </button>
    </form>
  );
}
