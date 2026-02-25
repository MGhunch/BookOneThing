"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Car, Users, Coffee, Sun, X, Trash2 } from "lucide-react";
import type { Thing, Booking } from "@/types";
import { createBooking, cancelBooking, setReminderPreference } from "@/app/[slug]/actions";
import ModalShell from "@/components/ModalShell";

const ORANGE        = "#e8722a";
const ORANGE_BOOKED = "#f2c9a8";
const ORANGE_AVAIL  = "#fdf4ee";
const ORANGE_SOFT   = "#fbe0cc";
const ORANGE_READY  = "#f0924a";
const DARK   = "#1a1a1a";
const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const SLOT_H   = 36;
const HAIRLINE = 1;
const PILL_GAP = 5;

const DAYS      = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FULL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const ICON_MAP: Record<string, React.ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  car: Car, users: Users, coffee: Coffee, sun: Sun,
};

const S_IDLE    = "idle";
const S_PICKING = "picking";
const S_SEEN    = "seen";
const S_READY   = "ready";
const S_MODAL   = "modal";

const ALL_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  ALL_SLOTS.push(`${h}:00`);
  ALL_SLOTS.push(`${h}:30`);
}
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

function slotY(i: number) {
  return Math.floor(i / 2) * (2 * SLOT_H + HAIRLINE + PILL_GAP) + (i % 2) * (SLOT_H + HAIRLINE);
}
const totalH = 24 * (2 * SLOT_H + HAIRLINE + PILL_GAP);

function slotIdx(s: string) { return ALL_SLOTS.indexOf(s); }

function fmtHour(n: number) {
  if (n === 0) return "12am";
  if (n < 12) return `${n}am`;
  if (n === 12) return "12pm";
  return `${n - 12}pm`;
}

function fmtSlot(s: string) {
  if (!s) return "";
  const [h, m] = s.split(":");
  const n = parseInt(h);
  const base = n === 0 ? "12" : n <= 12 ? `${n}` : `${n - 12}`;
  const suffix = n < 12 ? "am" : "pm";
  return m === "30" ? `${base}:30${suffix}` : `${base}${suffix}`;
}

function fmtEndTime(endSlot: string) {
  const [h, m] = endSlot.split(":").map(Number);
  let mins = h * 60 + m + 30;
  if (mins >= 24 * 60) mins = 24 * 60;
  const nh = Math.floor(mins / 60) % 24;
  const nm = mins % 60;
  return fmtSlot(`${nh}:${nm === 0 ? "00" : "30"}`);
}

