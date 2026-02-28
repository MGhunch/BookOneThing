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

function extractOwnerSlug(profiles: unknown): string {
  if (!profiles) return "";
  if (Array.isArray(profiles)) return (profiles[0] as { slug?: string | null })?.slug ?? "";
  return (profiles as { slug?: string | null })?.slug ?? "";
}

export type BookingResult =
  | { ok: true; bookingId: string; cancelToken: string }
  | { error: "MAX_LENGTH";      maxLengthMins: number }
  | { error: "BOOK_AHEAD" }
  | { error: "AVAIL_HOURS";     availStart: string; availEnd: string }
  | { error: "AVAIL_WEEKENDS" }
  | { error: "MAX_CONCURRENT";  currentCount: number }
  | { error: "OVERLAP" }
  | { error: "GENERIC" };

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a DB time string "HH:MM" into total minutes since midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Return { hour, minute, dayOfWeek(0=Sun) } for a UTC ISO string in a given IANA timezone */
function inTz(iso: string, tz: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric", minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  const hour   = parseInt(get("hour"),   10);
  const minute = parseInt(get("minute"), 10);
  const weekday = get("weekday"); // "Mon", "Tue", … "Sat", "Sun"
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  return { hour, minute, isWeekend, totalMins: hour * 60 + minute };
}

// ── createBooking ──────────────────────────────────────────────────────────────

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

  // ── 1. Fetch thing rules (needed for validation AND the email) ──────────────
  const { data: thing, error: thingErr } = await supabase
    .from("things")
    .select("name, timezone, instructions, avail_start, avail_end, avail_weekends, max_length_mins, book_ahead_days, max_concurrent, buffer_mins, profiles(org_name)")
    .eq("id", thingId)
    .single();

  if (thingErr || !thing) {
    console.error("Thing fetch failed:", thingErr);
    return { error: "GENERIC" };
  }

  const tz = thing.timezone ?? "UTC";

  // ── 2. Max booking length ───────────────────────────────────────────────────
  const durationMins = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
  if (durationMins > thing.max_length_mins) {
    return { error: "MAX_LENGTH", maxLengthMins: thing.max_length_mins };
  }

  // ── 3. Book ahead window ────────────────────────────────────────────────────
  const maxAheadMs = thing.book_ahead_days * 24 * 60 * 60 * 1000;
  if (new Date(startsAt).getTime() - Date.now() > maxAheadMs) {
    return { error: "BOOK_AHEAD" };
  }

  // ── 4. Availability hours + weekends ────────────────────────────────────────
  const start = inTz(startsAt, tz);
  const end   = inTz(endsAt,   tz);

  if (!thing.avail_weekends && (start.isWeekend || end.isWeekend)) {
    return { error: "AVAIL_WEEKENDS" };
  }

  const availStartMins = timeToMins(thing.avail_start);
  const availEndMins   = timeToMins(thing.avail_end);
  if (start.totalMins < availStartMins || end.totalMins > availEndMins) {
    return { error: "AVAIL_HOURS", availStart: thing.avail_start, availEnd: thing.avail_end };
  }

  // ── 5. Max concurrent bookings per person ───────────────────────────────────
  const { count: concurrentCount, error: concErr } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("thing_id", thingId)
    .eq("booker_email", bookerEmail.trim().toLowerCase())
    .gt("starts_at", new Date().toISOString())
    .is("cancelled_at", null);

  if (concErr) {
    console.error("Concurrent check failed:", concErr);
    return { error: "GENERIC" };
  }

  if ((concurrentCount ?? 0) >= thing.max_concurrent) {
    return { error: "MAX_CONCURRENT", currentCount: concurrentCount ?? thing.max_concurrent };
  }

  // ── 6. Buffer check ─────────────────────────────────────────────────────────
  if (thing.buffer_mins > 0) {
    const bufferMs      = thing.buffer_mins * 60 * 1000;
    const bufferBefore  = new Date(new Date(startsAt).getTime() - bufferMs).toISOString();
    const bufferAfter   = new Date(new Date(endsAt).getTime()   + bufferMs).toISOString();

    const { count: bufferCount, error: bufErr } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("thing_id", thingId)
      .is("cancelled_at", null)
      .or(`ends_at.gt.${bufferBefore},starts_at.lt.${bufferAfter}`)
      .neq("ends_at", startsAt); // exact adjacency is fine

    if (bufErr) {
      console.error("Buffer check failed:", bufErr);
      return { error: "GENERIC" };
    }
    if ((bufferCount ?? 0) > 0) {
      return { error: "OVERLAP" };
    }
  }

  // ── 7. Insert — DB exclusion constraint is the final backstop ───────────────
  const { data: booking, error: insertErr } = await supabase
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

  if (insertErr) {
    if (insertErr.code === "23P01") {
      return { error: "OVERLAP" };
    }
    console.error("Booking insert failed:", insertErr);
    return { error: "GENERIC" };
  }

  // ── 8. Send confirmation email (non-blocking, re-uses thing data) ────────────
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";
    await sendBookingConfirmation({
      bookingId:            booking.id,
      bookerName:           bookerName.trim(),
      bookerEmail:          bookerEmail.trim().toLowerCase(),
      thingName:            thing.name ?? "your booking",
      orgName:              extractOrgName(thing.profiles),
      startsAt,
      endsAt,
      timezone:             tz,
      cancelUrl:            `${appUrl}/cancel?token=${booking.cancel_token}`,
      specialInstructions:  thing.instructions ?? undefined,
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
        .select("name, slug, timezone, profiles(org_name, slug)")
        .eq("id", booking.thing_id)
        .single();

      const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";
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
        timezone:    thing?.timezone ?? "UTC",
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
