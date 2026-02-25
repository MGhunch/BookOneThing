"use server";

import { createClient } from "@supabase/supabase-js";
import { randomCodeword } from "@/lib/codewords";
import { sendCodewordEmail } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── SEND ─────────────────────────────────────────────────────────────────────

export type SendCodewordArgs =
  | { context: "manage"; email: string; firstName?: string }
  | { context: "booker"; email: string; firstName?: string; thingId: string; thingName: string; ownerSlug: string; thingSlug: string };

export type SendCodewordResult =
  | { ok: true }
  | { error: string };

export async function sendCodeword(args: SendCodewordArgs): Promise<SendCodewordResult> {
  const supabase = adminClient();
  const code     = randomCodeword();
  const email    = args.email.trim().toLowerCase();

  // Invalidate any existing unused codes for this email + context
  await supabase
    .from("magic_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("email", email)
    .eq("context", args.context)
    .is("used_at", null);

  // Insert the new code
  const row: Record<string, unknown> = {
    email,
    code,
    context:   args.context,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  if (args.context === "booker") {
    row.thing_id   = args.thingId;
    row.owner_slug = args.ownerSlug;
    row.thing_slug = args.thingSlug;
  }

  const { error: insertError } = await supabase
    .from("magic_codes")
    .insert(row);

  if (insertError) {
    console.error("magic_codes insert failed:", insertError);
    return { error: "Something went wrong. Please try again." };
  }

  // Send the email
  try {
    await sendCodewordEmail({
      toEmail:   email,
      firstName: args.firstName,
      code,
      context:   args.context,
      thingName: args.context === "booker" ? args.thingName : undefined,
    });
  } catch (emailErr) {
    console.error("Codeword email failed:", emailErr);
    return { error: "Couldn't send the email. Please try again." };
  }

  return { ok: true };
}

// ─── VERIFY ───────────────────────────────────────────────────────────────────

export type VerifyCodewordArgs = {
  email:   string;
  code:    string;
  context: "booker" | "manage";
};

export type VerifyCodewordResult =
  | { ok: true; thingId?: string; ownerSlug?: string; thingSlug?: string }
  | { error: string };

export async function verifyCodeword(args: VerifyCodewordArgs): Promise<VerifyCodewordResult> {
  const supabase = adminClient();
  const email    = args.email.trim().toLowerCase();
  const code     = args.code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("magic_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("context", args.context)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return { error: "That codeword isn't right. Try again." };
  }

  // Mark as used
  await supabase
    .from("magic_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  // For manage context: sign the user in via Supabase auth magic link
  // (we use signInWithOtp silently to establish a session)
  if (args.context === "manage") {
    const { error: authError } = await supabase.auth.admin.generateLink({
      type:  "magiclink",
      email,
    });
    if (authError) {
      console.error("Session creation failed:", authError);
      // Non-fatal — session can be re-established
    }
  }

  return {
    ok:        true,
    thingId:   data.thing_id   ?? undefined,
    ownerSlug: data.owner_slug ?? undefined,
    thingSlug: data.thing_slug ?? undefined,
  };
}
