import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import type { Profile } from "@/types/database";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "id">>();

    if (profile) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <div className="w-full">
        <h1 className="mb-2 text-2xl font-bold">Entrar no sistema</h1>
        <p className="mb-6 text-sm text-slate-600">Controle de pedidos por centro de distribuicao</p>
        <LoginForm />
      </div>
    </main>
  );
}
