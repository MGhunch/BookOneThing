import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import Calendar from "@/components/calendar/Calendar";

export default async function BookerPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerClient();

  // Fetch the thing by slug
  const { data: thing, error: thingError } = await supabase
    .from("things")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (thingError || !thing) notFound();

  // Fetch active bookings for the next 60 days
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

  return <Calendar thing={thing} bookings={bookings ?? []} />;
}
