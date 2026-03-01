import { ORANGE, DARK, WHITE, SYS, W_BOLD, W_REGULAR } from "@/lib/constants";

const PARAS = [
  { text: "Small team. Twelve people. One meeting room.",                                                                                                          bold: true  },
  { text: "You'd think there'd be an easy way to book it. But there wasn't. We got lost in the gap between Gmail and Outlook.",                                    bold: false },
  { text: "Double bookings. Disappearing invites. Chaos.",                                                                                                         bold: true  },
  { text: "So we asked the internet for help. No dice.",                                                                                                           bold: false },
  { text: "Sure, there's stacks of different systems with thousands of features for hundreds of dollars. But no easy way to just book one thing.",                  bold: false },
  { text: "So we made one.",                                                                                                                                        bold: true  },
  { text: "Now anyone can book one thing.",                                                                                                                         bold: false },
];

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
        fontSize: SIZE_XS,
        fontWeight: W_MEDIUM,
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
        fontWeight: W_BOLD,
        letterSpacing: "-0.8px",
        lineHeight: 1.15,
        color: DARK,
        marginBottom: "40px",
      }}>
        All we wanted to do<br />was book a room
      </h1>

      {/* Story card */}
      <div style={{
        background: WHITE,
        borderRadius: "20px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}>
        {PARAS.map((para, i) => (
          <p key={i} style={{
            fontSize: SIZE_BASE,
            fontWeight: para.bold ? W_BOLD : W_REGULAR,
            lineHeight: 1.75,
            color: para.bold ? DARK : "#555",
            margin: 0,
          }}>
            {para.text}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <a href="/setup" style={{
          display: "inline-block",
          background: ORANGE,
          color: WHITE,
          fontSize: SIZE_BASE,
          fontWeight: W_MEDIUM,
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
