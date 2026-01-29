import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // SeatSync Brand Palette
                background: "#F5F8FC",
                surface: "#ffffff",
                border: "#cbd5e1",

                primary: {
                    DEFAULT: "#0A1F44", // SeatSync Navy
                    foreground: "#FFFFFF", // White text
                    50: "#e6e9ef",
                    100: "#c1c9d6",
                    200: "#9ba8bd",
                    300: "#7488a4",
                    400: "#4e678b",
                    500: "#0A1F44", // Main
                    600: "#081936",
                    700: "#061329",
                    800: "#040c1b",
                    900: "#02060e",
                },
                secondary: {
                    DEFAULT: "#1F4E79", // SeatSync Blue
                    foreground: "#FFFFFF",
                },
                accent: {
                    DEFAULT: "#D4AF37", // SeatSync Gold
                    foreground: "#000000",
                },
                // Functional Status Colors
                success: "#22c55e",
                warning: "#eab308",
                danger: "#ef4444",
                info: "#3b82f6",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            animation: {
                'float-slow': 'float 8s ease-in-out infinite',
                'float-medium': 'float 6s ease-in-out infinite',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
                }
            },
        },
    },
    plugins: [heroui()],
};
