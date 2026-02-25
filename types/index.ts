// Book One Thing — shared types

export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  org_name: string | null;
  slug: string;               // e.g. "harbour-works-k7n2"
  created_at: string;
};

export type Thing = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  icon: string;
  avail_start: string;        // "09:00"
  avail_end: string;          // "17:00"
  avail_weekends: boolean;
  max_length_mins: number;
  book_ahead_days: number;
  max_concurrent: number;
  buffer_mins: number;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  thing_id: string;
  booker_name: string;
  booker_email: string | null;
  starts_at: string;          // ISO 8601
  ends_at: string;            // ISO 8601
  cancelled_at: string | null;
  created_at: string;
};

// What the calendar receives to render
export type CalendarConfig = {
  thing: Thing;
  bookings: Booking[];
  bookerName: string | null;  // From localStorage
};

// Fairness rule validation result
export type RuleCheck = {
  allowed: boolean;
  reason?: string;
};
