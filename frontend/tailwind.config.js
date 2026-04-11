import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./*.html", "./src/**/*.{js,jsx,html}"],
  theme: { extend: {} },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        turf: {
          primary: "#2563eb",
          secondary: "#7c3aed",
          accent: "#06b6d4",
          neutral: "#111827",
          "base-100": "#0f172a",
        },
      },
      "dark",
      "luxury",
    ],
  },
};
