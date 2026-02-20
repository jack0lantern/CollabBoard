import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Nunito", "system-ui", "-apple-system", "sans-serif"],
        sketch: ["Caveat", "cursive"],
      },
      colors: {
        crayon: {
          red: "#ff4757",
          blue: "#2979ff",
          green: "#00c853",
          yellow: "#ffd600",
          purple: "#aa00ff",
          orange: "#ff6d00",
          pink: "#f50057",
        },
        paper: {
          DEFAULT: "#fffbee",
          line: "#c8e6ff",
        },
      },
      borderWidth: {
        "3": "3px",
      },
      boxShadow: {
        "crayon-red": "4px 4px 0 #ff4757",
        "crayon-blue": "4px 4px 0 #2979ff",
        "crayon-green": "4px 4px 0 #00c853",
        "crayon-yellow": "4px 4px 0 #ffd600",
        "crayon-purple": "4px 4px 0 #aa00ff",
        "crayon-orange": "4px 4px 0 #ff6d00",
        "crayon-dark": "4px 4px 0 #1a1a2e",
      },
    },
  },
  plugins: [],
};

export default config;
