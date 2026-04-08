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
          900: '#0a0f0d',
          800: '#0f1412',
          700: '#181d1a',
          600: '#262b29',
          500: '#313633',
        },
        cyber: {
          cyan: '#00E5FF',
          green: '#00FF41',
          red: '#FF003C',
          yellow: '#F3FF00'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        hud: ['Inter', 'sans-serif'], // Or Poppins if added later
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, rgba(0, 255, 65, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 65, 0.05) 1px, transparent 1px)",
      },
      animation: {
        'scanline': 'scanline 4s linear infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 10px rgba(0,255,65,0.5))' },
          '50%': { opacity: '.7', filter: 'drop-shadow(0 0 2px rgba(0,255,65,0.2))' },
        },
        matrixRain: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' }
        }
      }
    },
  },
  plugins: [],
}
