import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCancellationConfirmation } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractOrgName(profiles: unknown): string {
  if (!profiles) return "";
  if (Array.isArray(profiles)) return (profiles[0] as { org_name?: string | null })?.org_name ?? "";
  return (profiles as { org_name?: string | null })?.org_name ?? "";
}

function extractOwnerSlug(profiles: unknown): string {
  if (!profiles) return "";
  if (Array.isArray(profiles)) return (profiles[0] as { slug?: string | null })?.slug ?? "";
  return (profiles as { slug?: string | null })?.slug ?? "";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/?error=invalid_link`);
  }

  const supabase = adminClient();

  // Find the booking by cancel token — must be active (not already cancelled)
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, booker_name, booker_email, starts_at, ends_at, cancelled_at, thing_id")
    .eq("cancel_token", token)
    .single();

  if (error || !booking) {
    return NextResponse.redirect(`${origin}/cancelled?reason=not_found`);
  }

  if (booking.cancelled_at) {
    // Already cancelled — just show the page, don't error
    return NextResponse.redirect(`${origin}/cancelled?reason=already_cancelled`);
  }

  // Soft delete
  const { error: cancelError } = await supabase
    .from("bookings")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (cancelError) {
    console.error("Token cancel failed:", cancelError);
    return NextResponse.redirect(`${origin}/?error=cancel_failed`);
  }

  // Send cancellation email (non-blocking)
  if (booking.booker_email) {
    try {
      const { data: thing } = await supabase
        .from("things")
        .select("name, slug, profiles(org_name, slug)")
        .eq("id", booking.thing_id)
        .single();

      await sendCancellationConfirmation({
        bookerName:  booking.booker_name,
        bookerEmail: booking.booker_email,
        thingName:   thing?.name ?? "your booking",
        orgName:     extractOrgName(thing?.profiles),
        startsAt:    booking.starts_at,
        endsAt:      booking.ends_at,
        calendarUrl: ownerSlug && thing?.slug ? `${origin}/${ownerSlug}/${thing.slug}` : undefined,
      });

      // Redirect back to the thing's calendar
      if (thing?.slug) {
        const ownerSlug = extractOwnerSlug(thing?.profiles);
        if (ownerSlug) {
          return NextResponse.redirect(`${origin}/${ownerSlug}/${thing.slug}?cancelled=1`);
        }
      }
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr);
    }
  }

  return NextResponse.redirect(`${origin}/cancelled`);
}
