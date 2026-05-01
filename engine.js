// =============================================================================
// engine.js — Shared Markov + odds engine for pricing.html and admin.html
// =============================================================================

(function (global) {
  'use strict';

  const TOP_HOME_GAMES = new Set([1, 2, 5, 7]);

  // -------- Game schedule helpers --------
  function isTopHome(gameNum) {
    return TOP_HOME_GAMES.has(gameNum);
  }

  function topWinProbForGame(series, gameNum) {
    if (series.mode === 'manual') {
      return clamp01(series.manual['game' + gameNum]);
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

  // -------- Public API --------
  global.PlayoffsEngine = {
    isTopHome,
    topWinProbForGame,
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
