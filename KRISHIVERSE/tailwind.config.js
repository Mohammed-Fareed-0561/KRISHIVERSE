/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D52',
        secondary: '#7C5C3E',
        accent: '#2563EB',
        warning: '#D97706',
        danger: '#C0392B',
        dark: '#1A1A1A',
        light: '#F9F7F4',
      },
      fontSize: {
        'display': '32px',
        'h2': '24px',
        'h3': '20px',
        'body-lg': '16px',
        'body-sm': '14px',
        'caption': '12px',
      },
      fontFamily: {
        sans: ['Noto Sans', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        heading: ['Baloo 2', 'Noto Sans Tamil', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          "primary":          "#2E7D52",
          "primary-content":  "#ffffff",
          "secondary":        "#7C5C3E",
          "secondary-content":"#ffffff",
          "accent":           "#2563EB",
          "accent-content":   "#ffffff",
          "neutral":          "#2C2C2C",
          "base-100":         "#FFFFFF",
          "base-200":         "#F9F7F4",
          "base-300":         "#EDE9E3",
          "base-content":     "#1A1A1A",
          "info":             "#2563EB",
          "success":          "#2E7D52",
          "warning":          "#D97706",
          "error":            "#C0392B",
        },
      },
    ],
    darkTheme: "light",
    logs: false,
  },
}
