const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default function CancelledPage() {
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
        width: 56, height: 56, borderRadius: 18,
        background: "#f0ece6",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 28px",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#bbb" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,11 8,17 19,5"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: "28px", fontWeight: 800, letterSpacing: "-0.6px",
        color: DARK, margin: "0 0 10px", lineHeight: 1.15,
      }}>
        Booking cancelled
      </h1>

      <p style={{
        fontSize: "15px", color: "#888", lineHeight: 1.65,
        margin: "0 0 32px", fontWeight: 400,
      }}>
        All sorted. Someone else can grab that slot now
      </p>

      <div style={{ height: 1, background: "#d8d5d0", margin: "0 0 32px" }} />

      <a href="/" style={{
        fontSize: "13px", fontWeight: 600, color: ORANGE, textDecoration: "none",
      }}>
        ← Go back to where you were
      </a>

    </div>
  );
}
