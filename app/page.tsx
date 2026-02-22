import Image from "next/image";

const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = "#e8722a";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8e5e0",
        fontFamily: SYS,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "48px" }}>
        <Image
          src="/logo.png"
          alt="bookonething"
          width={240}
          height={48}
          style={{ height: "40px", width: "auto" }}
          priority
        />
      </div>

      {/* Hero */}
      <div
        style={{
          maxWidth: "480px",
          textAlign: "center",
          marginBottom: "48px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#1a1a1a",
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          The easy way to share anything, with anyone.
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#888",
            lineHeight: 1.7,
            marginBottom: "32px",
          }}
        >
          Sign up. Name your thing. Share the link. Done.
          <br />
          Anyone can book it. No app. No login. No training required.
        </p>

        <a
          href="/setup"
          style={{
            display: "inline-block",
            background: ORANGE,
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            padding: "16px 36px",
            borderRadius: "16px",
            textDecoration: "none",
            letterSpacing: "-0.3px",
          }}
        >
          Set up your first thing — free
        </a>
      </div>

      {/* Pricing note */}
      <p style={{ fontSize: "13px", color: "#aaa", fontFamily: SYS }}>
        First thing free, forever. Additional things $10/month each.
      </p>
    </div>
  );
}
