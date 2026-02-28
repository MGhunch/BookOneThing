"use server";

import { createClient } from "@supabase/supabase-js";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";

import { sendBookingConfirmation, sendCancellationConfirmation } from "@/lib/email";

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

function extractOwnerSlug(profiles: unknown): string {
  if (!profiles) return "";
  if (Array.isArray(profiles)) return (profiles[0] as { slug?: string | null })?.slug ?? "";
  return (profiles as { slug?: string | null })?.slug ?? "";
}

export type BookingResult =
  | { ok: true; bookingId: string; cancelToken: string }
  | { error: string };

export async function createBooking({
  thingId,
  bookerName,
  bookerEmail,
  startsAt,
  endsAt,
}: {
  thingId:     string;
  bookerName:  string;
  bookerEmail: string;
  startsAt:    string;
  endsAt:      string;
}): Promise<BookingResult> {
  const supabase = adminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      thing_id:     thingId,
      booker_name:  bookerName.trim(),
      booker_email: bookerEmail.trim().toLowerCase(),
      starts_at:    startsAt,
      ends_at:      endsAt,
    })
    .select("id, cancel_token")
    .single();

  if (error) {
    if (error.code === "23P01") {
      return { error: "Sorry, that slot was just taken. Pick another time." };
    }
    console.error("Booking insert failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Fetch thing + org name + special instructions for the email (non-blocking)
  try {
    const { data: thing } = await supabase
      .from("things")
      .select("name, timezone, instructions, profiles(org_name)")
      .eq("id", thingId)
      .single();

    await sendBookingConfirmation({
      bookingId:            booking.id,
      bookerName:           bookerName.trim(),
      bookerEmail:          bookerEmail.trim().toLowerCase(),
      thingName:            thing?.name ?? "your booking",
      orgName:              extractOrgName(thing?.profiles),
      startsAt,
      endsAt,
      timezone:             thing?.timezone ?? "UTC",
      cancelUrl:            `${appUrl}/cancel?token=${booking.cancel_token}`,
      specialInstructions:  thing?.instructions ?? undefined,
      calBaseUrl:           appUrl,
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
        .select("name, slug, profiles(org_name, slug)")
        .eq("id", booking.thing_id)
        .single();

      const ownerSlug    = extractOwnerSlug(thing?.profiles);
      const calendarUrl  = ownerSlug && thing?.slug
        ? `${appUrl}/${ownerSlug}/${thing.slug}`
        : undefined;

      await sendCancellationConfirmation({
        bookerName:  booking.booker_name,
        bookerEmail: booking.booker_email,
        thingName:   thing?.name ?? "your booking",
        orgName:     extractOrgName(thing?.profiles),
        startsAt:    booking.starts_at,
        endsAt:      booking.ends_at,
        calendarUrl,
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
