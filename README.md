# NHL Playoffs Pricing Tool — User Guide

A guide for the BetFanatics trading team. This tool prices every market we offer for NHL playoff series — series winners, correct scores, totals, spreads, after-game-N states, parlays, futures (Cup, Conference, Division, Country, First-Time Winner, SCF Exact Result), and outputs a CSV that uploads directly into NATS.

This guide assumes you have **never used GitHub before**. If a step looks unfamiliar, follow it exactly — there are no shortcuts you're missing.

---

## What the tool is

There are **two web pages** that work together:

| Page | URL | Who uses it | What it does |
|---|---|---|---|
| **Pricing** | https://timnaval-dev.github.io/betfanatics-playoffs/pricing.html | Anyone on the trading team | Read-only view of all live prices. Cup prices start at admin's anchored values from the most recent export, then drift with the model as bracket state changes. |
| **Admin** | https://timnaval-dev.github.io/betfanatics-playoffs/admin.html | The person setting prices (one designated trader at a time) | Edit per-game prices, add wins, anchor Cup prices, apply biases, export the CSV for NATS, export an updated `playoffs.js` to commit back to the repo. Anchors are held fixed in admin — they don't drift here. |

The data behind both pages lives in a single file: **`playoffs.js`**, stored in this GitHub repo:
**https://github.com/timnaval-dev/betfanatics-playoffs**

When you "save" your work, you're committing a new version of `playoffs.js` to GitHub. Once committed, GitHub Pages auto-deploys both pages within 1–2 minutes — so the rest of the team sees the new prices on `pricing.html`.

---

## Daily workflow at a glance

1. Open **admin.html** in your browser (link above).
2. Make your edits — wins, per-game prices, Cup anchors, biases, whatever needs to change.
3. Click **"Export new playoffs.js"** in the top right. A file called `playoffs.js` downloads to your computer.
4. Go to GitHub, paste the new file in, and click "Commit changes".
5. Wait 1–2 minutes. Refresh `pricing.html` and verify your changes are live.

That's the whole loop. The rest of this guide explains each step in detail.

---

## Setting up access (one-time, do this first)

Before you can edit anything, you need a GitHub account that has been added as a collaborator on this repo.

### 1. Create a GitHub account

If you already have one, skip to step 2.

1. Go to **https://github.com/signup**
2. Use your work email address.
3. Pick any username — it doesn't have to be your real name.
4. Verify your email.

### 2. Get added as a collaborator

Send your GitHub username to **Tim** in Slack. Tim will go to the repo settings, click "Manage access," and invite you. You'll get an email invitation — click "Accept invitation."

Until this is done, you can view the repo but you cannot save changes.

### 3. Bookmark these three URLs

- **Admin**: https://timnaval-dev.github.io/betfanatics-playoffs/admin.html
- **Pricing**: https://timnaval-dev.github.io/betfanatics-playoffs/pricing.html
- **GitHub repo**: https://github.com/timnaval-dev/betfanatics-playoffs

Put them in a browser folder labeled "NHL Playoffs Tool."

---

## How the admin page is organized

When you open admin.html, you'll see this structure:

**Top bar (always visible)**
- Round tabs: Round 1, Round 2, Conference Finals, Stanley Cup Final, Outrights
- Series tabs: appear within each round (e.g., "BUF vs BOS")
- Action buttons (top right): Export current series CSV · Export all series CSV · Initialize bracket from standings · Export new playoffs.js

**Within each series tab (Round 1 / Round 2 / etc.)**
1. **Identity panel** — top and bottom team for the series
2. **Inputs panel** — choose Derived mode (auto-priced from MoneyPuck power scores) or Manual mode (you set per-game probabilities)
3. **State panel** — the current series score (use + and − buttons to add/remove wins)
4. **Margin panel** — override the default margin for any market on this series
5. **Live markets panel** — live preview of every market this series produces (Series Winner, Correct Score, Spreads, etc.). Updates as you edit. Cards are collapsible — Series Winner is open by default.

