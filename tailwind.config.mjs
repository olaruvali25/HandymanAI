/** @type {import("tailwindcss").Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--ring)",
        background: "var(--bg)",
        foreground: "var(--text)",
        primary: { DEFAULT: "var(--accent)", foreground: "#000000" },
        secondary: { DEFAULT: "var(--surface)", foreground: "var(--text)" },
        muted: { DEFAULT: "var(--surface)", foreground: "var(--muted)" },
        accent: { DEFAULT: "var(--accent-soft)", foreground: "#000000" },
        destructive: { DEFAULT: "#ef4444", foreground: "#000000" },
        card: { DEFAULT: "var(--bg-elev)", foreground: "var(--text)" },
        popover: { DEFAULT: "var(--bg-elev)", foreground: "var(--text)" },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
