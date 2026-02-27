import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase";
import Calendar from "@/components/calendar/Calendar";
import type { Thing } from "@/types";


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

    // Fetch all owner's things for bottom nav
    const { data: allThings } = await supabase
      .from("things")
      .select("id, name, slug, icon")
      .eq("owner_id", profile.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

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
        allThings={allThings ?? []}
      />;
    }
  }

  notFound();
}

// ── Shared render component ───────────────────────────────────────────────────

import { Car, Users, Coffee, Sun, Plus, Wrench, Monitor, Home } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  car: Car, users: Users, coffee: Coffee, sun: Sun,
  wrench: Wrench, monitor: Monitor, home: Home,
};

interface NavThing { id: string; name: string; slug: string; icon: string; }

function ThingNavSlot({
  t, ownerSlug, side, isAdd,
}: {
  t?: NavThing; ownerSlug: string; side: "left" | "right"; isAdd?: boolean;
}) {
  const IconComp = t ? (ICON_MAP[t.icon] || Car) : Plus;
  const label    = t ? t.name : "Add another thing";
  const href     = t ? `/${ownerSlug}/${t.slug}` : "/setup";
  const isRight  = side === "right";

  return (
    <a href={href} style={{
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      width: "88px",
      flexShrink: 0,
      textDecoration: "none",
      opacity: t || isAdd ? 0.28 : 0,
      pointerEvents: t || isAdd ? "auto" : "none",
      transition: "opacity 0.2s ease",
      padding: "8px 4px",
    }}
    className={`cal-side cal-side-${side}`}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: "#1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <IconComp size={20} strokeWidth={1.75} color="#fff" />
      </div>
      {/* Name */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#1a1a1a",
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        lineHeight: 1.3,
        width: "100%",
        textAlign: "center",
      }}>
        {label}
      </div>
    </a>
  );
}

function CalendarPage({
  thing, orgName, ownerSlug, thingSlug, bookings, session, allThings,
}: {
  thing:           Thing;
  orgName:         string;
  ownerSlug:       string;
  thingSlug:       string;
  bookings:        import("@/types").Booking[];
  session:         BookerSession | null;
  allThings?:      NavThing[];
}) {
  const things = allThings ?? [];
  const idx    = things.findIndex(t => t.slug === thingSlug);
  const prev   = idx > 0 ? things[idx - 1] : undefined;
  // Right side: next thing if exists, otherwise "Add another thing" prompt
  const next   = idx >= 0 && idx < things.length - 1 ? things[idx + 1] : undefined;
  const showAdd = !next; // always show add on the right if no next thing

  return (
    <>
      <style>{`
        .page-wrap {
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          padding: 64px 24px 8px;
          overflow: hidden;
        }
        @media (max-width: 779px) {
          .page-wrap { padding: 72px 8px 8px; }
        }
        .cal-hero {
          width: 100%;
          max-width: 420px;
          flex-shrink: 0;
          height: 100%;
        }
        .cal-side { display: none !important; }
        .cal-side:hover { opacity: 0.75 !important; }
        @media (min-width: 780px) {
          .cal-side { display: flex !important; }
        }
        @media (min-width: 1080px) {
          .cal-side-left  { width: 110px; }
          .cal-side-right { width: 110px; }
        }
      `}</style>

      <div className="page-wrap">
        {/* Left — previous thing */}
        <ThingNavSlot t={prev} ownerSlug={ownerSlug} side="left" />

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

        {/* Right — next thing or add prompt */}
        <ThingNavSlot t={next} ownerSlug={ownerSlug} side="right" isAdd={showAdd} />
      </div>

      {/* Mobile bottom nav — only when multiple things exist */}
      {things.length > 1 && (
        <>
          <style>{`
            .mob-nav {
              display: flex;
              justify-content: center;
              gap: 12px;
              padding: 12px 16px 20px;
              background: #fff;
              border-top: 1px solid #f0ece6;
              margin: 0 8px;
              border-radius: 0 0 24px 24px;
            }
            @media (min-width: 780px) {
              .mob-nav { display: none; }
            }
            .mob-slot {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 5px;
              text-decoration: none;
              opacity: 0.32;
              transition: opacity 0.2s;
            }
            .mob-slot-active { opacity: 1; }
            .mob-slot-add { opacity: 0.8; }
            .mob-slot-icon {
              width: 44px; height: 44px;
              border-radius: 14px;
              background: #1a1a1a;
              display: flex; align-items: center; justify-content: center;
            }
            .mob-slot-active .mob-slot-icon { background: #e8722a; }
            .mob-slot-add .mob-slot-icon { background: #fdf4ee; }
            .mob-slot-name {
              font-size: 9px;
              font-weight: 600;
              color: #1a1a1a;
              text-align: center;
              line-height: 1.3;
              max-width: 52px;
              font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .mob-slot-add .mob-slot-name { color: #e8722a; }
          `}</style>
          <div className="mob-nav">
            {things.map(t => {
              const IconComp = ICON_MAP[t.icon] || Car;
              const isActive = t.slug === thingSlug;
              return (
                <a
                  key={t.id}
                  href={`/${ownerSlug}/${t.slug}`}
                  className={`mob-slot${isActive ? " mob-slot-active" : ""}`}
                >
                  <div className="mob-slot-icon">
                    <IconComp size={20} strokeWidth={1.75} color="#fff" />
                  </div>
                  <div className="mob-slot-name">{t.name}</div>
                </a>
              );
            })}
            <a href="/setup" className="mob-slot mob-slot-add">
              <div className="mob-slot-icon">
                <Plus size={20} strokeWidth={1.75} color="#e8722a" />
              </div>
              <div className="mob-slot-name">Add more</div>
            </a>
          </div>
        </>
      )}
    </>
  );
}
