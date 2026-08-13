// Muted instrument palette — the 5 semantic meanings the protocol terminal
// encodes in color, remapped to paper-readable tints for the Pharmacopoeia.
// Mirrored as CSS vars in globals.css (.pharmacopoeia --sig-*). Keep in sync.
// The terminal uses inline style={{}}, so it consumes these TS constants.
export const SIG = {
  // base (from Pharmacopoeia tokens)
  paper: "#EDE9E0",
  paperDeep: "#E2DCCC",
  ink: "#1C1A15",
  inkSoft: "#4A4438",
  inkFaint: "#8E877D",
  line: "#C9C2AE",
  // semantic
  bio: "#2F6E6B", bioTint: "rgba(47,110,107,.09)",
  llm: "#6A4C74", llmTint: "rgba(106,76,116,.09)",
  alert: "#A32B1F", alertTint: "rgba(163,43,31,.08)",
  ok: "#5B7A47", okTint: "rgba(91,122,71,.10)",
  warn: "#9C6B24", warnTint: "rgba(156,107,36,.10)",
} as const;

export const SEVERITY_INK = {
  watch: "#9C6B24",
  elevated: "#B4622E",
  high: "#A32B1F",
} as const;
