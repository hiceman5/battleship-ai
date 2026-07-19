# Bugs

Track every bug here. Copy the template below for each new entry. Do not
delete resolved entries — they document regressions and their fixes.

## Template

- **ID:**
- **Title:**
- **Severity:**
- **Found by:**
- **Symptom:**
- **Root cause:**
- **Fix:**
- **Test:**

## Entries

- **ID:** BUG-001
- **Title:** Fresh game auto-starts into `Playing` with an empty AI board
- **Severity:** High
- **Found by:** devin/reducer-setup-actions
- **Symptom:** Starting a new game from `createInitialState()` and legally
  placing all five human ships transitioned `phase` straight to `Playing`,
  but the AI board had no ships. Because `isFleetDestroyed` is true for a
  fleet-less board on the first human shot, the game was effectively broken /
  instantly decided against the AI.
- **Root cause:** `PLACE_SHIP` auto-transitioned to `Playing` when the fifth
  ship was placed, yet the AI fleet was only ever laid down by `RESET` —
  `createInitialState()` leaves the AI board empty. There was no explicit
  Start step to place the AI fleet, contradicting SPEC §3.2 (Start must be a
  separate, gated action).
- **Fix:** Removed the auto-start from `PLACE_SHIP` (placing the fifth ship now
  leaves `phase = Setup`). Added an explicit `START` action that is a no-op
  until all five human ships are legally placed and, when valid, lays the AI
  fleet via `engine.generateRandomLayout(rng)`, sets `phase = Playing`, and
  leaves the human to move first. Also added a `CLEAR` action to empty the
  human fleet during Setup.
- **Test:** `gameReducer.test.ts` › "start-bug regression (SPEC §3.2, §4)" ›
  "a fresh game does NOT auto-start with an empty AI board" (plus the
  "does NOT auto-start once the full fleet is placed (stays Setup)" and the
  START/CLEAR suites).
