import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGameAdapter } from "@/lib/games";

const requestSchema = z.object({ game: z.string(), rawText: z.string().max(10_000) });

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to add a score." }, { status: 401 });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  const adapter = getGameAdapter(body.data.game);
  if (!adapter) return NextResponse.json({ error: "That game is not supported yet." }, { status: 400 });
  const result = adapter.parseShareText(body.data.rawText);
  if (!result.ok) return NextResponse.json({ error: result.errors.join(" ") }, { status: 422 });
  return NextResponse.json({ submission: result.value });
}
