import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const SYS    = "Poppins, -apple-system, BlinkMacSystemFont, sans-serif";

// ─── ICS ─────────────────────────────────────────────────────────────────────

function icsDate(iso: string): string {
  // Format: 20260224T090000Z
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDateLocal(iso: string, timezone: string): string {
  // Format for TZID: 20260224T090000 (no Z — local time in the named zone)
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const p = (type: string) => parts.find(x => x.type === type)?.value ?? "00";
  return `${p("year")}${p("month")}${p("day")}T${p("hour")}${p("minute")}${p("second")}`;
}

function buildICS({
  uid,
  summary,
  description,
  startsAt,
  endsAt,
  bookerEmail,
  bookerName,
  timezone = "UTC",
}: {
  uid:         string;
  summary:     string;
  description: string;
  startsAt:    string;
  endsAt:      string;
  bookerEmail: string;
  bookerName:  string;
  timezone?:   string;
}): string {
  const now      = icsDate(new Date().toISOString());
  const dtStart  = timezone === "UTC"
    ? `DTSTART:${icsDate(startsAt)}`
    : `DTSTART;TZID=${timezone}:${icsDateLocal(startsAt, timezone)}`;
  const dtEnd    = timezone === "UTC"
    ? `DTEND:${icsDate(endsAt)}`
    : `DTEND;TZID=${timezone}:${icsDateLocal(endsAt, timezone)}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Book One Thing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}@bookonething.com`,
    `DTSTAMP:${now}`,
    dtStart,
    dtEnd,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=Book One Thing:mailto:bookings@bookonething.com`,
    `ATTENDEE;CN=${bookerName}:mailto:${bookerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── EMAIL HTML ───────────────────────────────────────────────────────────────

export function buildConfirmationHTML({
  bookerName,
  thingName,
  orgName,
  startsAt,
  endsAt,
  cancelUrl,
}: {
  bookerName: string;
  thingName:  string;
  orgName:    string;
  startsAt:   string;
  endsAt:     string;
  cancelUrl?: string;
}): string {
  const timeRange = `${fmtTime(startsAt)} – ${fmtTime(endsAt)}`;
  const dateStr   = fmtDate(startsAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>You're booked</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <!-- Tick -->
              <div style="width:52px;height:52px;border-radius:50%;background:${ORANGE};display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <table cellpadding="0" cellspacing="0" width="52" height="52">
                  <tr><td align="center" valign="middle">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" stroke-width="2.5">
                      <polyline points="3,11 8,17 19,5"/>
                    </svg>
                  </td></tr>
                </table>
              </div>

              <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">
                All booked, ${bookerName}.
              </p>
              ${orgName ? `<p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">${orgName}</p>` : `<div style="margin-bottom:24px;"></div>`}

              <!-- Detail block -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fdf4ee;border-radius:14px;padding:18px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:0 0 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3">
                            <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                          </svg>
                        </td>
                        <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">
                          ${thingName}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3">
                            <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                          </svg>
                        </td>
                        <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">
                          ${timeRange}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3">
                            <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                          </svg>
                        </td>
                        <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">
                          ${dateStr}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 ${cancelUrl ? "16px" : "0"};font-size:13px;color:#999;line-height:1.6;">
                The calendar invite is attached. Add it to your calendar and you're done.
              </p>
              ${cancelUrl ? `
              <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;">
                Changed your plans? <a href="${cancelUrl}" style="color:#888;font-weight:600;">Cancel your booking</a> so someone else can jump in.
              </p>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              Book One Thing · The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildCancellationHTML({
  bookerName,
  thingName,
  orgName,
  startsAt,
  endsAt,
}: {
  bookerName: string;
  thingName:  string;
  orgName:    string;
  startsAt:   string;
  endsAt:     string;
}): string {
  const timeRange = `${fmtTime(startsAt)} – ${fmtTime(endsAt)}`;
  const dateStr   = fmtDate(startsAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Booking cancelled</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">
                Booking cancelled.
              </p>
              ${orgName ? `<p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">${orgName}</p>` : `<div style="margin-bottom:24px;"></div>`}

              <!-- Detail block -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9f8f6;border-radius:14px;padding:18px 20px;margin-bottom:28px;border:1.5px solid #ede9e3;">
                <tr><td style="font-size:15px;font-weight:700;color:${DARK};padding-bottom:4px;">${thingName}</td></tr>
                <tr><td style="font-size:14px;color:#888;">${timeRange} · ${dateStr}</td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                The slot is now free for someone else to book. If this was a mistake, just head back and rebook.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              Book One Thing · The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── BOOKER MAGIC LINK ───────────────────────────────────────────────────────

export function buildMagicLinkHTML({
  firstName,
  thingName,
  magicLink,
}: {
  firstName: string;
  thingName: string;
  magicLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Activate ${thingName}</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">
                One tap, ${firstName}.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888;line-height:1.6;">
                ${thingName} is ready and waiting. Tap the button below — it'll pop up right where you left off.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}"
                       style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:-0.2px;">
                      Activate ${thingName} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;text-align:center;">
                Keep this email — it's your permanent link back to your calendar.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              Book One Thing · The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendBookerMagicLink({
  firstName,
  toEmail,
  thingName,
  magicLink,
}: {
  firstName:  string;
  toEmail:    string;
  thingName:  string;
  magicLink:  string;
}) {
  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      toEmail,
    subject: `Your link to ${thingName}`,
    html:    buildMagicLinkHTML({ firstName, thingName, magicLink }),
  });
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export async function sendBookingConfirmation({
  bookingId,
  bookerName,
  bookerEmail,
  thingName,
  orgName,
  startsAt,
  endsAt,
  timezone = "UTC",
  cancelUrl,
}: {
  bookingId:   string;
  bookerName:  string;
  bookerEmail: string;
  thingName:   string;
  orgName:     string;
  startsAt:    string;
  endsAt:      string;
  timezone?:   string;
  cancelUrl?:  string;
}) {
  const icsContent = buildICS({
    uid:         bookingId,
    summary:     `${thingName} booked`,
    description: orgName ? `${thingName} · ${orgName}` : thingName,
    startsAt,
    endsAt,
    bookerEmail,
    bookerName,
    timezone,
  });

  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      bookerEmail,
    subject: `You're booked — ${thingName}`,
    html:    buildConfirmationHTML({ bookerName, thingName, orgName, startsAt, endsAt, cancelUrl }),
    attachments: [{
      filename: "booking.ics",
      content:  Buffer.from(icsContent).toString("base64"),
    }],
  });
}

export async function sendCancellationConfirmation({
  bookerName,
  bookerEmail,
  thingName,
  orgName,
  startsAt,
  endsAt,
}: {
  bookerName:  string;
  bookerEmail: string;
  thingName:   string;
  orgName:     string;
  startsAt:    string;
  endsAt:      string;
}) {
  await resend.emails.send({
    from:    "BookOneThing <bookings@bookonething.com>",
    to:      bookerEmail,
    subject: `Booking cancelled — ${thingName}`,
    html:    buildCancellationHTML({ bookerName, thingName, orgName, startsAt, endsAt }),
  });
}

// ─── OWNER WELCOME (thing live) ──────────────────────────────────────────────

function fmtAvailTime(t: string): string {
  // "09:00" → "9am", "17:30" → "5:30pm"
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const m = parseInt(mStr);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2,"0")}${suffix}`;
}

function fmtMaxLength(mins: number): string {
  if (mins >= 99999) return "No limit";
  if (mins >= 480) return "Full day";
  if (mins >= 240) return "Half day";
  if (mins >= 60) return `${mins / 60} hour${mins / 60 === 1 ? "" : "s"}`;
  return `${mins} mins`;
}

function fmtBookAhead(days: number): string {
  if (days >= 99999) return "Any time";
  if (days >= 365) return "Up to 1 year";
  if (days >= 180) return "Up to 6 months";
  if (days >= 90)  return "Up to 3 months";
  if (days >= 60)  return "Up to 2 months";
  if (days >= 30)  return "Up to 1 month";
  if (days >= 14)  return "Up to 2 weeks";
  return `Up to ${days} days`;
}

export function buildOwnerWelcomeHTML({
  firstName,
  thingName,
  shareUrl,
  availStart,
  availEnd,
  availWeekends,
  maxLengthMins,
  bookAheadDays,
  maxConcurrent,
}: {
  firstName:     string;
  thingName:     string;
  shareUrl:      string;
  availStart:    string;
  availEnd:      string;
  availWeekends: boolean;
  maxLengthMins: number;
  bookAheadDays: number;
  maxConcurrent: number;
}): string {
  const availability = `${fmtAvailTime(availStart)} – ${fmtAvailTime(availEnd)}${availWeekends ? ", 7 days" : ", weekdays"}`;
  const maxLen       = fmtMaxLength(maxLengthMins);
  const bookAhead    = fmtBookAhead(bookAheadDays);

  // mailto for the pre-popped share button
  const mailSubject = encodeURIComponent(`Book ${thingName} here.`);
  const mailBody    = encodeURIComponent(`Hey there,\n\n${firstName} has set up ${thingName} ready to book.\n\n> ${shareUrl}\n\nJust pop in your email. Click the link. And you're in.\nNo passwords. No fuss.\n\nTry it. Go book some things.`);
  const mailtoHref  = `mailto:?subject=${mailSubject}&body=${mailBody}`;

  const faqUrl = "https://bookonething.com/faq";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #ede9e3;font-size:13px;font-weight:600;color:#1a1a1a;width:50%;">${label}</td>
      <td style="padding:9px 0;border-bottom:1px solid #ede9e3;font-size:13px;color:#666;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Here's your link to share</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <!-- Headline -->
              <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">
                ${thingName} is live.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888;line-height:1.6;">
                Hey ${firstName} — you're all set up. Nice.
              </p>

              <!-- Share link hero -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fdf4ee;border-radius:14px;padding:20px 22px;margin-bottom:10px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:13px;color:#888;line-height:1.5;">
                      Here's where you'll find it:
                    </p>
                    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:${DARK};word-break:break-all;">
                      ${shareUrl}
                    </p>
                    <p style="margin:0 0 14px;font-size:13px;color:#888;">
                      Share the link with your team.
                    </p>
                    <a href="${shareUrl}"
                       style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;letter-spacing:-0.2px;">
                      Go book some things
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Pre-popped share email -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <a href="${mailtoHref}"
                       style="font-size:13px;color:#888;text-decoration:none;font-weight:600;">
                      ✉︎ &nbsp;Share with your team
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Setup summary — icon + name header -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${row("Available", availability)}
                ${row("Max booking length", maxLen)}
                ${row("Book ahead", bookAhead)}
                ${row("Bookings per person", `Up to ${maxConcurrent} at a time`)}
              </table>

              <!-- Footer note -->
              <p style="margin:0 0 16px;font-size:12px;color:#bbb;line-height:1.6;">
                Got questions? <a href="${faqUrl}" style="color:#888;">Check the FAQs.</a>
              </p>

              <!-- Sign-off -->
              <p style="margin:0;font-size:13px;font-weight:700;color:${DARK};">
                All set. Let's book some things.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              BookOneThing | The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOwnerWelcome({
  firstName,
  toEmail,
  thingName,
  shareUrl,
  availStart,
  availEnd,
  availWeekends,
  maxLengthMins,
  bookAheadDays,
  maxConcurrent,
}: {
  firstName:     string;
  toEmail:       string;
  thingName:     string;
  shareUrl:      string;
  availStart:    string;
  availEnd:      string;
  availWeekends: boolean;
  maxLengthMins: number;
  bookAheadDays: number;
  maxConcurrent: number;
}) {
  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      toEmail,
    subject: `${thingName} is ready to book.`,
    html:    buildOwnerWelcomeHTML({
      firstName, thingName, shareUrl,
      availStart, availEnd, availWeekends,
      maxLengthMins, bookAheadDays, maxConcurrent,
    }),
  });
}

