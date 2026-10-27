import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ status: "degraded", database: "not-configured" }, { status: 503 });
  const { error } = await supabase.from("games").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ status: "unhealthy", database: "unreachable" }, { status: 503 });
  return NextResponse.json({ status: "ok" });
}