**Within the Outrights tab**
1. **Eastern Conference Winner** card — 8 teams, model-derived probabilities adjusted by your bias inputs
2. **Western Conference Winner** card — same idea for the West
3. **Stanley Cup Winner** card — all 16 playoff teams
4. **Stanley Cup Prices (trader anchors)** — the editor where you type Cup prices and conference biases per team
5. **Derived Cup Markets** — five markets that derive from Cup prices: Conference of Cup Winner, Division, Country, First-Time Winner, SCF Exact Result

---

## Common edits

### A game just finished — record the result

1. Open admin.html.
2. Click the round tab (e.g., "Round 2").
3. Click the series tab (e.g., "CAR vs PHI").
4. Find the **State panel**.
5. Click the **+1 win** button under the team that won.
6. Verify the score updates correctly.
7. Export and commit (see "Saving your changes" below).

That's it. The Live Markets panel below will instantly recompute all the after-game-N prices, parlays, and series winner odds.

### You disagree with the auto-priced game line

By default, every series starts in **Derived mode** — game-by-game home win probabilities come from MoneyPuck power scores. If you think the model is wrong on a specific series:

1. Open the series tab.
2. In the **Inputs panel**, switch from Derived to **Manual**.
3. The per-game grid becomes editable. Each cell is the probability that the **home team** wins that specific game.
4. Type your own probabilities (any number between 0.01 and 0.99 — for example, 0.65 means 65% home win probability for that game).
5. The Live Markets panel below updates as you type.

You can flip back to Derived at any time. Your manual values are remembered if you flip back to Manual later in the same session.

### Adjust a Stanley Cup price (anchor a team)

On the **Outrights** tab, the Cup Prices editor lets you set a specific American odds price for any team. Once set, that team's Cup probability is locked at that value (the model still drives unanchored teams).

1. Click the **Outrights** round tab.
2. Find the team in the Cup Prices editor.
3. Type the price in American odds in the team's input box (e.g., `+450` or `-110`).
4. Hit Tab or click outside the box.
5. The team is now "anchored" — you'll see a SET badge appear next to their row.

To **unanchor** a team and let the model drive again, click the ↺ button next to their row, or delete the value from the input.

### Apply a conference bias

A conference bias adds (or subtracts) a percentage point to a team's conference probability without changing their Cup probability. Useful when you think the model is too low/high on a team's chances of reaching the Cup Final.

1. On the **Outrights** tab, find the team's row.
2. Use the bias slider in their row (range: −5pp to +5pp, in 0.1pp increments).
3. The probability will update immediately. The bias persists until you reset it manually.

Biases are independent of Cup price overrides. They will stick around even if you click "Clear Cup overrides only."

### Reset everything (start fresh)

Two reset buttons live in the Cup Prices editor:

| Button | What it does |
|---|---|
| **Clear Cup overrides only** | Removes all Cup price anchors. Model drives all Cup probabilities. Conference biases are preserved. |
| **Reset everything** | Removes all Cup overrides AND all conference biases. |

Both will ask you to confirm before doing anything destructive.

---

## Saving your changes (the GitHub commit step)

This is where most non-technical users get stuck. Follow the steps exactly.

### Step 1 — Export the new playoffs.js

1. In admin.html, click **"Export new playoffs.js"** (top right).
2. A file called `playoffs.js` will download to your computer (usually to your Downloads folder).
3. Find the file. Don't open it. Don't rename it. Don't change anything inside it.

### Step 2 — Open the file on GitHub

1. Go to **https://github.com/timnaval-dev/betfanatics-playoffs**
2. In the file list, click on **`playoffs.js`** (the same name as the file you just downloaded).
3. You'll see the file's contents in a viewer. In the top right of that viewer, click the pencil icon (✏️) — its label is "Edit this file." If you don't see the pencil, you don't have edit access yet — see "Setting up access" above.

### Step 3 — Replace the contents

