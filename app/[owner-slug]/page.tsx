import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase";
import Calendar from "@/components/calendar/Calendar";
import type { Thing } from "@/types";
import { DARK } from "@/lib/constants";


interface BookerSession {
  email:     string;
  firstName: string;
  orgSlug:   string;
}

async function readSession(ownerSlug: string): Promise<BookerSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(`bot_session_${ownerSlug}`)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.email     === "string" &&
      typeof parsed.firstName === "string" &&
      typeof parsed.orgSlug   === "string"
    ) {
      return parsed as BookerSession;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function BookerPage({
  params,
}: {
  params: Promise<{ "owner-slug": string; "thing-slug": string }>;
}) {
  const { "owner-slug": ownerSlug, "thing-slug": thingSlug } = await params;
  const supabase = createServiceClient();

  // ── Try the real thing first ──────────────────────────────────────────────

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_name")
    .eq("slug", ownerSlug)
    .single();

  if (profile) {
    const { data: thing } = await supabase
      .from("things")
      .select("*")
      .eq("slug", thingSlug)
      .eq("owner_id", profile.id)
      .eq("is_active", true)
      .single();

    if (thing) {
      const from = new Date();
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 60);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("thing_id", thing.id)
        .is("cancelled_at", null)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString());

      const session = await readSession(ownerSlug);

      return <CalendarPage
        thing={thing}
        orgName={profile.org_name ?? ""}
        ownerSlug={ownerSlug}
        thingSlug={thingSlug}
        bookings={bookings ?? []}
        session={session}
      />;
    }
  }

  notFound();
}

// ── Shared render component ───────────────────────────────────────────────────

function CalendarPage({
  thing, orgName, ownerSlug, thingSlug, bookings, session,
}: {
  thing:           Thing;
  orgName:         string;
  ownerSlug:       string;
  thingSlug:       string;
  bookings:        import("@/types").Booking[];
  session:         BookerSession | null;
}) {
  return (
    <>
      <style>{`
        .page-wrap {
          overflow: hidden;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          padding: 72px 8px 40px;
        }
        .cal-arrow {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 72px;
          flex-shrink: 0;
          cursor: pointer;
          opacity: 0.18;
          transition: opacity 0.25s ease;
          text-decoration: none;
          padding: 32px 8px;
          border: none;
          background: none;
        }
        .cal-arrow:hover { opacity: 0.55; }
        .cal-arrow svg { display: block; }
        .cal-hero {
          width: 100%;
          max-width: 420px;
          flex-shrink: 0;
        }
        @media (min-width: 780px) {
          .cal-arrow { display: flex; }
        }
        @media (min-width: 1080px) {
          .cal-arrow { width: 100px; }
        }
      `}</style>

      <div className="page-wrap">
        <a href={`/${ownerSlug}`} className="cal-arrow">
          <svg width="32" height="56" viewBox="0 0 32 56" fill="none">
            <path d="M28 4L4 28L28 52" stroke={DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        <div className="cal-hero">
          <Calendar
            thing={thing}
            orgName={orgName}
            ownerSlug={ownerSlug}
            thingSlug={thingSlug}
            bookings={bookings}
            bookerSession={session}
          />
        </div>

        <a href={`/${ownerSlug}`} className="cal-arrow">
          <svg width="32" height="56" viewBox="0 0 32 56" fill="none">
            <path d="M4 4L28 28L4 52" stroke={DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

    </>
  );
}
