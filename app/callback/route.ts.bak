import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOwnerWelcome } from "@/lib/email";

const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const SYS    = "Poppins, -apple-system, BlinkMacSystemFont, sans-serif";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

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

// Simple "you're in" HTML page — shown after the magic link is clicked.
// The calendar is already open in the other tab; this page just confirms.
function youreInPage(firstName: string, thingName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;800&display=swap" rel="stylesheet"/>
<title>You're in</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${SYS};
    background: #e8e5e0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
  }
  .card {
    background: #fff;
    border-radius: 24px;
    padding: 48px 40px;
    max-width: 360px;
    width: 100%;
    text-align: center;
    box-shadow: 0 4px 32px rgba(0,0,0,0.07);
  }
  .tick {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: ${ORANGE};
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
  }
  h1 {
    font-size: 28px;
    font-weight: 800;
    color: ${DARK};
    letter-spacing: -0.6px;
    line-height: 1.2;
    margin-bottom: 10px;
  }
  p {
    font-size: 15px;
    color: #888;
    line-height: 1.65;
    margin-bottom: 32px;
  }
  .note {
    font-size: 13px;
    color: #bbb;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="tick">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4,14 10,21 24,7"/>
      </svg>
    </div>
    <h1>You're in, ${firstName}.</h1>
    <p>${thingName} is all yours.</p>
    <p class="note">Head back to your calendar.<br/>You can close this tab.</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const token = searchParams.get("token");

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

  // 2. Get the pending thing by token
  if (!token) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const { data: pending, error: pendingError } = await supabase
    .from("pending_things")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (pendingError || !pending) {
    // Token expired or not found — still log them in, send to home
    await supabase.from("profiles").upsert({
      id:    user.id,
      email: user.email!,
      first_name: user.user_metadata?.first_name ?? null,
    }, { onConflict: "id" });
    return NextResponse.redirect(`${appUrl}/`);
  }

  const ownerSlug = pending.owner_slug;
  const firstName = pending.first_name;

  // 3. Upsert the profile with the pre-generated owner slug
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("id", user.id)
    .single();

  await supabase.from("profiles").upsert({
    id:         user.id,
    email:      user.email!,
    first_name: firstName,
    // Only set slug if this is a new profile — don't overwrite existing owners
    slug:       existingProfile?.slug ?? ownerSlug,
  }, { onConflict: "id" });

  // 4. Create the real thing from the pending row
  const thingSlug = await uniqueThingSlug(supabase, user.id, pending.slug);

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

  if (thingError || !thing) {
    console.error("Thing creation failed:", thingError);
    return NextResponse.redirect(`${appUrl}/`);
  }

  // 5. Clean up the pending row
  await supabase.from("pending_things").delete().eq("token", token);

  // 6. Send owner welcome email (non-blocking)
  try {
    const shareUrl = `${appUrl}/${ownerSlug}/${thing.slug}`;
    await sendOwnerWelcome({
      firstName,
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

  // 7. Return the "you're in" page — calendar is polling and will show the modal
  return new NextResponse(youreInPage(firstName, pending.name), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
