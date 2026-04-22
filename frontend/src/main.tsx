import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HeroUIProvider } from "@heroui/react";

// Suppress annoying React-Aria warning in development
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('aria-hidden')) return;
  originalError.call(console, ...args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('aria-hidden') || args[0].includes('aria-label'))) return;
  originalWarn.call(console, ...args);
};

const bootLoader = document.getElementById("boot-loader");
if (bootLoader) bootLoader.remove();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const Root = () => {
  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');

    document.body.classList.remove('dark');
    document.body.classList.add('light');

    document.documentElement.style.colorScheme = 'light';
  }, []);

  return (
    <main className="light text-foreground bg-background min-h-screen">
      <App />
    </main>
  );
};

root.render(
  <React.StrictMode>
    <HeroUIProvider>
      <Root />
    </HeroUIProvider>
  </React.StrictMode>
);

