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

function buildICS({
  uid,
  summary,
  description,
  startsAt,
  endsAt,
  bookerEmail,
  bookerName,
}: {
  uid:         string;
  summary:     string;
  description: string;
  startsAt:    string;
  endsAt:      string;
  bookerEmail: string;
  bookerName:  string;
}): string {
  const now = icsDate(new Date().toISOString());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Book One Thing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}@bookonething.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${icsDate(startsAt)}`,
    `DTEND:${icsDate(endsAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
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

              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                The calendar invite is attached. Add it to your calendar and you're done.
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
<title>Your link to ${thingName}</title>
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
                Hey ${firstName}.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888;line-height:1.6;">
                You're nearly done. Click the link. Dive in.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}"
                       style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:-0.2px;">
                      Open calendar →
                    </a>
                  </td>
                </tr>
              </table>
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
}: {
  bookingId:  string;
  bookerName: string;
  bookerEmail: string;
  thingName:  string;
  orgName:    string;
  startsAt:   string;
  endsAt:     string;
}) {
  const icsContent = buildICS({
    uid:         bookingId,
    summary:     `${thingName} booked`,
    description: orgName ? `${thingName} · ${orgName}` : thingName,
    startsAt,
    endsAt,
    bookerEmail,
    bookerName,
  });

  await resend.emails.send({
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      bookerEmail,
    subject: `You're booked — ${thingName}`,
    html:    buildConfirmationHTML({ bookerName, thingName, orgName, startsAt, endsAt }),
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
    from:    "Book One Thing <bookings@bookonething.com>",
    to:      bookerEmail,
    subject: `Booking cancelled — ${thingName}`,
    html:    buildCancellationHTML({ bookerName, thingName, orgName, startsAt, endsAt }),
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
