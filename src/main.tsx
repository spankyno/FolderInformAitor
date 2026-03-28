import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import './index.css';

const Provider = ThemeProvider as any;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider attribute="class" defaultTheme="light">
      <App />
    </Provider>
  </StrictMode>,
);