// ─── REMINDER EMAIL ──────────────────────────────────────────────────────────

export function buildReminderHTML({
  bookerName,
  thingName,
  orgName,
  startsAt,
  endsAt,
  cancelUrl,
  reminderNote,
}: {
  bookerName:    string;
  thingName:     string;
  orgName:       string;
  startsAt:      string;
  endsAt:        string;
  cancelUrl:     string;
  reminderNote?: string;
}): string {
  const timeRange = `${fmtTime(startsAt)} – ${fmtTime(endsAt)}`;
  const dateStr   = fmtDate(startsAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Reminder</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:${DARK};letter-spacing:-0.6px;line-height:1.2;">
                See you tomorrow, ${bookerName}.
              </p>
              ${orgName ? `<p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#bbb;">${orgName}</p>` : `<div style="margin-bottom:24px;"></div>`}

              <!-- Detail block -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fdf4ee;border-radius:14px;padding:18px 20px;margin-bottom:28px;">
                <tr>
                  <td style="padding:0 0 10px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>
                      </td>
                      <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${thingName}</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>
                      </td>
                      <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${timeRange}</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td${reminderNote ? ' style="padding:0 0 10px;"' : ""}>
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:20px;height:20px;background:${ORANGE};border-radius:50%;text-align:center;vertical-align:middle;">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="3"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>
                      </td>
                      <td style="padding-left:10px;font-size:15px;font-weight:700;color:${DARK};">${dateStr}</td>
                    </tr></table>
                  </td>
                </tr>
                ${reminderNote ? `
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:20px;height:20px;"></td>
                      <td style="padding-left:10px;font-size:13px;color:#888;font-style:italic;">${reminderNote}</td>
                    </tr></table>
                  </td>
                </tr>` : ""}
              </table>

              <!-- Body -->
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                It's all ready, unless you're not...
              </p>

              <!-- Cancel CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${cancelUrl}"
                       style="display:inline-block;background:${DARK};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:-0.2px;">
                      Cancel my booking
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:12px;color:#bbb;text-align:center;line-height:1.6;">
                Please cancel if you don't need it. Someone else can jump in.
              </p>

              <!-- Footer note -->
              <p style="margin:0 0 16px;font-size:12px;color:#bbb;line-height:1.6;">
                Got questions? <a href="https://bookonething.com/faq" style="color:#888;">Check the FAQs.</a>
              </p>
              <p style="margin:0;font-size:13px;font-weight:700;color:${DARK};">
                All set. Let's book some things.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              BookOneThing | The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendReminderEmail({
  bookerName,
  bookerEmail,
  thingName,
  orgName,
  startsAt,
  endsAt,
  cancelUrl,
  reminderNote,
}: {
  bookerName:    string;
  bookerEmail:   string;
  thingName:     string;
  orgName:       string;
  startsAt:      string;
  endsAt:        string;
  cancelUrl:     string;
  reminderNote?: string;
}) {
  const timeStr  = fmtTime(startsAt);
  const noteTag  = reminderNote ? ` — ${reminderNote}` : "";

  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      bookerEmail,
    subject: `Reminder: ${thingName}${noteTag} — tomorrow at ${timeStr}`,
    html:    buildReminderHTML({ bookerName, thingName, orgName, startsAt, endsAt, cancelUrl, reminderNote }),
  });
}

