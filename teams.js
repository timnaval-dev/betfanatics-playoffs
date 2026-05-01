// =============================================================================
// teams.js — NHL team identity database (all 32 teams)
// =============================================================================
// Maps short codes to full team names and brand colors.
// Each team has home and away color sets, each with primary and secondary.
// Colors are tuned for visibility on dark UI background.
// Reusable across seasons. If a team rebrands, edit here.
// =============================================================================

const NHL_TEAMS = {
  // ========== EASTERN CONFERENCE ==========

  // ----- Atlantic Division -----
  BOS: {
    name: "Boston Bruins",
    home: { primary: "#FFB81C", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#FFB81C" }
  },
  BUF: {
    name: "Buffalo Sabres",
    home: { primary: "#003087", secondary: "#FFB81C" },
    away: { primary: "#FFFFFF", secondary: "#003087" }
  },
  DET: {
    name: "Detroit Red Wings",
    home: { primary: "#C8102E", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" }
  },
  FLA: {
    name: "Florida Panthers",
    home: { primary: "#C8102E", secondary: "#B9975B" },
    away: { primary: "#041E42", secondary: "#C8102E" }
  },
  MTL: {
    name: "Montreal Canadiens",
    home: { primary: "#AF1E2D", secondary: "#192168" },
    away: { primary: "#FFFFFF", secondary: "#AF1E2D" }
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
  TOR: {
    name: "Toronto Maple Leafs",
    home: { primary: "#00205B", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#00205B" }
  },

  // ----- Metropolitan Division -----
  CAR: {
    name: "Carolina Hurricanes",
    home: { primary: "#CC0000", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CC0000" }
  },
  CBJ: {
    name: "Columbus Blue Jackets",
    home: { primary: "#002654", secondary: "#CE1126" },
    away: { primary: "#FFFFFF", secondary: "#002654" }
  },
  NJD: {
    name: "New Jersey Devils",
    home: { primary: "#CE1126", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CE1126" }
  },
  NYI: {
    name: "New York Islanders",
    home: { primary: "#00539B", secondary: "#F47D30" },
    away: { primary: "#FFFFFF", secondary: "#00539B" }
  },
  NYR: {
    name: "New York Rangers",
    home: { primary: "#0038A8", secondary: "#CE1126" },
    away: { primary: "#FFFFFF", secondary: "#0038A8" }
  },
  PHI: {
    name: "Philadelphia Flyers",
    home: { primary: "#F74902", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#F74902" }
  },
  PIT: {
    name: "Pittsburgh Penguins",
    home: { primary: "#FCB514", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#FCB514" }
  },
  WSH: {
    name: "Washington Capitals",
    home: { primary: "#C8102E", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" }
  },

  // ========== WESTERN CONFERENCE ==========

  // ----- Central Division -----
  CHI: {
    name: "Chicago Blackhawks",
    home: { primary: "#CF0A2C", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CF0A2C" }
  },
  COL: {
    name: "Colorado Avalanche",
    home: { primary: "#6F263D", secondary: "#236192" },
    away: { primary: "#FFFFFF", secondary: "#6F263D" }
  },
  DAL: {
    name: "Dallas Stars",
    home: { primary: "#006847", secondary: "#8A8D8F" },
    away: { primary: "#FFFFFF", secondary: "#006847" }
  },
  MIN: {
    name: "Minnesota Wild",
    home: { primary: "#154734", secondary: "#A6192E" },
    away: { primary: "#FFFFFF", secondary: "#154734" }
  },
  NSH: {
    name: "Nashville Predators",
    home: { primary: "#FFB81C", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#FFB81C" }
  },
  STL: {
    name: "St. Louis Blues",
    home: { primary: "#002F87", secondary: "#FCB514" },
    away: { primary: "#FFFFFF", secondary: "#002F87" }
  },
  UTA: {
    name: "Utah Mammoth",
    home: { primary: "#6CACE4", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#6CACE4" }
  },
  WPG: {
    name: "Winnipeg Jets",
    home: { primary: "#041E42", secondary: "#AC162C" },
    away: { primary: "#FFFFFF", secondary: "#041E42" }
  },

  // ----- Pacific Division -----
  ANA: {
    name: "Anaheim Ducks",
    home: { primary: "#F47A38", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#F47A38" }
  },
  CGY: {
    name: "Calgary Flames",
    home: { primary: "#C8102E", secondary: "#F1BE48" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" }
  },
  EDM: {
    name: "Edmonton Oilers",
    home: { primary: "#FF4C00", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#FF4C00" }
  },
  LAK: {
    name: "Los Angeles Kings",
    home: { primary: "#A2AAAD", secondary: "#111111" },
    away: { primary: "#FFFFFF", secondary: "#A2AAAD" }
  },
  SEA: {
    name: "Seattle Kraken",
    home: { primary: "#99D9D9", secondary: "#001628" },
    away: { primary: "#FFFFFF", secondary: "#99D9D9" }
  },
  SJS: {
    name: "San Jose Sharks",
    home: { primary: "#006D75", secondary: "#E57200" },
    away: { primary: "#FFFFFF", secondary: "#006D75" }
  },
  VAN: {
    name: "Vancouver Canucks",
    home: { primary: "#00205B", secondary: "#00843D" },
    away: { primary: "#FFFFFF", secondary: "#00843D" }
  },
  VGK: {
    name: "Vegas Golden Knights",
    home: { primary: "#B4975A", secondary: "#333F42" },
    away: { primary: "#333F42", secondary: "#B4975A" }
  }
};

// Look up a team's color with safe fallback.
function teamColor(short, role, kind, fallback) {
  if (!short || !NHL_TEAMS[short]) return fallback || '#888888';
  return NHL_TEAMS[short][role][kind] || fallback || '#888888';
}

// Return all teams sorted alphabetically by full name.
function teamsSortedByName() {
  return Object.entries(NHL_TEAMS)
    .map(([short, t]) => ({ short, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

if (typeof window !== 'undefined') {
  window.NHL_TEAMS = NHL_TEAMS;
  window.teamColor = teamColor;
  window.teamsSortedByName = teamsSortedByName;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NHL_TEAMS, teamColor, teamsSortedByName };
}
