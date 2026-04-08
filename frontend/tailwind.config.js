/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: '#05070a',
          800: '#0c0e12',
          700: '#14171c',
          600: '#1e2329',
          500: '#2a2f35',
        },
        cyber: {
          cyan: '#00f2ff',
          green: '#00ff95',
          red: '#ff3366',
          yellow: '#ffcc00',
          purple: '#7000ff',
          pink: '#ff007a'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        hud: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 242, 255, 0.05) 1px, transparent 1px)",
      },
      animation: {
        'scanline': 'scanline 4s linear infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(0,242,255,0.4))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(0,242,255,0.2))' },
        },
        matrixRain: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
