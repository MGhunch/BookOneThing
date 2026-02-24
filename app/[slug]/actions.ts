"use server";

import { createClient } from "@supabase/supabase-js";
import { sendOwnerMagicLink } from "@/lib/email";

// Service role client — bypasses RLS, only used server-side
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Convert display values to DB values
function maxLengthMins(key: string): number {
  const map: Record<string, number> = {
    "30": 30, "120": 120, "hd": 240, "fd": 480, "none": 99999,
  };
  return map[key] ?? 120;
}

function bookAheadDays(key: string): number {
  const map: Record<string, number> = {
    "1": 30, "3": 90, "6": 180, "12": 365, "none": 99999,
  };
  return map[key] ?? 30;
}

function maxConcurrent(key: string): number {
  const map: Record<string, number> = {
    "3": 3, "5": 5, "10": 10, "none": 99999,
  };
  return map[key] ?? 3;
}

function bufferMins(key: string): number {
  return parseInt(key) || 0;
}

function availTimes(avail: string, fromH: number, toH: number) {
  if (avail === "9-5")  return { start: "09:00", end: "17:00" };
  if (avail === "24")   return { start: "00:00", end: "23:30" };
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return { start: fmt(fromH), end: fmt(toH) };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export type SetupFormData = {
  // Thing
  name: string;
  icon: string;
  avail: string;
  fromH: number;
  toH: number;
  weekends: boolean;
  notes: string;
  maxLen: string;
  ahead: string;
  concurrent: string;
  buffer: string;
  // Owner
  email: string;
  firstName: string;
};

export async function submitSetup(data: SetupFormData) {
  const supabase = adminClient();
  const slug = slugify(data.name);
  const { start, end } = availTimes(data.avail, data.fromH, data.toH);

  // 1. Store the pending thing
  const { data: pending, error: pendingError } = await supabase
    .from("pending_things")
    .insert({
      email:           data.email.trim().toLowerCase(),
      first_name:      data.firstName.trim(),
      name:            data.name.trim(),
      slug,
      icon:            data.icon || "car",
      avail_start:     start,
      avail_end:       end,
      avail_weekends:  data.weekends,
      max_length_mins: maxLengthMins(data.maxLen),
      book_ahead_days: bookAheadDays(data.ahead),
      max_concurrent:  maxConcurrent(data.concurrent),
      buffer_mins:     bufferMins(data.buffer),
      instructions:    data.notes.trim() || null,
    })
    .select("token")
    .single();

  if (pendingError || !pending) {
    console.error("Pending insert failed:", pendingError);
    return { error: "Something went wrong. Please try again." };
  }

  // 2. Generate the magic link — grab the URL, send via Resend
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";
  const redirectTo = `${siteUrl}/callback?token=${pending.token}`;

  const { data: linkData, error: authError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: data.email.trim().toLowerCase(),
    options: {
      redirectTo,
      data: {
        first_name: data.firstName.trim(),
      },
    },
  });

  if (authError || !linkData?.properties?.action_link) {
    console.error("Magic link failed:", authError);
    return { error: "Couldn't send the magic link. Please try again." };
  }

  // 3. Send via Resend with branded template
  try {
    await sendOwnerMagicLink({
      firstName: data.firstName.trim(),
      toEmail:   data.email.trim().toLowerCase(),
      thingName: data.name.trim(),
      magicLink: linkData.properties.action_link,
    });
  } catch (emailError) {
    console.error("Resend failed:", emailError);
    return { error: "Couldn't send the magic link. Please try again." };
  }

  return { ok: true };
}
