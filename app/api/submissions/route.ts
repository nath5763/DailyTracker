import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGameAdapter } from "@/lib/games";

const confirmedSchema = z.object({
  puzzleKey: z.string().min(1).max(80), puzzleNumber: z.number().int().positive(), playedOn: z.string(), primaryScore: z.number().finite().min(1),
  metrics: z.object({ percentile: z.number().min(0).max(100).optional(), components: z.array(z.number().min(1)).max(10).optional() }), parserVersion: z.number().int().positive(),
});
const requestSchema = z.object({ game: z.string(), rawText: z.string().min(1).max(10_000), confirmed: confirmedSchema });

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to add a score." }, { status: 401 });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the confirmed puzzle, date, and score." }, { status: 400 });
  const adapter = getGameAdapter(body.data.game);
  if (!adapter) return NextResponse.json({ error: "That game is not supported." }, { status: 400 });
  if (!adapter.parseShareText(body.data.rawText).ok) return NextResponse.json({ error: "The original result text is no longer valid." }, { status: 422 });
  const errors = adapter.validate(body.data.confirmed);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
  const { data: game } = await supabase.from("games").select("id").eq("slug", body.data.game).eq("active", true).single();
  if (!game) return NextResponse.json({ error: "Game configuration is missing." }, { status: 503 });
  const value = body.data.confirmed;
  const { data: inserted, error } = await supabase.from("submissions").insert({ user_id: data.user.id, game_id: game.id, puzzle_key: String(value.puzzleNumber), played_on: value.playedOn, primary_score: value.primaryScore, metrics: value.metrics, raw_text: body.data.rawText, parser_version: value.parserVersion }).select("id").single();
  if (error?.code === "23505") return NextResponse.json({ error: "You already saved a result for this Fermi puzzle." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Could not save this score." }, { status: 500 });
  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
