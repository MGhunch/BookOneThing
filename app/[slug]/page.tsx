import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import Calendar from "@/components/calendar/Calendar";

const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default async function BookerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: thing, error: thingError } = await supabase
    .from("things")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (thingError || !thing) notFound();

  const from = new Date();
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

  return (
    <>
      <style>{`
        .calendar-layout {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          padding: 80px 0;
          gap: 0;
        }

        .cal-arrow {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          width: 180px;
          flex-shrink: 0;
          cursor: pointer;
          opacity: 0.35;
          transition: opacity 0.2s ease;
          text-decoration: none;
          padding: 24px;
        }

        .cal-arrow:hover {
          opacity: 0.65;
        }

        .cal-arrow-glyph {
          font-size: 64px;
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1;
          font-family: ${SYS};
          letter-spacing: -4px;
        }

        .cal-arrow-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #1a1a1a;
          font-family: ${SYS};
          text-align: center;
        }

        .cal-hero {
          width: 100%;
          max-width: 430px;
          flex-shrink: 0;
        }

        @media (min-width: 800px) {
          .cal-arrow { display: flex; }
          .cal-hero { width: 430px; }
        }

        @media (min-width: 1100px) {
          .cal-arrow { width: 220px; }
        }
      `}</style>

      <div className="calendar-layout">

        {/* Left arrow */}
        <a href="#" className="cal-arrow" style={{ alignItems: "flex-end" }}>
          <div className="cal-arrow-glyph">‹</div>
          <div className="cal-arrow-label">Add more<br />things</div>
        </a>

        {/* Calendar hero */}
        <div className="cal-hero">
          <Calendar thing={thing} bookings={bookings ?? []} />
        </div>

        {/* Right arrow */}
        <a href="#" className="cal-arrow" style={{ alignItems: "flex-start" }}>
          <div className="cal-arrow-glyph">›</div>
          <div className="cal-arrow-label">Add more<br />things</div>
        </a>

      </div>
    </>
  );
}
