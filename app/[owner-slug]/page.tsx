import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ "owner-slug": string }>;
}) {
  const { "owner-slug": ownerSlug } = await params;
  const supabase = createServerClient();

  // Fetch the owner profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", ownerSlug)
    .single();

  if (profileError || !profile) notFound();

  // Fetch their first active thing
  const { data: things } = await supabase
    .from("things")
    .select("slug")
    .eq("owner_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!things || things.length === 0) notFound();

  redirect(`/${ownerSlug}/${things[0].slug}`);
}
