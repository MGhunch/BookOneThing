import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

import { ORANGE, ORANGE_LIGHT, GREY, GREY_LIGHT, DARK, WHITE, BORDER, SYS, SIZE_SM, SIZE_BASE, SIZE_XL, W_MEDIUM, W_BOLD } from "@/lib/constants";

function fmtTime(iso: string, timezone: string = "UTC"): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: timezone,
    hour:     "numeric",
    minute:   "2-digit",
    hour12:   true,
  }).formatToParts(d);
  const hour   = parts.find(p => p.type === "hour")?.value ?? "12";
  const minute = parts.find(p => p.type === "minute")?.value ?? "00";
  const ampm   = (parts.find(p => p.type === "dayPeriod")?.value ?? "am").toLowerCase();
  return minute === "00" ? `${hour}${ampm}` : `${hour}:${minute}${ampm}`;
}

function fmtDate(iso: string, timezone: string = "UTC"): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: timezone,
    weekday:  "long",
    day:      "numeric",
    month:    "long",
  }).formatToParts(d);
  const weekday = parts.find(p => p.type === "weekday")?.value ?? "";
  const day     = parts.find(p => p.type === "day")?.value ?? "";
  const month   = parts.find(p => p.type === "month")?.value ?? "";
  return `${weekday} ${day} ${month}`;
}

export default async function CancelConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();

  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booker_name, starts_at, ends_at, cancelled_at, thing_id, things(name, timezone)")
    .eq("cancel_token", token)
    .single();

  if (!booking) notFound();

  if (booking.cancelled_at) {
    return (
      <div style={{ maxWidth: "400px", margin: "0 auto", padding: "120px 24px 100px", fontFamily: SYS, textAlign: "center" }}>
        <h1 style={{ fontSize: SIZE_XL, fontWeight: W_BOLD, color: DARK, margin: "0 0 12px" }}>Already cancelled</h1>
        <p style={{ fontSize: SIZE_BASE, color: GREY, margin: 0 }}>This booking was already cancelled.</p>
      </div>
    );
  }

  const thing     = Array.isArray(booking.things) ? booking.things[0] : booking.things;
  const thingName = (thing as { name?: string } | null)?.name ?? "your booking";
  const timezone  = (thing as { timezone?: string } | null)?.timezone ?? "UTC";
  const timeRange = `${fmtTime(booking.starts_at, timezone)} – ${fmtTime(booking.ends_at, timezone)}`;
  const dateStr   = fmtDate(booking.starts_at, timezone);

  return (
    <div style={{
      maxWidth: "400px",
      margin: "0 auto",
      padding: "120px 24px 100px",
      fontFamily: SYS,
      textAlign: "center",
    }}>

      {/* Orange circle with white X */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: ORANGE,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke=WHITE strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: "26px", fontWeight: W_BOLD, letterSpacing: "-0.6px",
        color: DARK, margin: "0 0 6px", lineHeight: 1.15,
      }}>
        Cancel your booking?
      </h1>
      <p style={{ fontSize: SIZE_SM, color: GREY_LIGHT, fontWeight: W_MEDIUM, margin: "0 0 24px" }}>
        {booking.booker_name}
      </p>

      {/* Detail block */}
      <div style={{
        background: ORANGE_LIGHT, borderRadius: 14,
        padding: "18px 20px", marginBottom: 28,
        textAlign: "left", display: "flex", flexDirection: "column", gap: 10,
      }}>
        {[thingName, timeRange, dateStr].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: ORANGE,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke=WHITE strokeWidth="3">
                <polyline points="1.5,5 4,7.5 8.5,2.5"/>
              </svg>
            </div>
            <span style={{ fontSize: SIZE_BASE, fontWeight: W_BOLD, color: DARK }}>{label}</span>
          </div>
        ))}
      </div>

      {/* POST form — email scanners follow GET links but never POST */}
        <form method="POST" action="/cancel/confirm" style={{ display: "flex", gap: 10 }}>
        <input type="hidden" name="token" value={token} />
        <a
          href="/"
          style={{
            flex: 1, padding: "14px", borderRadius: 12,
            border: `1.5px solid ${BORDER}`, background: WHITE,
            color: GREY_LIGHT, fontFamily: SYS, fontSize: 14, fontWeight: W_MEDIUM,
            textDecoration: "none", textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          Keep it
        </a>
        <button
          type="submit"
          style={{
            flex: 1, padding: "14px", borderRadius: 12,
            border: "none", background: ORANGE,
            color: WHITE, fontFamily: SYS, fontSize: 14, fontWeight: W_BOLD,
            cursor: "pointer",
          }}
        >
          Cancel it
        </button>
      </form>

    </div>
  );
}
