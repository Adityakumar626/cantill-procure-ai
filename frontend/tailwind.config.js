/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F6F8',
        surface: '#FFFFFF',
        sidebar: {
          DEFAULT: '#172536',
          hover: '#1F334A',
          active: '#263D57',
        },
        ink: {
          primary: '#202B38',
          secondary: '#687586',
          muted: '#8D99A8',
        },
        border: {
          subtle: '#E1E5EA',
          strong: '#CAD0D8',
        },
        corporate: {
          DEFAULT: '#315FCE',
          hover: '#254DB0',
          subtle: '#EBF1FD',
          border: '#C7D7F9',
        },
        success: {
          DEFAULT: '#16845B',
          subtle: '#E8F5EE',
          border: '#B6E2CC',
        },
        warning: {
          DEFAULT: '#C58A25',
          subtle: '#FDF7EB',
          border: '#F6DFB3',
        },
        danger: {
          DEFAULT: '#C74747',
          subtle: '#FDF0F0',
          border: '#F7C6C6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
