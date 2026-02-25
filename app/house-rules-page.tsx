const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const CARD   = "#ffffff";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const RULES = [
  {
    title: "Always look after the things",
    body: "When people share their stuff, it's good to leave it just as you found it. Mostly they won't complain out loud. But they'll think it.",
  },
  {
    title: "Only book things when you need them",
    body: "Not 'just in case'. Or 'maybe next Friday'. Or when you need to get in quick before Colin hogs the lot. That's just chaos.",
  },
  {
    title: "Don't be a dick",
    body: "It's life advice not booking advice, but if the shoe fits. If you're wondering 'should I?', it's likely you should not.",
  },
];

export default function HouseRulesPage() {
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
        House Rules
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
        Three simple rules
      </h1>

      {/* Rules */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {RULES.map((rule, i) => (
          <div key={i} style={{
            display: "flex",
            background: CARD,
            borderRadius: "20px",
            overflow: "hidden",
          }}>
            {/* Orange stripe */}
            <div style={{ width: "4px", flexShrink: 0, background: ORANGE }} />
            {/* Content */}
            <div style={{ padding: "28px 32px" }}>
              <div style={{
                fontSize: "17px",
                fontWeight: 700,
                color: DARK,
                letterSpacing: "-0.3px",
                marginBottom: "10px",
              }}>
                {rule.title}
              </div>
              <p style={{
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: 1.75,
                color: "#555",
                margin: 0,
              }}>
                {rule.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: "48px", textAlign: "center" }}>
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
