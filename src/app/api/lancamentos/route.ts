import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

interface RequestBody {
  distributionCenterId?: string;
  quantity?: number;
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
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
    .select("id, role, distribution_center_id, full_name")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    return NextResponse.json({ message: "Perfil nao encontrado." }, { status: 403 });
  }

  const body = (await request.json()) as RequestBody;
  const quantity = Number(body.quantity);

  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Quantidade invalida." }, { status: 400 });
  }

  const distributionCenterId =
    profile.role === "manager" ? body.distributionCenterId : profile.distribution_center_id;

  if (!distributionCenterId) {
    return NextResponse.json({ message: "Centro de distribuicao nao definido." }, { status: 400 });
  }

  const payload = {
    distribution_center_id: distributionCenterId,
    order_date: todayDateOnly(),
    quantity,
    created_by: user.id,
    updated_by: user.id
  };

  const { error } = await supabase.from("daily_orders").upsert(payload, {
    onConflict: "distribution_center_id,order_date"
  });

  if (error) {
    return NextResponse.json({ message: "Nao foi possivel salvar o lancamento." }, { status: 500 });
  }

  return NextResponse.json({ message: "Lancamento salvo com sucesso." });
}
