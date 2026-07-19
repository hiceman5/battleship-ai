import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './useTheme'

export type ThemeToggleProps = {
  readonly className?: string
}

/**
 * Dark-mode toggle button (SPEC §8, §10). Adds/removes the `dark` class on the
 * document root through {@link useTheme}; presentation only.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-black bg-yellow-400 text-black',
        'shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-500',
        'dark:border-white dark:bg-fuchsia-500 dark:text-white dark:shadow-[3px_3px_0_0_rgba(255,255,255,0.85)]',
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
