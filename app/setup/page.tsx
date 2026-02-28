"use client";

import { useState } from "react";
import {
  Car, Users, Coffee, Sun, Wrench, Monitor, Home, Plus, Check, Clock,
} from "lucide-react";
import { submitSetup } from "./actions";

// ─── TIMEZONE HELPERS ─────────────────────────────────────────────────────────

const TZ_FRIENDLY: Record<string, string> = {
  "Pacific/Auckland":    "New Zealand",
  "Pacific/Chatham":     "Chatham Islands",
  "Australia/Sydney":    "Sydney",
  "Australia/Melbourne": "Melbourne",
  "Australia/Brisbane":  "Brisbane",
  "Australia/Perth":     "Perth",
  "Australia/Adelaide":  "Adelaide",
  "Asia/Tokyo":          "Tokyo",
  "Asia/Singapore":      "Singapore",
  "Asia/Hong_Kong":      "Hong Kong",
  "Asia/Shanghai":       "China",
  "Asia/Kolkata":        "India",
  "Asia/Dubai":          "Dubai",
  "Europe/London":       "London",
  "Europe/Paris":        "Paris",
  "Europe/Berlin":       "Berlin",
  "Europe/Amsterdam":    "Amsterdam",
  "Europe/Stockholm":    "Stockholm",
  "Europe/Zurich":       "Zurich",
  "America/New_York":    "New York",
  "America/Chicago":     "Chicago",
  "America/Denver":      "Denver",
  "America/Los_Angeles": "Los Angeles",
  "America/Toronto":     "Toronto",
  "America/Vancouver":   "Vancouver",
  "America/Sao_Paulo":   "São Paulo",
  "America/Mexico_City": "Mexico City",
  "UTC":                 "UTC",
};

const TZ_LIST = Object.entries(TZ_FRIENDLY).map(([iana, label]) => ({ iana, label }));

function tzFriendly(iana: string): string {
  return TZ_FRIENDLY[iana] ?? iana.replace(/_/g, " ").split("/").pop() ?? iana;
}

function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
}
import ModalShell from "@/components/ModalShell";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const ORANGE_MID   = "#fbe0cc";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const GREY_LIGHT   = "#bbb";
const BORDER       = "#ede9e3";
const BG           = "#e8e5e0";
const CARD         = "#ffffff";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const ICONS = [
  { key: "car",     Icon: Car     },
  { key: "users",   Icon: Users   },
  { key: "coffee",  Icon: Coffee  },
  { key: "sun",     Icon: Sun     },
  { key: "wrench",  Icon: Wrench  },
  { key: "monitor", Icon: Monitor },
  { key: "home",    Icon: Home    },
  { key: "other",   Icon: Plus    },
];

const AVAIL_PRESETS = [
  { key: "9-5", label: "9 – 5"    },
  { key: "24",  label: "24 / 7"   },
  { key: "set", label: "Set hours" },
];

const LENGTH_PRESETS = [
  { key: "30",   label: "30 mins"  },
  { key: "120",  label: "2 hours"  },
  { key: "hd",   label: "Half day" },
  { key: "none", label: "No limits"},
];

const AHEAD_PRESETS = [
  { key: "1",    label: "1 month"  },
  { key: "3",    label: "3 months" },
  { key: "6",    label: "6 months" },
  { key: "12",   label: "1 year"   },
];

const CONCURRENT_PRESETS = [
  { key: "3",    label: "3"          },
  { key: "5",    label: "5"          },
  { key: "10",   label: "10"         },
  { key: "none", label: "Have at it" },
];

const BUFFER_PRESETS = [
  { key: "0",  label: "No need"  },
  { key: "15", label: "15 mins"  },
  { key: "30", label: "30 mins"  },
];

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`btn-selector${active ? " active" : ""}`}>
      {label}
    </button>
  );
}

function Field({ label, explainer, children }: { label: string; explainer?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: DARK, fontFamily: SYS, marginBottom: "2px" }}>{label}</div>
        {explainer && <div style={{ fontSize: "13px", fontWeight: 400, color: GREY, fontFamily: SYS }}>{explainer}</div>}
      </div>
      {children}
    </div>
  );
}

