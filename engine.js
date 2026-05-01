// =============================================================================
// engine.js — Shared Markov + odds engine for pricing.html and admin.html
// =============================================================================

(function (global) {
  'use strict';

  const TOP_HOME_GAMES = new Set([1, 2, 5, 7]);
  const HOME_ADVANTAGE = 0.04; // ~54% league-average home win rate

  // -------- Game schedule helpers --------
  function isTopHome(gameNum) {
    return TOP_HOME_GAMES.has(gameNum);
  }

  // Derived per-game top win probability from MoneyPuck Power Scores.
  // Reads from global NHL_TEAMS table. Falls back to 0.50 if either team unknown.
  function derivedTopWinProbForGame(topShort, botShort, topIsHome) {
    const teams = global.NHL_TEAMS || {};
    const tp = (teams[topShort] && teams[topShort].power) ? teams[topShort].power.score : 0;
    const bp = (teams[botShort] && teams[botShort].power) ? teams[botShort].power.score : 0;
    const dPower = tp - bp;
    const advantage = topIsHome ? HOME_ADVANTAGE : -HOME_ADVANTAGE;
    return clamp01(0.50 + advantage + dPower);
  }

  function topWinProbForGame(series, gameNum) {
    if (series.mode === 'manual') {
      return clamp01(series.manual['game' + gameNum]);
    }
    if (series.mode === 'derived') {
      // Need both teams identified to derive
      const topShort = series.topSeed && series.topSeed.short;
      const botShort = series.botSeed && series.botSeed.short;
      if (topShort && botShort) {
        return derivedTopWinProbForGame(topShort, botShort, isTopHome(gameNum));
      }
      // Fallback: if either team is TBD, fall through to auto values
    }
    return isTopHome(gameNum)
      ? clamp01(series.auto.topHomeWinPct)
      : clamp01(1 - series.auto.botHomeWinPct);
  }

  function clamp01(p) {
    if (typeof p !== 'number' || isNaN(p)) return 0.5;
    return Math.max(0, Math.min(1, p));
  }

  // -------- Odds conversions --------
  function probToDecimal(p) {
    if (p <= 0) return Infinity;
    if (p >= 1) return 1.0;
    return 1 / p;
  }

  function decimalToAmerican(dec) {
    if (!isFinite(dec) || dec <= 1) return '—';
    const d = dec - 1;
    if (d >= 1) return '+' + Math.round(d * 100);
    return Math.round(-100 / d).toString();
  }

  function americanToProb(american) {
    if (american === null || american === undefined || american === '') return null;
    let s = String(american).trim().replace(/^\+/, '');
    const a = parseFloat(s);
    if (isNaN(a)) return null;
    if (a > 0) return 100 / (a + 100);
    if (a < 0) return -a / (-a + 100);
    return 0.5;
  }

  function probToAmerican(p) {
    return decimalToAmerican(probToDecimal(p));
  }

  // -------- Markov chain: forward reach probabilities --------
  // Returns object keyed by "i,j" with P(reach state (i,j)) starting from current state.
  function computeReachProbs(series) {
    const P = {};
    const startKey = series.state.topWins + ',' + series.state.botWins;
    P[startKey] = 1.0;
    const startGameTotal = series.state.topWins + series.state.botWins;

    for (let g = startGameTotal; g < 7; g++) {
      const pTop = topWinProbForGame(series, g + 1);
      const pBot = 1 - pTop;
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          if (i + j !== g) continue;
          if (i >= 4 || j >= 4) continue;
          const key = i + ',' + j;
          const p = P[key] || 0;
          if (p === 0) continue;
          const kT = (i + 1) + ',' + j;
          const kB = i + ',' + (j + 1);
          P[kT] = (P[kT] || 0) + p * pTop;
          P[kB] = (P[kB] || 0) + p * pBot;
        }
      }
    }
    return P;
  }

  // -------- Never Trail probability --------
  // forTop=true means top seed never trails (i >= j throughout).
  function computeNeverTrail(series, forTop) {
    if (forTop && series.state.topWins < series.state.botWins) return 0;
    if (!forTop && series.state.botWins < series.state.topWins) return 0;

    const PNT = {};
    const startKey = series.state.topWins + ',' + series.state.botWins;
    PNT[startKey] = 1.0;
    const startGameTotal = series.state.topWins + series.state.botWins;

    for (let g = startGameTotal; g < 7; g++) {
      const pTop = topWinProbForGame(series, g + 1);
      const pBot = 1 - pTop;
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          if (i + j !== g) continue;
          if (i >= 4 || j >= 4) continue;
          if (forTop && i < j) continue;
          if (!forTop && j < i) continue;
          const key = i + ',' + j;
          const p = PNT[key] || 0;
          if (p === 0) continue;

          if (forTop) {
            // Top win → (i+1, j): always OK if we're already at i >= j
            const kT = (i + 1) + ',' + j;
            PNT[kT] = (PNT[kT] || 0) + p * pTop;
            // Bot win → (i, j+1): only OK if i > j (so i >= j+1 still holds)
            if (i > j) {
              const kB = i + ',' + (j + 1);
              PNT[kB] = (PNT[kB] || 0) + p * pBot;
            }
          } else {
            // Bot never-trail: need j >= i throughout
            // Top win → (i+1, j): only OK if j > i (so j >= i+1)
            if (j > i) {
              const kT = (i + 1) + ',' + j;
              PNT[kT] = (PNT[kT] || 0) + p * pTop;
            }
            const kB = i + ',' + (j + 1);
            PNT[kB] = (PNT[kB] || 0) + p * pBot;
          }
        }
      }
    }

    let total = 0;
    if (forTop) {
      for (let j = 0; j <= 3; j++) total += PNT['4,' + j] || 0;
    } else {
      for (let i = 0; i <= 3; i++) total += PNT[i + ',4'] || 0;
    }
    return total;
  }

  // -------- State at end of game N (uses history) --------
  function stateAfterGame(series, N) {
    const M = series.state.topWins + series.state.botWins;
    if (N > M) return null;
    if (N === M) return [series.state.topWins, series.state.botWins];
    if (series.state.history && series.state.history.length > N) {
      return series.state.history[N];
    }
    return null;
  }

  // -------- Margin application --------
  // Given a list of fair probabilities and a target overround, scale proportionally.
  function applyMargin(fairProbs, marginPct) {
    const sum = fairProbs.reduce((a, b) => a + b, 0);
    if (sum === 0) return fairProbs.slice();
    const factor = (1 + marginPct) / sum;
    return fairProbs.map(p => Math.min(p * factor, 0.999));
  }

  // -------- Resolve margin for a market --------
  function resolveMargin(series, marketKey, defaults) {
    if (series.margin && typeof series.margin[marketKey] === 'number') {
      return series.margin[marketKey];
    }
    if (defaults && defaults.margin && typeof defaults.margin[marketKey] === 'number') {
      return defaults.margin[marketKey];
    }
    return 0.05;
  }

  // -------- Compute all markets for a series --------
  // Returns a structured object the UI can render directly.
  function computeMarkets(series, defaults) {
    const P = computeReachProbs(series);

    // Sums
    let pTopSeries = 0;
    for (let j = 0; j <= 3; j++) pTopSeries += P['4,' + j] || 0;
    let pBotSeries = 0;
    for (let i = 0; i <= 3; i++) pBotSeries += P[i + ',4'] || 0;

    // Series Winner — 2-way
    const winnerMargin = resolveMargin(series, 'seriesWinner', defaults);
    const winnerProbs = applyMargin([pTopSeries, pBotSeries], winnerMargin);
    const seriesWinner = {
      type: 'paired',
      pairs: [{
        margin: winnerProbs[0] + winnerProbs[1] - 1,
        legs: [
          { label: series.topSeed.name || 'Top Seed', fair: pTopSeries, offered: winnerProbs[0] },
          { label: series.botSeed.name || 'Bottom Seed', fair: pBotSeries, offered: winnerProbs[1] }
        ]
      }]
    };

    // Correct Score — 8-way exact
    const csFair = [];
    const csLabels = [];
    for (let j = 0; j <= 3; j++) {
      csFair.push(P['4,' + j] || 0);
      csLabels.push((series.topSeed.name || 'Top') + ' 4-' + j);
    }
    for (let i = 0; i <= 3; i++) {
      csFair.push(P[i + ',4'] || 0);
      csLabels.push((series.botSeed.name || 'Bot') + ' 4-' + i);
    }
    const csMarginPct = resolveMargin(series, 'correctScore', defaults);
    const csOffered = applyMargin(csFair, csMarginPct);
    const correctScore = {
      type: 'exact',
      overallMargin: csOffered.reduce((a, b) => a + b, 0) - 1,
      legs: csLabels.map((label, idx) => ({
        label,
        fair: csFair[idx],
        offered: csOffered[idx]
      }))
    };

    // Total Games (O/U) — 3 paired 2-ways
    const pGame = [0, 0, 0, 0]; // index = ng - 4
    for (let ng = 4; ng <= 7; ng++) {
      let p = 0;
      for (let j = 0; j <= 3; j++) if (4 + j === ng) p += P['4,' + j] || 0;
      for (let i = 0; i <= 3; i++) if (i + 4 === ng) p += P[i + ',4'] || 0;
      pGame[ng - 4] = p;
    }
    const pOver45 = pGame[1] + pGame[2] + pGame[3];
    const pOver55 = pGame[2] + pGame[3];
    const pOver65 = pGame[3];
    const ouMargin = resolveMargin(series, 'totalGamesOU', defaults);
    const ouPairs = [
      { line: 4.5, overFair: pOver45, underFair: 1 - pOver45 },
      { line: 5.5, overFair: pOver55, underFair: 1 - pOver55 },
      { line: 6.5, overFair: pOver65, underFair: 1 - pOver65 }
    ].map(p => {
      const adj = applyMargin([p.overFair, p.underFair], ouMargin);
      return {
        margin: adj[0] + adj[1] - 1,
        legs: [
          { label: 'Over ' + p.line, fair: p.overFair, offered: adj[0] },
          { label: 'Under ' + p.line, fair: p.underFair, offered: adj[1] }
        ]
      };
    });
    const totalGamesOU = { type: 'paired', pairs: ouPairs };

    // Exact Games — 4-way
    const exactMarginPct = resolveMargin(series, 'totalGamesExact', defaults);
    const exactOffered = applyMargin(pGame, exactMarginPct);
    const exactGames = {
      type: 'exact',
      overallMargin: exactOffered.reduce((a, b) => a + b, 0) - 1,
      legs: [4, 5, 6, 7].map((ng, idx) => ({
        label: ng + ' Games',
        fair: pGame[idx],
        offered: exactOffered[idx]
      }))
    };

    // Series Spreads — 6 paired 2-ways
    const pT40 = P['4,0'] || 0;
    const pT41 = P['4,1'] || 0;
    const pT42 = P['4,2'] || 0;
    const pT43 = P['4,3'] || 0;
    const pB40 = P['0,4'] || 0;
    const pB41 = P['1,4'] || 0;
    const pB42 = P['2,4'] || 0;
    const pB43 = P['3,4'] || 0;

    const topName = series.topSeed.name || 'Top';
    const botName = series.botSeed.name || 'Bot';
    const spreadMargin = resolveMargin(series, 'spreads', defaults);
    const spreadDefs = [
      { topLabel: topName + ' -1.5', topFair: pT40 + pT41 + pT42, botLabel: botName + ' +1.5', botFair: pBotSeries + pT43 },
      { topLabel: topName + ' -2.5', topFair: pT40 + pT41,        botLabel: botName + ' +2.5', botFair: pBotSeries + pT43 + pT42 },
      { topLabel: topName + ' -3.5', topFair: pT40,                botLabel: botName + ' +3.5', botFair: pBotSeries + pT43 + pT42 + pT41 },
      { topLabel: botName + ' -1.5', topFair: pB40 + pB41 + pB42, botLabel: topName + ' +1.5', botFair: pTopSeries + pB43 },
      { topLabel: botName + ' -2.5', topFair: pB40 + pB41,        botLabel: topName + ' +2.5', botFair: pTopSeries + pB43 + pB42 },
      { topLabel: botName + ' -3.5', topFair: pB40,                botLabel: topName + ' +3.5', botFair: pTopSeries + pB43 + pB42 + pB41 }
    ];
    const spreadPairs = spreadDefs.map(d => {
      const adj = applyMargin([d.topFair, d.botFair], spreadMargin);
      return {
        margin: adj[0] + adj[1] - 1,
        legs: [
          { label: d.topLabel, fair: d.topFair, offered: adj[0] },
          { label: d.botLabel, fair: d.botFair, offered: adj[1] }
        ]
      };
    });
    const spreads = { type: 'paired', pairs: spreadPairs };

    // After Game 3 — 4-way exact
    const totalPlayed = series.state.topWins + series.state.botWins;
    const settledG3 = totalPlayed >= 3;
    const realizedG3 = settledG3 ? stateAfterGame(series, 3) : null;
    const ag3MarginPct = resolveMargin(series, 'afterG3', defaults);
    const ag3StatesList = [[3, 0], [2, 1], [1, 2], [0, 3]];
    const ag3Fair = ag3StatesList.map(([i, j]) =>
      settledG3
        ? (realizedG3 && realizedG3[0] === i && realizedG3[1] === j ? 1 : 0)
        : (P[i + ',' + j] || 0)
    );
    const ag3Offered = settledG3 ? ag3Fair.slice() : applyMargin(ag3Fair, ag3MarginPct);
    const afterG3 = {
      type: 'exact',
      settled: settledG3,
      overallMargin: ag3Offered.reduce((a, b) => a + b, 0) - 1,
      legs: ag3StatesList.map(([i, j], idx) => ({
        label: topName + ' ' + i + '-' + j + ' ' + botName,
        fair: ag3Fair[idx],
        offered: ag3Offered[idx],
        current: realizedG3 && realizedG3[0] === i && realizedG3[1] === j
      }))
    };

    // After Game 4 — 5-way exact
    const settledG4 = totalPlayed >= 4;
    const realizedG4 = settledG4 ? stateAfterGame(series, 4) : null;
    const ag4MarginPct = resolveMargin(series, 'afterG4', defaults);
    const ag4StatesList = [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]];
    const ag4Fair = ag4StatesList.map(([i, j]) =>
      settledG4
        ? (realizedG4 && realizedG4[0] === i && realizedG4[1] === j ? 1 : 0)
        : (P[i + ',' + j] || 0)
    );
    const ag4Offered = settledG4 ? ag4Fair.slice() : applyMargin(ag4Fair, ag4MarginPct);
    const afterG4 = {
      type: 'exact',
      settled: settledG4,
      overallMargin: ag4Offered.reduce((a, b) => a + b, 0) - 1,
      legs: ag4StatesList.map(([i, j], idx) => {
        let label;
        if (i === 4) label = topName + ' 4-0 (Sweep)';
        else if (j === 4) label = botName + ' 4-0 (Sweep)';
        else if (i === j) label = 'Tied 2-2';
        else if (i > j) label = topName + ' ' + i + '-' + j;
        else label = botName + ' ' + j + '-' + i;
        return {
          label,
          fair: ag4Fair[idx],
          offered: ag4Offered[idx],
          current: realizedG4 && realizedG4[0] === i && realizedG4[1] === j
        };
      })
    };

    // From Behind / Never Trail — 4-way exact
    const pTopNT = computeNeverTrail(series, true);
    const pBotNT = computeNeverTrail(series, false);
    const pTopFB = Math.max(0, pTopSeries - pTopNT);
    const pBotFB = Math.max(0, pBotSeries - pBotNT);
    const fbntMargin = resolveMargin(series, 'fromBehindNeverTrail', defaults);
    const fbntFair = [pTopNT, pTopFB, pBotNT, pBotFB];
    const fbntOffered = applyMargin(fbntFair, fbntMargin);
    const fromBehind = {
      type: 'exact',
      overallMargin: fbntOffered.reduce((a, b) => a + b, 0) - 1,
      legs: [
        { label: topName + ' To Win and Never Trail',  fair: pTopNT, offered: fbntOffered[0] },
        { label: topName + ' To Win From Behind',      fair: pTopFB, offered: fbntOffered[1] },
        { label: botName + ' To Win and Never Trail',  fair: pBotNT, offered: fbntOffered[2] },
        { label: botName + ' To Win From Behind',      fair: pBotFB, offered: fbntOffered[3] }
      ]
    };

    return {
      P,
      pTopSeries,
      pBotSeries,
      seriesWinner,
      correctScore,
      totalGamesOU,
      exactGames,
      spreads,
      afterG3,
      afterG4,
      fromBehind
    };
  }

  // -------- Margin badge helpers --------
  function marginBadgeColor(margin) {
    if (margin < 0) return 'underround';
    if (margin <= 0.06) return 'green';
    if (margin <= 0.10) return 'amber';
    return 'red';
  }

  function fmtMargin(m) {
    return (m * 100).toFixed(1) + '%';
  }

  function fmtPct(p) {
    if (p < 0.001) return '<0.1%';
    return (p * 100).toFixed(1) + '%';
  }

  function fmtDecimal(d) {
    if (!isFinite(d)) return '—';
    return d.toFixed(2);
  }

  // -------- Outrights computation (full enumeration via Markov + power scores) --------
  // Walks the bracket recursively, enumerating every possible matchup at every round.
  // For TBD series, the matchup is determined by upstream winner distributions, weighted
  // by their probabilities. Series winner probabilities use derived per-game probs (power
  // scores) when both teams are known. Current series state (topWins/botWins) is honored
  // when the slotted matchup matches an enumerated pair.
  // -------- Outrights helpers: market parsing, de-vig, blending, biases, round --------

  // Parse a pasted block of "Team Name +odds" or "Team Name\n+odds" into
  // { teamShort: rawImpliedProb (with vig) }. Lines that don't match are skipped.
  // Section headers like "Eastern Conference Winner" are also skipped.
  function parseOddsList(text, teamsTable) {
    if (!text || !text.trim()) return { parsed: {}, unmatched: [] };
    const teams = teamsTable || (global.NHL_TEAMS || {});
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed = {};
    const unmatched = [];
    let pendingName = null;

    const SKIP_PATTERNS = /conference winner|stanley cup|see (less|more)|odds to win|^team$|2024\/25|2025\/26|^to win$|^[\^v⌃ˇ]$/i;

    function matchTeamShort(name) {
      const lc = name.toLowerCase().trim();
      // Exact match on full name
      for (const [s, t] of Object.entries(teams)) {
        if (t.name && t.name.toLowerCase() === lc) return s;
      }
      // Last-word match (e.g., "Hurricanes" → CAR)
      for (const [s, t] of Object.entries(teams)) {
        if (!t.name) continue;
        const lastWord = t.name.split(' ').pop().toLowerCase();
        if (lc === lastWord || lc.endsWith(' ' + lastWord) || lc.endsWith(lastWord)) return s;
      }
      // Contains match (city or nickname inside)
      for (const [s, t] of Object.entries(teams)) {
        if (!t.name) continue;
        const tName = t.name.toLowerCase();
        if (tName.includes(lc) || lc.includes(tName)) return s;
      }
      // Short code match
      const upper = name.toUpperCase().replace(/[^A-Z]/g, '');
      if (teams[upper]) return upper;
      return null;
    }

    for (const line of lines) {
      if (SKIP_PATTERNS.test(line)) { pendingName = null; continue; }

      // Inline format: "Team Name +odds" or "Team Name -odds"
      const inline = line.match(/^(.+?)[\s\t]+([+-]\d+)$/);
      if (inline) {
        const short = matchTeamShort(inline[1].trim());
        const american = parseInt(inline[2], 10);
        if (short) parsed[short] = americanToProb(american);
        else unmatched.push(inline[1].trim());
        pendingName = null;
        continue;
      }

      // Just odds on a line — pair with previous team name
      if (/^[+-]?\d+$/.test(line)) {
        if (pendingName) {
          const short = matchTeamShort(pendingName);
          const american = parseInt(line, 10);
          if (short) parsed[short] = americanToProb(american);
          else unmatched.push(pendingName);
        }
        pendingName = null;
        continue;
      }

      // Not odds, not header — assume team name awaiting odds
      pendingName = line;
    }

    return { parsed, unmatched };
  }

  // De-vig a probability map: divides each by sum so total = 1.
  function devig(probs) {
    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    if (sum <= 0) return { ...probs };
    const out = {};
    for (const [k, v] of Object.entries(probs)) out[k] = v / sum;
    return out;
  }

  // Average two de-vigged probability maps. If a team is in only one, use that value.
  // Renormalizes the result.
  function averageMarkets(fdDv, dkDv) {
    const all = new Set([...Object.keys(fdDv || {}), ...Object.keys(dkDv || {})]);
    const result = {};
    for (const k of all) {
      const a = (fdDv && fdDv[k] != null) ? fdDv[k] : null;
      const b = (dkDv && dkDv[k] != null) ? dkDv[k] : null;
      if (a != null && b != null) result[k] = (a + b) / 2;
      else if (a != null) result[k] = a;
      else if (b != null) result[k] = b;
    }
    return devig(result);
  }

  // Blend model probs with market probs: blended = (1-mw) * model + mw * market.
  // Renormalizes to keep total = 1. If marketProbs is empty, returns model unchanged.
  function blendModelAndMarket(modelProbs, marketProbs, marketWeight) {
    if (!marketProbs || Object.keys(marketProbs).length === 0) return { ...modelProbs };
    const mw = clamp01(marketWeight);
    const all = new Set([...Object.keys(modelProbs), ...Object.keys(marketProbs)]);
    const out = {};
    for (const k of all) {
      const m = modelProbs[k] || 0;
      const x = marketProbs[k] || 0;
      out[k] = (1 - mw) * m + mw * x;
    }
    return devig(out);
  }

  // Apply per-team probability biases (in percentage points, e.g. -0.05 = -5%).
  // Net delta is redistributed equally across unbiased teams. Floors at 0, then renorms.
  function applyOutrightBiases(probs, biases) {
    if (!biases || Object.keys(biases).length === 0) return { ...probs };
    const teams = Object.keys(probs);
    const biasedSet = new Set(Object.keys(biases).filter(k => Math.abs(biases[k] || 0) > 1e-9 && teams.includes(k)));
    if (biasedSet.size === 0) return { ...probs };

    const unbiased = teams.filter(k => !biasedSet.has(k));
    let netBias = 0;
    biasedSet.forEach(k => { netBias += biases[k] || 0; });

    const out = { ...probs };
    biasedSet.forEach(k => { out[k] = Math.max(0, out[k] + (biases[k] || 0)); });

    if (unbiased.length > 0) {
      const perTeam = -netBias / unbiased.length;
      unbiased.forEach(k => { out[k] = Math.max(0, out[k] + perTeam); });
    }

    return devig(out);
  }

  // Determine the "round" that a market is currently in, based on which series have
  // both teams populated. East/West conference markets follow their conference's
  // progress; SCF follows the bracket-wide max round.
  function computeMarketRound(workingData, scope) {
    const series = workingData.series;
    const bracket = workingData.bracket;
    let ids;
    if (scope === 'east') {
      ids = [...bracket.east.r1, ...bracket.east.r2, bracket.east.r3];
    } else if (scope === 'west') {
      ids = [...bracket.west.r1, ...bracket.west.r2, bracket.west.r3];
    } else {
      ids = [
        ...bracket.east.r1, ...bracket.east.r2, bracket.east.r3,
        ...bracket.west.r1, ...bracket.west.r2, bracket.west.r3,
        bracket.final
      ];
    }
    const roundOf = (id) => {
      if (id === bracket.final) return 4;
      if (/(^|-)e3|w3/i.test(id)) return 3;
      if (/(^|-)e2|w2/i.test(id)) return 2;
      return 1;
    };
    let maxRound = 1;
    for (const id of ids) {
      const s = series[id];
      if (s && s.topSeed && s.topSeed.short && s.botSeed && s.botSeed.short) {
        maxRound = Math.max(maxRound, roundOf(id));
      }
    }
    return maxRound;
  }

  // Look up the configured outright margin for a given round + market type.
  function getOutrightMargin(workingData, round, marketType) {
    const sched = workingData.defaults &&
                  workingData.defaults.margin &&
                  workingData.defaults.margin.outrightSchedule;
    if (sched && sched[round] && typeof sched[round][marketType] === 'number') {
      return sched[round][marketType];
    }
    // Fallback to legacy single-margin defaults
    if (marketType === 'conference') return (workingData.defaults.margin && workingData.defaults.margin.conferenceWinner) || 0.10;
    return (workingData.defaults.margin && workingData.defaults.margin.stanleyCupWinner) || 0.16;
  }

  function computeOutrights(workingData) {
    const conn = workingData.bracketConnections;
    const series = workingData.series;
    const defaults = workingData.defaults;

    // Compute series win prob for a given (top, bot) matchup using derived per-game
    // probabilities, starting from initialState (default 0-0). Standard Markov chain.
    function derivedSeriesWinProb(topShort, botShort, initialState) {
      const start = initialState || { topWins: 0, botWins: 0 };
      // If already complete, return deterministic
      if (start.topWins >= 4) return 1.0;
      if (start.botWins >= 4) return 0.0;
      // Run Markov forward from current state
      let P = {};
      const startKey = start.topWins + ',' + start.botWins;
      P[startKey] = 1.0;
      const startGameTotal = start.topWins + start.botWins;
      for (let g = startGameTotal; g < 7; g++) {
        const gameNum = g + 1;
        const pTopGame = derivedTopWinProbForGame(topShort, botShort, isTopHome(gameNum));
        const pBotGame = 1 - pTopGame;
        const newP = {};
        for (const key of Object.keys(P)) {
          const [iStr, jStr] = key.split(',');
          const i = +iStr, j = +jStr;
          if (i >= 4 || j >= 4) {
            // Terminal state, carry forward
            newP[key] = (newP[key] || 0) + P[key];
            continue;
          }
          const kT = (i + 1) + ',' + j;
          const kB = i + ',' + (j + 1);
          newP[kT] = (newP[kT] || 0) + P[key] * pTopGame;
          newP[kB] = (newP[kB] || 0) + P[key] * pBotGame;
        }
        P = newP;
      }
      // P(top wins series) = sum over all "4,j" terminal states
      let pTopSeries = 0;
      for (let j = 0; j <= 3; j++) pTopSeries += P['4,' + j] || 0;
      return pTopSeries;
    }

    // Memoized: returns distribution {teamShort: probability} of who wins this series.
    // Recursively computes upstream entry distributions when slots are TBD.
    const winnerDistCache = {};
    function computeWinnerDist(seriesId) {
      if (winnerDistCache[seriesId]) return winnerDistCache[seriesId];
      const s = series[seriesId];
      let result;

      // If complete, winner is known
      if (s.state.topWins >= 4 && s.topSeed.short) {
        result = { [s.topSeed.short]: 1.0 };
      } else if (s.state.botWins >= 4 && s.botSeed.short) {
        result = { [s.botSeed.short]: 1.0 };
      } else {
        // Get entry distributions
        const c = conn[seriesId];
        const topDist = s.topSeed.short
          ? { [s.topSeed.short]: 1.0 }
          : (c ? computeWinnerDist(c.topFrom) : {});
        const botDist = s.botSeed.short
          ? { [s.botSeed.short]: 1.0 }
          : (c ? computeWinnerDist(c.botFrom) : {});

        result = {};
        for (const [tShort, pT] of Object.entries(topDist)) {
          for (const [bShort, pB] of Object.entries(botDist)) {
            if (tShort === bShort) continue; // same team can't face itself
            const pairProb = pT * pB;
            if (pairProb === 0) continue;
            // Use current state ONLY if this matchup matches the actual slotted teams
            const slottedMatch = s.topSeed.short === tShort && s.botSeed.short === bShort;
            const useState = slottedMatch ? s.state : { topWins: 0, botWins: 0 };
            const pTopWins = derivedSeriesWinProb(tShort, bShort, useState);
            result[tShort] = (result[tShort] || 0) + pairProb * pTopWins;
            result[bShort] = (result[bShort] || 0) + pairProb * (1 - pTopWins);
          }
        }
        // Normalize against any same-team-pairing exclusions
        const total = Object.values(result).reduce((a, b) => a + b, 0);
        if (total > 0 && Math.abs(total - 1) > 1e-9) {
          for (const k of Object.keys(result)) result[k] /= total;
        }
      }

      winnerDistCache[seriesId] = result;
      return result;
    }

    // Get conference final + SCF winner distributions
    const eastConfId = workingData.bracket.east.r3;
    const westConfId = workingData.bracket.west.r3;
    const scfId = workingData.bracket.final;
    const eastConfWinnersModel = computeWinnerDist(eastConfId);
    const westConfWinnersModel = computeWinnerDist(westConfId);
    const cupWinnersModel = computeWinnerDist(scfId);

    // ===== PIPELINE: model fair → market blend → bias → margin =====

    // 1. Model fair (already de-vigged since computeWinnerDist returns probabilities summing to 1)
    const modelEastFair = { ...eastConfWinnersModel };
    const modelWestFair = { ...westConfWinnersModel };
    const modelScfFair  = { ...cupWinnersModel };

    // 2. Market blend (if active for this market)
    const blend = workingData.outrightBlend || {};
    function getMarketAvg(blendCfg) {
      if (!blendCfg || !blendCfg.enabled) return null;
      const fdRaw = blendCfg.fanDuelProbs || {};
      const dkRaw = blendCfg.draftKingsProbs || {};
      const haveFD = Object.keys(fdRaw).length > 0;
      const haveDK = Object.keys(dkRaw).length > 0;
      if (!haveFD && !haveDK) return null;
      // De-vig each book independently, then average
      const fdDv = haveFD ? devig(fdRaw) : {};
      const dkDv = haveDK ? devig(dkRaw) : {};
      return averageMarkets(fdDv, dkDv);
    }
    const eastMarketAvg = getMarketAvg(blend.eastConf);
    const westMarketAvg = getMarketAvg(blend.westConf);
    const scfMarketAvg  = getMarketAvg(blend.scf);

    const eastMW = (blend.eastConf && typeof blend.eastConf.marketWeight === 'number') ? blend.eastConf.marketWeight : 0.7;
    const westMW = (blend.westConf && typeof blend.westConf.marketWeight === 'number') ? blend.westConf.marketWeight : 0.7;
    const scfMW  = (blend.scf      && typeof blend.scf.marketWeight === 'number')      ? blend.scf.marketWeight      : 0.7;

    const blendedEast = eastMarketAvg ? blendModelAndMarket(modelEastFair, eastMarketAvg, eastMW) : { ...modelEastFair };
    const blendedWest = westMarketAvg ? blendModelAndMarket(modelWestFair, westMarketAvg, westMW) : { ...modelWestFair };
    const blendedScf  = scfMarketAvg  ? blendModelAndMarket(modelScfFair,  scfMarketAvg,  scfMW)  : { ...modelScfFair };

    // 3. Apply liability biases
    const biases = workingData.outrightBiases || {};
    const finalEastFair = applyOutrightBiases(blendedEast, biases.eastConf || {});
    const finalWestFair = applyOutrightBiases(blendedWest, biases.westConf || {});
    const finalScfFair  = applyOutrightBiases(blendedScf,  biases.scf || {});

    // 4. Build teams array
    const teams = [];
    const r1Ids = [...workingData.bracket.east.r1, ...workingData.bracket.west.r1];
    r1Ids.forEach(r1Id => {
      const r1 = series[r1Id];
      [r1.topSeed, r1.botSeed].forEach(seed => {
        if (!seed.short) return;
        const isEast = r1.conference === 'East';
        const confFair  = isEast ? finalEastFair : finalWestFair;
        const confModel = isEast ? modelEastFair : modelWestFair;
        const confMarket = isEast ? eastMarketAvg : westMarketAvg;
        const confBiases = isEast ? (biases.eastConf || {}) : (biases.westConf || {});
        teams.push({
          short: seed.short,
          name: seed.name,
          conference: r1.conference,
          r1SeriesId: r1Id,
          // Final fair (after blend + bias) drives the offered odds
          fairWinConference: confFair[seed.short] || 0,
          fairWinStanleyCup: finalScfFair[seed.short] || 0,
          // Diagnostic fields for transparency in the UI
          modelFairConference: confModel[seed.short] || 0,
          modelFairStanleyCup: modelScfFair[seed.short] || 0,
          marketFairConference: confMarket ? (confMarket[seed.short] || 0) : null,
          marketFairStanleyCup: scfMarketAvg ? (scfMarketAvg[seed.short] || 0) : null,
          biasConference: confBiases[seed.short] || 0,
          biasStanleyCup: (biases.scf || {})[seed.short] || 0
        });
      });
    });

    // 5. Round-based margins
    const eastRound = computeMarketRound(workingData, 'east');
    const westRound = computeMarketRound(workingData, 'west');
    const scfRound  = computeMarketRound(workingData, 'all');
    const marginEastConf = getOutrightMargin(workingData, eastRound, 'conference');
    const marginWestConf = getOutrightMargin(workingData, westRound, 'conference');
    const marginSCF      = getOutrightMargin(workingData, scfRound,  'stanleyCup');

    const eastTeams = teams.filter(t => t.conference === 'East');
    const westTeams = teams.filter(t => t.conference === 'West');

    const scaleConf = (subset, marginPct) => {
      const sum = subset.reduce((a, t) => a + t.fairWinConference, 0);
      if (sum === 0) { subset.forEach(t => { t.offeredWinConference = 0; }); return 0; }
      const factor = (1 + marginPct) / sum;
      subset.forEach(t => { t.offeredWinConference = Math.min(t.fairWinConference * factor, 0.999); });
      return subset.reduce((a, t) => a + t.offeredWinConference, 0) - 1;
    };
    const eastConfMargin = scaleConf(eastTeams, marginEastConf);
    const westConfMargin = scaleConf(westTeams, marginWestConf);

    const scfSum = teams.reduce((a, t) => a + t.fairWinStanleyCup, 0);
    if (scfSum > 0) {
      const factor = (1 + marginSCF) / scfSum;
      teams.forEach(t => { t.offeredWinStanleyCup = Math.min(t.fairWinStanleyCup * factor, 0.999); });
    } else {
      teams.forEach(t => { t.offeredWinStanleyCup = 0; });
    }
    const scfMargin = teams.reduce((a, t) => a + t.offeredWinStanleyCup, 0) - 1;

    return {
      teams,
      eastTeams: eastTeams.slice().sort((a, b) => b.fairWinConference - a.fairWinConference),
      westTeams: westTeams.slice().sort((a, b) => b.fairWinConference - a.fairWinConference),
      allTeamsByCup: teams.slice().sort((a, b) => b.fairWinStanleyCup - a.fairWinStanleyCup),
      eastConfMargin,
      westConfMargin,
      scfMargin,
      // Diagnostic / display info
      eastRound, westRound, scfRound,
      eastMarketAvg, westMarketAvg, scfMarketAvg
    };
  }

  // -------- Public API --------
  global.PlayoffsEngine = {
    isTopHome,
    topWinProbForGame,
    derivedTopWinProbForGame,
    HOME_ADVANTAGE,
    clamp01,
    probToDecimal,
    decimalToAmerican,
    americanToProb,
    probToAmerican,
    computeReachProbs,
    computeNeverTrail,
    stateAfterGame,
    applyMargin,
    resolveMargin,
    computeMarkets,
    computeOutrights,
    parseOddsList,
    devig,
    averageMarkets,
    blendModelAndMarket,
    applyOutrightBiases,
    computeMarketRound,
    getOutrightMargin,
    marginBadgeColor,
    fmtMargin,
    fmtPct,
    fmtDecimal,
    TOP_HOME_GAMES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PlayoffsEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);
