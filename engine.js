// =============================================================================
// engine.js — Shared Markov + odds engine for pricing.html and admin.html
// =============================================================================

(function (global) {
  'use strict';

  const TOP_HOME_GAMES = new Set([1, 2, 5, 7]);
  const HOME_ADVANTAGE = 0.02; // ~52% home win rate (per Tim's request)

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

    // Game 1 Winner / Series Winner Parlay — 4-way exact
    // Joint distribution of (G1 winner, series winner). Once G1 has been played,
    // the two parlays where the wrong team won G1 settle to 0; the two surviving
    // parlays equal the series-winner price for that team (since the G1 leg won).
    //
    // Math (pre-G1):
    //   P(A G1) = pTopGame1, P(B G1) = 1 - pTopGame1
    //   P(A series | A won G1) = run Markov from state (1, 0)
    //   P(A series | B won G1) = run Markov from state (0, 1)
    //   Joint(X G1, Y series) = P(X G1) * P(Y series | X G1)
    function seriesWinProbFromState(s, topW, botW) {
      // Markov forward from (topW, botW) using current per-game probs.
      // Mirrors computeReachProbs but starts at an arbitrary state.
      if (topW >= 4) return 1.0;
      if (botW >= 4) return 0.0;
      let dist = { [topW + ',' + botW]: 1.0 };
      const startGameTotal = topW + botW;
      for (let g = startGameTotal; g < 7; g++) {
        const gameNum = g + 1;
        const pTopG = topWinProbForGame(s, gameNum);
        const pBotG = 1 - pTopG;
        const next = {};
        for (const key of Object.keys(dist)) {
          const [iStr, jStr] = key.split(',');
          const i = +iStr, j = +jStr;
          if (i >= 4 || j >= 4) {
            next[key] = (next[key] || 0) + dist[key];
            continue;
          }
          const kT = (i + 1) + ',' + j;
          const kB = i + ',' + (j + 1);
          next[kT] = (next[kT] || 0) + dist[key] * pTopG;
          next[kB] = (next[kB] || 0) + dist[key] * pBotG;
        }
        dist = next;
      }
      let pTop = 0;
      for (let j = 0; j <= 3; j++) pTop += dist['4,' + j] || 0;
      return pTop;
    }

    const playedCount = (series.state.topWins || 0) + (series.state.botWins || 0);
    const g1Done = playedCount >= 1;
    let g1FairTopAndTop, g1FairTopAndBot, g1FairBotAndTop, g1FairBotAndBot;
    if (!g1Done) {
      // Pre-G1: full joint distribution
      const pTopG1 = topWinProbForGame(series, 1);
      const pBotG1 = 1 - pTopG1;
      // Series probs conditional on G1 outcome (run Markov from 1,0 and 0,1)
      const pTopWinsGivenTopG1 = seriesWinProbFromState(series, 1, 0);
      const pTopWinsGivenBotG1 = seriesWinProbFromState(series, 0, 1);
      g1FairTopAndTop = pTopG1 * pTopWinsGivenTopG1;
      g1FairTopAndBot = pTopG1 * (1 - pTopWinsGivenTopG1);
      g1FairBotAndTop = pBotG1 * pTopWinsGivenBotG1;
      g1FairBotAndBot = pBotG1 * (1 - pTopWinsGivenBotG1);
    } else {
      // Post-G1: collapse to series-winner odds for the surviving combinations.
      // We can read who won G1 from series.state.history[1] (state after G1).
      const hist = series.state.history || [[0,0]];
      const afterG1 = hist[1] || [0, 0];
      const topWonG1 = afterG1[0] >= 1;
      // Series probs are already pTopSeries / pBotSeries (computed above from current state).
      g1FairTopAndTop = topWonG1 ? pTopSeries : 0;
      g1FairTopAndBot = topWonG1 ? pBotSeries : 0;
      g1FairBotAndTop = topWonG1 ? 0 : pTopSeries;
      g1FairBotAndBot = topWonG1 ? 0 : pBotSeries;
    }
    const g1Margin = resolveMargin(series, 'g1AndSeries', defaults);
    const g1ParlayFair = [g1FairTopAndTop, g1FairTopAndBot, g1FairBotAndTop, g1FairBotAndBot];
    const g1ParlayOffered = applyMargin(g1ParlayFair, g1Margin);
    const g1AndSeries = {
      type: 'exact',
      overallMargin: g1ParlayOffered.reduce((a, b) => a + b, 0) - 1,
      legs: [
        { label: topName + ' G1 + ' + topName + ' Series', fair: g1ParlayFair[0], offered: g1ParlayOffered[0] },
        { label: topName + ' G1 + ' + botName + ' Series', fair: g1ParlayFair[1], offered: g1ParlayOffered[1] },
        { label: botName + ' G1 + ' + topName + ' Series', fair: g1ParlayFair[2], offered: g1ParlayOffered[2] },
        { label: botName + ' G1 + ' + botName + ' Series', fair: g1ParlayFair[3], offered: g1ParlayOffered[3] }
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
      fromBehind,
      g1AndSeries
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
  // -------- Outrights helpers: direct-anchor flow --------
  //
  // The trader sets target Stanley Cup probabilities for individual teams in admin.
  // Those overrides anchor the SCF column. Conference winner probs derive from
  //   P(WinConf) = P(SCF) / P(WinSCF | WinConf)
  // where the conditional comes from MoneyPuck-driven bracket enumeration.
  // Conference biases (per-team, in pp) shift those derived conf probs and redistribute
  // the net delta equally across unbiased teams in the same conference.

  // Convert American odds to a probability (helper for trader-friendly input).
  function americanInputToProb(american) {
    if (american === null || american === undefined || american === '') return null;
    const n = parseFloat(String(american).replace(/[^\-+0-9.]/g, ''));
    if (isNaN(n) || n === 0) return null;
    if (n > 0) return 100 / (n + 100);
    return -n / (-n + 100);
  }

  // Renormalize a probability map so the values sum to 1. Negative or NaN values become 0.
  function normalize(probs) {
    const out = {};
    let sum = 0;
    for (const [k, v] of Object.entries(probs)) {
      const safe = (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
      out[k] = safe;
      sum += safe;
    }
    if (sum <= 0) return out;
    for (const k of Object.keys(out)) out[k] /= sum;
    return out;
  }

  // Apply conference biases (per-team pp deltas) to a derived conference prob map.
  // Net delta is redistributed equally across unbiased teams in the same conference.
  // Floors at 0, then renormalizes to keep the column at 100%.
  function applyConferenceBiases(probs, biases) {
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

    return normalize(out);
  }

  // Determine which teams are eligible to be slotted into a given series, based on
  // bracket position. R1/R2 series are division-locked. R3 (conference final)
  // is conference-locked. SCF allows any team. Returns array of short codes alphabetically.
  function eligibleTeamsForSeries(seriesId, teamsTable) {
    const teams = teamsTable || (global.NHL_TEAMS || {});
    const codes = Object.keys(teams).sort();
    const lower = (seriesId || '').toLowerCase();
    let division = null;
    let conference = null;
    if (/atl/.test(lower)) division = 'Atlantic';
    else if (/met/.test(lower)) division = 'Metropolitan';
    else if (/cen/.test(lower)) division = 'Central';
    else if (/pac/.test(lower)) division = 'Pacific';
    else if (lower.startsWith('e3')) conference = 'East';
    else if (lower.startsWith('w3')) conference = 'West';
    if (division) return codes.filter(c => teams[c].division === division);
    if (conference) return codes.filter(c => teams[c].conference === conference);
    return codes;
  }

  // Apply NHL playoff seeding rules to populate R1 matchups from standings.
  // Standings format: { atlantic: [1st, 2nd, 3rd], metropolitan: [...], central: [...],
  //                     pacific: [...], wildCardEast: [WC1, WC2], wildCardWest: [WC1, WC2] }
  // Wild cards must be ordered higher-points first (WC1 = better record, WC2 = worse).
  //
  // Seeding logic per conference:
  //   - The two division winners face the wild cards. The division winner with MORE
  //     points faces WC2 (the worse wild card), and the other division winner faces WC1.
  //   - 2 vs 3 inside each division (no cross-division 2/3 games).
  //
  // We need a way to determine which division winner has more points. Without explicit
  // points stored, we use array order (caller convention): the conference's two division
  // winners listed in `topConferenceSeeds` array, first = better record.
  //
  // Caller passes standings AND a topConferenceSeeds map. If the latter is omitted, we
  // use the order ['atlantic', 'metropolitan'] for East and ['central', 'pacific'] for
  // West, meaning the first listed is treated as the better record.
  //
  // Returns a partial bracket-style structure ready to merge into workingData.series:
  //   { 'e1-atl-1v4': { topSeed: {...}, botSeed: {...} }, ... }
  function seedR1FromStandings(standings, teamsTable, topConfSeeds) {
    const teams = teamsTable || (global.NHL_TEAMS || {});
    const seeds = topConfSeeds || { east: ['atlantic', 'metropolitan'], west: ['central', 'pacific'] };

    function teamObj(short) {
      const t = teams[short];
      return { name: (t && t.name) || short, short };
    }

    // East: figure out which division winner gets WC1 vs WC2
    // Convention: first entry in seeds.east has better record → faces WC2
    const eastDiv1Name = seeds.east[0]; // e.g. 'atlantic' (better record)
    const eastDiv2Name = seeds.east[1]; // e.g. 'metropolitan' (worse record but still div winner)
    const eastDiv1Top = standings[eastDiv1Name][0]; // e.g. BUF
    const eastDiv2Top = standings[eastDiv2Name][0]; // e.g. CAR
    const eastWC1 = standings.wildCardEast[0];      // higher-points WC
    const eastWC2 = standings.wildCardEast[1];      // lower-points WC

    // Better division winner faces WC2, other faces WC1
    const eastDiv1WildCard = eastWC2;
    const eastDiv2WildCard = eastWC1;

    // Same for West
    const westDiv1Name = seeds.west[0];
    const westDiv2Name = seeds.west[1];
    const westDiv1Top = standings[westDiv1Name][0];
    const westDiv2Top = standings[westDiv2Name][0];
    const westWC1 = standings.wildCardWest[0];
    const westWC2 = standings.wildCardWest[1];
    const westDiv1WildCard = westWC2;
    const westDiv2WildCard = westWC1;

    // Map division name → R1 series ID prefix
    const divToPrefix = {
      atlantic: 'atl',
      metropolitan: 'met',
      central: 'cen',
      pacific: 'pac'
    };

    const out = {};
    // East
    out['e1-' + divToPrefix[eastDiv1Name] + '-1v4'] = {
      topSeed: teamObj(eastDiv1Top),
      botSeed: teamObj(eastDiv1WildCard)
    };
    out['e1-' + divToPrefix[eastDiv1Name] + '-2v3'] = {
      topSeed: teamObj(standings[eastDiv1Name][1]),
      botSeed: teamObj(standings[eastDiv1Name][2])
    };
    out['e1-' + divToPrefix[eastDiv2Name] + '-1v4'] = {
      topSeed: teamObj(eastDiv2Top),
      botSeed: teamObj(eastDiv2WildCard)
    };
    out['e1-' + divToPrefix[eastDiv2Name] + '-2v3'] = {
      topSeed: teamObj(standings[eastDiv2Name][1]),
      botSeed: teamObj(standings[eastDiv2Name][2])
    };
    // West
    out['w1-' + divToPrefix[westDiv1Name] + '-1v4'] = {
      topSeed: teamObj(westDiv1Top),
      botSeed: teamObj(westDiv1WildCard)
    };
    out['w1-' + divToPrefix[westDiv1Name] + '-2v3'] = {
      topSeed: teamObj(standings[westDiv1Name][1]),
      botSeed: teamObj(standings[westDiv1Name][2])
    };
    out['w1-' + divToPrefix[westDiv2Name] + '-1v4'] = {
      topSeed: teamObj(westDiv2Top),
      botSeed: teamObj(westDiv2WildCard)
    };
    out['w1-' + divToPrefix[westDiv2Name] + '-2v3'] = {
      topSeed: teamObj(standings[westDiv2Name][1]),
      botSeed: teamObj(standings[westDiv2Name][2])
    };
    return out;
  }

  // Determine the "round" each market is currently in, based on which series have
  // both teams populated. East/West conference markets follow their conference's
  // progress; SCF follows the bracket-wide max round. Used for display only —
  // the actual margin comes from getOutrightMargin which counts completed series.
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

  // Get the outright margin for a market based on how many series in scope have completed.
  // Margin drops gradually with each series ending: piecewise linear through Tim's
  // anchor points (R1 start / R2 start / R3 start / R4 start).
  // For East/West conference (7 series total: 4 R1 + 2 R2 + 1 R3):
  //   completed=0 → 10%, =4 → 8%, =6 → 4.5%, =7 → settled
  // For SCF (15 series total):
  //   completed=0 → 16%, =8 → 12%, =12 → 8%, =14 → 4.5%, =15 → settled
  function getOutrightMargin(workingData, scope, marketType) {
    const series = workingData.series;
    const isComplete = (s) => s && (s.state.topWins >= 4 || s.state.botWins >= 4);

    // Linear interpolation between anchor points
    function interpolate(x, points) {
      // points = [[x1, y1], [x2, y2], ...] sorted by x
      if (x <= points[0][0]) return points[0][1];
      if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
      for (let i = 1; i < points.length; i++) {
        if (x <= points[i][0]) {
          const [x1, y1] = points[i - 1];
          const [x2, y2] = points[i];
          const t = (x - x1) / (x2 - x1);
          return y1 + t * (y2 - y1);
        }
      }
      return points[points.length - 1][1];
    }

    if (scope === 'east' || scope === 'west') {
      const ids = scope === 'east'
        ? [...workingData.bracket.east.r1, ...workingData.bracket.east.r2, workingData.bracket.east.r3]
        : [...workingData.bracket.west.r1, ...workingData.bracket.west.r2, workingData.bracket.west.r3];
      const completed = ids.filter(id => isComplete(series[id])).length;
      // Anchors: (0 done, 10%) → (4 done = R1 fully ended, 8%) → (6 done = R2 fully ended, 4.5%) → (7 done = market settled)
      const margin = interpolate(completed, [[0, 0.10], [4, 0.08], [6, 0.045], [7, 0.045]]);
      return margin;
    }
    // SCF: all 15 series across both conferences
    const allIds = [
      ...workingData.bracket.east.r1, ...workingData.bracket.east.r2, workingData.bracket.east.r3,
      ...workingData.bracket.west.r1, ...workingData.bracket.west.r2, workingData.bracket.west.r3,
      workingData.bracket.final
    ];
    const completed = allIds.filter(id => isComplete(series[id])).length;
    // Anchors: 0→16%, 8→12% (R1 ended), 12→8% (R2 ended), 14→4.5% (R3 ended), 15→settled
    const margin = interpolate(completed, [[0, 0.16], [8, 0.12], [12, 0.08], [14, 0.045], [15, 0.045]]);
    return margin;
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

    // ===== PIPELINE: trader-anchored SCF → derived conference + biases → margin =====
    //
    // 1. Build model-fair Cup probs from MoneyPuck enumeration (used as default for any
    //    team without a trader override).
    // 2. For each team with a trader override, replace the model prob with the override.
    //    Renormalize the SCF column so it sums to 1.
    // 3. Eliminated teams force to 0 (overrides are kept in storage but suppressed).
    // 4. Conference winner probs derive from:
    //      P(WinConf) = P(SCF) / P(WinSCF | WinConf)
    //    The conditional comes from MoneyPuck-driven Markov+enumeration on the remaining
    //    bracket. If WinSCF given WinConf is 0 (impossible) or 1 (forced), the team's
    //    SCF prob is used directly as their conference prob.
    // 5. Apply per-team conference biases (pp deltas), redistribute equally across
    //    unbiased teams in the same conference, renormalize.
    // 6. Apply gradual round-based margins (East/West conf and SCF separately).

    // 1. Model fair from MoneyPuck enumeration
    const modelEastFair = { ...eastConfWinnersModel };
    const modelWestFair = { ...westConfWinnersModel };
    const modelScfFair  = { ...cupWinnersModel };

    // Eliminated detection: a team is eliminated if any series they were in ended with
    // them losing. We can detect this by walking R1 series and seeing if a team that
    // was slotted there has a 4-x or x-4 against them.
    function teamIsEliminated(short) {
      if (!short) return false;
      // Walk every series; if this team is the loser of any complete series, they're out.
      for (const sid of Object.keys(series)) {
        const s = series[sid];
        if (!s) continue;
        const complete = (s.state.topWins >= 4 || s.state.botWins >= 4);
        if (!complete) continue;
        if (s.topSeed.short === short && s.state.botWins >= 4) return true;
        if (s.botSeed.short === short && s.state.topWins >= 4) return true;
      }
      return false;
    }

    // 2. Trader overrides: stored as { TEAMSHORT: probability } in workingData.outrightOverrides.scf
    const overrides = (workingData.outrightOverrides && workingData.outrightOverrides.scf) || {};
    const cupBiases = (workingData.outrightBiases && workingData.outrightBiases.scf) || {};

    // Build the SCF fair column: model + overrides, with eliminated teams forced to 0.
    let scfFair = { ...modelScfFair };
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === 'number' && v >= 0 && v <= 1) scfFair[k] = v;
    }
    // 3. Eliminate
    for (const k of Object.keys(scfFair)) {
      if (teamIsEliminated(k)) scfFair[k] = 0;
    }
    // Renormalize
    scfFair = normalize(scfFair);

    // 4. Derive conference winner probs from SCF anchor
    // P(WinConf) = P(SCF) / P(WinSCF | WinConf)
    // P(WinSCF | WinConf) is computed from the MoneyPuck model.
    function deriveConfFair(modelConfProbs, modelScfProbs, anchoredScf, conferenceTeams) {
      const result = {};
      for (const team of conferenceTeams) {
        const modelConf = modelConfProbs[team] || 0;
        const modelScf = modelScfProbs[team] || 0;
        const anchorScf = anchoredScf[team] || 0;
        if (teamIsEliminated(team) || anchorScf <= 0) {
          result[team] = 0;
          continue;
        }
        // P(WinSCF | WinConf) = modelScf / modelConf  (when modelConf > 0)
        if (modelConf > 1e-9) {
          const condProb = modelScf / modelConf;
          if (condProb > 1e-9) {
            result[team] = anchorScf / condProb;
          } else {
            // Edge: model says they can't win SCF given conf — fall back to anchor
            result[team] = anchorScf;
          }
        } else {
          // Model says they can't win conf at all — anchor with the SCF prob directly
          result[team] = anchorScf;
        }
      }
      return normalize(result);
    }

    // Identify all teams in each conference from R1 slots
    const eastConfTeams = [];
    const westConfTeams = [];
    [...workingData.bracket.east.r1].forEach(id => {
      const s = series[id];
      if (s.topSeed.short) eastConfTeams.push(s.topSeed.short);
      if (s.botSeed.short) westConfTeams.push(s.botSeed.short); // wrong cond, fix below
    });
    // Cleaner: walk East R1 ids for east, West R1 ids for west
    eastConfTeams.length = 0;
    workingData.bracket.east.r1.forEach(id => {
      const s = series[id];
      if (s.topSeed.short) eastConfTeams.push(s.topSeed.short);
      if (s.botSeed.short) eastConfTeams.push(s.botSeed.short);
    });
    westConfTeams.length = 0;
    workingData.bracket.west.r1.forEach(id => {
      const s = series[id];
      if (s.topSeed.short) westConfTeams.push(s.topSeed.short);
      if (s.botSeed.short) westConfTeams.push(s.botSeed.short);
    });

    let eastConfFair = deriveConfFair(modelEastFair, modelScfFair, scfFair, eastConfTeams);
    let westConfFair = deriveConfFair(modelWestFair, modelScfFair, scfFair, westConfTeams);

    // 5. Apply conference biases and renormalize
    const eastBiases = (workingData.outrightBiases && workingData.outrightBiases.eastConf) || {};
    const westBiases = (workingData.outrightBiases && workingData.outrightBiases.westConf) || {};
    eastConfFair = applyConferenceBiases(eastConfFair, eastBiases);
    westConfFair = applyConferenceBiases(westConfFair, westBiases);

    // 6. Build teams array
    const teams = [];
    const r1Ids = [...workingData.bracket.east.r1, ...workingData.bracket.west.r1];
    r1Ids.forEach(r1Id => {
      const r1 = series[r1Id];
      [r1.topSeed, r1.botSeed].forEach(seed => {
        if (!seed.short) return;
        const isEast = r1.conference === 'East';
        const confFair = isEast ? eastConfFair : westConfFair;
        const confModel = isEast ? modelEastFair : modelWestFair;
        const confBiases = isEast ? eastBiases : westBiases;
        const eliminated = teamIsEliminated(seed.short);
        const scfOverride = overrides[seed.short];
        teams.push({
          short: seed.short,
          name: seed.name,
          conference: r1.conference,
          r1SeriesId: r1Id,
          eliminated,
          // Final fair (after override + bias) drives offered odds
          fairWinConference: confFair[seed.short] || 0,
          fairWinStanleyCup: scfFair[seed.short] || 0,
          // Diagnostic: model-only values for transparency
          modelFairConference: confModel[seed.short] || 0,
          modelFairStanleyCup: modelScfFair[seed.short] || 0,
          // Whether this team's SCF price is currently overridden by trader
          scfOverridden: typeof scfOverride === 'number',
          scfOverrideRaw: typeof scfOverride === 'number' ? scfOverride : null,
          // Conference bias (pp delta from trader)
          biasConference: confBiases[seed.short] || 0,
          biasStanleyCup: cupBiases[seed.short] || 0
        });
      });
    });

    // 7. Round-based gradual margins
    const eastRound = computeMarketRound(workingData, 'east');
    const westRound = computeMarketRound(workingData, 'west');
    const scfRound  = computeMarketRound(workingData, 'all');
    const marginEastConf = getOutrightMargin(workingData, 'east', 'conference');
    const marginWestConf = getOutrightMargin(workingData, 'west', 'conference');
    const marginSCF      = getOutrightMargin(workingData, 'all',  'stanleyCup');

    const eastTeams = teams.filter(t => t.conference === 'East');
    const westTeams = teams.filter(t => t.conference === 'West');

    const scaleConf = (subset, marginPct) => {
      const sum = subset.reduce((a, t) => a + t.fairWinConference, 0);
      if (sum === 0) { subset.forEach(t => { t.offeredWinConference = 0; }); return 0; }
      const factor = (1 + marginPct) / sum;
      subset.forEach(t => {
        if (t.eliminated) { t.offeredWinConference = 0; return; }
        t.offeredWinConference = Math.min(t.fairWinConference * factor, 0.999);
      });
      return subset.reduce((a, t) => a + t.offeredWinConference, 0) - 1;
    };
    const eastConfMargin = scaleConf(eastTeams, marginEastConf);
    const westConfMargin = scaleConf(westTeams, marginWestConf);

    const scfSum = teams.reduce((a, t) => a + t.fairWinStanleyCup, 0);
    if (scfSum > 0) {
      const factor = (1 + marginSCF) / scfSum;
      teams.forEach(t => {
        if (t.eliminated) { t.offeredWinStanleyCup = 0; return; }
        t.offeredWinStanleyCup = Math.min(t.fairWinStanleyCup * factor, 0.999);
      });
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
      eastRound, westRound, scfRound
    };
  }

  // -------- Derived Cup Markets --------
  // Five markets that derive directly from the per-team Stanley Cup probabilities
  // (post-override, post-bias). All return the same shape used by computeMarkets:
  //   { type: 'paired'|'exact', overallMargin, legs/pairs }
  //
  // SCF Exact Result uses an independence assumption between East and West outcomes:
  //   P(matchup E vs W AND E wins) = scfFair[E] * confFair[W]
  //   P(matchup E vs W AND W wins) = scfFair[W] * confFair[E]
  // This is exact when East and West bracket outcomes are independent, which is
  // true given the bracket structure (no inter-conference series until SCF).
  function computeDerivedCupMarkets(workingData, outrights, teamsTable) {
    const T = teamsTable || (typeof window !== 'undefined' && window.NHL_TEAMS) || {};
    const margin = workingData.defaults.margin;
    const teams = outrights.teams || [];

    // Helper: bucket teams by a key function and sum their Cup probabilities.
    // Returns array of { label, fair, key } sorted by fair desc.
    const bucketByKey = (keyFn, labels) => {
      const buckets = {};
      labels.forEach(lbl => { buckets[lbl] = 0; });
      teams.forEach(t => {
        const k = keyFn(t);
        if (k && buckets.hasOwnProperty(k)) {
          buckets[k] += t.fairWinStanleyCup || 0;
        }
      });
      return labels.map(lbl => ({ label: lbl, fair: buckets[lbl], key: lbl }));
    };

    // Renormalize an array of probabilities to sum to 1 (defensive — Cup probs
    // may not sum exactly to 1 after overrides + biases in edge cases).
    const renormalize = (arr) => {
      const sum = arr.reduce((a, b) => a + (b.fair || 0), 0);
      if (sum <= 0) return arr;
      return arr.map(x => ({ ...x, fair: x.fair / sum }));
    };

    // ----- 1. Conference of Stanley Cup Winner (2-way) -----
    let confLegs = bucketByKey(t => t.conference, ['East', 'West']);
    confLegs = renormalize(confLegs);
    confLegs = confLegs.map(l => ({ ...l, label: l.label === 'East' ? 'Eastern Conference' : 'Western Conference' }));
    const confMarginPct = margin.conferenceOfCupWinner || 0.05;
    const confOffered = applyMargin(confLegs.map(l => l.fair), confMarginPct);
    const conferenceOfCupWinner = {
      type: 'paired',
      pairs: [{
        margin: confOffered.reduce((a, b) => a + b, 0) - 1,
        legs: confLegs.map((l, i) => ({ label: l.label, fair: l.fair, offered: confOffered[i] }))
      }]
    };

    // ----- 2. Division of Stanley Cup Winner (4-way) -----
    let divLegs = bucketByKey(t => {
      const meta = T[t.short];
      return meta ? meta.division : null;
    }, ['Atlantic', 'Metropolitan', 'Central', 'Pacific']);
    divLegs = renormalize(divLegs);
    const divMarginPct = margin.divisionOfCupWinner || 0.08;
    const divOffered = applyMargin(divLegs.map(l => l.fair), divMarginPct);
    const divisionOfCupWinner = {
      type: 'exact',
      overallMargin: divOffered.reduce((a, b) => a + b, 0) - 1,
      legs: divLegs.map((l, i) => ({ label: l.label, fair: l.fair, offered: divOffered[i] }))
    };

    // ----- 3. Country of Stanley Cup Winner (2-way) -----
    let countryLegs = bucketByKey(t => {
      const meta = T[t.short];
      return meta ? meta.country : null;
    }, ['USA', 'CAN']);
    countryLegs = renormalize(countryLegs);
    countryLegs = countryLegs.map(l => ({ ...l, label: l.label === 'USA' ? 'United States' : 'Canada' }));
    const countryMarginPct = margin.countryOfCupWinner || 0.05;
    const countryOffered = applyMargin(countryLegs.map(l => l.fair), countryMarginPct);
    const countryOfCupWinner = {
      type: 'paired',
      pairs: [{
        margin: countryOffered.reduce((a, b) => a + b, 0) - 1,
        legs: countryLegs.map((l, i) => ({ label: l.label, fair: l.fair, offered: countryOffered[i] }))
      }]
    };

    // ----- 4. First-Time Stanley Cup Winner (2-way Yes/No) -----
    let pYes = 0, pNo = 0;
    teams.forEach(t => {
      const meta = T[t.short];
      const eligible = meta && meta.firstTimeEligible;
      if (eligible) pYes += t.fairWinStanleyCup || 0;
      else pNo += t.fairWinStanleyCup || 0;
    });
    // Renormalize defensively
    const totalFt = pYes + pNo;
    if (totalFt > 0) { pYes /= totalFt; pNo /= totalFt; }
    const ftMarginPct = margin.firstTimeCupWinner || 0.06;
    const ftOffered = applyMargin([pYes, pNo], ftMarginPct);
    const firstTimeCupWinner = {
      type: 'paired',
      pairs: [{
        margin: ftOffered.reduce((a, b) => a + b, 0) - 1,
        legs: [
          { label: 'Yes', fair: pYes, offered: ftOffered[0] },
          { label: 'No',  fair: pNo,  offered: ftOffered[1] }
        ]
      }]
    };

    // ----- 5. Stanley Cup Finals Exact Result (up to 8x8x2 = 128) -----
    const eastTeams = teams.filter(t => t.conference === 'East');
    const westTeams = teams.filter(t => t.conference === 'West');
    const exactLegs = [];
    eastTeams.forEach(E => {
      westTeams.forEach(W => {
        const fairEwins = (E.fairWinStanleyCup || 0) * (W.fairWinConference || 0);
        const fairWwins = (W.fairWinStanleyCup || 0) * (E.fairWinConference || 0);
        exactLegs.push({
          label: (E.name || E.short) + ' def. ' + (W.name || W.short),
          fair: fairEwins,
          winner: E.short, vs: W.short
        });
        exactLegs.push({
          label: (W.name || W.short) + ' def. ' + (E.name || E.short),
          fair: fairWwins,
          winner: W.short, vs: E.short
        });
      });
    });

    // Renormalize exact-result legs (the joint distribution should sum to 1
    // by construction, but renormalize defensively for numerical stability).
    const exactSum = exactLegs.reduce((a, b) => a + b.fair, 0);
    if (exactSum > 0) {
      exactLegs.forEach(l => { l.fair /= exactSum; });
    }

    // Sort by fair desc so most-likely matchups appear at the top.
    exactLegs.sort((a, b) => b.fair - a.fair);

    // Per-selection margin: HARDCODED 3 percentage points added to every live
    // leg's fair probability. Eliminated/unreachable legs (fair = 0) stay at 0.
    // This intentionally produces a fat overall book — with N live legs the
    // total book overround is 1 + N * 0.03. Early bracket has many live legs
    // (40+) so margin is very high; late bracket compresses naturally.
    // The defaults.margin.scfExactResult value is intentionally IGNORED here.
    const SCF_EXACT_PER_LEG_MARGIN = 0.03;
    const exactOffered = exactLegs.map(l =>
      l.fair > 0 ? Math.min(l.fair + SCF_EXACT_PER_LEG_MARGIN, 0.999) : 0
    );
    const scfExactResult = {
      type: 'exact',
      overallMargin: exactOffered.reduce((a, b) => a + b, 0) - 1,
      legs: exactLegs.map((l, i) => ({
        label: l.label,
        fair: l.fair,
        offered: exactOffered[i],
        winner: l.winner,
        vs: l.vs
      }))
    };

    return {
      conferenceOfCupWinner,
      divisionOfCupWinner,
      countryOfCupWinner,
      firstTimeCupWinner,
      scfExactResult
    };
  }

  // -------- CSV Export --------
  // Maps a series ID to its 1-8 slot number per Tim's cheat sheet convention:
  //   Slot 1, 2 → Metropolitan division (East)
  //   Slot 3, 4 → Atlantic division (East)
  //   Slot 5, 6 → Central division (West)
  //   Slot 7, 8 → Pacific division (West)
  // Within each division: the "1v4" lane uses the odd slot (1, 3, 5, 7) and the
  // "2v3" lane uses the even slot (2, 4, 6, 8). When a R2 division final is active,
  // it takes the odd slot (since the bracket survives forward through that lane).
  // Conference finals (R3) and the Stanley Cup Final are NOT mapped here — they're
  // outright/futures markets handled separately.
  const SERIES_SLOT_MAP = {
    'e1-met-1v4': 1,
    'e1-met-2v3': 2,
    'e2-met-final': 1,
    'e1-atl-1v4': 3,
    'e1-atl-2v3': 4,
    'e2-atl-final': 3,
    'w1-cen-1v4': 5,
    'w1-cen-2v3': 6,
    'w2-cen-final': 5,
    'w1-pac-1v4': 7,
    'w1-pac-2v3': 8,
    'w2-pac-final': 7
  };

  function getSeriesSlot(seriesId) {
    return SERIES_SLOT_MAP[seriesId] || null;
  }

  // Generate the exact Market Type strings expected by the cheat sheet, with the
  // slot number substituted in. The `{playerName}` token (a literal string used
  // by NATS to inject team/player context) only appears on slot 8 and only on
  // these 5 markets: Series Winner, Correct Score, When Will Series End,
  // Handicap, Score After Game 4. All other slots get plain market type strings.
  function getMarketTypeLabel(marketKind, slot) {
    const prefix = (slot === 8) ? '{playerName} ' : '';
    switch (marketKind) {
      case 'seriesWinner':  return prefix + 'Series Winner ' + slot;
      case 'correctScore':  return prefix + 'Series Correct Score ' + slot;
      case 'exactGames':    return prefix + 'When Will Series End ' + slot;
      case 'spreads':       return prefix + 'Series Handicap ' + slot;
      case 'afterG4':       return prefix + 'Series Correct Score After Game 4 (' + slot + ')';
      case 'afterG3':       return 'Series Correct Score After Game 3 (' + slot + ')';
      case 'totalGamesOU':  return 'Series Total Games ' + slot;
      case 'g1AndSeries':   return 'Series Winner/Game 1 Parlay ' + slot;
      case 'fromBehind':    return 'Series To Win From Behind ' + slot;
      default: return marketKind + ' ' + slot;
    }
  }

  // Build a list of {type, name, selection, price} rows for one series.
  // Skips:
  //   - Series that are complete (one team has 4 wins)
  //   - Series where either team is unknown (TBD slots)
  //   - Settled markets (afterG3 once G3 is played, afterG4 once G4 is played, g1AndSeries once G1 is played)
  //   - Series that don't have a 1-8 slot (R3 conference finals, SCF — handled separately as outrights)
  // Decimal precision: 5 places.
  // For spreads: outputs all 12 selections (top/bot at ±1.5/2.5/3.5).
  function buildSeriesPropsCSV(series, defaults, seriesId) {
    const rows = [];
    if (!series || !series.topSeed || !series.botSeed) return rows;
    if (!series.topSeed.short || !series.botSeed.short) return rows;
    const tw = series.state.topWins || 0;
    const bw = series.state.botWins || 0;
    if (tw >= 4 || bw >= 4) return rows; // skip complete series

    // Resolve slot from seriesId. If caller didn't pass seriesId, skip.
    const slot = seriesId ? getSeriesSlot(seriesId) : null;
    if (!slot) return rows; // No slot mapping (conf finals, SCF, etc.) — skip.

    const m = computeMarkets(series, defaults);
    const topShort = series.topSeed.short;
    const botShort = series.botSeed.short;
    const topFull = series.topSeed.name || topShort;
    const botFull = series.botSeed.name || botShort;
    const matchupShort = topShort + ' vs ' + botShort;
    const playedCount = tw + bw;

    const fmtPrice = (offered) => {
      if (offered === null || offered === undefined || !isFinite(offered) || offered <= 0) return '';
      const dec = 1 / offered;
      return dec.toFixed(5);
    };

    // Helper to push a row using slot-aware market type
    const push = (kind, marketName, selection, price) => {
      rows.push({ type: getMarketTypeLabel(kind, slot), name: marketName, selection, price });
    };

    // 1. Series Winner (2 selections)
    push('seriesWinner', matchupShort + ' Series Winner', topFull, fmtPrice(m.seriesWinner.pairs[0].legs[0].offered));
    push('seriesWinner', matchupShort + ' Series Winner', botFull, fmtPrice(m.seriesWinner.pairs[0].legs[1].offered));

    // 2. Series Correct Score (8 selections, ordered: top 4-0, bot 4-0, top 4-1, bot 4-1, ...)
    // Engine stores them as: top 4-0, top 4-1, top 4-2, top 4-3, bot 4-0, bot 4-1, bot 4-2, bot 4-3
    // Cheat sheet order: top 4-0, bot 4-0, top 4-1, bot 4-1, top 4-2, bot 4-2, top 4-3, bot 4-3
    const cs = m.correctScore.legs;
    for (let i = 0; i < 4; i++) {
      push('correctScore', matchupShort + ' Series Correct Score', topFull + ' 4-' + i, fmtPrice(cs[i].offered));
      push('correctScore', matchupShort + ' Series Correct Score', botFull + ' 4-' + i, fmtPrice(cs[4 + i].offered));
    }

    // 3. When Will Series End (4 selections: 4 / 5 / 6 / 7 Games)
    // Engine stores exactGames legs as: 4 games, 5 games, 6 games, 7 games (in order)
    const eg = m.exactGames.legs;
    push('exactGames', matchupShort + ' Series Exact Games', '4 Games', fmtPrice(eg[0].offered));
    push('exactGames', matchupShort + ' Series Exact Games', '5 Games', fmtPrice(eg[1].offered));
    push('exactGames', matchupShort + ' Series Exact Games', '6 Games', fmtPrice(eg[2].offered));
    push('exactGames', matchupShort + ' Series Exact Games', '7 Games', fmtPrice(eg[3].offered));

    // 4. Series Spread (12 selections — both teams at ±1.5/2.5/3.5)
    // Engine returns 6 pairs. Each pair contains 2 legs with the labels we want.
    // Pairs: [Top -1.5, Bot +1.5], [Top -2.5, Bot +2.5], [Top -3.5, Bot +3.5],
    //        [Bot -1.5, Top +1.5], [Bot -2.5, Top +2.5], [Bot -3.5, Top +3.5]
    // Cheat sheet ordering: Top -3.5, Top -2.5, Top -1.5, Top +1.5, Top +2.5, Top +3.5,
    //                      Bot -3.5, Bot -2.5, Bot -1.5, Bot +1.5, Bot +2.5, Bot +3.5
    const sp = m.spreads.pairs;
    // Engine ordering (per createspread): top -1.5/+2.5/+3.5/-3.5 etc — easier to look up by label
    const spreadLookup = {};
    sp.forEach(pair => pair.legs.forEach(leg => { spreadLookup[leg.label] = leg.offered; }));
    const spreadOrder = [
      topFull + ' -3.5', topFull + ' -2.5', topFull + ' -1.5',
      topFull + ' +1.5', topFull + ' +2.5', topFull + ' +3.5',
      botFull + ' -3.5', botFull + ' -2.5', botFull + ' -1.5',
      botFull + ' +1.5', botFull + ' +2.5', botFull + ' +3.5'
    ];
    spreadOrder.forEach(label => {
      push('spreads', matchupShort + ' Series Spread', label, fmtPrice(spreadLookup[label]));
    });

    // 5. Series Score After Game 4 (6 selections — only output if G4 not yet played)
    if (playedCount < 4 && m.afterG4 && !m.afterG4.settled && m.afterG4.legs && m.afterG4.legs.length >= 5) {
      // Engine afterG4 leg ordering: [4,0], [3,1], [2,2], [1,3], [0,4]
      // Cheat sheet output order: top 4-0, bot 4-0, top 3-1, bot 3-1, top 2-2, bot 2-2
      // Note: cheat sheet has BOTH top 2-2 AND bot 2-2 but engine combines into single Tied 2-2
      // We'll split the 2-2 prob 50/50 between top/bot since they're equally likely from a tied state.
      // Actually re-reading the cheat sheet: rows show "Carolina Hurricanes 2-2 | Philadelphia Flyers 2-2"
      // which implies both teams' "currently leading 2-2" states. Since 2-2 is one outcome,
      // we'll output the Tied 2-2 prob under the topFull selection and 0 elsewhere — but that's wrong.
      // Cleanest fix: output the 2-2 prob just once as topFull's selection (NATS would interpret).
      // But cheat sheet seems to expect two separate selections. So we split 50/50.
      const ag4Legs = m.afterG4.legs;
      const top40 = ag4Legs[0].offered;
      const top31 = ag4Legs[1].offered;
      const tied22 = ag4Legs[2].offered;
      const bot31 = ag4Legs[3].offered;
      const bot40 = ag4Legs[4].offered;
      // 2-2 is one state. Cheat sheet has both top 2-2 and bot 2-2 rows — same price each.
      push('afterG4', matchupShort + ' Series Score After Game 4', topFull + ' 4-0', fmtPrice(top40));
      push('afterG4', matchupShort + ' Series Score After Game 4', botFull + ' 4-0', fmtPrice(bot40));
      push('afterG4', matchupShort + ' Series Score After Game 4', topFull + ' 3-1', fmtPrice(top31));
      push('afterG4', matchupShort + ' Series Score After Game 4', botFull + ' 3-1', fmtPrice(bot31));
      push('afterG4', matchupShort + ' Series Score After Game 4', topFull + ' 2-2', fmtPrice(tied22));
      push('afterG4', matchupShort + ' Series Score After Game 4', botFull + ' 2-2', fmtPrice(tied22));
    }

    // 6. Series Score After Game 3 (4 selections — only if G3 not yet played)
    if (playedCount < 3 && m.afterG3 && !m.afterG3.settled && m.afterG3.legs && m.afterG3.legs.length >= 4) {
      // Engine afterG3 ordering: [3,0], [2,1], [1,2], [0,3]
      // Cheat sheet ordering: top 3-0, bot 3-0, top 2-1, bot 2-1
      const ag3Legs = m.afterG3.legs;
      push('afterG3', matchupShort + ' Series Score After Game 3', topFull + ' 3-0', fmtPrice(ag3Legs[0].offered));
      push('afterG3', matchupShort + ' Series Score After Game 3', botFull + ' 3-0', fmtPrice(ag3Legs[3].offered));
      push('afterG3', matchupShort + ' Series Score After Game 3', topFull + ' 2-1', fmtPrice(ag3Legs[1].offered));
      push('afterG3', matchupShort + ' Series Score After Game 3', botFull + ' 2-1', fmtPrice(ag3Legs[2].offered));
    }

    // 7. Series Total Games (2 selections — Over 5.5, Under 5.5)
    // Engine totalGamesOU is a paired market with O/U lines at 4.5, 5.5, 6.5
    // We only need 5.5 line for the cheat sheet
    if (m.totalGamesOU && m.totalGamesOU.pairs) {
      const target = m.totalGamesOU.pairs.find(p =>
        p.legs.some(l => /5\.5/.test(l.label || ''))
      );
      if (target) {
        const overLeg  = target.legs.find(l => /Over/i.test(l.label) || /^O/i.test(l.label));
        const underLeg = target.legs.find(l => /Under/i.test(l.label) || /^U/i.test(l.label));
        if (overLeg)  push('totalGamesOU', matchupShort + ' Series Total Games', 'Over 5.5',  fmtPrice(overLeg.offered));
        if (underLeg) push('totalGamesOU', matchupShort + ' Series Total Games', 'Under 5.5', fmtPrice(underLeg.offered));
      }
    }

    // 8. Game 1 / Series Winner Parlay (4 selections — skip if G1 played, since 2 of 4 settle to 0)
    if (playedCount < 1 && m.g1AndSeries && m.g1AndSeries.legs) {
      const g1 = m.g1AndSeries.legs;
      // Cheat sheet order: top/top, bot/bot, top/bot, bot/top
      // Engine order: [top G1+top, top G1+bot, bot G1+top, bot G1+bot]
      // Selection format: "<topFull> / <topFull>", etc.
      const g1Lookup = {};
      g1.forEach(leg => {
        // Leg labels are "<topFull> G1 + <topFull> Series", etc.
        // Convert to cheat sheet format "<TeamA> / <TeamB>"
        const match = leg.label.match(/^(.+) G1 \+ (.+) Series$/);
        if (match) g1Lookup[match[1] + ' / ' + match[2]] = leg.offered;
      });
      const g1Order = [
        topFull + ' / ' + topFull,
        botFull + ' / ' + botFull,
        topFull + ' / ' + botFull,
        botFull + ' / ' + topFull
      ];
      g1Order.forEach(sel => {
        if (g1Lookup[sel] !== undefined) {
          push('g1AndSeries', matchupShort + ' Game 1/Series Winner', sel, fmtPrice(g1Lookup[sel]));
        }
      });
    }

    // 9. Series From Behind / Never Trail (4 selections)
    if (m.fromBehind && m.fromBehind.legs && m.fromBehind.legs.length >= 4) {
      // Engine ordering: [0] top NT, [1] top FB, [2] bot NT, [3] bot FB
      // Cheat sheet ordering: top FB, bot FB, top NT, bot NT
      const fb = m.fromBehind.legs;
      rows.push({ type: getMarketTypeLabel('fromBehind', slot), name: matchupShort + ' To Win Series From Behind', selection: topFull + ' To Win Series From Behind', price: fmtPrice(fb[1].offered) });
      rows.push({ type: getMarketTypeLabel('fromBehind', slot), name: matchupShort + ' To Win Series From Behind', selection: botFull + ' To Win Series From Behind', price: fmtPrice(fb[3].offered) });
      push('fromBehind', matchupShort + ' To Win Series From Behind', topFull + ' To Win Series and Never Trail', fmtPrice(fb[0].offered));
      push('fromBehind', matchupShort + ' To Win Series From Behind', botFull + ' To Win Series and Never Trail', fmtPrice(fb[2].offered));
    }

    return rows;
  }

  // Convert an array of CSV rows to a string with header.
  function csvRowsToString(rows) {
    const header = 'Market Type,Market Name,Selection,Price';
    const escape = (s) => {
      if (s === null || s === undefined) return '';
      const str = String(s);
      if (/[,"\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    };
    const lines = rows.map(r => [r.type, r.name, r.selection, r.price].map(escape).join(','));
    return [header].concat(lines).join('\n');
  }


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
    computeDerivedCupMarkets,
    americanInputToProb,
    normalize,
    applyConferenceBiases,
    computeMarketRound,
    getOutrightMargin,
    eligibleTeamsForSeries,
    seedR1FromStandings,
    buildSeriesPropsCSV,
    csvRowsToString,
    getSeriesSlot,
    getMarketTypeLabel,
    marginBadgeColor,
    fmtMargin,
    fmtPct,
    fmtDecimal,
    TOP_HOME_GAMES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PlayoffsEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);balThis);
