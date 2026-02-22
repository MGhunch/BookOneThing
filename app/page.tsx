import Calendar from "@/components/calendar/Calendar";

const DEMO_THING = {
  id: "demo",
  owner_id: "demo",
  name: "Meeting Room A",
  slug: "meeting-room-a",
  icon: "users",
  avail_start: "09:00",
  avail_end: "17:00",
  avail_weekends: false,
  max_length_mins: 120,
  book_ahead_days: 14,
  max_concurrent: 2,
  buffer_mins: 0,
  instructions: "Level 3, turn left out of the lift. Seats 8.",
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEMO_BOOKINGS = [
  {
    id: "1",
    thing_id: "demo",
    booker_name: "Peter",
    booker_email: null,
    starts_at: new Date().toISOString(),
    ends_at: new Date().toISOString(),
    cancelled_at: null,
    created_at: new Date().toISOString(),
  },
];

export default async function BookerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Calendar
      thing={DEMO_THING}
      bookings={DEMO_BOOKINGS}
      slug={slug}
    />
  );
}
