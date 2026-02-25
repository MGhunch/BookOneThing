const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const GREY   = "#888";
const CARD   = "#ffffff";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default function OurStoryPage() {
  return (
    <div style={{
      maxWidth: "560px",
      margin: "0 auto",
      padding: "120px 24px 100px",
      fontFamily: SYS,
    }}>

      {/* Label */}
      <div style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: ORANGE,
        marginBottom: "16px",
      }}>
        Our Story
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "32px",
        fontWeight: 800,
        letterSpacing: "-0.8px",
        lineHeight: 1.15,
        color: DARK,
        marginBottom: "40px",
      }}>
        A baby born<br />of frustration
      </h1>

      {/* Story card */}
      <div style={{
        background: CARD,
        borderRadius: "20px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}>
        {[
          "We couldn't find a way to book one thing. In our case it was a meeting room. Small office, a dozen people, one meeting room.",
          "You'd think it would be straightforward. But no.",
          "We were banging our heads on the wall between Gmail and Outlook. Nothing would sync or show up in the right places.",
          "So we sat down and asked the internet.",
          "Stacks of different systems with thousands of features for hundreds of dollars. Ridiculous.",
          "So we gave up and made the thing we wanted.",
          "We hope you find it useful to book one thing.",
        ].map((para, i) => (
          <p key={i} style={{
            fontSize: i === 1 || i === 4 ? "15px" : "14px",
            fontWeight: i === 1 || i === 4 ? 600 : 400,
            lineHeight: 1.75,
            color: i === 1 || i === 4 ? DARK : "#555",
            margin: 0,
          }}>
            {para}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <a href="/setup" style={{
          display: "inline-block",
          background: ORANGE,
          color: "#fff",
          fontSize: "15px",
          fontWeight: 600,
          padding: "14px 32px",
          borderRadius: "14px",
          textDecoration: "none",
          letterSpacing: "-0.3px",
          fontFamily: SYS,
        }}>
          Set up your first thing on us
        </a>

      </div>

    </div>
  );
}
