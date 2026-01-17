import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#0056D2", // Academic Royal Blue
                    foreground: "#FFFFFF",
                    50: "#F0F7FF",
                    100: "#E0F0FF",
                    200: "#B8DBFF",
                    300: "#8AC2FF",
                    400: "#57A0FF",
                    500: "#2B7FFF",
                    600: "#0056D2", // Main
                    700: "#0043A6",
                    800: "#003482",
                    900: "#002766",
                },
                secondary: {
                    DEFAULT: "#0F172A", // Slate Navy
                    foreground: "#FFFFFF",
                },
                academic: {
                    sky: "#E0F2FE",    // Light Sky
                    cyan: "#A5F3FC",   // Soft Cyan
                    blue: "#38BDF8",   // Bright Blue
                }
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
