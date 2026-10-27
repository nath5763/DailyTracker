import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(2).max(48) });

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Use a name between 2 and 48 characters." }, { status: 400 });
  const { data, error } = await supabase.rpc("create_leaderboard", { name_input: body.data.name });
  if (error) return NextResponse.json({ error: "Could not create leaderboard." }, { status: 500 });
  return NextResponse.json({ id: data }, { status: 201 });
}
