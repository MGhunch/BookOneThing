import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOwnerWelcome } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Generate a 4-char random code — e.g. "k7n2"
function randomCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Generate a unique owner slug from org name or email prefix + random code
// e.g. "harbour-works-k7n2"
async function uniqueOwnerSlug(
  supabase: ReturnType<typeof adminClient>,
  base: string
): Promise<string> {
  let slug = `${slugify(base)}-${randomCode()}`;
  // Extremely unlikely to collide but check anyway
  while (true) {
    const { data } = await supabase.from("profiles").select("id").eq("slug", slug).single();
    if (!data) return slug;
    slug = `${slugify(base)}-${randomCode()}`;
  }
}

// If "car-park" is taken for this owner, try "car-park-2" etc.
async function uniqueThingSlug(
  supabase: ReturnType<typeof adminClient>,
  ownerId: string,
  base: string
): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase
      .from("things")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("slug", slug)
      .single();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const token = searchParams.get("token"); // our pending_things token

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?error=no_code`);
  }

  const supabase = adminClient();

  // 1. Exchange the auth code for a session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError || !sessionData.user) {
    console.error("Auth exchange failed:", sessionError);
    return NextResponse.redirect(`${appUrl}/?error=auth_failed`);
  }

  const user = sessionData.user;

  // 2. Upsert the profile — generate an owner slug if this is a new account
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("id", user.id)
    .single();

  let ownerSlug = existingProfile?.slug ?? null;

  if (!ownerSlug) {
    // New owner — generate slug from org_name (if set) or email prefix
    const baseName = user.user_metadata?.org_name
      ?? user.email!.split("@")[0];
    ownerSlug = await uniqueOwnerSlug(supabase, baseName);
  }

  await supabase.from("profiles").upsert({
    id:         user.id,
    email:      user.email!,
    first_name: user.user_metadata?.first_name ?? null,
    slug:       ownerSlug,
  }, { onConflict: "id" });

  // 3. If we have a pending thing token, claim it
  if (token) {
    const { data: pending, error: pendingError } = await supabase
      .from("pending_things")
      .select("*")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!pendingError && pending) {
      const thingSlug = await uniqueThingSlug(supabase, user.id, slugify(pending.name));

      const { data: thing, error: thingError } = await supabase
        .from("things")
        .insert({
          owner_id:        user.id,
          name:            pending.name,
          slug:            thingSlug,
          icon:            pending.icon,
          avail_start:     pending.avail_start,
          avail_end:       pending.avail_end,
          avail_weekends:  pending.avail_weekends,
          timezone:        pending.timezone ?? "UTC",
          max_length_mins: pending.max_length_mins,
          book_ahead_days: pending.book_ahead_days,
          max_concurrent:  pending.max_concurrent,
          buffer_mins:     pending.buffer_mins,
          instructions:    pending.instructions,
          is_active:       true,
        })
        .select("slug")
        .single();

      if (!thingError && thing) {
        await supabase.from("pending_things").delete().eq("token", token);

        try {
          const shareUrl = `${appUrl}/${ownerSlug}/${thing.slug}`;
          await sendOwnerWelcome({
            firstName:     pending.first_name,
            toEmail:       pending.email,
            thingName:     pending.name,
            shareUrl,
            availStart:    pending.avail_start,
            availEnd:      pending.avail_end,
            availWeekends: pending.avail_weekends,
            maxLengthMins: pending.max_length_mins,
            bookAheadDays: pending.book_ahead_days,
            maxConcurrent: pending.max_concurrent,
          });
        } catch (emailErr) {
          console.error("Owner welcome email failed:", emailErr);
        }

        return NextResponse.redirect(`${appUrl}/${ownerSlug}/${thing.slug}`);
      }
    }
  }

  // Fallback — no pending thing, send to home
  return NextResponse.redirect(`${appUrl}/`);
}

