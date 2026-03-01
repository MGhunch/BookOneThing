import { ORANGE, GREY, GREY_LIGHT, DARK, WHITE, SYS, W_REGULAR, W_MEDIUM, W_BOLD } from "@/lib/constants";

export default function Home() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 24px", fontFamily: SYS,
    }}>

      {/* Hero */}
      <div style={{ maxWidth: "480px", textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "52px", fontWeight: W_BOLD, color: DARK,
          letterSpacing: "-2px", lineHeight: 1.05, margin: "0 0 20px 0",
        }}>
          The easy way<br />to share anything,<br />with anyone.
        </h1>
        <p style={{
          fontSize: "16px", color: GREY, lineHeight: 1.7, margin: 0, fontWeight: W_REGULAR,
        }}>
          Just set up your thing. Share a link. Done.<br />
          Anyone can book it. No passwords. No fuss.
        </p>
      </div>

      {/* CTA */}
      <a href="/setup" style={{
        display: "inline-block", background: ORANGE, color: WHITE,
        fontSize: "16px", fontWeight: W_MEDIUM, padding: "16px 36px",
        borderRadius: "16px", textDecoration: "none",
        letterSpacing: "-0.3px", fontFamily: SYS,
      }}>
        Set up your first thing on us
      </a>

      {/* Pricing note */}
      <p style={{ fontSize: "12px", color: GREY, fontFamily: SYS, marginTop: "12px", marginBottom: 0 }}>
        First thing free. Extra things $10 a month.
      </p>

    </div>
  );
}
