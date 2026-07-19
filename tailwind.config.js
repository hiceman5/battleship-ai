/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Approved cell-state palette (SPEC §10, signed off): fill light / dark.
        cell: {
          water: { DEFAULT: '#e0f2fe', dark: '#0c2233' },
          ship: { DEFAULT: '#64748b', dark: '#94a3b8' },
          miss: { DEFAULT: '#64748b', dark: '#64748b' },
          hit: {
            DEFAULT: '#dc2626',
            dark: '#fca5a5',
            bg: '#fecaca',
            'bg-dark': '#7f1d1d',
          },
          sunk: { DEFAULT: '#0f172a', dark: '#020617' },
        },
        placement: {
          valid: { DEFAULT: '#a7f3d0', dark: '#34d399' },
          invalid: { DEFAULT: '#fca5a5', dark: '#f87171' },
        },
      },
      // Approved cell metrics (SPEC §10, signed off).
      spacing: {
        cell: '36px',
        'cell-narrow': '28px',
      },
      gap: {
        cell: '2px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        cell: '4px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
