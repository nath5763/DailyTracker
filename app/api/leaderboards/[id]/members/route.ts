import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const addSchema = z.object({ shareId: z.string().uuid() });
const removeSchema = z.object({ userId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid leaderboard." }, { status: 400 });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = addSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter a complete account UUID." }, { status: 400 });
  const { error } = await supabase.rpc("add_leaderboard_member", { leaderboard_input: id, share_id_input: body.data.shareId });
  if (error) return NextResponse.json({ error: "Account not found or you cannot manage this leaderboard." }, { status: error.code === "23505" ? 409 : 404 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = removeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid player." }, { status: 400 });
  const { error } = await supabase.rpc("remove_leaderboard_member", { leaderboard_input: id, user_id_input: body.data.userId });
  if (error) return NextResponse.json({ error: "Could not remove that player." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
