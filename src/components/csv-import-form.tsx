"use client";

import { FormEvent, useMemo, useState } from "react";

interface ImportResponse {
  message?: string;
  imported?: number;
  errors?: Array<{ line: number; message: string }>;
}

const EXAMPLE_CSV = `codigo_cd,data,quantidade
08,2026-02-01,120
08,2026-02-02,98
10,2026-02-01,150`;

export function CsvImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imported, setImported] = useState<number>(0);
  const [errors, setErrors] = useState<Array<{ line: number; message: string }>>([]);

  const hasErrors = useMemo(() => errors.length > 0, [errors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setMessage("Selecione um arquivo CSV.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setImported(0);
    setErrors([]);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/lancamentos/importar", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json()) as ImportResponse;

    setMessage(payload.message ?? (response.ok ? "Importacao concluida." : "Erro na importacao."));
    setImported(payload.imported ?? 0);
    setErrors(payload.errors ?? []);
    setIsLoading(false);
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold">Importacao em lote (CSV)</h3>
      <p className="mt-1 text-sm text-slate-600">Use para subir varios dias de uma vez (ex.: mes passado completo).</p>

      <details className="mt-3 rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">Ver formato do CSV</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-100 p-3 text-xs">{EXAMPLE_CSV}</pre>
      </details>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="csv-file" className="mb-1 block text-sm font-medium text-slate-700">
            Arquivo CSV
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
        >
          {isLoading ? "Importando..." : "Importar CSV"}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      {imported > 0 ? <p className="text-sm text-green-700">Linhas importadas: {imported}</p> : null}

      {hasErrors ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-sm font-semibold text-red-700">Erros encontrados:</p>
          <ul className="space-y-1 text-sm text-red-700">
            {errors.slice(0, 30).map((item, index) => (
              <li key={`${item.line}-${index}`}>
                Linha {item.line}: {item.message}
              </li>
            ))}
          </ul>
          {errors.length > 30 ? <p className="mt-2 text-xs text-red-700">Mostrando 30 de {errors.length} erros.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
