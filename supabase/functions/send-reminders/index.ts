import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY")!;
const APP_URL         = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://bookonething.com";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYS   = "Poppins, -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function buildReminderHTML(p: {
  bookerName: string; thingName: string; orgName: string;
  startsAt: string; endsAt: string; cancelUrl: string; reminderNote?: string;
}): string {
  const timeRange   = `${fmtTime(p.startsAt)} – ${fmtTime(p.endsAt)}`;
  const dateStr     = fmtDate(p.startsAt);
  const orgLine     = p.orgName
    ? `<p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">${p.orgName}</p>`
    : `<div style="margin-bottom:24px;"></div>`;
  const noteLine    = p.reminderNote
    ? `<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">Things to remember</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f6;border-radius:12px;padding:14px 18px;margin-bottom:28px;border:1.5px solid #ede9e3;"><tr><td style="font-size:13px;color:#888;font-style:italic;line-height:1.6;">${p.reminderNote}</td></tr></table>`
    : `<div style="margin-bottom:28px;"></div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Reminder</title></head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:28px;"><img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
<p style="margin:0 0 6px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">See you tomorrow, ${p.bookerName}</p>
${orgLine}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ee;border-radius:14px;padding:18px 20px;margin-bottom:16px;">
<tr><td style="padding:0 0 10px;"><table cellpadding="0" cellspacing="0"><tr>
  <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></td>
  <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${p.thingName}</td>
</tr></table></td></tr>
<tr><td style="padding:0 0 10px;"><table cellpadding="0" cellspacing="0"><tr>
  <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></td>
  <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${timeRange}</td>
</tr></table></td></tr>
<tr><td><table cellpadding="0" cellspacing="0"><tr>
  <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></td>
  <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${dateStr}</td>
</tr></table></td></tr>
</table>
${noteLine}
<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">Change of plans?</p>
<p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7;">Please let us know. Someone else can jump in.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td><a href="${p.cancelUrl}" style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;letter-spacing:-0.2px;">Don't need it, thanks</a></td></tr>
</table>
<p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;">Got questions? <a href="https://bookonething.com/faq" style="color:#888;">Check the FAQs</a></p>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">BookOneThing | The easy way to share anything with anyone.</td></tr>
</table></td></tr></table>
</body></html>`;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Find bookings starting tomorrow (UTC window) with reminder opted in, not yet cancelled, not yet sent
  const now       = new Date();
  const tomorrow  = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayStart  = new Date(tomorrow);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd    = new Date(tomorrow);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, booker_name, booker_email, starts_at, ends_at, cancel_token, reminder_note, thing_id")
    .eq("reminder_opt_in", true)
    .is("cancelled_at", null)
    .is("reminder_sent_at", null)
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString());

  if (error) {
    console.error("Reminder query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!bookings?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // Fetch thing names + org names in one go
  const thingIds  = [...new Set(bookings.map(b => b.thing_id))];
  const { data: things } = await supabase
    .from("things")
    .select("id, name, profiles(org_name)")
    .in("id", thingIds);

  const thingMap = Object.fromEntries((things ?? []).map(t => [t.id, t]));

  let sent = 0;

  for (const booking of bookings) {
    if (!booking.booker_email) continue;

    const thing     = thingMap[booking.thing_id];
    const thingName = thing?.name ?? "your booking";
    const orgName   = (Array.isArray(thing?.profiles) ? thing.profiles[0] : thing?.profiles)?.org_name ?? "";
    const cancelUrl = `${APP_URL}/cancel?token=${booking.cancel_token}`;
    const timeStr   = fmtTime(booking.starts_at);
    const noteTag   = booking.reminder_note ? ` — ${booking.reminder_note}` : "";

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    "Book One Thing <bookings@bookonething.com>",
          to:      booking.booker_email,
          subject: `Reminder: "${thingName}" booked tomorrow at ${timeStr}`,
          html:    buildReminderHTML({
            bookerName:   booking.booker_name,
            thingName,
            orgName,
            startsAt:     booking.starts_at,
            endsAt:       booking.ends_at,
            cancelUrl,
            reminderNote: booking.reminder_note ?? undefined,
          }),
        }),
      });

      // Mark as sent so we don't double-send
      await supabase
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      sent++;
    } catch (err) {
      console.error(`Reminder failed for booking ${booking.id}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
