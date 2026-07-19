# Battleship Specification

Browser-based, single-player Battleship against an AI opponent. Client
side only, no backend. This document is the complete, authoritative
specification: a contributor who reads only this file and `AGENTS.md`
has everything needed to implement the game without further questions.

Architecture, stack, and process constraints (pure `engine`/`ai`,
reducer-only state transitions, frozen `types.ts`, DoD, branch naming,
regression tests) are defined in `AGENTS.md` and are not repeated here.

---

## 1. Board and coordinates

- The board is a fixed **10×10** grid. The size is a constant for v1;
  there is no UI to change it.
- **Columns** are the horizontal axis, labelled **A–J** left → right.
  **Rows** are the vertical axis, labelled **1–10** top → bottom.
- A cell is displayed as the column letter followed by the row number,
  e.g. `A1` (top-left), `J10` (bottom-right).
- Internally coordinates are **zero-indexed** via `Coord { row, col }`
  (both `0–9`), as defined in `src/engine/types.ts`. Conversion between
  internal indices and the `A1` display label happens only at the UI
  boundary. Engine and AI code never deal in letters.

## 2. Fleet

- Each player has a fleet of **five ships, one of each class**:

  | Ship       | Length |
  | ---------- | ------ |
  | Carrier    | 5      |
  | Battleship | 4      |
  | Cruiser    | 3      |
  | Submarine  | 3      |
  | Destroyer  | 2      |

- Total occupied cells per fleet: **17**.
- Both players (human and AI) use the identical fleet. There is no
  asymmetry.

## 3. Ship placement

### 3.1 Legality rules

A placement is legal only if **all** of the following hold:

1. Orientation is **Horizontal or Vertical only** (no diagonal), per the
   `Orientation` enum.
2. The ship lies **entirely within bounds** (no cell off the 10×10
   grid).
3. The ship does **not overlap** any other ship.
4. **Ships may not touch — not orthogonally and not diagonally.** Every
   ship must be surrounded by a one-cell buffer of empty water (or the
   board edge). Equivalently, no two ships may occupy cells that are
   king-move adjacent.

`Ship.origin` is the **top-left-most** cell of the ship:

- **Horizontal**: the ship occupies `col = origin.col … origin.col +
  size − 1` on `row = origin.row`.
- **Vertical**: the ship occupies `row = origin.row … origin.row + size
  − 1` on `col = origin.col`.

### 3.2 Human placement flow (Setup phase)

- The human places all five ships during the `Setup` phase.
- Placement supports **both**:
  - **Manual placement**: select a ship, choose an orientation, and
    click a target cell to place it. Rotate the pending ship with the
    keyboard `R` key or an on-screen rotate button. Orientation is
    Horizontal/Vertical only.
  - **Randomize** button: fills all unplaced ships with a random legal
    layout (respecting §3.1, including the no-touch rule).
  - **Clear** button: removes all placed ships and returns to an empty
    board.
- Illegal placements are rejected and never committed; the UI indicates
  the target is invalid rather than placing the ship.
- Transient placement state (which ship is selected, the pending
  orientation, the hover/ghost preview cell) lives **locally in the
  placement UI component**. It is **not** part of `GameState` and not a
  game rule. Only completed, legal placements are committed into
  `Board.ships` through the reducer.
- The **Start** action is disabled until all five ships are legally
  placed. The game cannot begin from an invalid or partial layout.

### 3.3 AI placement

- The AI places its fleet with a **uniform random legal layout**
  respecting §3.1 (including no-touch), at the start of each game.
- Placement randomness comes from an **injectable RNG** so tests can pin
  layouts deterministically.

## 4. Turn structure and firing

- **The human always fires first.**
- Turns **strictly alternate**, exactly **one shot per turn**. A hit
  does **not** grant an extra shot; the turn passes after every resolved
  shot regardless of hit or miss. `GameState.currentPlayer` toggles
  between `human` and `ai`.
- A shot targets a single cell on the **opponent's** board.

### 4.1 Firing on a fresh cell

- **Miss**: the targeted cell becomes `CellState.Miss`, the coord is
  appended to that board's `shots`, and the turn passes.
- **Hit**: the targeted cell becomes `CellState.Hit`, the coord is
  appended both to the owning `Ship.hits` and to the board's `shots`. If
  this hit completes the ship, resolve a **sink** (§5). The turn passes
  after the shot resolves.

### 4.2 Repeat shots

- Firing on a cell that has already been fired upon is a **rejected
  no-op**: no state changes, and the **turn does not pass**.
- The UI makes already-fired cells **non-interactive/disabled** so the
  human cannot waste a turn. The AI never selects an already-fired cell
  (see §6).

## 5. Sunk detection and reveal

- A ship is **sunk** when every one of its cells has been hit
  (`Ship.hits` covers the full ship length).