function OrangeBlock({ n }: { n: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: ORANGE, borderRadius: "8px", width: "32px", height: "32px", marginBottom: "16px" }}>
      <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", fontFamily: SYS, letterSpacing: "-0.5px" }}>0{n}</span>
    </div>
  );
}

// ─── MODALS ──────────────────────────────────────────────────────────────────

function DetailsModal({ name, onSubmit, loading, error }: {
  name: string;
  onSubmit: (email: string, firstName: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail]           = useState("");
  const [firstName, setFirstName]   = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [nameFocus, setNameFocus]   = useState(false);
  const [attempts, setAttempts]     = useState(0);

  const canSubmit  = email.trim().includes("@") && !!firstName.trim() && !loading;
  const hasError   = !!error;
  const isWobbly   = hasError && attempts >= 3;

  const handleClick = () => {
    if (!canSubmit && !hasError) return;
    if (hasError) {
      setAttempts(a => a + 1);
      onSubmit(email, firstName);
      return;
    }
    setAttempts(a => a + 1);
    onSubmit(email, firstName);
  };

  const buttonActive = canSubmit || hasError;

  return (
    <ModalShell>
      {/* X — only surfaces when truly stuck */}
      {isWobbly && (
        <button
          onClick={() => { window.location.href = "/"; }}
          style={{
            position: "absolute", top: "20px", right: "20px",
            background: "none", border: "none", cursor: "pointer",
            padding: "4px", lineHeight: 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>
      )}

      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: DARK, letterSpacing: "-0.6px", fontFamily: SYS, marginBottom: "8px" }}>
          One more thing
        </div>
        <div style={{ fontSize: "14px", color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
          We&rsquo;re nearly done, we just don&rsquo;t know you.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
        <div>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            placeholder="What's your email?"
            autoFocus
            style={{
              width: "100%", padding: "13px 16px", borderRadius: "12px",
              border: `1.5px solid ${emailFocus || email ? ORANGE : BORDER}`,
              background: email ? ORANGE_LIGHT : "#f9f8f6",
              fontSize: "15px", fontWeight: 500, fontFamily: SYS, color: DARK,
              outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const,
            }}
          />
          <div style={{ fontSize: "12px", color: GREY_LIGHT, marginTop: "5px", fontFamily: SYS }}>So we can keep you in the loop.</div>
        </div>

        <div>
          <input
            type="text" value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onFocus={() => setNameFocus(true)}
            onBlur={() => setNameFocus(false)}
            placeholder="What's your first name?"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: "12px",
              border: `1.5px solid ${nameFocus || firstName ? ORANGE : BORDER}`,
              background: firstName ? ORANGE_LIGHT : "#f9f8f6",
              fontSize: "15px", fontWeight: 500, fontFamily: SYS, color: DARK,
              outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const,
            }}
          />
          <div style={{ fontSize: "12px", color: GREY_LIGHT, marginTop: "5px", fontFamily: SYS }}>So we know who&rsquo;s who on the calendar.</div>
        </div>
      </div>

      {hasError && (
        <div style={{ fontSize: "13px", color: "#c0392b", marginBottom: "16px", fontFamily: SYS }}>
          {isWobbly
            ? "Something's gone wobbly. Hit the X and try later."
            : error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={!buttonActive}
        style={{
          width: "100%", padding: "16px", borderRadius: "13px", border: "none",
          background: buttonActive ? ORANGE : "#fbe0cc",
          color: buttonActive ? "#fff" : "#e0824a",
          fontSize: "15px", fontWeight: 700, fontFamily: SYS,
          cursor: buttonActive ? "pointer" : "default",
          letterSpacing: "-0.3px", transition: "all 0.2s",
        }}
      >
        {loading ? "Setting up your thing…" : hasError ? "Try again" : "Make my thing"}
      </button>
    </ModalShell>
  );
}

function SentModal({ name, onDiveIn }: { name: string; onDiveIn: () => void }) {
  return (
    <ModalShell>
      <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
        <Check size={24} strokeWidth={2.5} color="#fff" />
      </div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: DARK, letterSpacing: "-0.6px", fontFamily: SYS, lineHeight: 1.2, marginBottom: "10px" }}>
        Check your email
      </div>
      <div style={{ fontSize: "15px", color: GREY, fontFamily: SYS, lineHeight: 1.6, marginBottom: "28px" }}>
        We&rsquo;ve sent your link to &ldquo;{name}&rdquo;. Keep that email — it&rsquo;s how you get back to your calendar.
      </div>
      <button
        onClick={onDiveIn}
        style={{
          width: "100%", padding: "16px", borderRadius: "13px", border: "none",
          background: ORANGE, color: "#fff",
          fontSize: "15px", fontWeight: 700, fontFamily: SYS,
          cursor: "pointer", letterSpacing: "-0.3px",
        }}
      >
        Go to my calendar →
      </button>
    </ModalShell>
  );
}

// ─── MOCK CALENDAR ───────────────────────────────────────────────────────────

function MockCalendar({ name, iconKey }: { name: string; iconKey: string | null }) {
  const IconComp = ICONS.find(i => i.key === iconKey)?.Icon || Car;
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
  const todayIdx = day === 0 ? 6 : day - 1;
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = [8,9,10,11,12,13,14,15,16,17];
  const fmtH = (h: number) => h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h-12}pm`;

  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "18px 18px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconComp size={15} strokeWidth={1.75} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: DARK, letterSpacing: "-0.3px", fontFamily: SYS }}>{name}</div>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#bbb", fontFamily: SYS }}>Harbour Works</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", margin: "14px 0 10px" }}>
          {days.map((d, i) => {
            const sel = i === todayIdx;
            return (
              <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "5px 2px", borderRadius: "7px", background: sel ? ORANGE_LIGHT : "transparent" }}>
                <span style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" as const, color: sel ? ORANGE : "#ccc", fontFamily: SYS }}>{d}</span>
                <span style={{ fontSize: "13px", fontWeight: sel ? 700 : 400, color: sel ? ORANGE : "#ccc", fontFamily: SYS }}>{weekDates[i].getDate()}</span>
              </div>
            );
          })}
        </div>
        <div style={{ height: "1px", background: "#f4f0eb", marginBottom: "10px" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 16px" }}>
        {hours.map(h => (
          <div key={h} style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
            <div style={{ width: "32px", fontSize: "9px", color: "#ccc", fontWeight: 500, fontFamily: SYS, paddingTop: "10px", textAlign: "right" as const, flexShrink: 0 }}>{fmtH(h)}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ height: "26px", background: ORANGE_LIGHT, borderRadius: "6px" }} />
              <div style={{ height: "26px", background: ORANGE_LIGHT, borderRadius: "6px" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const [name, setName]             = useState("");
  const [icon, setIcon]             = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [avail, setAvail]           = useState("9-5");
  const [fromH, setFromH]           = useState(9);
  const [toH, setToH]               = useState(17);
  const [weekends, setWeekends]     = useState(false);
  const [timezone, setTimezone]     = useState(() => detectTimezone());
  const [tzSearch, setTzSearch]     = useState("");
  const [tzOpen, setTzOpen]         = useState(false);
  const [notes, setNotes]           = useState("");
  const [maxLen, setMaxLen]         = useState("120");
  const [ahead, setAhead]           = useState("1");
  const [concurrent, setConcurrent] = useState("3");
  const [buffer, setBuffer]         = useState("0");
  const [side, setSide]             = useState<"front" | "back">("front");
  const [flipping, setFlipping]     = useState(false);
  const [modal, setModal]           = useState<"none" | "details" | "sent" | "preview">("none");
  const [loading, setLoading]       = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameFocus, setNameFocus]   = useState(false);
  const [notesFocus, setNotesFocus] = useState(false);

  const trimmed   = name.trim();
  const canFlip   = !!trimmed;

  const flip = (to: "front" | "back") => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => { setSide(to); setFlipping(false); }, 400);
  };

  const fmtH = (h: number) => {
    if (h === 0)  return "12am";
    if (h < 12)   return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const selectStyle = {
    padding: "10px 14px", borderRadius: "10px",
    border: `1.5px solid ${BORDER}`, fontFamily: SYS,
    fontSize: "14px", fontWeight: 600, color: DARK,
    background: CARD, cursor: "pointer", outline: "none",
  };

  const [calUrl, setCalUrl] = useState<string | null>(null);
  const handleSubmit = async (email: string, firstName: string) => {
    setLoading(true);
    setSubmitError(null);

    const result = await submitSetup({
      name: trimmed, icon: icon || "car",
      avail, fromH, toH, weekends, notes,
      maxLen, ahead, concurrent, buffer,
      timezone,
      email, firstName,
    });

    setLoading(false);

    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }

    setCalUrl(result.url);
    setModal("sent");
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: SYS, position: "relative", zIndex: 0 }}>
      <style>{`
        @keyframes flipOut { 0% { transform: rotateY(0deg); opacity: 1; } 100% { transform: rotateY(-90deg); opacity: 0; } }
        @keyframes flipIn  { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0deg); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .flip-out { animation: flipOut 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .flip-in  { animation: flipIn  0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* Calendar backdrop when modal is shown, or in preview mode */}
      {modal !== "none" && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "90px 24px 60px" }}>
          <div style={{ width: "100%", maxWidth: "390px", height: "100%", maxHeight: "700px", background: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 48px rgba(0,0,0,0.09)" }}>
            <MockCalendar name={trimmed} iconKey={icon} />
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "details" && (
        <DetailsModal
          name={trimmed}
          onSubmit={handleSubmit}
          loading={loading}
          error={submitError}
        />
      )}
      {modal === "sent" && <SentModal name={trimmed} onDiveIn={() => {
        if (calUrl) window.location.href = calUrl;
      }} />}

      {/* Form */}
      {modal === "none" && (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "100px 24px 140px" }}>
          <style>{`.setup-icon-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; } @media (max-width: 600px) { .setup-icon-grid { grid-template-columns: repeat(4, 1fr); } .setup-card { padding: 28px 24px 28px !important; } }`}</style>

          <div
            className={`setup-card ${flipping ? (side === "front" ? "flip-out" : "flip-in") : ""}`}
            style={{ background: CARD, borderRadius: "24px", padding: "44px 44px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.07)" }}
          >

            {/* ── CARD 1 ── */}
            {side === "front" && (
              <>
                <OrangeBlock n={1} />
                <div style={{ fontSize: "28px", fontWeight: 800, color: DARK, letterSpacing: "-0.8px", lineHeight: 1.15, fontFamily: SYS, marginBottom: "8px" }}>
                  What are you sharing
                </div>
                <div style={{ fontSize: "15px", color: GREY, fontFamily: SYS, fontWeight: 400, marginBottom: "36px" }}>
                  It only takes a minute to set up your thing.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

                  <Field label="What's it called?" explainer="The simpler the better. Call it what it is.">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onFocus={() => setNameFocus(true)}
                      onBlur={() => setNameFocus(false)}
                      placeholder="The Car Park"
                      maxLength={40}
                      style={{
                        width: "100%", padding: "14px 18px", borderRadius: "14px",
                        border: `1.5px solid ${trimmed ? ORANGE : nameFocus ? ORANGE : BORDER}`,
                        background: trimmed ? ORANGE_LIGHT : "#f9f8f6",
                        fontSize: "18px", fontWeight: 600, fontFamily: SYS, color: DARK,
                        outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const,
                      }}
                    />
                  </Field>

                  <Field label="Choose an icon" explainer="To help you remember which thing is which.">
                    <div className="setup-icon-grid">
                      {ICONS.map(({ key, Icon }) => {
                        const active = icon === key;
                        return (
                          <button key={key} onClick={() => setIcon(key)} style={{
                            padding: "14px 8px", borderRadius: "12px",
                            border: active ? `1.5px solid ${ORANGE}` : `1.5px solid ${BORDER}`,
                            background: active ? ORANGE_LIGHT : "#f9f8f6",
                            cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", transition: "all 0.15s",
                          }}>
                            <Icon size={20} strokeWidth={1.75} color={active ? ORANGE : "#ccc"} />
                          </button>
                        );
                      })}
                    </div>
                    {icon === "other" && (
                      <input
                        value={otherLabel}
                        onChange={e => setOtherLabel(e.target.value)}
                        placeholder="What is it?"
                        maxLength={30}
                        autoFocus
                        style={{
                          marginTop: "12px", width: "220px", padding: "10px 14px",
                          borderRadius: "10px", border: `1.5px solid ${ORANGE}`,
                          background: ORANGE_LIGHT, fontSize: "14px", fontWeight: 600,
                          fontFamily: SYS, color: DARK, outline: "none", boxSizing: "border-box" as const,
                        }}
                      />
                    )}
                  </Field>

                  <Field label="When's it available?" explainer="Keeps the calendar nice and simple.">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {AVAIL_PRESETS.map(({ key, label }) => (
                        <Pill key={key} label={label} active={avail === key} onClick={() => setAvail(key)} />
                      ))}
                    </div>
                    {avail === "set" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                        <select value={fromH} onChange={e => setFromH(parseInt(e.target.value))} style={selectStyle}>
                          {hours.map(h => <option key={h} value={h}>{fmtH(h)}</option>)}
                        </select>
                        <span style={{ fontSize: "14px", color: GREY_LIGHT, fontWeight: 500 }}>to</span>
                        <select value={toH} onChange={e => setToH(parseInt(e.target.value))} style={selectStyle}>
                          {hours.map(h => <option key={h} value={h}>{fmtH(h)}</option>)}
                        </select>
                      </div>
                    )}
                    {avail !== "24" && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>

                        {/* Weekends checkbox */}
                        <button onClick={() => setWeekends(!weekends)}
                          style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: SYS }}>
                          <div style={{
                            width: "18px", height: "18px", borderRadius: "5px",
                            border: weekends ? "none" : `1.5px solid ${BORDER}`,
                            background: weekends ? ORANGE : "#f9f8f6",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all 0.15s",
                          }}>
                            {weekends && <Check size={10} strokeWidth={3} color="#fff" />}
                          </div>
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "#555" }}>Include weekends</span>
                        </button>

                        {/* Timezone */}
                        <div style={{ position: "relative" }}>
                          <button onClick={() => { setTzOpen(!tzOpen); setTzSearch(""); }}
                            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: SYS }}>
                            <Clock size={18} color={"#555"} strokeWidth={1.75} />
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "#555" }}>{tzFriendly(timezone)} time</span>
                          </button>

                          {tzOpen && (
                            <div style={{
                              position: "absolute", right: 0, top: "calc(100% + 8px)",
                              background: CARD, borderRadius: "14px", padding: "10px 0",
                              boxShadow: "0 4px 24px rgba(0,0,0,0.12)", zIndex: 100,
                              minWidth: "200px",
                            }}>
                              <div style={{ padding: "0 12px 8px" }}>
                                <input
                                  autoFocus
                                  value={tzSearch}
                                  onChange={e => setTzSearch(e.target.value)}
                                  placeholder="Search..."
                                  style={{
                                    width: "100%", padding: "8px 10px", borderRadius: "8px",
                                    border: `1.5px solid ${BORDER}`, background: "#f9f8f6",
                                    fontSize: "13px", fontFamily: SYS, outline: "none",
                                    boxSizing: "border-box" as const,
                                  }}
                                />
                              </div>
                              <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                                {TZ_LIST
                                  .filter(tz => tz.label.toLowerCase().includes(tzSearch.toLowerCase()))
                                  .map(tz => (
                                    <button key={tz.iana}
                                      onClick={() => { setTimezone(tz.iana); setTzOpen(false); }}
                                      style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "9px 16px", background: tz.iana === timezone ? ORANGE_LIGHT : "none",
                                        border: "none", cursor: "pointer", fontFamily: SYS,
                                        fontSize: "13px", fontWeight: tz.iana === timezone ? 700 : 400,
                                        color: tz.iana === timezone ? ORANGE : DARK,
                                      }}>
                                      {tz.label}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Field>

                  <Field label="Stuff people need to know" explainer="Any special rules or quirks?">
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      onFocus={() => setNotesFocus(true)}
                      onBlur={() => setNotesFocus(false)}
                      placeholder="e.g. Park on the left side only. Or don't forget the hot water."
                      rows={3}
                      maxLength={300}
                      style={{
                        width: "100%", padding: "14px 18px", borderRadius: "14px",
                        border: `1.5px solid ${notesFocus ? ORANGE : BORDER}`,
                        background: "#f9f8f6", fontSize: "14px", fontWeight: 400,
                        fontFamily: SYS, color: DARK, outline: "none",
                        resize: "none" as const, lineHeight: 1.7, boxSizing: "border-box" as const,
                        transition: "border 0.15s",
                      }}
                    />
                    <div style={{ fontSize: "12px", color: GREY_LIGHT, marginTop: "6px", fontFamily: SYS }}>
                      Keep it short and practical. No access codes or private information.
                    </div>
                  </Field>

                </div>

                <button
                  onClick={() => canFlip && flip("back")}
                  disabled={!canFlip}
                  className={`btn ${canFlip ? "btn-primary" : "btn-inactive"}`}
                  style={{ marginTop: "40px", fontSize: "16px", letterSpacing: "-0.3px" }}
                >
                  Let's set some rules
                </button>
              </>
            )}

            {/* ── CARD 2 ── */}
            {side === "back" && (
              <>
                <OrangeBlock n={2} />
                <div style={{ fontSize: "28px", fontWeight: 800, color: DARK, letterSpacing: "-0.8px", lineHeight: 1.15, fontFamily: SYS, marginBottom: "8px" }}>
                  How will you share it
                </div>
                <div style={{ fontSize: "15px", color: GREY, fontFamily: SYS, fontWeight: 400, marginBottom: "36px" }}>
                  Simple rules to make it fair for everyone.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

                  <Field label="Max time" explainer="So people don't stay all day.">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {LENGTH_PRESETS.map(({ key, label }) => (
                        <Pill key={key} label={label} active={maxLen === key} onClick={() => setMaxLen(key)} />
                      ))}
                    </div>
                  </Field>

                  <Field label="How far ahead?" explainer="So your people can plan.">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {AHEAD_PRESETS.map(({ key, label }) => (
                        <Pill key={key} label={label} active={ahead === key} onClick={() => setAhead(key)} />
                      ))}
                    </div>
                  </Field>

                  <Field label="Max bookings" explainer="So nobody hogs your thing.">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {CONCURRENT_PRESETS.map(({ key, label }) => (
                        <Pill key={key} label={label} active={concurrent === key} onClick={() => setConcurrent(key)} />
                      ))}
                    </div>
                  </Field>

                  <Field label="Breathing room" explainer="Time between bookings.">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {BUFFER_PRESETS.map(({ key, label }) => (
                        <Pill key={key} label={label} active={buffer === key} onClick={() => setBuffer(key)} />
                      ))}
                    </div>
                  </Field>

                </div>

                <button
                  onClick={() => setModal("details")}
                  style={{
                    width: "100%", marginTop: "40px", padding: "18px",
                    borderRadius: "14px", border: "none",
                    background: ORANGE, color: "#fff",
                    fontSize: "16px", fontWeight: 700, fontFamily: SYS,
                    cursor: "pointer", letterSpacing: "-0.3px",
                  }}
                >
                  {`Set up "${trimmed}"`}
                </button>


                <button
                  onClick={() => flip("front")}
                  style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: GREY_LIGHT, fontFamily: SYS, fontWeight: 500 }}
                >
                  ← Back
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
