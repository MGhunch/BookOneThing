"use client";

import { useState } from "react";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const BORDER       = "#ede9e3";
const CARD         = "#ffffff";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

type FAQ = { q: string; a: string };
type Section = { label: string; faqs: FAQ[] };

const SECTIONS: Section[] = [
  {
    label: "Booking",
    faqs: [
      { q: "How do I book?", a: "Just choose your start time and end time. We'll confirm by email." },
      { q: "Do I need an account?", a: "No. Just your name and email. That's it. No passwords, no app, no hassles." },
      { q: "How do you know who's booking?", a: "The first time you book, you'll need to confirm by email. After that, we'll remember you — just dive in and book. Easy." },
      { q: "Who can see my bookings?", a: "Everyone using the calendar will see your first name. But don't worry, nobody but the sharer will see your email address." },
      { q: "Can anyone book if they have the link?", a: "Yes. Anyone with the link can book. Sharers keep an eye on who's using their calendar and can remove anyone who shouldn't be there." },
      { q: "Will you spam me with emails?", a: "Not at all. We'll send you a confirmation of your booking. And a reminder if you like. Other than that your email is just a magic key to dive in and make bookings." },
      { q: "What if someone shouldn't be making bookings?", a: "If you think someone's playing up, just let the sharer know. They can check it out and even get them booted." },
    ],
  },
  {
    label: "Sharing",
    faqs: [
      { q: "How do I set up a thing?", a: "It's easy. Just think up a name for it and click your way through a couple of questions. We'll send a magic link to confirm and boom, your calendar is live." },
      { q: "How do I share it with people?", a: "Just share the link with people you know. Anyone with the link can book time with your thing." },
      { q: "How do I see who's booked?", a: "Go to Manage My Things to see a list of who's booked time in your calendar. You'll also get a weekly email showing anyone who's new." },
      { q: "Can I edit my thing after it's live?", a: "Yes. You can change availability, rules, and instructions any time. This won't change any existing bookings." },
      { q: "How do I remove someone?", a: "Go to Manage My Things to see everyone with permission to book in your calendar. If there's someone rogue, just boot them. It's your thing." },
      { q: "What if someone books a slot they shouldn't have?", a: "You can cancel any booking from your calendar. The booker will get an email letting them know." },
      { q: "What if two people try to book the same slot?", a: "First in, first served. You snooze you lose." },
      { q: "Can I cancel someone's booking?", a: "Yes, any time. They'll get an email so they're not left wondering." },
    ],
  },
  {
    label: "Pricing",
    faqs: [
      { q: "How much does it cost?", a: "Your first thing is free, no questions asked. If you need more things, they're $10 a month. No extra fees, no stuffing around. Just $10 a month per thing." },
      { q: "Do I need a credit card to get started?", a: "No. You can list your first thing on us and never touch your wallet." },
      { q: "How do I cancel?", a: "Just let us know and we'll switch everything off. Easy." },
      { q: "What happens to my bookings if I cancel?", a: "We'll email everyone with a booking. After that, digital dust." },
      { q: "Is there a contract or minimum term?", a: "Nope. If it's switched on, it's switched on until you let us know. And remember, your first thing is free, forever." },
    ],
  },
  {
    label: "General",
    faqs: [
      { q: "What's a \"thing\"?", a: "Anything that can be booked. A car park, a meeting room, a boat, a beach house, a tennis court. If people fight over it, it's a thing." },
      { q: "What devices does it work on?", a: "Anything with the internet. Phone, tablet, laptop, whatever. No app required." },
      { q: "What if I lose the link?", a: "Just ask the sharer to resend it." },
      { q: "What's the difference between a sharer and a booker?", a: "A sharer is someone who's sharing their thing. A booker is someone who books it. We wanted to make it more complicated than that. But it isn't. The sharer sets the thing up and decides who can use it. Bookers just show up and book. Most people will be both at some point." },
      { q: "Is BookOneThing secure?", a: "Yes. Every booking is tied to a confirmed email address. Sharers control who has access. Nothing personal ever gets shared." },
      { q: "Who's behind BookOneThing?", a: "Hunch. A small team who got tired of fighting over the car park. So we built the thing we wished existed." },
    ],
  },
];

function PlusIcon({ open }: { open: boolean }) {
  return (
    <div style={{
      width: "22px", height: "22px",
      borderRadius: "50%",
      background: open ? ORANGE : ORANGE_LIGHT,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      transition: "background 0.2s ease, transform 0.25s ease",
      transform: open ? "rotate(45deg)" : "rotate(0deg)",
    }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
        stroke={open ? "#fff" : ORANGE} strokeWidth="2.5" strokeLinecap="round">
        <line x1="5" y1="1" x2="5" y2="9" />
        <line x1="1" y1="5" x2="9" y2="5" />
      </svg>
    </div>
  );
}

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: CARD,
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: open ? "0 4px 20px rgba(0,0,0,0.07)" : "none",
      transition: "box-shadow 0.2s ease",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: SYS,
          fontSize: "14px",
          fontWeight: 600,
          color: open ? ORANGE : DARK,
          lineHeight: 1.4,
          transition: "color 0.15s ease",
        }}
      >
        {faq.q}
        <PlusIcon open={open} />
      </button>

      <div style={{
        maxHeight: open ? "300px" : "0",
        overflow: "hidden",
        transition: "max-height 0.3s ease",
        padding: open ? "0 20px 18px" : "0 20px",
      }}>
        <p style={{
          fontSize: "13px",
          lineHeight: 1.7,
          color: "#555",
          borderTop: `1px solid ${BORDER}`,
          paddingTop: "14px",
          margin: 0,
          fontFamily: SYS,
        }}>
          {faq.a}
        </p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={{
      maxWidth: "600px",
      margin: "0 auto",
      padding: "120px 24px 100px",
      fontFamily: SYS,
    }}>
      <h1 style={{
        fontSize: "32px",
        fontWeight: 800,
        letterSpacing: "-0.8px",
        color: DARK,
        marginBottom: "8px",
      }}>
        FAQs
      </h1>
      <p style={{
        fontSize: "14px",
        color: GREY,
        marginBottom: "48px",
      }}>
        The things people actually want to know.
      </p>

      {SECTIONS.map((section) => (
        <div key={section.label} style={{ marginBottom: "40px" }}>
          <div style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: ORANGE,
            marginBottom: "12px",
          }}>
            {section.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {section.faqs.map((faq) => (
              <FAQItem key={faq.q} faq={faq} />
            ))}
          </div>
        </div>
      ))}

      <div style={{
        textAlign: "center",
        paddingTop: "24px",
        fontSize: "13px",
        color: "#bbb",
      }}>
        Still got questions?{" "}
        <a href="mailto:hello@bookonething.com" style={{
          color: ORANGE,
          textDecoration: "none",
          fontWeight: 600,
        }}>
          Say hello.
        </a>
      </div>
    </div>
  );
}
