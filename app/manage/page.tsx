"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Car, Users, Coffee, Sun, Wrench, Monitor, Home, Plus,
  Copy, Check, ExternalLink, Settings, ChevronRight, ChevronDown, ChevronUp,
  LogOut, Edit2, X,
} from "lucide-react";
import { CodewordProgressBar } from "@/components/CodewordProgressBar";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const GREY_LIGHT   = "#bbb";
const BORDER       = "#ede9e3";
const BG           = "#e8e5e0";
const CARD         = "#ffffff";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const ICONS: Record<string, React.ElementType> = {
  car: Car, users: Users, coffee: Coffee, sun: Sun,
  wrench: Wrench, monitor: Monitor, home: Home, other: Plus,
};

// ─── SUPABASE ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Thing {
  id: string;
  name: string;
  slug: string;
  icon: string;
  avail_start: string;
  avail_end: string;
  avail_weekends: boolean;
  max_length_mins: number;
  book_ahead_days: number;
  max_concurrent: number;
  buffer_mins: number;
}

interface Profile {
  slug: string;
  first_name: string | null;
  org_name: string | null;
}

interface Sharer {
  id: string;
  first_name: string;
  email: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (h === 0  && m === 0) return "midnight";
  if (h === 12 && m === 0) return "12pm";
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

function fmtMaxLength(mins: number) {
  if (mins >= 99999) return "No limit";
  if (mins >= 480)   return "Full day";
  if (mins >= 240)   return "Half day";
  if (mins >= 60)    return `${mins / 60} hr${mins > 60 ? "s" : ""}`;
  return `${mins} mins`;
}

function fmtAhead(days: number) {
  if (days >= 365) return "1 year";
  if (days >= 90)  return "3 months";
  if (days >= 30)  return "1 month";
  return `${days} days`;
}

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8, flexShrink: 0,
        border: `1.5px solid ${copied ? ORANGE : BORDER}`,
        background: copied ? ORANGE_LIGHT : "#f9f8f6",
        color: copied ? ORANGE : GREY,
        fontSize: 12, fontWeight: 600, fontFamily: SYS,
        cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const,
      }}
    >
      {copied
        ? <><Check size={12} strokeWidth={2.5} /> Copied</>
        : <><Copy size={12} strokeWidth={1.75} /> Copy link</>}
    </button>
  );
}

// ─── SHARER ROW ───────────────────────────────────────────────────────────────

function SharerRow({ sharer, onRevoke }: { sharer: Sharer; onRevoke: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const initials = sharer.first_name.slice(0, 1).toUpperCase();

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: ORANGE_LIGHT, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: ORANGE, fontFamily: SYS,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DARK, fontFamily: SYS }}>{sharer.first_name}</div>
        <div style={{ fontSize: 11, color: GREY_LIGHT, fontFamily: SYS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{sharer.email}</div>
      </div>
      <button
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onRevoke(sharer.id)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 6, flexShrink: 0,
          border: `1.5px solid ${hover ? "#c0392b" : BORDER}`,
          background: hover ? "#fdf0ee" : "transparent",
          color: hover ? "#c0392b" : GREY_LIGHT,
          fontSize: 11, fontWeight: 600, fontFamily: SYS,
          cursor: "pointer", transition: "all 0.15s",
        }}
      >
        <X size={10} strokeWidth={2.5} /> Remove
      </button>
    </div>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────

