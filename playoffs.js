// =============================================================================
// playoffs.js — Source of truth for NHL Playoff series data
// =============================================================================
// Bootstrapped with actual 2026 NHL Playoffs bracket and current scores.
// Replace this file in the GitHub repo to update live prices.
// History arrays for in-progress / non-sweep series are best-guess defaults;
// adjust in admin tool if exact game-by-game matters for After-G3 / After-G4 markets.
// =============================================================================

const PLAYOFFS_DATA = {
  generatedAt: "2026-04-30T23:00:00Z",
  generatedBy: "manual-bootstrap-2026",

  bracket: {
    east: {
      r1: ["e1-atl-1v4", "e1-atl-2v3", "e1-met-1v4", "e1-met-2v3"],
      r2: ["e2-atl-final", "e2-met-final"],
      r3: "e3-conference-final"
    },
    west: {
      r1: ["w1-cen-1v4", "w1-cen-2v3", "w1-pac-1v4", "w1-pac-2v3"],
      r2: ["w2-cen-final", "w2-pac-final"],
      r3: "w3-conference-final"
    },
    final: "scf"
  },

  bracketConnections: {
    "e2-atl-final":         { topFrom: "e1-atl-1v4", botFrom: "e1-atl-2v3" },
    "e2-met-final":         { topFrom: "e1-met-1v4", botFrom: "e1-met-2v3" },
    "w2-cen-final":         { topFrom: "w1-cen-1v4", botFrom: "w1-cen-2v3" },
    "w2-pac-final":         { topFrom: "w1-pac-1v4", botFrom: "w1-pac-2v3" },
    "e3-conference-final":  { topFrom: "e2-atl-final", botFrom: "e2-met-final" },
    "w3-conference-final":  { topFrom: "w2-cen-final", botFrom: "w2-pac-final" },
    "scf":                  { topFrom: "e3-conference-final", botFrom: "w3-conference-final" }
  },

  series: {
    // ===== EAST ROUND 1 =====
    "e1-atl-1v4": {
      label: "Atlantic 1 vs Wild Card 1",
      conference: "East",
      round: 1,
      topSeed: { name: "Buffalo Sabres", short: "BUF" },
      botSeed: { name: "Boston Bruins",  short: "BOS" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      // BUF leads 3-2; history is best-guess, adjust in admin if needed
      state: { topWins: 3, botWins: 2, history: [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2]] },
      margin: {}
    },
    "e1-atl-2v3": {
      label: "Atlantic 2 vs Atlantic 3",
      conference: "East",
      round: 1,
      topSeed: { name: "Tampa Bay Lightning", short: "TBL" },
      botSeed: { name: "Montreal Canadiens",  short: "MTL" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      // MTL leads 3-2
      state: { topWins: 2, botWins: 3, history: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
      margin: {}
    },
    "e1-met-1v4": {
      label: "Metropolitan 1 vs Wild Card 2",
      conference: "East",
      round: 1,
      topSeed: { name: "Carolina Hurricanes", short: "CAR" },
      botSeed: { name: "Ottawa Senators",     short: "OTT" },
      mode: "auto",
      auto: { topHomeWinPct: 0.60, botHomeWinPct: 0.45 },
      manual: { game1: 0.60, game2: 0.60, game3: 0.55, game4: 0.55, game5: 0.60, game6: 0.55, game7: 0.60 },
      // CAR won 4-0 sweep
      state: { topWins: 4, botWins: 0, history: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
      margin: {}
    },
    "e1-met-2v3": {
      label: "Metropolitan 2 vs Metropolitan 3",
      conference: "East",
      round: 1,
      topSeed: { name: "Pittsburgh Penguins",   short: "PIT" },
      botSeed: { name: "Philadelphia Flyers",   short: "PHI" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      // PHI won 4-2
      state: { topWins: 2, botWins: 4, history: [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]] },
      margin: {}
    },

    // ===== WEST ROUND 1 =====
    "w1-cen-1v4": {
      label: "Central 1 vs Wild Card 2",
      conference: "West",
      round: 1,
      topSeed: { name: "Colorado Avalanche", short: "COL" },
      botSeed: { name: "Los Angeles Kings",  short: "LAK" },
      mode: "auto",
      auto: { topHomeWinPct: 0.62, botHomeWinPct: 0.45 },
      manual: { game1: 0.62, game2: 0.62, game3: 0.55, game4: 0.55, game5: 0.62, game6: 0.55, game7: 0.62 },
      // COL won 4-0 sweep
      state: { topWins: 4, botWins: 0, history: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
      margin: {}
    },
    "w1-cen-2v3": {
      label: "Central 2 vs Central 3",
      conference: "West",
      round: 1,
      topSeed: { name: "Dallas Stars",   short: "DAL" },
      botSeed: { name: "Minnesota Wild", short: "MIN" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      // MIN won 4-2
      state: { topWins: 2, botWins: 4, history: [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]] },
      margin: {}
    },
    "w1-pac-1v4": {
      label: "Pacific 1 vs Wild Card 1",
      conference: "West",
      round: 1,
      topSeed: { name: "Vegas Golden Knights", short: "VGK" },
      botSeed: { name: "Utah Mammoth",         short: "UTA" },
      mode: "auto",
      auto: { topHomeWinPct: 0.60, botHomeWinPct: 0.48 },
      manual: { game1: 0.60, game2: 0.60, game3: 0.52, game4: 0.52, game5: 0.60, game6: 0.52, game7: 0.60 },
      // VGK leads 3-2
      state: { topWins: 3, botWins: 2, history: [[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]] },
      margin: {}
    },
    "w1-pac-2v3": {
      label: "Pacific 2 vs Pacific 3",
      conference: "West",
      round: 1,
      topSeed: { name: "Edmonton Oilers", short: "EDM" },
      botSeed: { name: "Anaheim Ducks",   short: "ANA" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      // ANA won 4-2
      state: { topWins: 2, botWins: 4, history: [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]] },
      margin: {}
    },

    // ===== EAST ROUND 2 =====
    "e2-atl-final": {
      label: "Atlantic Final",
      conference: "East",
      round: 2,
      // Both feeders still in progress
      topSeed: { name: "", short: "" },
      botSeed: { name: "", short: "" },
      mode: "auto",
      auto: { topHomeWinPct: 0.50, botHomeWinPct: 0.50 },
      manual: { game1: 0.50, game2: 0.50, game3: 0.50, game4: 0.50, game5: 0.50, game6: 0.50, game7: 0.50 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },
    "e2-met-final": {
      label: "Metropolitan Final",
      conference: "East",
      round: 2,
      topSeed: { name: "Carolina Hurricanes", short: "CAR" },
      botSeed: { name: "Philadelphia Flyers", short: "PHI" },
      mode: "auto",
      auto: { topHomeWinPct: 0.58, botHomeWinPct: 0.48 },
      manual: { game1: 0.58, game2: 0.58, game3: 0.52, game4: 0.52, game5: 0.58, game6: 0.52, game7: 0.58 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },

    // ===== WEST ROUND 2 =====
    "w2-cen-final": {
      label: "Central Final",
      conference: "West",
      round: 2,
      topSeed: { name: "Colorado Avalanche", short: "COL" },
      botSeed: { name: "Minnesota Wild",     short: "MIN" },
      mode: "auto",
      auto: { topHomeWinPct: 0.60, botHomeWinPct: 0.48 },
      manual: { game1: 0.60, game2: 0.60, game3: 0.52, game4: 0.52, game5: 0.60, game6: 0.52, game7: 0.60 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },
    "w2-pac-final": {
      label: "Pacific Final",
      conference: "West",
      round: 2,
      // Top still TBD (VGK/UTA in progress); ANA already through as bot
      topSeed: { name: "", short: "" },
      botSeed: { name: "Anaheim Ducks", short: "ANA" },
      mode: "auto",
      auto: { topHomeWinPct: 0.55, botHomeWinPct: 0.50 },
      manual: { game1: 0.55, game2: 0.55, game3: 0.50, game4: 0.50, game5: 0.55, game6: 0.50, game7: 0.55 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },

    // ===== CONFERENCE FINALS (TBD) =====
    "e3-conference-final": {
      label: "Eastern Conference Final",
      conference: "East",
      round: 3,
      topSeed: { name: "", short: "" },
      botSeed: { name: "", short: "" },
      mode: "auto",
      auto: { topHomeWinPct: 0.50, botHomeWinPct: 0.50 },
      manual: { game1: 0.50, game2: 0.50, game3: 0.50, game4: 0.50, game5: 0.50, game6: 0.50, game7: 0.50 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },
    "w3-conference-final": {
      label: "Western Conference Final",
      conference: "West",
      round: 3,
      topSeed: { name: "", short: "" },
      botSeed: { name: "", short: "" },
      mode: "auto",
      auto: { topHomeWinPct: 0.50, botHomeWinPct: 0.50 },
      manual: { game1: 0.50, game2: 0.50, game3: 0.50, game4: 0.50, game5: 0.50, game6: 0.50, game7: 0.50 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    },

    // ===== STANLEY CUP FINAL (TBD) =====
    "scf": {
      label: "Stanley Cup Final",
      conference: "Final",
      round: 4,
      topSeed: { name: "", short: "" },
      botSeed: { name: "", short: "" },
      mode: "auto",
      auto: { topHomeWinPct: 0.50, botHomeWinPct: 0.50 },
      manual: { game1: 0.50, game2: 0.50, game3: 0.50, game4: 0.50, game5: 0.50, game6: 0.50, game7: 0.50 },
      state: { topWins: 0, botWins: 0, history: [[0,0]] },
      margin: {}
    }
  },

  defaults: {
    margin: {
      seriesWinner: 0.05,
      correctScore: 0.08,
      totalGamesOU: 0.05,
      totalGamesExact: 0.08,
      spreads: 0.05,
      afterG3: 0.06,
      afterG4: 0.06,
      fromBehindNeverTrail: 0.06
    }
  }
};

if (typeof window !== 'undefined') {
  window.PLAYOFFS_DATA = PLAYOFFS_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PLAYOFFS_DATA;
}
