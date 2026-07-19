import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Read the OS colour-scheme preference (SPEC §8, §10). */
function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** Reflect the current theme onto the document root via the `dark` class. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

/**
 * Dark-mode state using Tailwind's `dark` class strategy (SPEC §8, §10). The
 * theme initialises from `prefers-color-scheme` on first load and is then
 * user-controllable via {@link toggle}. No persistence (no localStorage) per
 * SPEC §8.
 */
export function useTheme(): {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
} {
  const [theme, setThemeState] = useState<Theme>(() =>
    prefersDark() ? 'dark' : 'light',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, setTheme }
}