function SettingsPanel({ thing, sharers, onRevoke }: {
  thing: Thing;
  sharers: Sharer[];
  onRevoke: (id: string) => void;
}) {
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, background: "#faf9f7", padding: "20px 24px 24px" }}>

      {/* Fairness Rules */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: GREY_LIGHT, fontFamily: SYS, textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>
            Fairness Rules
          </div>
          <a
            href={`/setup/edit?id=${thing.id}`}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 7,
              border: `1.5px solid ${BORDER}`,
              background: CARD, color: DARK, textDecoration: "none",
              fontSize: 11, fontWeight: 600, fontFamily: SYS,
            }}
          >
            <Edit2 size={10} strokeWidth={2.5} /> Edit
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Max booking",    value: fmtMaxLength(thing.max_length_mins) },
            { label: "Book ahead",     value: fmtAhead(thing.book_ahead_days)     },
            { label: "Max per person", value: thing.max_concurrent >= 99999 ? "Unlimited" : String(thing.max_concurrent) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: CARD, borderRadius: 10, padding: "10px 12px", border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: GREY_LIGHT, fontFamily: SYS, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DARK, fontFamily: SYS }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Your Sharers */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: GREY_LIGHT, fontFamily: SYS, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 4 }}>
          Your sharers
        </div>
        <div style={{ fontSize: 12, color: GREY_LIGHT, fontFamily: SYS, marginBottom: 12 }}>
          Here's everyone who's booking your thing.
        </div>

        {sharers.length === 0 ? (
          <div style={{ fontSize: 13, color: GREY_LIGHT, fontFamily: SYS, padding: "12px 0" }}>
            No bookings yet.
          </div>
        ) : (
          <div>
            {sharers.map((sharer, i) => (
              <div key={sharer.id} style={{ borderBottom: i === sharers.length - 1 ? "none" : undefined }}>
                <SharerRow sharer={sharer} onRevoke={onRevoke} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── THING CARD ───────────────────────────────────────────────────────────────

function ThingCard({ thing, ownerSlug }: { thing: Thing; ownerSlug: string }) {
  const [open, setOpen]         = useState(false);
  const [sharers, setSharers]   = useState<Sharer[]>([]);
  const [sharersLoaded, setSharersLoaded] = useState(false);

  const IconComp   = ICONS[thing.icon] ?? Car;
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookonething.com";
  const shareUrl   = `${siteUrl}/${ownerSlug}/${thing.slug}`;
  const availLabel = `${fmtTime(thing.avail_start)} – ${fmtTime(thing.avail_end)}${thing.avail_weekends ? ", 7 days" : ", weekdays"}`;

  // Load sharers on first open — per thing, so each card shows its own bookers
  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && !sharersLoaded) {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("booker_sessions")
        .select("id, first_name, email")
        .eq("thing_id", thing.id)
        .order("authenticated_at", { ascending: true });
      setSharers(data ?? []);
      setSharersLoaded(true);
    }
  };

  const revoke = async (id: string) => {
    const supabase = getSupabase();
    await supabase.from("booker_sessions").delete().eq("id", id);
    setSharers(s => s.filter(x => x.id !== id));
  };

  return (
    <div style={{ background: CARD, borderRadius: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 24px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: DARK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
          <IconComp size={20} strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: DARK, letterSpacing: "-0.3px", fontFamily: SYS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
            {thing.name}
          </div>
          <div style={{ fontSize: 12, color: GREY_LIGHT, fontFamily: SYS, marginTop: 2 }}>{availLabel}</div>
        </div>
        <button
          onClick={handleOpen}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 12px", borderRadius: 10, flexShrink: 0,
            border: `1.5px solid ${open ? ORANGE : BORDER}`,
            background: open ? ORANGE_LIGHT : "#f9f8f6",
            color: open ? ORANGE : GREY_LIGHT,
            fontSize: 12, fontWeight: 600, fontFamily: SYS,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <Settings size={13} strokeWidth={1.75} />
          Manage
          {open ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
        </button>
      </div>

      {/* Share row */}
      <div style={{ padding: "14px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 8,
              background: ORANGE_LIGHT, border: `1.5px solid #f2dcc8`,
              textDecoration: "none", overflow: "hidden",
            }}
          >
            <ExternalLink size={11} strokeWidth={2} color={ORANGE} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ORANGE, fontFamily: SYS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
              {shareUrl.replace("https://", "")}
            </span>
          </a>
          <CopyButton text={shareUrl} />
        </div>
      </div>

      {/* Settings panel */}
      <div style={{
        maxHeight: open ? 800 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <SettingsPanel thing={thing} sharers={sharers} onRevoke={revoke} />
      </div>
    </div>
  );
}

// ─── ADD THING CARD ───────────────────────────────────────────────────────────

function AddThingCard({ hasThings }: { hasThings: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href="/setup"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "20px 24px", borderRadius: 20, textDecoration: "none",
        background: hover ? ORANGE_LIGHT : CARD,
        border: `2px solid ${hover ? ORANGE : BORDER}`,
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: hover ? ORANGE : "#f0ece6",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: hover ? "#fff" : GREY_LIGHT,
        transition: "all 0.2s",
      }}>
        <Plus size={20} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: DARK, fontFamily: SYS, letterSpacing: "-0.2px" }}>
          Add another thing
        </div>
        <div style={{ fontSize: 12, color: GREY_LIGHT, fontFamily: SYS, marginTop: 2 }}>
          {hasThings ? "$10/month. Cancel anytime." : "Your first thing is free."}
        </div>
      </div>
      <ChevronRight size={18} strokeWidth={1.75} color={hover ? ORANGE : GREY_LIGHT} style={{ flexShrink: 0, transition: "all 0.2s" }} />
    </a>
  );
}



// ─── CODEWORD SCREEN ──────────────────────────────────────────────────────────

function CodewordScreen({ onAuthed }: { onAuthed: (email: string) => void }) {
  const [screen, setScreen]     = useState<"email" | "code">("email");
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;

  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const { sendCodeword } = await import("@/app/codeword-actions");
    const result = await sendCodeword({ context: "manage", email: email.trim() });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setResetKey(k => k + 1);
    setScreen("code");
  }

  async function handleVerify() {
    if (!validCode || loading) return;
    setLoading(true);
    setError(null);
    const { verifyCodeword } = await import("@/app/codeword-actions");
    const result = await verifyCodeword({ email: email.trim(), code: code.trim().toUpperCase(), context: "manage" });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onAuthed(email.trim());
  }

  // ── Email step ──────────────────────────────────────────────────────────────

  if (screen === "email") {
    return (
      <>
        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20%,60%  { transform: translateX(-6px); }
            40%,80%  { transform: translateX(6px); }
          }
          .cw-shake { animation: shake 0.4s ease; }
        `}</style>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: DARK, letterSpacing: "-0.6px", fontFamily: SYS, lineHeight: 1.15, marginBottom: 8 }}>
            Let's find your things.
          </div>
          <div style={{ fontSize: 15, color: GREY, fontFamily: SYS, lineHeight: 1.65 }}>
            Just pop in your email.
          </div>
        </div>
        <input
          type="email" value={email}
          onChange={e => { setEmail(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="your@email.com" autoFocus
          style={{
            width: "100%", padding: "14px 18px", borderRadius: 14,
            border: `1.5px solid ${email ? ORANGE : BORDER}`,
            background: email ? ORANGE_LIGHT : "#f9f8f6",
            fontSize: 16, fontWeight: 500, fontFamily: SYS, color: DARK,
            outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const,
            marginBottom: 10,
          }}
        />
        {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10 }}>{error}</div>}
        <button
          onClick={handleSend} disabled={!validEmail || loading}
          style={{
            width: "100%", padding: 16, borderRadius: 13, border: "none",
            background: validEmail ? ORANGE : "#f0ece6",
            color: validEmail ? "#fff" : "#bbb",
            fontSize: 15, fontWeight: 700, fontFamily: SYS,
            cursor: validEmail ? "pointer" : "default",
            letterSpacing: "-0.3px", transition: "all 0.2s",
          }}
        >
          {loading ? "Sending…" : "Get a codeword"}
        </button>
      </>
    );
  }

  // ── Code step ───────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: DARK, letterSpacing: "-0.6px", fontFamily: SYS, lineHeight: 1.15 }}>
          Enter your codeword.
        </div>
      </div>

      <CodewordProgressBar resetKey={resetKey} />

      <div className={shake ? "cw-shake" : ""}>
        <input
          type="text" value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="CODEWORD" maxLength={10} autoFocus
          style={{
            width: "100%", padding: "16px 18px", borderRadius: 14,
            textAlign: "center" as const,
            border: `2px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`,
            background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f9f8f6",
            fontSize: 26, fontWeight: 800, fontFamily: SYS,
            color: error ? "#c0392b" : DARK,
            outline: "none", letterSpacing: "5px",
            transition: "all 0.15s", boxSizing: "border-box" as const,
            marginBottom: 10,
          }}
        />
      </div>
      {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10, textAlign: "center" as const }}>{error}</div>}
      <button
        onClick={handleVerify} disabled={!validCode || loading}
        style={{
          width: "100%", padding: 16, borderRadius: 13, border: "none",
          background: validCode ? DARK : "#f0ece6",
          color: validCode ? "#fff" : "#bbb",
          fontSize: 15, fontWeight: 700, fontFamily: SYS,
          cursor: validCode ? "pointer" : "default",
          letterSpacing: "-0.3px", transition: "all 0.2s",
          marginBottom: 14,
        }}
      >
        {loading ? "Checking…" : "Unlock"}
      </button>
      <div style={{ textAlign: "center" as const, fontSize: 13, color: GREY_LIGHT, fontFamily: SYS }}>
        Didn't get it?{" "}
        <span
          onClick={() => { setScreen("email"); setCode(""); setError(null); }}
          style={{ color: ORANGE, fontWeight: 600, cursor: "pointer" }}
        >
          Send another
        </span>
      </div>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ManagePage() {
  const [authState, setAuthState]   = useState<"loading" | "unauthed" | "authed">("unauthed");
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [things, setThings]         = useState<Thing[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  async function loadData(email: string) {
    setDataLoading(true);
    const { loadOwnerData } = await import("@/app/codeword-actions");
    const result = await loadOwnerData(email);
    if (result.profile) setProfile(result.profile as Profile);
    setThings(result.things as Thing[]);
    setDataLoading(false);
  }

  function handleAuthed(email: string) {
    setAuthedEmail(email);
    setAuthState("authed");
    loadData(email);
  }

  const signOut = () => {
    window.location.href = "/";
  };

  // ── Not authenticated ────────────────────────────────────────────────────────

  if (authState === "unauthed") {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ background: CARD, borderRadius: 24, padding: "48px 40px", maxWidth: 380, width: "100%", boxShadow: "0 4px 32px rgba(0,0,0,0.07)" }}>
          <CodewordScreen onAuthed={handleAuthed} />
        </div>
      </div>
    );
  }

  // ── Authenticated ────────────────────────────────────────────────────────────

  const firstName = profile?.first_name ?? "there";
  const ownerSlug = profile?.slug ?? "";

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: SYS }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .thing-card { animation: fadeUp 0.3s ease forwards; opacity: 0; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px 120px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: DARK, letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 6 }}>
              Your things, {firstName}.
            </div>
            <div style={{ fontSize: 15, color: GREY, fontWeight: 400, lineHeight: 1.65 }}>
              Share the link. People book. That's it.
            </div>
          </div>
          <button
            onClick={signOut}
            style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 6,
              background: "none", border: `1.5px solid ${BORDER}`,
              borderRadius: 8, padding: "7px 12px", cursor: "pointer",
              color: GREY_LIGHT, fontFamily: SYS, fontSize: 12, fontWeight: 600,
            }}
          >
            <LogOut size={12} strokeWidth={1.75} /> Sign out
          </button>
        </div>

        {/* Things */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dataLoading ? (
            [0, 1].map(i => (
              <div key={i} style={{ background: CARD, borderRadius: 20, height: 120, opacity: 0.4, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }} />
            ))
          ) : (
            <>
              {things.map((thing, i) => (
                <div key={thing.id} className="thing-card" style={{ animationDelay: `${i * 0.07}s` }}>
                  <ThingCard thing={thing} ownerSlug={ownerSlug} />
                </div>
              ))}
              <div className="thing-card" style={{ animationDelay: `${things.length * 0.07}s` }}>
                <AddThingCard hasThings={things.length > 0} />
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
