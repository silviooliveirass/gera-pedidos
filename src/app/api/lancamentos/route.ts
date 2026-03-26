import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

interface RequestBody {
  distributionCenterId?: string;
  quantity?: number;
  orderDate?: string;
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === value;
}

function resolveDistributionCenterId(profile: Profile, requestedCenterId?: string) {
  return profile.role === "manager" ? requestedCenterId : profile.distribution_center_id;
}

async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, distribution_center_id, full_name")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile: profile ?? null };
}

export async function GET(request: Request) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (!profile) {
    return NextResponse.json({ message: "Perfil nao encontrado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const requestedCenterId = searchParams.get("distributionCenterId") ?? undefined;
  const orderDate = searchParams.get("orderDate") ?? "";

  if (!orderDate || !isValidDateOnly(orderDate)) {
    return NextResponse.json({ message: "Data invalida." }, { status: 400 });
  }

  const distributionCenterId = resolveDistributionCenterId(profile, requestedCenterId);

  if (!distributionCenterId) {
    return NextResponse.json({ message: "Centro de distribuicao nao definido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("daily_orders")
    .select("quantity")
    .eq("distribution_center_id", distributionCenterId)
    .eq("order_date", orderDate)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: "Nao foi possivel consultar o lancamento." }, { status: 500 });
  }

  return NextResponse.json({ quantity: data?.quantity ?? 0 });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (!profile) {
    return NextResponse.json({ message: "Perfil nao encontrado." }, { status: 403 });
  }

  const body = (await request.json()) as RequestBody;
  const quantity = Number(body.quantity);

  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Quantidade invalida." }, { status: 400 });
  }

  const orderDate = body.orderDate ?? todayDateOnly();

  if (!isValidDateOnly(orderDate)) {
    return NextResponse.json({ message: "Data invalida." }, { status: 400 });
  }

  if (orderDate > todayDateOnly()) {
    return NextResponse.json({ message: "Nao e permitido lancar em data futura." }, { status: 400 });
  }

  const distributionCenterId = resolveDistributionCenterId(profile, body.distributionCenterId);

  if (!distributionCenterId) {
    return NextResponse.json({ message: "Centro de distribuicao nao definido." }, { status: 400 });
  }

  const payload = {
    distribution_center_id: distributionCenterId,
    order_date: orderDate,
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
