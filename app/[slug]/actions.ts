"use server";

import { createClient } from "@supabase/supabase-js";
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

export type BookingResult =
  | { ok: true }
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
  startsAt:    string; // ISO string
  endsAt:      string; // ISO string
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
    .select("id")
    .single();

  if (error) {
    // Exclusion constraint violation — slot taken
    if (error.code === "23P01") {
      return { error: "Sorry, that slot was just taken. Pick another time." };
    }
    console.error("Booking insert failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Fetch thing + org name for the email (non-blocking — don't fail the booking if email fails)
  try {
    const { data: thing } = await supabase
      .from("things")
      .select("name, timezone, profiles(org_name)")
      .eq("id", thingId)
      .single();

    await sendBookingConfirmation({
      bookingId:   booking.id,
      bookerName:  bookerName.trim(),
      bookerEmail: bookerEmail.trim().toLowerCase(),
      thingName:   thing?.name ?? "your booking",
      orgName:     extractOrgName(thing?.profiles),
      startsAt,
      endsAt,
      timezone:    thing?.timezone ?? "UTC",
    });
  } catch (emailErr) {
    // Log but don't surface to the user — booking succeeded
    console.error("Confirmation email failed:", emailErr);
  }

  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<BookingResult> {
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
