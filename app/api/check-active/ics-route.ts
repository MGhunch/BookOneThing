import { NextRequest, NextResponse } from "next/server";

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDateLocal(iso: string, timezone: string): string {
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

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const uid         = searchParams.get("uid")         ?? "booking";
  const startsAt    = searchParams.get("starts")       ?? "";
  const endsAt      = searchParams.get("ends")         ?? "";
  const name        = searchParams.get("name")         ?? "Booking";
  const timezone    = searchParams.get("timezone")     ?? "UTC";
  const bookerName  = searchParams.get("bookerName")   ?? "";
  const bookerEmail = searchParams.get("bookerEmail")  ?? "";

  if (!startsAt || !endsAt) {
    return new NextResponse("Missing required params", { status: 400 });
  }

  const now     = icsDate(new Date().toISOString());
  const dtStart = timezone === "UTC"
    ? `DTSTART:${icsDate(startsAt)}`
    : `DTSTART;TZID=${timezone}:${icsDateLocal(startsAt, timezone)}`;
  const dtEnd   = timezone === "UTC"
    ? `DTEND:${icsDate(endsAt)}`
    : `DTEND;TZID=${timezone}:${icsDateLocal(endsAt, timezone)}`;

  const lines = [
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
    `SUMMARY:${escapeICS(name)}`,
    `DESCRIPTION:${escapeICS(name)}`,
    `ORGANIZER;CN=Book One Thing:mailto:bookings@bookonething.com`,
    ...(bookerEmail ? [`ATTENDEE;CN=${escapeICS(bookerName)}:mailto:${bookerEmail}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsContent = lines.join("\r\n");
  const filename   = `${name.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
