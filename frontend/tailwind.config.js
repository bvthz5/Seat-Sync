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
                // SeatSync Brand Palette - Premium Indigo/Violet
                background: "#f8fafc",
                surface: "#ffffff",
                border: "#e2e8f0",

                primary: {
                    DEFAULT: "#6366f1", // Indigo 500
                    foreground: "#ffffff",
                    50: "#f5f7ff",
                    100: "#ebf0fe",
                    200: "#ced9fd",
                    300: "#adc0fc",
                    400: "#8da7fa",
                    500: "#6366f1",
                    600: "#4f46e5",
                    700: "#4338ca",
                    800: "#3730a3",
                    900: "#312e81",
                },
                secondary: {
                    DEFAULT: "#8b5cf6", // Violet 500
                    foreground: "#ffffff",
                },
                accent: {
                    DEFAULT: "#f59e0b", // Amber 500
                    foreground: "#000000",
                },
                // Functional Status Colors
                success: "#10b981",
                warning: "#f59e0b",
                danger: "#ef4444",
                info: "#0ea5e9",
            },
            fontFamily: {
                sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
            },
            animation: {
                'float-slow': 'float 8s ease-in-out infinite',
                'float-medium': 'float 6s ease-in-out infinite',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
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
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8, transform: 'scale(0.98)' },
                }
            },
            boxShadow: {
                'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 6px 15px -6px rgba(0, 0, 0, 0.02)',
                'premium-hover': '0 20px 40px -5px rgba(0, 0, 0, 0.06), 0 10px 20px -8px rgba(0, 0, 0, 0.03)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            }

        },
    },
    plugins: [heroui()],
};
