const ORANGE = "#e8722a";
const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default function Home() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px 80px",
      fontFamily: SYS,
    }}>

      {/* Hero */}
      <div style={{ maxWidth: "480px", textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "52px",
          fontWeight: 800,
          color: "#1a1a1a",
          letterSpacing: "-2px",
          lineHeight: 1.05,
          margin: "0 0 20px 0",
        }}>
          The easy way<br />to share anything,<br />with anyone.
        </h1>
        <p style={{
          fontSize: "16px",
          color: "#888",
          lineHeight: 1.7,
          margin: "0",
          fontWeight: 400,
        }}>
          Set up your thing. Share a link. Done.<br />
          Anyone can book it. No sign ups. No fuss.
        </p>
      </div>

      {/* CTA */}
      <a href="/setup" style={{
        display: "inline-block",
        background: ORANGE,
        color: "#fff",
        fontSize: "16px",
        fontWeight: 700,
        padding: "16px 36px",
        borderRadius: "16px",
        textDecoration: "none",
        letterSpacing: "-0.3px",
        fontFamily: SYS,
      }}>
        Set up your first thing on us
      </a>

      {/* Pricing note */}
      <p style={{ fontSize: "13px", color: "#bbb", fontFamily: SYS, marginTop: "16px", marginBottom: "0" }}>
        First thing free, forever. Additional things $10 a month.
      </p>

    </div>
  );
}
