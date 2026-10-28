import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/public-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const publicOrigin = getPublicOrigin(request);
  const supabase = await createServerSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, publicOrigin));
  }
  return NextResponse.redirect(new URL("/auth?error=callback", publicOrigin));
}