- On sink, **all of that ship's cells transition from `Hit` to
  `CellState.Sunk`** and are styled distinctly from ordinary hits.
- A sink is **announced by ship identity**, both visually and via an
  `aria-live` region: e.g. "You sank the enemy Cruiser" when the human
  sinks an AI ship, "Your Battleship was sunk" when the AI sinks a human
  ship.

### 5.1 Visibility rules

- On the **human's own board**: the human always sees their own ship
  positions, plus the AI's incoming hits and misses.
- On the **AI's board** (the human's firing target): the human sees
  **only shot results** — hits, misses, and sunk ships. **Unfired AI
  ship locations remain hidden** until game over.
- At **game over**, the loser's remaining (un-sunk) ship positions are
  **revealed** on the board.

## 6. AI behavior

The AI is **deterministic given the game state** (aside from the
injectable placement RNG in §3.3). Given identical inputs it always
chooses the same shot, which makes it unit-testable. All ties are broken
by a **fixed ordering: lowest `row`, then lowest `col`**.

The AI holds **no persistent mode state in `GameState`**. Its next shot
is **recomputed deterministically each turn** from the human board's
`shots` plus the ships' `hits`/sunk status (i.e. the AI's targeting is a
pure function of observable board state). Nothing in `types.ts` changes
to accommodate the AI.

The AI operates in three conceptual modes, evaluated in order each turn:

### 6.1 Search mode (parity)

- When there are **no unresolved hits** (hits that do not belong to an
  already-sunk ship), the AI is searching.
- It fires only on cells of a **single checkerboard parity** (cells
  where `(row + col)` is even, say). Because the smallest ship
  (Destroyer, length 2) always covers one cell of each parity, a
  parity-2 net is guaranteed to eventually strike every ship while
  firing at roughly half the cells.
- Parity is **fixed at 2 for v1**; it does not dynamically widen as
  small ships are sunk.
- Among legal parity cells not yet fired upon, choose by the fixed
  tie-break ordering.

### 6.2 Hunt mode (probe neighbors)

- As soon as there is an **unresolved single hit**, the AI enters hunt
  mode. It considers the **four orthogonal neighbors** of the hit cell,
  filters to those **in bounds and not yet fired upon**, and fires at
  one (chosen by the fixed tie-break ordering).

### 6.3 Target mode (extend along axis)

- Once there are **two or more collinear unresolved hits** (sharing a
  row or a column), the AI locks onto that axis and fires only at the
  **two open ends of the line** (the in-bounds, not-yet-fired cells
  immediately beyond each end), until the ship sinks or a shot proves
  the line does not extend that way.

### 6.4 Reset on sink

- When a ship sinks, its hits become resolved. Because **ships may not
  touch (§3.1)**, no unresolved hit can ever belong to a neighbouring
  ship. Therefore on every sink the AI cleanly **returns to search mode
  (§6.1)** — there is no leftover-hit hunting case.

### 6.5 Out of scope for v1

- No probability-density map / ship-length weighting beyond parity +
  hunt + target.
- No difficulty levels; there is a single AI.

## 7. Turn pacing

- The AI does not move instantly. After the human's shot resolves, the
  AI's move is issued after a **short delay (~400–600 ms)** during which
  the board shows a "thinking"/disabled state, so the human can perceive
  the AI's shot as a distinct event.

## 8. Win condition, game over, and replay

- **Win**: the first player to **sink all five** of the opponent's ships
  wins. The reducer sets `GameState.winner` and `phase = GameOver`.
- **No draw is possible**: because the human fires first and turns
  strictly alternate, exactly one player reaches "all opponent ships
  sunk" first.
- **Game-over screen** shows:
  - a **Win / Lose headline**,
  - a summary: **shots fired, hits, and accuracy**,
  - the **revealed boards** (§5.1), and
  - a **"Play again"** button.
- **Replay**: "Play again" resets the game to the **`Setup` phase**. The
  human re-places (or re-randomizes) their fleet and the AI
  re-randomizes its fleet. There is no instant rematch that reuses the
  previous layout.
- **No persistence**: game state is **not** saved across reloads;
  reloading the page starts fresh. (No localStorage for v1.)

## 9. Accessibility

- **Keyboard grid navigation**: a focus cursor moves cell-by-cell with
  the **arrow keys**; **Enter/Space fires** the focused cell. The grid
  uses a **roving `tabindex`** so it is a single tab stop that then
  navigates internally.
- **ARIA**:
  - The grid uses `role="grid"` with `role="gridcell"` cells.
  - Each cell has an `aria-label` combining its coordinate and state,
    e.g. "B4, empty", "B4, hit", "B4, miss", "B4, sunk".
  - Turn changes and sink announcements are exposed through an
    `aria-live="polite"` region.
