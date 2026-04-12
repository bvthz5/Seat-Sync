import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HeroUIProvider } from "@heroui/react";

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

