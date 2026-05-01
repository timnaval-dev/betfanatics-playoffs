// =============================================================================
// teams.js — NHL team identity database
// =============================================================================
// Maps short codes (TOR, MTL, etc.) to full team names and brand colors.
// Each team has home and away color sets, each with primary and secondary.
// Colors are tuned for visibility on dark UI background.
// =============================================================================

const NHL_TEAMS = {
  // ===== EASTERN CONFERENCE =====
  TOR: {
    name: "Toronto Maple Leafs",
    home: { primary: "#00205B", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#00205B" }
  },
  OTT: {
    name: "Ottawa Senators",
    home: { primary: "#C52032", secondary: "#B79257" },
    away: { primary: "#000000", secondary: "#C52032" }
  },
  TBL: {
    name: "Tampa Bay Lightning",
    home: { primary: "#002868", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#002868" }
  },
  FLA: {
    name: "Florida Panthers",
    home: { primary: "#C8102E", secondary: "#B9975B" },
    away: { primary: "#041E42", secondary: "#C8102E" }
  },
  WSH: {
    name: "Washington Capitals",
    home: { primary: "#C8102E", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" }
  },
  MTL: {
    name: "Montreal Canadiens",
    home: { primary: "#AF1E2D", secondary: "#192168" },
    away: { primary: "#FFFFFF", secondary: "#AF1E2D" }
  },
  CAR: {
    name: "Carolina Hurricanes",
    home: { primary: "#CC0000", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CC0000" }
  },
  NJD: {
    name: "New Jersey Devils",
    home: { primary: "#CE1126", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CE1126" }
  },

  // ===== WESTERN CONFERENCE =====
  WPG: {
    name: "Winnipeg Jets",
    home: { primary: "#041E42", secondary: "#AC162C" },
    away: { primary: "#FFFFFF", secondary: "#041E42" }
  },
  STL: {
    name: "St. Louis Blues",
    home: { primary: "#002F87", secondary: "#FCB514" },
    away: { primary: "#FFFFFF", secondary: "#002F87" }
  },
  DAL: {
    name: "Dallas Stars",
    home: { primary: "#006847", secondary: "#8A8D8F" },
    away: { primary: "#FFFFFF", secondary: "#006847" }
  },
  COL: {
    name: "Colorado Avalanche",
    home: { primary: "#6F263D", secondary: "#236192" },
    away: { primary: "#FFFFFF", secondary: "#6F263D" }
  },
  VGK: {
    name: "Vegas Golden Knights",
    home: { primary: "#B4975A", secondary: "#333F42" },
    away: { primary: "#333F42", secondary: "#B4975A" }
  },
  MIN: {
    name: "Minnesota Wild",
    home: { primary: "#154734", secondary: "#A6192E" },
    away: { primary: "#FFFFFF", secondary: "#154734" }
  },
  LAK: {
    name: "Los Angeles Kings",
    home: { primary: "#A2AAAD", secondary: "#111111" },
    away: { primary: "#FFFFFF", secondary: "#A2AAAD" }
  },
  EDM: {
    name: "Edmonton Oilers",
    home: { primary: "#FF4C00", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#FF4C00" }
  }
};

// Look up a team's color with safe fallback. Role = "home"|"away", kind = "primary"|"secondary".
function teamColor(short, role, kind, fallback) {
  if (!short || !NHL_TEAMS[short]) return fallback || '#888888';
  return NHL_TEAMS[short][role][kind] || fallback || '#888888';
}

if (typeof window !== 'undefined') {
  window.NHL_TEAMS = NHL_TEAMS;
  window.teamColor = teamColor;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NHL_TEAMS, teamColor };
}
