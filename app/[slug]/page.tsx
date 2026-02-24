import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import Calendar from "@/components/calendar/Calendar";
import BookerGate from "@/components/BookerGate";

const SESSION_COOKIE = "bot_session";

interface BookerSession {
  email:     string;
  firstName: string;
}

async function readSession(): Promise<BookerSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.email === "string" && typeof parsed.firstName === "string") {
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Fetch thing + owner profile (for org_name) in one go
  const { data: thing, error: thingError } = await supabase
    .from("things")
    .select("*, profiles(org_name)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (thingError || !thing) notFound();

  const orgName: string = (thing.profiles as { org_name: string | null })?.org_name ?? "";

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

  const session = await readSession();

  return (
    <>
      <style>{`
        .page-wrap {
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

        {/* Left arrow */}
        <a href="#" className="cal-arrow">
          <svg width="32" height="56" viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 4L4 28L28 52" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        {/* Calendar hero */}
        <div className="cal-hero">
          <Calendar
            thing={thing}
            orgName={orgName}
            bookings={bookings ?? []}
            bookerSession={session}
          />
        </div>

        {/* Right arrow */}
        <a href="#" className="cal-arrow">
          <svg width="32" height="56" viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L28 28L4 52" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

      </div>

      {/* Gate — shown when no valid session cookie */}
      {!session && (
        <BookerGate
          thingId={thing.id}
          thingName={thing.name}
          slug={slug}
        />
      )}
    </>
  );
}
