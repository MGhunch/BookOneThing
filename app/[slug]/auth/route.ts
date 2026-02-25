import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE = "bot_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookonething.com";

  if (!token) {
    return NextResponse.redirect(`${appUrl}/?error=no_token`);
  }

  const supabase = adminClient();

  // Look up the session token
  const { data: session, error } = await supabase
    .from("booker_sessions")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session) {
    // Token invalid, expired, or already used
    return NextResponse.redirect(`${appUrl}/?error=invalid_link`);
  }

  // Mark the token as used
  await supabase
    .from("booker_sessions")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Build the session cookie value
  const cookieValue = JSON.stringify({
    email:     session.email,
    firstName: session.first_name,
  });

  // Redirect to the calendar and set the session cookie
  const redirectTo = `${appUrl}/${session.slug}`;
  const response = NextResponse.redirect(redirectTo);

  response.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });

  return response;
}
