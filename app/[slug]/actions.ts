"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendBookingConfirmation, sendCancellationConfirmation } from "@/lib/email";

const SESSION_COOKIE = "bot_session";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Supabase returns joined rows as object or array depending on relationship type.
// This handles both safely.
function extractOrgName(profiles: unknown): string {
  if (!profiles) return "";
  if (Array.isArray(profiles)) {
    return (profiles[0] as { org_name?: string | null })?.org_name ?? "";
  }
  return (profiles as { org_name?: string | null })?.org_name ?? "";
}

// Read and validate the bot_session cookie server-side.
// Returns the verified session, or null if missing/invalid.
async function readSession(): Promise<{ email: string; firstName: string } | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.email === "string" && typeof parsed.firstName === "string") {
      return { email: parsed.email.trim().toLowerCase(), firstName: parsed.firstName.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

export type BookingResult =
  | { ok: true; bookingId: string; cancelToken: string }
  | { error: string };

export async function createBooking({
  thingId,
  startsAt,
  endsAt,
}: {
  thingId:  string;
  startsAt: string;
  endsAt:   string;
}): Promise<BookingResult> {
  // Gate: must have a valid session cookie. We read identity server-side —
  // the client has no say over who is making this booking.
  const session = await readSession();
  if (!session) {
    return { error: "Click your magic link to book." };
  }

  const supabase = adminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      thing_id:     thingId,
      booker_name:  session.firstName,
      booker_email: session.email,
      starts_at:    startsAt,
      ends_at:      endsAt,
    })
    .select("id, cancel_token")
    .single();

  if (error) {
    if (error.code === "23P01") {
      // Exclusion constraint violation — another booking beat us to it.
      // The DB handles this atomically, so first-writer always wins.
      return { error: "Sorry, that slot was just taken. Pick another time." };
    }
    console.error("Booking insert failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Fetch thing + org name for the email (non-blocking)
  try {
    const { data: thing } = await supabase
      .from("things")
      .select("name, timezone, profiles(org_name)")
      .eq("id", thingId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";
    await sendBookingConfirmation({
      bookingId:   booking.id,
      bookerName:  session.firstName,
      bookerEmail: session.email,
      thingName:   thing?.name ?? "your booking",
      orgName:     extractOrgName(thing?.profiles),
      startsAt,
      endsAt,
      timezone:    thing?.timezone ?? "UTC",
      cancelUrl:   `${appUrl}/cancel?token=${booking.cancel_token}`,
    });
  } catch (emailErr) {
    console.error("Confirmation email failed:", emailErr);
  }

  return { ok: true, bookingId: booking.id, cancelToken: booking.cancel_token };
}

export async function cancelBooking(bookingId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = adminClient();

  // Fetch booking details before cancelling (needed for the email)
  const { data: booking } = await supabase
    .from("bookings")
    .select("booker_name, booker_email, starts_at, ends_at, thing_id")
    .eq("id", bookingId)
    .single();

  const { error } = await supabase
    .from("bookings")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    console.error("Cancel failed:", error);
    return { error: "Couldn't cancel that booking. Please try again." };
  }

  // Send cancellation email if we have the data (non-blocking)
  if (booking?.booker_email) {
    try {
      const { data: thing } = await supabase
        .from("things")
        .select("name, profiles(org_name)")
        .eq("id", booking.thing_id)
        .single();

      await sendCancellationConfirmation({
        bookerName:  booking.booker_name,
        bookerEmail: booking.booker_email,
        thingName:   thing?.name ?? "your booking",
        orgName:     extractOrgName(thing?.profiles),
        startsAt:    booking.starts_at,
        endsAt:      booking.ends_at,
      });
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr);
    }
  }

  return { ok: true };
}

export async function setReminderPreference({
  bookingId,
  optIn,
  note,
}: {
  bookingId: string;
  optIn:     boolean;
  note?:     string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = adminClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      reminder_opt_in: optIn,
      reminder_note:   note?.trim() || null,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Reminder preference failed:", error);
    return { error: "Couldn't save that. Please try again." };
  }

  return { ok: true };
}
