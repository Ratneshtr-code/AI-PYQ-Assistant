/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                baseLight: "#f9fafb",
                baseCard: "#ffffff",
                baseText: "#1f2937",
                baseBorder: "#e5e7eb",

                accentBlue: "#3b82f6",
                accentGreen: "#22c55e",
                accentAmber: "#f59e0b",
                accentPurple: "#a855f7",
            },
            boxShadow: {
                soft: "0 1px 4px rgba(0,0,0,0.05)",
                lift: "0 2px 10px rgba(0,0,0,0.08)",
            },
            borderRadius: {
                xl: "1rem",
                "2xl": "1.25rem",
            },
        },
    },
    plugins: [],
};
