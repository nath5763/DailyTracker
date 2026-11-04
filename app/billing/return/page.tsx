import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BillingReturn({ searchParams }: { searchParams: Promise<{ checkout?: string; billing?: string }> }) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.checkout === "success" || params.checkout === "cancelled") query.set("checkout", params.checkout);
  if (params.billing === "returned") query.set("billing", "returned");
  redirect(`/profile/${encodeURIComponent(viewer.profile.shareId)}${query.size ? `?${query}` : ""}`);
}
