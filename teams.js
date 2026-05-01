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
    away: { primary: "#FFFFFF", secondary: "#FFB81C" },
    power: { score: 0.0456, abilityToWin: 0.0062, scoringChances: 0.0225, goaltending: 0.0169 }
  },
  BUF: {
    name: "Buffalo Sabres",
    home: { primary: "#003087", secondary: "#FFB81C" },
    away: { primary: "#FFFFFF", secondary: "#003087" },
    power: { score: 0.0575, abilityToWin: 0.0132, scoringChances: 0.0346, goaltending: 0.0097 }
  },
  DET: {
    name: "Detroit Red Wings",
    home: { primary: "#C8102E", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" },
    power: { score: 0.0208, abilityToWin: 0.0028, scoringChances: 0.0114, goaltending: 0.0066 }
  },
  FLA: {
    name: "Florida Panthers",
    home: { primary: "#C8102E", secondary: "#B9975B" },
    away: { primary: "#041E42", secondary: "#C8102E" },
    power: { score: -0.0322, abilityToWin: -0.0143, scoringChances: -0.0153, goaltending: -0.0026 }
  },
  MTL: {
    name: "Montreal Canadiens",
    home: { primary: "#AF1E2D", secondary: "#192168" },
    away: { primary: "#FFFFFF", secondary: "#AF1E2D" },
    power: { score: 0.0201, abilityToWin: 0.0092, scoringChances: -0.0058, goaltending: 0.0166 }
  },
  OTT: {
    name: "Ottawa Senators",
    home: { primary: "#C52032", secondary: "#B79257" },
    away: { primary: "#000000", secondary: "#C52032" },
    power: { score: 0.0439, abilityToWin: 0.0092, scoringChances: 0.0363, goaltending: -0.0016 }
  },
  TBL: {
    name: "Tampa Bay Lightning",
    home: { primary: "#002868", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#002868" },
    power: { score: 0.0415, abilityToWin: 0.0117, scoringChances: 0.0168, goaltending: 0.0130 }
  },
  TOR: {
    name: "Toronto Maple Leafs",
    home: { primary: "#00205B", secondary: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#00205B" },
    power: { score: -0.0824, abilityToWin: -0.0157, scoringChances: -0.0670, goaltending: 0.0003 }
  },

  // ----- Metropolitan Division -----
  CAR: {
    name: "Carolina Hurricanes",
    home: { primary: "#CC0000", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CC0000" },
    power: { score: 0.0807, abilityToWin: 0.0128, scoringChances: 0.0820, goaltending: -0.0141 }
  },
  CBJ: {
    name: "Columbus Blue Jackets",
    home: { primary: "#002654", secondary: "#CE1126" },
    away: { primary: "#FFFFFF", secondary: "#002654" },
    power: { score: 0.0207, abilityToWin: 0.0040, scoringChances: 0.0146, goaltending: 0.0020 }
  },
  NJD: {
    name: "New Jersey Devils",
    home: { primary: "#CE1126", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CE1126" },
    power: { score: 0.0103, abilityToWin: -0.0066, scoringChances: 0.0176, goaltending: -0.0007 }
  },
  NYI: {
    name: "New York Islanders",
    home: { primary: "#00539B", secondary: "#F47D30" },
    away: { primary: "#FFFFFF", secondary: "#00539B" },
    power: { score: 0.0060, abilityToWin: 0.0026, scoringChances: -0.0087, goaltending: 0.0121 }
  },
  NYR: {
    name: "New York Rangers",
    home: { primary: "#0038A8", secondary: "#CE1126" },
    away: { primary: "#FFFFFF", secondary: "#0038A8" },
    power: { score: 0.0045, abilityToWin: -0.0162, scoringChances: -0.0141, goaltending: 0.0348 }
  },
  PHI: {
    name: "Philadelphia Flyers",
    home: { primary: "#F74902", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#F74902" },
    power: { score: -0.0001, abilityToWin: 0.0028, scoringChances: 0.0226, goaltending: -0.0255 }
  },
  PIT: {
    name: "Pittsburgh Penguins",
    home: { primary: "#FCB514", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#FCB514" },
    power: { score: 0.0056, abilityToWin: 0.0069, scoringChances: 0.0198, goaltending: -0.0211 }
  },
  WSH: {
    name: "Washington Capitals",
    home: { primary: "#C8102E", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" },
    power: { score: 0.0292, abilityToWin: 0.0032, scoringChances: -0.0062, goaltending: 0.0321 }
  },

  // ========== WESTERN CONFERENCE ==========

  // ----- Central Division -----
  CHI: {
    name: "Chicago Blackhawks",
    home: { primary: "#CF0A2C", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#CF0A2C" },
    power: { score: -0.0897, abilityToWin: -0.0181, scoringChances: -0.0664, goaltending: -0.0052 }
  },
  COL: {
    name: "Colorado Avalanche",
    home: { primary: "#6F263D", secondary: "#236192" },
    away: { primary: "#FFFFFF", secondary: "#6F263D" },
    power: { score: 0.0810, abilityToWin: 0.0127, scoringChances: 0.0457, goaltending: 0.0226 }
  },
  DAL: {
    name: "Dallas Stars",
    home: { primary: "#006847", secondary: "#8A8D8F" },
    away: { primary: "#FFFFFF", secondary: "#006847" },
    power: { score: 0.0462, abilityToWin: 0.0103, scoringChances: 0.0147, goaltending: 0.0212 }
  },
  MIN: {
    name: "Minnesota Wild",
    home: { primary: "#154734", secondary: "#A6192E" },
    away: { primary: "#FFFFFF", secondary: "#154734" },
    power: { score: 0.0556, abilityToWin: 0.0052, scoringChances: 0.0382, goaltending: 0.0121 }
  },
  NSH: {
    name: "Nashville Predators",
    home: { primary: "#FFB81C", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#FFB81C" },
    power: { score: -0.0216, abilityToWin: 0.0018, scoringChances: -0.0197, goaltending: -0.0037 }
  },
  STL: {
    name: "St. Louis Blues",
    home: { primary: "#002F87", secondary: "#FCB514" },
    away: { primary: "#FFFFFF", secondary: "#002F87" },
    power: { score: -0.0223, abilityToWin: 0.0027, scoringChances: -0.0382, goaltending: 0.0131 }
  },
  UTA: {
    name: "Utah Mammoth",
    home: { primary: "#6CACE4", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#6CACE4" },
    power: { score: 0.0151, abilityToWin: 0.0032, scoringChances: 0.0275, goaltending: -0.0156 }
  },
  WPG: {
    name: "Winnipeg Jets",
    home: { primary: "#041E42", secondary: "#AC162C" },
    away: { primary: "#FFFFFF", secondary: "#041E42" },
    power: { score: 0.0179, abilityToWin: 0.0018, scoringChances: 0.0029, goaltending: 0.0133 }
  },

  // ----- Pacific Division -----
  ANA: {
    name: "Anaheim Ducks",
    home: { primary: "#F47A38", secondary: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#F47A38" },
    power: { score: -0.0232, abilityToWin: -0.0085, scoringChances: -0.0007, goaltending: -0.0140 }
  },
  CGY: {
    name: "Calgary Flames",
    home: { primary: "#C8102E", secondary: "#F1BE48" },
    away: { primary: "#FFFFFF", secondary: "#C8102E" },
    power: { score: -0.1141, abilityToWin: -0.0138, scoringChances: -0.0913, goaltending: -0.0090 }
  },
  EDM: {
    name: "Edmonton Oilers",
    home: { primary: "#FF4C00", secondary: "#041E42" },
    away: { primary: "#FFFFFF", secondary: "#FF4C00" },
    power: { score: 0.0147, abilityToWin: 0.0028, scoringChances: 0.0401, goaltending: -0.0282 }
  },
  LAK: {
    name: "Los Angeles Kings",
    home: { primary: "#A2AAAD", secondary: "#111111" },
    away: { primary: "#FFFFFF", secondary: "#A2AAAD" },
    power: { score: 0.0007, abilityToWin: 0.0010, scoringChances: -0.0095, goaltending: 0.0091 }
  },
  SEA: {
    name: "Seattle Kraken",
    home: { primary: "#99D9D9", secondary: "#001628" },
    away: { primary: "#FFFFFF", secondary: "#99D9D9" },
    power: { score: -0.0376, abilityToWin: -0.0089, scoringChances: -0.0327, goaltending: 0.0040 }
  },
  SJS: {
    name: "San Jose Sharks",
    home: { primary: "#006D75", secondary: "#E57200" },
    away: { primary: "#FFFFFF", secondary: "#006D75" },
    power: { score: -0.0951, abilityToWin: -0.0042, scoringChances: -0.0473, goaltending: -0.0436 }
  },
  VAN: {
    name: "Vancouver Canucks",
    home: { primary: "#00205B", secondary: "#00843D" },
    away: { primary: "#FFFFFF", secondary: "#00843D" },
    power: { score: -0.1424, abilityToWin: -0.0226, scoringChances: -0.0793, goaltending: -0.0405 }
  },
  VGK: {
    name: "Vegas Golden Knights",
    home: { primary: "#B4975A", secondary: "#333F42" },
    away: { primary: "#333F42", secondary: "#B4975A" },
    power: { score: 0.0589, abilityToWin: 0.0028, scoringChances: 0.0715, goaltending: -0.0153 }
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