1. Click anywhere in the code area.
2. Press **Ctrl+A** (Windows) or **Cmd+A** (Mac) to select all text.
3. Press **Delete** or **Backspace** to clear it.
4. Open your downloaded `playoffs.js` file in a text editor (Notepad on Windows, TextEdit on Mac, or any code editor). Don't double-click — that may open it in a browser. Right-click the file and choose "Open With → Notepad" (Windows) or "Open With → TextEdit" (Mac).
5. Press **Ctrl+A** / **Cmd+A** to select all, then **Ctrl+C** / **Cmd+C** to copy.
6. Switch back to the GitHub browser tab.
7. Click into the empty code area and paste with **Ctrl+V** / **Cmd+V**.

### Step 4 — Commit the changes

1. Scroll to the bottom of the page (or click the green "Commit changes..." button at the top right of the code area).
2. A dialog opens. The first input box ("Commit message") is the description. Type something short and useful, like:
   - `CAR up 1-0 in R2`
   - `Updated VGK Cup price to +650`
   - `Cleared all overrides post-R1`
3. Leave the radio button on **"Commit directly to the main branch"**.
4. Click the green **"Commit changes"** button.

### Step 5 — Wait, then verify

1. Wait 1–2 minutes for GitHub Pages to redeploy.
2. Open https://timnaval-dev.github.io/betfanatics-playoffs/pricing.html
3. Hard-refresh the page: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac). A normal refresh might still show the old cached version.
4. Confirm your changes are visible.

If the page still looks like the old data after 5 minutes, something went wrong — check that you committed to the `main` branch and that the file you pasted is named exactly `playoffs.js`.

---

## Exporting CSVs for NATS

Two buttons in the admin top bar produce CSVs in NATS-compatible format:

- **Export current series CSV** — downloads only the series tab you're currently viewing
- **Export all series CSV** — downloads every active, in-progress series in one file

The CSV contains four columns: Market Type, Market Name, Selection, Price (decimal, 5 places). Every selection that needs to be priced gets its own row. The CSV automatically skips:

- Completed series (one team has 4 wins)
- TBD series (either team unknown)
- Settled markets within a live series (After Game 3 once Game 3 has played, etc.)
- Conference finals and Stanley Cup Final (those are outright markets, not in the 1–8 slot system)

The slot numbering follows our cheat sheet:
- Slots 1, 2 → Metropolitan division (slot 1 = top series, slot 2 = bottom series)
- Slots 3, 4 → Atlantic division
- Slots 5, 6 → Central division
- Slots 7, 8 → Pacific division

Slot 8 is the only slot where Market Type strings get the `{playerName}` prefix. Everything else uses plain text. This was the cheat sheet's behavior — don't change it unless NATS asks for it.

After downloading the CSV, you can upload it into NATS through the normal market upload flow.

---

## Setting up next season

Hockey reseeds annually. When the 2026–2027 playoffs start, here's what needs to happen:

### Pre-season (before play-in / Round 1 starts)

#### 1. Update standings in `playoffs.js`

Find the `standings` block at the top of `playoffs.js`. Update each division's array with the top three teams by points (in order). Update `wildCardEast` and `wildCardWest` with the two wild card teams in each conference (WC1 first, WC2 second).

If a tie exists between divisions for the conference's #1 seed, the team with more total points takes the higher conference seed. This matters for the bracket — the conference's #1 seed always plays WC2, while the other division winner plays WC1. The admin's "Initialize bracket from standings" button will need this rule baked in if it's not already obvious from points alone.

