"use client";

import { FormEvent, useEffect, useState } from "react";

interface DistributionCenterOption {
  id: string;
  code: string;
  name: string;
}

interface LaunchFormProps {
  initialQuantity: number;
  initialDate: string;
  initialCdId: string | null;
  availableCenters: DistributionCenterOption[];
  isManager: boolean;
}

interface QuantityResponse {
  quantity?: number;
  message?: string;
}

export function LaunchForm({
  initialQuantity,
  initialDate,
  initialCdId,
  availableCenters,
  isManager
}: LaunchFormProps) {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [orderDate, setOrderDate] = useState(initialDate);
  const [centerId, setCenterId] = useState(initialCdId ?? availableCenters[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  useEffect(() => {
    async function loadExistingQuantity() {
      if (!centerId || !orderDate) {
        setQuantity("0");
        return;
      }

      setIsLoadingExisting(true);
      setStatus(null);

      const query = new URLSearchParams({
        distributionCenterId: centerId,
        orderDate
      });

      const response = await fetch(`/api/lancamentos?${query.toString()}`);
      const payload = (await response.json()) as QuantityResponse;

      if (!response.ok) {
        setStatus(payload.message ?? "Nao foi possivel carregar o lancamento da data.");
        setIsLoadingExisting(false);
        return;
      }

      setQuantity(String(payload.quantity ?? 0));
      setIsLoadingExisting(false);
    }

    void loadExistingQuantity();
  }, [centerId, orderDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!centerId) {
      setStatus("Selecione um centro de distribuicao.");
      return;
    }

    if (!orderDate) {
      setStatus("Selecione uma data valida.");
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
        orderDate,
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
        <label htmlFor="orderDate" className="mb-1 block text-sm font-medium text-slate-700">
          Data do lancamento
        </label>
        <input
          id="orderDate"
          type="date"
          required
          value={orderDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setOrderDate(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-slate-700">
          Quantidade de pedidos
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

      {isLoadingExisting ? <p className="text-sm text-slate-500">Carregando valor ja lancado para esta data...</p> : null}
      {status ? <p className="text-sm text-slate-700">{status}</p> : null}

      <button
        type="submit"
        disabled={isLoading || isLoadingExisting}
        className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
      >
        {isLoading ? "Salvando..." : "Salvar lancamento"}
      </button>
    </form>
  );
}