// ─── OWNER MAGIC LINK ────────────────────────────────────────────────────────

export async function sendOwnerMagicLink({
  firstName,
  toEmail,
  thingName,
  magicLink,
}: {
  firstName: string;
  toEmail:   string;
  thingName: string;
  magicLink: string;
}) {
  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      toEmail,
    subject: `Your link to set up ${thingName}`,
    html:    buildMagicLinkHTML({ firstName, thingName, magicLink }),
  });
}

// ─── CODEWORD EMAILS ─────────────────────────────────────────────────────────
// Replaces all magic link auth emails.
// Three contexts: booker (unlock calendar), owner setup, owner manage.

export function buildCodewordHTML({
  firstName,
  code,
  context,
  thingName,
}: {
  firstName?: string;
  code:        string;
  context:     "booker" | "manage" | "setup";
  thingName?:  string;
}): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const actionLine =
    context === "booker" ? `Use it to unlock the calendar. Easy.` :
    context === "setup"  ? `Use it to set up your thing. Easy.`   :
                           `Use it to manage your things. Easy.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<title>Your codeword</title>
</head>
<body style="margin:0;padding:0;background:#e8e5e0;font-family:${SYS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e5e0;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://bookonething.com/logo2.png" alt="Book One Thing" width="160" style="display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:36px 36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <p style="margin:0 0 20px;font-size:15px;color:#888;line-height:1.6;">${greeting}</p>

              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Your codeword.
              </p>

              <!-- The codeword -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#666;">Your codeword</p>
                    <p style="margin:0;font-size:42px;font-weight:800;color:#ffffff;letter-spacing:8px;font-family:${SYS};">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                ${actionLine}
              </p>

              <p style="margin:0 0 0;font-size:13px;color:#bbb;line-height:1.6;">
                Your codeword only lasts 15 minutes. Get in there.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#aaa;">
              Book One Thing · The easy way to share anything with anyone.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCodewordEmail({
  toEmail,
  firstName,
  code,
  context,
  thingName,
}: {
  toEmail:    string;
  firstName?: string;
  code:       string;
  context:    "booker" | "manage" | "setup";
  thingName?: string;
}) {
  const subject =
    context === "booker" ? "Your booking codeword" :
                           "Your BookOneThing codeword";

  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      toEmail,
    subject,
    html:    buildCodewordHTML({ firstName, code, context, thingName }),
  });
}
