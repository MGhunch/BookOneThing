import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOwnerWelcome } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const token = searchParams.get("token"); // our pending_things token

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const supabase = adminClient();

  // 1. Exchange the auth code for a session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError || !sessionData.user) {
    console.error("Auth exchange failed:", sessionError);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const user = sessionData.user;

  // 2. Upsert the profile (may already exist if returning owner)
  await supabase.from("profiles").upsert({
    id:         user.id,
    email:      user.email!,
    first_name: user.user_metadata?.first_name ?? null,
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
      // Check slug isn't already taken
      const slug = await uniqueSlug(supabase, pending.slug);

      // Insert into things
      const { data: thing, error: thingError } = await supabase
        .from("things")
        .insert({
          owner_id:        user.id,
          name:            pending.name,
          slug,
          icon:            pending.icon,
          avail_start:     pending.avail_start,
          avail_end:       pending.avail_end,
          avail_weekends:  pending.avail_weekends,
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
        // Clean up the pending row
        await supabase.from("pending_things").delete().eq("token", token);

        // Send owner welcome email (non-blocking — don't fail the redirect if it errors)
        try {
          const shareUrl = `${origin}/${thing.slug}`;
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

        // Redirect to the live calendar
        return NextResponse.redirect(`${origin}/${thing.slug}`);
      }
    }
  }

  // Fallback — no pending thing, send to home
  return NextResponse.redirect(`${origin}/`);
}

// If "the-car-park" is taken, try "the-car-park-2" etc.
async function uniqueSlug(supabase: ReturnType<typeof adminClient>, base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase.from("things").select("id").eq("slug", slug).single();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}
