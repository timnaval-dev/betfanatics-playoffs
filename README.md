[# NHL Playoffs Pricing Suite

Two-tool system for live series pricing across all 15 NHL Playoff series, backed by a single config file in this repo.

Built for BetFanatics Trading.

## What's in here

| File | Purpose |
|------|---------|
| `pricing.html` | Public pricing tool. Read-only, what the trading team uses. |
| `admin.html` | Admin/editor tool. Password-gated, exports updated config. |
| `playoffs.js` | The single source of truth. All 15 series, current state, prices. |
| `engine.js` | Shared math engine (Markov chain, odds conversion, market computation). |
| `README.md` | This file. |

## Live URLs (after GitHub Pages setup)

- Pricing: `https://timnaval-dev.github.io/<repo>/pricing.html`
- Admin: `https://timnaval-dev.github.io/<repo>/admin.html`

## Setup (one-time)

1. Create a new public GitHub repo (e.g. `betfanatics-playoffs`) under `timnaval-dev`.
2. Drop these 5 files into the repo root.
3. Commit and push.
4. In repo Settings → Pages → Source: `main` branch, root folder. Save.
5. Wait ~1 minute. Pages URLs go live.
6. Share `pricing.html` URL with the trading team. Keep `admin.html` URL for yourself.

## How to update settings (the day-to-day flow)

When a game settles, prices need adjusting, or a series ends and you want to populate the next round:

1. Open `admin.html` in your browser.
2. Enter password: **`Tech`**
3. Navigate to the affected series via round + series tabs.
4. Make your edits:
   - **Team names / short codes**: Identity panel
   - **Home win % sliders or per-game odds**: Pricing Inputs panel (toggle Auto / Manual)
   - **Advance series state**: Series State panel (use Top Wins / Bottom Wins buttons)
   - **Margin overrides**: Margin Overrides panel (leave blank for default)
5. The yellow banner at the top will show "N series modified".
6. Click **Export new playoffs.js**.
7. In the modal:
   - Click **Download .js File** to save locally and drag into your repo clone, OR
   - Click **Copy to Clipboard** and paste directly into the GitHub web editor for `playoffs.js`
8. Commit. GitHub Pages updates within ~30 seconds. Live for the team.

## How rounds advance (no-reseed bracket)

The tool follows standard NHL bracket structure (post-2014, no reseeding):

```
Round 1               Round 2              Conf Final         Stanley Cup
─────────────────────────────────────────────────────────────────────────
EAST
Atlantic 1 vs WC2  ┐
                   ├── Atlantic Final ┐
Atlantic 2 vs 3    ┘                  │
                                      ├── Eastern Final ┐
Metro 1 vs WC1     ┐                  │                 │
                   ├── Metro Final ───┘                 │
Metro 2 vs 3       ┘                                    │
                                                        ├── Stanley Cup
WEST                                                    │
Central 1 vs WC2   ┐                                    │
                   ├── Central Final ─┐                 │
Central 2 vs 3     ┘                  │                 │
                                      ├── Western Final ┘
Pacific 1 vs WC1   ┐                  │
                   ├── Pacific Final ─┘
Pacific 2 vs 3     ┘
```

When a Round 1 series ends in admin, navigate to the corresponding Round 2 series. A green **Bracket Advance Available** panel appears with two options:

- **Place [Winner] as Top Seed** (default — better seed becomes home in G1, G2, G5, G7)
- **Place [Winner] as Bottom Seed** (use if needed for re-seeding edge cases)

Same flow for promoting Round 2 winners into Conference Finals, and Conference Finals winners into the Stanley Cup Final.

## Manual mode

Each series has two pricing modes:

- **Auto (Sliders)**: Set Top Seed Home Win % and Bottom Seed Home Win %. The tool derives the 7 game probabilities from the home pattern (G1/G2/G5/G7 = top home, G3/G4/G6 = bot home).
- **Manual (Per Game)**: Set the Top Seed's win odds directly for each of the 7 games (American odds format like `-150` or `+120`). Markov chain pulls those 7 numbers directly. Change any one game's price → all markets recompute.

Switching from Auto to Manual auto-populates the 7 game inputs from current sliders, so you don't lose context.

## Markets shown

Each series renders 8 market cards:

| Market | Type | Margin display |
|--------|------|----------------|
| Series Winner | 2-way | Pair margin badge |
| Correct Score | 8-way exact | Overall margin badge |
| Total Games (O/U) | 3 paired O/U lines (4.5, 5.5, 6.5) | Per-pair margin badges |
| Exact Games | 4-way (4, 5, 6, 7 games) | Overall margin badge |
| Series Spreads | 6 paired (±1.5/2.5/3.5 each side) | Per-pair margin badges |
| Series Score After Game 3 | 4-way (settles after G3) | Overall margin badge |
| Series Score After Game 4 | 5-way (settles after G4) | Overall margin badge |
| From Behind / Never Trail | 4-way | Overall margin badge |

Margin badge colors:

- **Green**: 0–6% (typical)
- **Amber**: 6–10% (high)
- **Red**: >10% (very high)
- **Purple/dim**: <0% (underround — usually a config error)

## Default margins (overridable per series)

Set in `playoffs.js` under `defaults.margin`:

| Market | Default |
|--------|---------|
| Series Winner | 5% |
| Correct Score | 8% |
| Total Games O/U | 5% |
| Exact Games | 8% |
| Spreads | 5% |
| After Game 3 | 6% |
| After Game 4 | 6% |
| From Behind / Never Trail | 6% |

Override per series in admin tool's Margin Overrides panel.

## Editing without admin tool (advanced)

`playoffs.js` is plain JS. You can edit it by hand if you prefer. Key fields per series:

```js
{
  topSeed: { name: "Capitals", short: "WSH" },
  botSeed: { name: "Canadiens", short: "MTL" },
  mode: "auto",                                      // or "manual"
  auto:   { topHomeWinPct: 0.62, botHomeWinPct: 0.45 },
  manual: { game1: 0.62, game2: 0.62, ... game7: 0.62 },
  state:  { topWins: 2, botWins: 1, history: [[0,0],[1,0],[2,0],[2,1]] },
  margin: { seriesWinner: 0.04 }                     // overrides only
}
```

Just keep the file structure intact (don't break the JSON-shaped object) and reload `pricing.html`.

## Math model

The tool runs a Markov chain on series state. From the current `(topWins, botWins)`, each game has a P(top wins) value that determines the transition. Walking the chain forward gives the probability of reaching every possible end state, which is then aggregated into the various market shapes.

Margins are applied proportionally: fair probabilities are scaled so their sum equals `1 + margin`, then individual offered prices are computed.

For "Never Trail" markets, a constrained Markov walk is used that excludes any path crossing through a state where the chosen team is behind.

## Troubleshooting

- **Admin won't unlock**: Password is exactly `Tech` (capital T, no quotes). Stored in `sessionStorage` once unlocked, lasts until browser tab closes.
- **Export modal looks broken**: The textarea is read-only; use the Copy or Download buttons.
- **Pricing tool shows old data**: Hard-refresh (Cmd+Shift+R / Ctrl+Shift+R). GitHub Pages cache can take a minute.
- **Markets show negative margins**: Either you set a margin <0% in admin, or there's a bug. Default to 5% in admin's margin override field if unsure.
- **Manual input rejected**: Use American odds format only. `-150`, `+120`, `100`. Don't include "$" or "%". Empty input keeps the existing value.

## Discarding admin changes

In admin tool, "Discard Changes" button reverts to whatever's currently in `playoffs.js` on the page. Useful if you start poking around and want to reset.

If you've already exported but want to undo, use git history to roll `playoffs.js` back. (No versioned backups in-app; rely on git.)

## Future enhancements (not currently built)

- OT and players props per series
- Bet builder / SGP combinations
- Real-time pull from feeds
- User-specific margin presets

If you want any of these, ping me.
](https://timnaval-dev.github.io/betfanatics-playoffs/pricing.html)
