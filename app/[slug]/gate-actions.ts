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
  firstName,
  thingId,
  thingName,
  slug,
}: {
  email:     string;
  firstName: string;
  thingId:   string;
  thingName: string;
  slug:      string;
}): Promise<GateResult> {
  const supabase = adminClient();

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const { error } = await supabase.from("booker_sessions").insert({
    email:      email.trim().toLowerCase(),
    first_name: firstName.trim(),
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
      firstName: firstName.trim(),
      toEmail:   email.trim().toLowerCase(),
      thingName,
      magicLink,
    });
  } catch (emailErr) {
    console.error("Magic link email failed:", emailErr);
    // Clean up the session if email failed
    await supabase.from("booker_sessions").delete().eq("token", token);
    return { error: "Couldn't send the email. Please try again." };
  }

  return { ok: true };
}
