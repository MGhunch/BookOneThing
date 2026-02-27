import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Poll endpoint — Calendar calls this every 3s when isPending=true
// Returns { active: true } once the owner has clicked the magic link
// and the real thing exists in the DB.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ownerSlug = searchParams.get("ownerSlug");
  const thingSlug = searchParams.get("thingSlug");

  if (!ownerSlug || !thingSlug) {
    return NextResponse.json({ active: false });
  }

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", ownerSlug)
    .single();

  if (!profile) {
    return NextResponse.json({ active: false });
  }

  const { data: thing } = await supabase
    .from("things")
    .select("id")
    .eq("owner_id", profile.id)
    .eq("slug", thingSlug)
    .eq("is_active", true)
    .single();

  return NextResponse.json({ active: !!thing });
}
