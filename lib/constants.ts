// ─────────────────────────────────────────────────────────────
// BookOneThing — Design Constants
// Single source of truth for colour, type, and surface tokens.
// Import this file everywhere. Declare nothing locally.
// ─────────────────────────────────────────────────────────────


// ── Oranges ──────────────────────────────────────────────────
// Dark to light. Each stop has a distinct job.

export const ORANGE_DARK   = "#c45a10";  // Text on booked slots (James)
export const ORANGE        = "#e8722a";  // Active states, buttons, your bookings
export const ORANGE_BOOKED = "#f2c9a8";  // Others' booking backgrounds
export const ORANGE_MID    = "#fbe0cc";  // Selecting range, disabled button bg
export const ORANGE_LIGHT  = "#fdf4ee";  // Available slots, info panels


// ── Greys ─────────────────────────────────────────────────────

export const GREY       = "#888888";     // Secondary text, explainers
export const GREY_LIGHT = "#bbbbbb";     // Placeholders, timestamps, meta
export const GREY_HINT  = "#dddddd";     // Disabled states, subtle dividers


// ── Core ──────────────────────────────────────────────────────

export const DARK   = "#1a1a1a";         // Brand, headings, confirm button
export const WHITE  = "#ffffff";         // Cards, modals, input backgrounds
export const BORDER = "#ede9e3";         // All borders, everywhere


// ── Backgrounds ───────────────────────────────────────────────
// Three distinct layers, three distinct names.

export const BACKGROUND = "#e8e5e0";     // Outer page — behind everything
export const SHELL      = "#f5f4f0";     // App shell — between page and card
// WHITE (above) is the third layer   // Cards and modals — on top


// ── Error ─────────────────────────────────────────────────────
// One red. Error toasts and cancel actions only.

export const RED_ERRORTOAST = "#c0392b";


// ── Typography ────────────────────────────────────────────────

export const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

// Sizes — 5 stops
export const SIZE_XS   = 10;            // Section labels, timestamps
export const SIZE_SM   = 13;            // Helper text, meta, captions
export const SIZE_BASE = 15;            // Body copy, field labels
export const SIZE_LG   = 20;            // Modal headings
export const SIZE_XL   = 28;            // Page headings

// Weights — 3 stops
export const W_REGULAR = 400;           // Body, helper text, placeholder
export const W_MEDIUM  = 600;           // Input text, labels, pills
export const W_BOLD    = 800;           // Headings, buttons, codeword
