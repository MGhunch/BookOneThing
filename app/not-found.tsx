const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default function NotFound() {
  return (
    <div style={{
      maxWidth: "400px",
      margin: "0 auto",
      padding: "120px 24px 100px",
      fontFamily: SYS,
      textAlign: "center",
    }}>

      {/* Icon */}
      <div style={{
        width: 56, height: 56,
        borderRadius: 18,
        background: ORANGE,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 28px",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="12" />
          <line x1="11" y1="15" x2="11.01" y2="15" />
        </svg>
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "28px",
        fontWeight: 800,
        letterSpacing: "-0.6px",
        color: DARK,
        margin: "0 0 10px",
        lineHeight: 1.15,
      }}>
        We've lost some things
      </h1>

      <p style={{
        fontSize: "15px",
        color: "#888",
        lineHeight: 1.65,
        margin: "0 0 32px",
        fontWeight: 400,
      }}>
        Well, not things exactly, just this page.<br />
        Try lifting a different rock.
      </p>

      <div style={{ height: 1, background: "#d8d5d0", margin: "0 0 32px" }} />

      <a href="/" style={{
        fontSize: "13px",
        fontWeight: 600,
        color: ORANGE,
        textDecoration: "none",
      }}>
        ← Go back to where you were
      </a>

    </div>
  );
}
