import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HeroUIProvider } from "@heroui/react";

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