function bookingToSlots(b: Booking, dateStr: string): string[] {
  const start = new Date(b.starts_at);
  const end   = new Date(b.ends_at);
  const localDate = start.toLocaleDateString("en-CA");
  if (localDate !== dateStr) return [];
  const slots: string[] = [];
  const cur = new Date(start);
  while (cur < end) {
    slots.push(`${cur.getHours()}:${cur.getMinutes() === 0 ? "00" : "30"}`);
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return slots;
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function TickRow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Check size={9} strokeWidth={3} color="#fff" />
      </div>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", fontFamily: SYS }}>{label}</span>
    </div>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: "80px", left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)`,
      opacity: visible ? 1 : 0, transition: "all 0.2s ease",
      background: "rgba(80,74,68,0.82)", color: "#fff",
      fontSize: "13px", fontWeight: 600, fontFamily: SYS,
      padding: "10px 20px", borderRadius: "24px",
      pointerEvents: "none", zIndex: 300, whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

interface BookerSession {
  email:     string;
  firstName: string;
}

interface CalendarProps {
  thing: Thing;
  orgName: string;
  bookings: Booking[];
  bookerSession: BookerSession | null;
}

export default function Calendar({ thing, orgName, bookings, bookerSession }: CalendarProps) {
  const [weekOffset, setWeekOffset]   = useState(0);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [phase, setPhase]           = useState(S_IDLE);
  const [start, setStart]           = useState<string | null>(null);
  const [end, setEnd]               = useState<string | null>(null);
  const [confirmed, setConfirmed]     = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [reminderNote, setReminderNote]   = useState("");
  const [reminderSaved, setReminderSaved] = useState(false);
  // Identity comes from the server-side session cookie (set by the magic link flow).
  // We keep local state so returning-device fallback (localStorage) can still populate them.
  const [bookerName, setBookerName]   = useState<string>(bookerSession?.firstName ?? "");
  const [bookerEmail, setBookerEmail] = useState<string>(bookerSession?.email ?? "");
  const [submitting, setSubmitting]   = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; timeStr: string } | null>(null);
  const [toast, setToast]             = useState({ visible: false, message: "" });

  const scrollRef  = useRef<HTMLDivElement>(null);
  const calRef     = useRef<HTMLDivElement>(null);
  const [calH, setCalH] = useState(300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router     = useRouter();

  const ThingIcon = ICON_MAP[thing.icon] || Car;
  const dates     = getWeekDates(weekOffset);
  const selDate   = dates[selectedDay];
  const dateStr   = selDate.toLocaleDateString("en-CA");

  // Is this a returning booker on this device?
  // A booker is "known" if they authenticated via the gate (session cookie)
  // or if they previously booked on this device (localStorage fallback).
  const isKnownBooker = bookerSession !== null || (bookerName !== "" && bookerEmail !== "");

  // Convert a slot string ("10:00") + the selected date into an ISO timestamp
  function slotToISO(slot: string, plusMins = 0): string {
    const [h, m] = slot.split(":").map(Number);
    const d = new Date(selDate);
    d.setHours(h, m + plusMins, 0, 0);
    return d.toISOString();
  }

  const bookingMap: Record<string, string> = {};
  const bookingIdMap: Record<string, string> = {};
  bookings.forEach((b) => {
    bookingToSlots(b, dateStr).forEach((slot) => {
      bookingMap[slot] = b.booker_name;
      bookingIdMap[slot] = b.id;
    });
  });

  const YOURS: string[] = Object.entries(bookingMap)
    .filter(([, name]) => name === bookerName && bookerName !== "")
    .map(([slot]) => slot);

  const dateLabel = `${FULL_DAYS[selectedDay]} ${selDate.getDate()} ${MONTHS[selDate.getMonth()]}`;

  // If we have a session from the cookie, that's authoritative.
  // Otherwise fall back to localStorage for any users pre-gate-rollout.
  useEffect(() => {
    if (bookerSession) return; // Session cookie wins — no localStorage needed
    const storedName  = localStorage.getItem("bookerName");
    const storedEmail = localStorage.getItem("bookerEmail");
    if (storedName)  setBookerName(storedName);
    if (storedEmail && storedEmail.includes("@") && storedEmail.includes(".")) {
      setBookerEmail(storedEmail);
    } else if (storedEmail) {
      localStorage.removeItem("bookerEmail");
      localStorage.removeItem("bookerName");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!calRef.current) return;
    const ro = new ResizeObserver((e) => {
      for (const ev of e) setCalH(ev.contentRect.height);
    });
    ro.observe(calRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    // 24/7 resource → open at 8am. Otherwise open at avail_start.
    const availStart = (thing.avail_start as string) ?? "09:00";
    const scrollTo = availStart === "00:00" ? "08:00" : availStart;
    const [h, m] = scrollTo.split(":").map(Number);
    const startSlotIdx = h * 2 + (m >= 30 ? 1 : 0);
    scrollRef.current.scrollTop = Math.max(0, slotY(startSlotIdx) - 16);
  }, [calH]);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000);
  }, []);

  const reset = () => {
    if (seenTimer.current) clearTimeout(seenTimer.current);
    setPhase(S_IDLE); setStart(null); setEnd(null); setConfirmed(false);
    setConfirmedBookingId(null); setReminderOptIn(false); setReminderNote(""); setReminderSaved(false);
  };

  const changeDay = (i: number) => { setSelectedDay(i); reset(); };
  const changeWeek = (dir: number) => { setWeekOffset((w) => w + dir); reset(); };

  const inRange = (s: string) => {
    if (!start) return false;
    const si = slotIdx(start);
    const ei = end ? slotIdx(end) : si;
    const idx = slotIdx(s);
    if (idx < 0) return false;
    return idx >= Math.min(si, ei) && idx <= Math.max(si, ei);
  };

  const hasConflict = (a: string, b: string) => {
    const lo = Math.min(slotIdx(a), slotIdx(b));
    const hi = Math.max(slotIdx(a), slotIdx(b));
    return ALL_SLOTS.slice(lo, hi + 1).some((s) => bookingMap[s] && !YOURS.includes(s));
  };

  const handleSlot = (s: string) => {
    if (bookingMap[s] && !YOURS.includes(s)) { showToast("Sorry, not available."); return; }
    if (YOURS.includes(s)) { showToast("Tap to cancel — coming soon."); return; }

    if (phase === S_IDLE || phase === S_READY) {
      setStart(s); setEnd(null); setPhase(S_PICKING); return;
    }
    if (phase === S_PICKING) {
      if (hasConflict(start!, s)) {
        showToast("Sorry, not available.");
        setStart(s); setEnd(null); setPhase(S_PICKING); return;
      }
      const lo = Math.min(slotIdx(start!), slotIdx(s));
      const hi = Math.max(slotIdx(start!), slotIdx(s));
      setStart(ALL_SLOTS[lo]); setEnd(ALL_SLOTS[hi]); setPhase(S_SEEN);
      if (seenTimer.current) clearTimeout(seenTimer.current);
      seenTimer.current = setTimeout(() => setPhase(S_READY), 700);
    }
  };

  const handleSelectionTap = () => { if (phase === S_READY) setPhase(S_MODAL); };

  const slotBg = (s: string) => {
    if (!inRange(s)) return ORANGE_AVAIL;
    if (phase === S_READY) return ORANGE_READY;
    return ORANGE_SOFT;
  };

  const startLabel = (slot: string) => {
    if (slot !== start) return null;
    if (phase === S_PICKING || phase === S_SEEN)
      return <span style={{ fontSize: "11px", fontWeight: 600, color: ORANGE, fontFamily: SYS }}>From {fmtSlot(start)}</span>;
    if (phase === S_READY)
      return <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", fontFamily: SYS }}>Book it?</span>;
    return null;
  };

  const endLabel = (slot: string) => {
    if (!end || slot !== end || slot === start) return null;
    const untilStr = fmtEndTime(end);
    if (phase === S_SEEN)
      return <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(232,114,42,0.8)", fontFamily: SYS }}>Until {untilStr}</span>;
    if (phase === S_READY)
      return <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: SYS }}>{fmtSlot(start!)} – {untilStr}</span>;
    return null;
  };

  const timeStr = start
    ? end && end !== start
      ? `${fmtSlot(start)} – ${fmtEndTime(end)}`
      : `${fmtSlot(start)} – ${fmtEndTime(start)}`
    : "";

  type Group = {
    type: string; name?: string; id?: string;
    startIdx: number; endIdx: number;
    s1?: string; s2?: string; slot?: string;
  };

  function buildGroups(): Group[] {
    const groups: Group[] = [];
    let i = 0;
    while (i < ALL_SLOTS.length) {
      const slot = ALL_SLOTS[i];
      const id   = bookingIdMap[slot];
      const name = bookingMap[slot];
      const yours = YOURS.includes(slot);

      if (id && !yours) {
        // Merge only slots belonging to the same booking ID
        let j = i;
        while (j < ALL_SLOTS.length && bookingIdMap[ALL_SLOTS[j]] === id) j++;
        groups.push({ type: "booking", name, id, startIdx: i, endIdx: j - 1 });
        i = j;
      } else if (yours) {
        // Merge only slots belonging to the same booking ID
        let j = i;
        while (j < ALL_SLOTS.length && bookingIdMap[ALL_SLOTS[j]] === id) j++;
        groups.push({ type: "yours", id, startIdx: i, endIdx: j - 1 });
        i = j;
      } else {
        const next = ALL_SLOTS[i + 1];
        const sameHour = next && slot.split(":")[0] === next.split(":")[0];
        if (sameHour && !bookingMap[next] && !YOURS.includes(next)) {
          groups.push({ type: "pill", startIdx: i, endIdx: i + 1, s1: slot, s2: next });
          i += 2;
        } else {
          groups.push({ type: "half", startIdx: i, endIdx: i, slot });
          i++;
        }
      }
    }
    return groups;
  }

  const groups = buildGroups();
  const groupH = (si: number, ei: number) => slotY(ei) + SLOT_H - slotY(si);

  return (
    <>
      <style>{`
        button { font-family: 'Poppins', sans-serif; outline: none; }
        button:focus, button:focus-visible { outline: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes readyPop { 0% { filter: brightness(1); } 50% { filter: brightness(1.06); } 100% { filter: brightness(1); } }
        .ready-pop { animation: readyPop 0.3s ease; }
        .cal-scroll::-webkit-scrollbar { width: 5px; display: block; }
        .cal-scroll::-webkit-scrollbar-track { background: transparent; }
        .cal-scroll::-webkit-scrollbar-thumb { background: rgba(232,114,42,0.2); border-radius: 99px; }
        .cal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(232,114,42,0.45); }
        .cal-scroll { scrollbar-width: thin; scrollbar-color: rgba(232,114,42,0.2) transparent; }
        @media (max-width: 779px) {
          .cal-scroll::-webkit-scrollbar { display: none; }
          .cal-scroll { scrollbar-width: none; }
        }
      `}</style>

      {/* Card */}
      <div style={{
        height: "calc(100dvh - 160px)",
        minHeight: "520px",
        background: "#fff",
        borderRadius: "24px",
        boxShadow: "0 8px 48px rgba(0,0,0,0.09)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: SYS,
      }}>

        {/* Card header */}
        <div style={{ flexShrink: 0, padding: "22px 20px 0" }}>

          {/* Thing identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: ORANGE,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ThingIcon size={17} strokeWidth={1.75} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "19px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {thing.name}
              </div>
              {orgName && (
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#bbb", marginTop: "2px" }}>
                  {orgName}
                </div>
              )}
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "4px", flexShrink: 0, display: "flex", alignItems: "center" }}>
              <Info size={15} strokeWidth={1.75} />
            </button>
          </div>

          {/* Day strip */}
          <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 16px", gap: "1px", alignItems: "center", marginBottom: "12px", marginTop: "16px" }}>
            <button onClick={() => changeWeek(-1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ddd", padding: 0 }}>‹</button>
            {DAYS.map((day, i) => {
              const d = dates[i];
              const sel = i === selectedDay;
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <button key={day} onClick={() => changeDay(i)} style={{
                  background: sel ? ORANGE_AVAIL : "transparent",
                  border: "none", borderRadius: "8px", padding: "6px 1px",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                }}>
                  <span style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: sel ? ORANGE : "#ccc" }}>{day}</span>
                  <span style={{ fontSize: "14px", fontWeight: isToday ? 800 : sel ? 700 : 400, color: sel ? ORANGE : isToday ? "#1a1a1a" : "#bbb" }}>{d.getDate()}</span>
                  {isToday && !sel && <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: ORANGE }} />}
                </button>
              );
            })}
            <button onClick={() => changeWeek(1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ddd", padding: 0 }}>›</button>
          </div>

          {/* Date row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", paddingBottom: "14px", borderTop: "1px solid #f4f0eb" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px" }}>
              {dateLabel}
            </span>
            {phase !== S_IDLE && (
              <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "4px" }}>
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Calendar scroll area */}
        <div ref={calRef} style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          <div
            ref={scrollRef}
            className="cal-scroll"
            style={{ position: "absolute", inset: 0, overflowY: "scroll", padding: "10px 16px 10px 16px" }}
          >
            <div style={{ position: "relative", height: `${totalH}px`, paddingLeft: "40px" }}>

              {ALL_HOURS.map((h) => (
                <div key={h} style={{ position: "absolute", left: 0, top: `${slotY(h * 2)}px`, width: "36px", height: `${SLOT_H}px`, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "10px", color: "#ccc", fontWeight: 500 }}>{fmtHour(h)}</span>
                </div>
              ))}

              <div style={{ position: "absolute", left: "40px", right: 0, top: 0 }}>
                {groups.map((group, gi) => {
                  const top    = slotY(group.startIdx);
                  const height = groupH(group.startIdx, group.endIdx);

                  if (group.type === "booking") return (
                    <div key={gi} onClick={() => showToast("Sorry, not available.")}
                      style={{ position: "absolute", top, left: 0, right: 0, height, background: ORANGE_BOOKED, borderRadius: "8px", display: "flex", alignItems: "flex-start", padding: "8px 11px", cursor: "pointer" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#c45a10" }}>{group.name}</span>
                    </div>
                  );

                  if (group.type === "yours") return (
                    <div
                    key={gi}
                    onClick={() => {
                      const s = ALL_SLOTS[group.startIdx];
                      const e = ALL_SLOTS[group.endIdx];
                      setCancelTarget({ id: group.id!, timeStr: `${fmtSlot(s)} – ${fmtEndTime(e)}` });
                    }}
                    style={{ position: "absolute", top, left: 0, right: 0, height, background: ORANGE, borderRadius: "8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 11px", cursor: "pointer" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff" }}>Your booking</span>
                      <Trash2 size={13} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                    </div>
                  );

                  if (group.type === "pill") {
                    const a1 = inRange(group.s1!);
                    const a2 = inRange(group.s2!);
                    const anyA = a1 || a2;
                    const bothActive = a1 && a2;
                    const ready = anyA && phase === S_READY;

                    return (
                      <div key={gi}
                        className={ready ? "ready-pop" : ""}
                        onClick={ready ? handleSelectionTap : undefined}
                        style={{ position: "absolute", top, left: 0, right: 0, height, borderRadius: "8px", overflow: "hidden",
                          border: bothActive ? `2px solid ${ORANGE}` : "2px solid transparent",
                          boxSizing: "border-box", cursor: ready ? "pointer" : "default", transition: "border 0.15s" }}>
                        <button
                          onClick={ready ? handleSelectionTap : () => handleSlot(group.s1!)}
                          style={{ display: "flex", alignItems: "center", paddingLeft: "11px", width: "100%", height: `${SLOT_H}px`,
                            background: slotBg(group.s1!), border: "none",
                            borderBottom: `${HAIRLINE}px solid rgba(232,114,42,0.1)`,
                            outline: a1 && !a2 ? `2px solid ${ORANGE}` : "none", outlineOffset: "-2px",
                            borderRadius: a1 && !a2 ? "8px 8px 0 0" : "0",
                            cursor: "pointer", boxSizing: "border-box", textAlign: "left", transition: "background 0.3s" }}>
                          {startLabel(group.s1!)}
                          {endLabel(group.s1!)}
                        </button>
                        <button
                          onClick={ready ? handleSelectionTap : () => handleSlot(group.s2!)}
                          style={{ display: "flex", alignItems: "center", paddingLeft: "11px", width: "100%", height: `${SLOT_H}px`,
                            background: slotBg(group.s2!), border: "none",
                            outline: a2 && !a1 ? `2px solid ${ORANGE}` : "none", outlineOffset: "-2px",
                            borderRadius: a2 && !a1 ? "0 0 8px 8px" : "0",
                            cursor: "pointer", boxSizing: "border-box", textAlign: "left", transition: "background 0.3s" }}>
                          {endLabel(group.s2!)}
                          {startLabel(group.s2!)}
                        </button>
                      </div>
                    );
                  }

                  const slot = group.slot!;
                  const active = inRange(slot);
                  const ready = active && phase === S_READY;

                  return (
                    <button key={gi}
                      className={ready ? "ready-pop" : ""}
                      onClick={ready ? handleSelectionTap : () => handleSlot(slot)}
                      style={{ position: "absolute", top, left: 0, right: 0, height: `${SLOT_H}px`,
                        background: slotBg(slot),
                        border: active ? `2px solid ${ORANGE}` : "2px solid transparent",
                        borderRadius: "8px", cursor: "pointer",
                        display: "flex", alignItems: "center", paddingLeft: "11px",
                        boxSizing: "border-box", textAlign: "left", transition: "background 0.3s, border 0.15s" }}>
                      {startLabel(slot)}
                      {endLabel(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Fade at top of scroll */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "32px", background: "linear-gradient(to top, transparent, rgba(255,255,255,0.98))", pointerEvents: "none" }} />
          {/* Fade at bottom of scroll */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "32px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.98))", pointerEvents: "none" }} />
        </div>

      </div>

      <Toast message={toast.message} visible={toast.visible} />

      {/* Modal */}
      {phase === S_MODAL && (
        <ModalShell onBackdropClick={reset}>
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {!confirmed ? (
              <>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "20px" }}>
                  Book {thing.name}
                </div>

                {/* Time + date summary */}
                <div style={{ background: ORANGE_AVAIL, borderRadius: "14px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  <TickRow label={timeStr} />
                  <TickRow label={dateLabel} />
                </div>

                {/* Name + email — only shown to first-time bookers */}
                {!isKnownBooker && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={bookerName}
                      onChange={(e) => setBookerName(e.target.value)}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: "12px",
                        border: "1.5px solid #ede9e3", fontSize: "14px", fontWeight: 500,
                        fontFamily: SYS, color: "#1a1a1a", outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Email — for your calendar invite"
                      value={bookerEmail}
                      onChange={(e) => setBookerEmail(e.target.value)}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: "12px",
                        border: "1.5px solid #ede9e3", fontSize: "14px", fontWeight: 500,
                        fontFamily: SYS, color: "#1a1a1a", outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ fontSize: "11px", color: "#bbb", fontFamily: SYS, paddingLeft: "2px" }}>
                      We'll try and remember you next time.
                    </div>
                  </div>
                )}

                {/* Known booker — show name as context (no fields needed) */}
                {isKnownBooker && (
                  <div style={{ fontSize: "13px", color: "#bbb", marginBottom: "20px", fontFamily: SYS }}>
                    Booking as <span style={{ color: "#1a1a1a", fontWeight: 600 }}>
                      {bookerSession ? bookerSession.firstName : bookerName}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={reset}
                    style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1.5px solid #ede9e3", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#aaa", fontFamily: SYS }}>
                    Not now
                  </button>
                  <button
                    disabled={!bookerName.trim() || !bookerEmail.trim() || !bookerEmail.includes("@") || !bookerEmail.includes(".") || submitting}
                    onClick={async () => {
                      if (!start) return;
                      setSubmitting(true);
                      const endSlot = end ?? start;
                      const result = await createBooking({
                        thingId:     thing.id,
                        bookerName:  bookerName.trim(),
                        bookerEmail: bookerEmail.trim(),
                        startsAt:    slotToISO(start),
                        endsAt:      slotToISO(endSlot, 30),
                      });
                      setSubmitting(false);
                      if ("error" in result) {
                        showToast(result.error);
                        reset();
                        return;
                      }
                      // Success — persist to localStorage only for non-session users (legacy fallback)
                      if (!bookerSession) {
                        localStorage.setItem("bookerName",  bookerName.trim());
                        localStorage.setItem("bookerEmail", bookerEmail.trim().toLowerCase());
                      }
                      setConfirmedBookingId(result.bookingId);
                      setConfirmed(true);
                      router.refresh();
                    }}
                    style={{
                      flex: 1, padding: "14px", borderRadius: "12px", border: "none",
                      background: (!bookerName.trim() || !bookerEmail.trim() || submitting) ? "#f0ece6" : ORANGE,
                      cursor: (!bookerName.trim() || !bookerEmail.trim() || submitting) ? "default" : "pointer",
                      fontSize: "14px", fontWeight: 600,
                      color: (!bookerName.trim() || !bookerEmail.trim() || submitting) ? "#bbb" : "#fff",
                      fontFamily: SYS, transition: "all 0.15s",
                    }}>
                    {submitting ? "Booking…" : "Confirm"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0", position: "relative" }}>
                <button onClick={reset} style={{ position: "absolute", top: 0, right: 0, background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: "22px", lineHeight: 1, padding: "4px" }}>
                  ×
                </button>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Check size={26} strokeWidth={2.5} color="#fff" />
                </div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px", letterSpacing: "-0.4px" }}>
                  All booked, {bookerSession ? bookerSession.firstName : bookerName}.
                </div>
                <div style={{ fontSize: "14px", color: "#bbb", lineHeight: 1.6, marginBottom: "24px" }}>
                  Check your email for a calendar invite.
                </div>

                {/* Reminder opt-in */}
                <div style={{ borderTop: "1px solid #ede9e3", paddingTop: "20px", textAlign: "left" }}>
                  <button
                    onClick={async () => {
                      const newOptIn = !reminderOptIn;
                      setReminderOptIn(newOptIn);
                      setReminderSaved(false);
                      if (!newOptIn && confirmedBookingId) {
                        await setReminderPreference({ bookingId: confirmedBookingId, optIn: false });
                      }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: SYS, width: "100%" }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
                      border: reminderOptIn ? "none" : "1.5px solid #ede9e3",
                      background: reminderOptIn ? ORANGE : "#f9f8f6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {reminderOptIn && <Check size={10} strokeWidth={3} color="#fff" />}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#555" }}>Want a reminder?</span>
                  </button>

                  {reminderOptIn && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Add a note (optional)"
                        value={reminderNote}
                        onChange={e => { setReminderNote(e.target.value); setReminderSaved(false); }}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: "12px",
                          border: "1.5px solid #ede9e3", fontSize: "14px", fontWeight: 400,
                          fontFamily: SYS, color: "#1a1a1a", outline: "none",
                          boxSizing: "border-box" as const, background: "#f9f8f6",
                        }}
                      />
                      <button
                        onClick={async () => {
                          if (!confirmedBookingId) return;
                          await setReminderPreference({ bookingId: confirmedBookingId, optIn: true, note: reminderNote });
                          setReminderSaved(true);
                        }}
                        style={{
                          width: "100%", padding: "12px", borderRadius: "12px", border: "none",
                          background: reminderSaved ? "#1a9c5b" : DARK,
                          fontSize: "13px", fontWeight: 600, color: "#fff",
                          cursor: "pointer", fontFamily: SYS, transition: "background 0.2s",
                        }}
                      >
                        {reminderSaved ? "Reminder saved ✓" : "Save reminder"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}
      {/* Cancel modal */}
      {cancelTarget && (
        <ModalShell onBackdropClick={() => setCancelTarget(null)}>
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "6px" }}>
              Cancel your booking?
            </div>
            <div style={{ fontSize: "13px", color: "#bbb", marginBottom: "24px", fontFamily: SYS }}>
              {thing.name} · {cancelTarget.timeStr} · {dateLabel}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1.5px solid #ede9e3", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#aaa", fontFamily: SYS }}>
                Keep it
              </button>
              <button
                onClick={async () => {
                  const result = await cancelBooking(cancelTarget.id);
                  if ("error" in result) { showToast(result.error); }
                  setCancelTarget(null);
                  router.refresh();
                }}
                style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: ORANGE, cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#fff", fontFamily: SYS }}>
                Cancel it
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
