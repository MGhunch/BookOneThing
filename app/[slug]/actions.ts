"use server";

import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

  const { error } = await supabase
    .from("bookings")
    .insert({
      thing_id:     thingId,
      booker_name:  bookerName.trim(),
      booker_email: bookerEmail.trim().toLowerCase(),
      starts_at:    startsAt,
      ends_at:      endsAt,
    });

  if (error) {
    // Exclusion constraint violation — slot taken
    if (error.code === "23P01") {
      return { error: "Sorry, that slot was just taken. Pick another time." };
    }
    console.error("Booking insert failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