- **Colorblind-safe markers**: hit/miss/sunk are distinguished by
  **shape/icon, not color alone** (e.g. dot = miss, ✕/burst = hit,
  filled marker = sunk), and all colors meet WCAG contrast.
- **Focus management**: on phase transitions, and especially on game
  over, focus moves to the new primary element (e.g. the game-over
  headline or "Play again" button) so keyboard and screen-reader users
  are not stranded.

## 10. Visual specification

The concrete visual design (exact colors, spacing, and typography) is
**not invented ad hoc**. The following Tailwind palette has been
**proposed and signed off**, and is now part of this spec.

### Semantic tokens (light / dark hex)

| Token                | Light     | Dark      |
| -------------------- | --------- | --------- |
| background           | `#f8fafc` | `#0b1220` |
| foreground           | `#0f172a` | `#e2e8f0` |
| muted-foreground     | `#475569` | `#94a3b8` |
| border               | `#cbd5e1` | `#243244` |
| card                 | `#ffffff` | `#111a2b` |
| primary              | `#0e7490` | `#22d3ee` |
| primary-foreground   | `#ffffff` | `#062c33` |

These are stored as HSL CSS variables in `src/index.css` (`:root` and
`.dark`) so shadcn tokens (`bg-background`, `text-foreground`,
`text-muted-foreground`, `bg-card`, `bg-primary`, `border-border`, …)
resolve for both modes.

### Cell states (fill light / dark) — colorblind-safe marker SHAPE is mandatory

| State           | Fill light | Fill dark | Marker (shape, not color alone)                          |
| --------------- | ---------- | --------- | -------------------------------------------------------- |
| water           | `#e0f2fe`  | `#0c2233` | none                                                     |
| own ship        | `#64748b`  | `#94a3b8` | solid block                                              |
| miss            | (water)    | (water)   | hollow/outlined dot in `#64748b`                         |
| hit             | `#fecaca`  | `#7f1d1d` | ✕ / burst, `#dc2626` (light) / `#fca5a5` (dark)          |
| sunk            | `#0f172a`  | `#020617` | filled marker                                            |
| placement valid | emerald outline `#a7f3d0` / `#34d399`              |                                                          |
| placement invalid | red outline `#fca5a5` / `#f87171`               |                                                          |

Cell fills are applied to the shared, read-only board cells (which carry
a per-cell `data-state`) via global rules in `src/index.css`; the
matching Tailwind tokens live under `theme.extend.colors.cell.*` in
`tailwind.config.js`.

### Metrics

- Cell: **36px** desktop / **28px** narrow; grid gap **2px**; cell
  radius **4px**; coord labels A–J / 1–10 in muted, `text-xs`,
  `tabular-nums`; focus ring 2px primary + 2px offset.

### Type

- **Inter** with fallback `ui-sans-serif, system-ui, sans-serif` (no
  web-font download required); game-over headline `text-3xl font-bold`.

- **Dark mode is enabled.** The app supports a dark theme (Tailwind
  `dark` class strategy), initialised from `prefers-color-scheme` and
  then user-controllable. Both light and dark palettes are signed off
  above.
- **Layout**: the two boards are shown **side-by-side on desktop**
  (`md:`+) and **stacked on narrow screens**. Mouse and keyboard are
  first-class inputs; touch is best-effort.

## 11. State model and game loop

- `GameState` (see `src/engine/types.ts`) is the single serializable
  source of truth: `phase`, `currentPlayer`, both players' `Board`s, and
  `winner`.
- All state transitions flow through `src/state/gameReducer.ts` via
  actions — e.g. `PLACE_SHIP`, `FIRE`, `AI_TURN`, `RESET`. Pure
  `engine` code computes shot/sink/win results; pure `ai` code returns a
  target `Coord`; UI components only **dispatch actions and render
  state**, never mutating game state directly.
- `src/engine/types.ts` is treated as **frozen** and edited only by
  explicit instruction (per `AGENTS.md`). The design above deliberately
  requires no new fields: transient placement state is UI-local (§3.2)
  and AI targeting is derived from board state (§6).

## 12. Suggested build order (vertical slices)

Each slice is its own `devin/<slice-name>` branch and PR (see
`AGENTS.md`). Recommended order:

1. **Engine** — placement legality, firing, sink/win resolution + tests.
2. **Reducer** — actions and state transitions + tests.
3. **AI** — parity search, hunt, target, sink-reset, deterministic
   tie-breaks + tests.
4. **Placement UI** — Setup phase (manual + randomize + clear + start).
5. **Play UI + accessibility** — two boards, firing, game-over screen,
   keyboard nav, ARIA, colorblind-safe markers.
6. **Visual polish** — apply the approved palette, dark mode, responsive
   layout.

Unit tests (Vitest) cover engine, reducer, and AI with deterministic
scenarios (parity, hunt, target, sink-reset, win). Every bug fix ships
with a regression test and a `docs/BUGS.md` entry.
