import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const StudentThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const StudentThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('seat-sync-student-theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    });

    useEffect(() => {
        localStorage.setItem('seat-sync-student-theme', theme);
        // Also toggle the 'dark' class on documentElement so global Tailwind configs line up perfectly if needed
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <StudentThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </StudentThemeContext.Provider>
    );
};

export const useStudentTheme = () => {
    const context = useContext(StudentThemeContext);
    if (!context) {
        throw new Error('useStudentTheme must be used within a StudentThemeProvider');
    }
    return context;
};
