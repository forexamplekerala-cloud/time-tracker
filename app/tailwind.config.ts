/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        
        // Category colors
        trading: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
          text: '#166534'
        },
        agency: {
          DEFAULT: '#2563EB',
          bg: '#DBEAFE',
          text: '#1D4ED8'
        },
        fuel: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
          text: '#B45309'
        },
        distraction: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
          text: '#B91C1C'
        },
        unclear: {
          DEFAULT: '#A1A1AA',
          bg: '#F4F4F5',
          text: '#52525B'
        }
      },
    },
  },
  plugins: [],
}
