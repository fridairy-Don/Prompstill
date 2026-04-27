/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        cream: {
          DEFAULT: "var(--cream)",
          2: "var(--cream-2)",
          3: "var(--cream-3)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          mute: "var(--ink-mute)",
          faint: "var(--ink-faint)",
        },
        mauve: "var(--mauve)",
        terracotta: "var(--terracotta)",
        lavender: "var(--lavender)",
        mint: "var(--mint)",
        mustard: "var(--mustard)",
      },
      borderWidth: {
        ink: "2px",
        "ink-thick": "2.5px",
      },
      boxShadow: {
        stamp: "3px 3px 0 var(--ink)",
        "stamp-lg": "4px 4px 0 var(--ink)",
        "stamp-sm": "2px 2px 0 var(--ink)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.22, 1, 0.36, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        appEnter: {
          "0%": { opacity: "0", transform: "scale(0.97) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        blink: { to: { opacity: "0" } },
      },
      animation: {
        "app-enter": "appEnter 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        blink: "blink 0.8s steps(2) infinite",
      },
    },
  },
  plugins: [],
};
