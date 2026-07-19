/**
 * Shared class-name tokens for the ARCADE visual variant (high-contrast, bold,
 * playful). Presentation only — no game rules. These are plain Tailwind utility
 * strings composed with {@link cn}, so the component API stays byte-for-byte
 * identical while the look changes. Every text/background pairing below is
 * chosen to meet WCAG AA (see PR notes for the contrast checks).
 */

/** Chunky rounded card/panel with a hard offset "sticker" shadow. */
export const arcadePanel =
  'rounded-2xl border-[3px] border-black bg-white text-slate-900 ' +
  'shadow-[6px_6px_0_0_rgba(0,0,0,1)] ' +
  'dark:border-white dark:bg-slate-900 dark:text-slate-50 ' +
  'dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.9)]'

/** Base button: heavy uppercase type, thick border, punchy hard shadow, tactile press. */
export const arcadeButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-black ' +
  'px-4 py-2 text-sm font-extrabold uppercase tracking-wide ' +
  'shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-100 ' +
  'hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-0 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ' +
  'dark:border-white dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.9)]'

/** Bright hero action (Start / Play again): yellow with black text — max contrast, max fun. */
export const arcadeButtonPrimary =
  'bg-yellow-400 text-black hover:bg-yellow-300 ' +
  'disabled:hover:bg-yellow-400'

/** Vivid accent action (fuchsia). White text — AA compliant. */
export const arcadeButtonAccent = 'bg-fuchsia-600 text-white hover:bg-fuchsia-500'

/** Neutral action: white/slate with a colored hover wash. */
export const arcadeButtonNeutral =
  'bg-white text-black hover:bg-cyan-100 ' +
  'dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'

/** Heavy, playful headline treatment. */
export const arcadeHeadline =
  'font-black uppercase tracking-tight text-slate-900 dark:text-white'