Example structure (replace teams with the new season's standings):
```
"standings": {
  "atlantic": ["BUF", "TBL", "MTL"],
  "metropolitan": ["CAR", "PIT", "PHI"],
  "central": ["COL", "DAL", "MIN"],
  "pacific": ["VGK", "EDM", "ANA"],
  "wildCardEast": ["BOS", "OTT"],
  "wildCardWest": ["UTA", "LAK"]
}
```

#### 2. Update `teams.js` for any franchise changes

If a team relocated, was renamed, or rebranded, update `teams.js`. Look for the team's three-letter code (e.g., `UTA` for Utah) and update:

- `name`: full team name
- `home.primary` / `home.secondary`: jersey colors
- `away.primary` / `away.secondary`: alternate jersey colors
- `country`: `"USA"` or `"CAN"`
- `firstTimeEligible`: `true` if this franchise has never won a Cup, `false` otherwise

Then commit `teams.js` to GitHub the same way you commit `playoffs.js`.

#### 3. Update MoneyPuck power scores in `teams.js`

Get the latest MoneyPuck team power scores (`score`, `abilityToWin`, `scoringChances`, `goaltending`) from MoneyPuck's website. Update the `power` object for every team. This is what the model uses to derive per-game prices in Derived mode.

Commit `teams.js`.

#### 4. Initialize the bracket

1. Open admin.html.
2. Click **"Initialize bracket from standings"** (top right).
3. Confirm. The bracket auto-seeds the Round 1 matchups based on the standings you put in.

#### 5. Reset all overrides and biases

1. Go to the **Outrights** tab.
2. Click **"Reset everything"** to clear last season's Cup price anchors and conference biases.
3. Set fresh Cup prices and biases based on this season's prior knowledge.

#### 6. Export and commit a fresh `playoffs.js`

Click "Export new playoffs.js" and commit it to GitHub. This new file becomes the season-opener baseline.

### During the season

The daily workflow described above. Update wins after each game, adjust per-game prices when you disagree with the model, anchor outright Cup prices when you have a strong opinion, export and commit.

---

## When something breaks

| Symptom | What to check |
|---|---|
| Pricing.html shows old prices after I committed | Hard-refresh with Ctrl/Cmd + Shift + R. Wait 2 minutes after committing. Check that you committed to `main` branch. |
| Admin won't load — blank page | The `playoffs.js` file is malformed. Open the GitHub repo, look at the most recent commit, click "Revert" to roll back to the previous working version. |
| Live Markets panel shows "Could not compute markets" | A game state is invalid (e.g., 5–2 series score). Check the State panel and use −1 win to fix. |
| Cup prices in admin look wrong | Click "Reset everything" to start fresh. Or use the per-row ↺ button to clear individual anchors. |
| CSV export is empty | All your series are either complete, TBD, or fully settled. The CSV intentionally skips those. Pick a series with wins between 1 and 3. |
| I made a bad commit and want to undo it | On GitHub, go to the **Commits** list (in the file viewer, click the clock icon or "History"). Find your most recent commit. Click into it. Click "Revert" in the top right. Commit the revert. |

If none of the above work, ping Tim in Slack with a screenshot.

---

## Glossary

- **Anchor (Cup price override)**: A trader-set probability for a team's Cup chances. In admin, anchors stay fixed regardless of bracket state. In pricing, anchors are the starting point at export time but drift with the model as state changes.
- **Baseline drift**: The behavior pricing.html uses for Cup probabilities. At export time, admin saves a snapshot of the anchored Cup probs and the pure-model Cup probs at that moment. Pricing computes a per-team multiplier (anchor / model_at_baseline) and applies it to the model at the current state. Net effect: pricing matches admin at export time, then anchored values drift naturally with the model as bracket state evolves.
- **Bias (conference bias)**: A trader-set adjustment to a team's conference probability, in percentage points. Persists across edits, biases stack on top of model output.
- **Derived mode**: The series uses MoneyPuck-derived per-game prices. Updates automatically with bracket state.
- **Manual mode**: The trader sets per-game prices by hand. Used when you disagree with the model.
- **Slot**: A 1–8 number that maps a series to its location in our NATS cheat sheet (e.g., slot 1 = Metro top series).
- **NATS**: BetFanatics' market upload system. The CSV exports go here.
- **Margin**: The percentage of overround built into each market's offered prices. Defaults are tuned per-market — you can override them per-series.
- **Live Markets panel**: The collapsible panel in admin that previews every market a series produces. Updates as you edit.
- **Derived Cup markets**: Five markets that aggregate Cup probabilities into different cuts: Conference, Division, Country, First-Time Winner, SCF Exact Result.

---

## Maintenance

This guide must be kept in sync with the tool. Whenever Tim and Claude make changes to the engine, admin, or pricing pages — including new markets, new buttons, new behaviors, or new defaults — this README and the equivalent Google Doc must be updated in the same session.

Last updated: 2 May 2026 — added baseline drift behavior for pricing outrights
