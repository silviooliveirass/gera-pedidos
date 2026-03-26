import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

interface ImportErrorItem {
  line: number;
  message: string;
}

interface CsvRow {
  line: number;
  code: string;
  orderDate: string;
  quantity: number;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function parseCsvContent(csvText: string): { rows: CsvRow[]; errors: ImportErrorItem[] } {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ line: 1, message: "CSV sem dados. Inclua cabecalho e ao menos uma linha." }]
    };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerParts = lines[0].split(delimiter).map(normalizeHeader);

  const codeIndex = headerParts.findIndex((h) => ["codigo_cd", "codigo", "cd", "code"].includes(h));
  const dateIndex = headerParts.findIndex((h) => ["data", "order_date", "date"].includes(h));
  const qtyIndex = headerParts.findIndex((h) => ["quantidade", "qtd", "quantity"].includes(h));

  if (codeIndex === -1 || dateIndex === -1 || qtyIndex === -1) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message:
            "Cabecalho invalido. Use: codigo_cd,data,quantidade (ou com ';')."
        }
      ]
    };
  }

  const errors: ImportErrorItem[] = [];
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const sourceLine = lines[i];
    const columns = sourceLine.split(delimiter).map((item) => item.trim());
    const lineNumber = i + 1;

    const code = columns[codeIndex] ?? "";
    const orderDate = columns[dateIndex] ?? "";
    const qtyText = columns[qtyIndex] ?? "";

    if (!code || !orderDate || !qtyText) {
      errors.push({ line: lineNumber, message: "Campos obrigatorios ausentes." });
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
      errors.push({ line: lineNumber, message: "Data invalida. Use YYYY-MM-DD." });
      continue;
    }

    const parsedDate = new Date(`${orderDate}T00:00:00Z`);
    if (parsedDate.toISOString().slice(0, 10) !== orderDate) {
      errors.push({ line: lineNumber, message: "Data inexistente." });
      continue;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (orderDate > today) {
      errors.push({ line: lineNumber, message: "Data futura nao permitida." });
      continue;
    }

    const quantity = Number(qtyText.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push({ line: lineNumber, message: "Quantidade invalida." });
      continue;
    }

    rows.push({
      line: lineNumber,
      code,
      orderDate,
      quantity: Math.round(quantity)
    });
  }

  return { rows, errors };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Pick<Profile, "id" | "role">>();

  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ message: "Apenas gestores podem importar CSV." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Arquivo CSV nao informado." }, { status: 400 });
  }

  const csvText = await file.text();
  const parsed = parseCsvContent(csvText);

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        message: "Nenhuma linha valida para importar.",
        imported: 0,
        errors: parsed.errors
      },
      { status: 400 }
    );
  }

  const { data: centers, error: centersError } = await supabase
    .from("distribution_centers")
    .select("id, code");

  if (centersError || !centers) {
    return NextResponse.json({ message: "Nao foi possivel carregar os CDs." }, { status: 500 });
  }

  const centerByCode = new Map<string, string>();
  centers.forEach((center) => {
    centerByCode.set(String(center.code), String(center.id));
  });

  const errors: ImportErrorItem[] = [...parsed.errors];
  const payload: Array<{
    distribution_center_id: string;
    order_date: string;
    quantity: number;
    created_by: string;
    updated_by: string;
  }> = [];

  parsed.rows.forEach((row) => {
    const centerId = centerByCode.get(row.code);

    if (!centerId) {
      errors.push({ line: row.line, message: `CD '${row.code}' nao encontrado.` });
      return;
    }

    payload.push({
      distribution_center_id: centerId,
      order_date: row.orderDate,
      quantity: row.quantity,
      created_by: user.id,
      updated_by: user.id
    });
  });

  if (payload.length === 0) {
    return NextResponse.json(
      {
        message: "Nenhuma linha valida para importar.",
        imported: 0,
        errors
      },
      { status: 400 }
    );
  }

  const { error: upsertError } = await supabase.from("daily_orders").upsert(payload, {
    onConflict: "distribution_center_id,order_date"
  });

  if (upsertError) {
    return NextResponse.json({ message: "Erro ao importar lancamentos." }, { status: 500 });
  }

  return NextResponse.json({
    message: "Importacao concluida.",
    imported: payload.length,
    errors
  });
}
