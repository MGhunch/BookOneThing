"use server";

import { createClient } from "@supabase/supabase-js";
import { sendBookerMagicLink } from "@/lib/email";
import crypto from "crypto";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type GateResult =
  | { ok: true }
  | { error: string };

export async function sendGateMagicLink({
  email,
  thingId,
  thingName,
  slug,
}: {
  email:     string;
  thingId:   string;
  thingName: string;
  slug:      string;
}): Promise<GateResult> {
  const supabase = adminClient();
  const cleanEmail = email.trim().toLowerCase();

  // Check if we already know this booker's name from a previous booking
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("booker_name")
    .eq("booker_email", cleanEmail)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Use first word of their name if we have it, otherwise fall back to "there"
  const firstName = existingBooking?.booker_name
    ? existingBooking.booker_name.trim().split(" ")[0]
    : "there";

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("booker_sessions").insert({
    email:      cleanEmail,
    first_name: firstName,
    thing_id:   thingId,
    slug,
    token,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Failed to create booker session:", error);
    return { error: "Something went wrong. Please try again." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";
  const magicLink = `${appUrl}/${slug}/auth?token=${token}`;

  try {
    await sendBookerMagicLink({
      firstName,
      toEmail:   cleanEmail,
      thingName,
      magicLink,
    });
  } catch (emailErr) {
    console.error("Magic link email failed:", emailErr);
    await supabase.from("booker_sessions").delete().eq("token", token);
    return { error: "Couldn't send the email. Please try again." };
  }

  return { ok: true };
}
