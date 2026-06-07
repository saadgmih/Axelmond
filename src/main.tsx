import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AccessibilityPreferencesProvider } from './hooks/useAccessibilityPreferences.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibilityPreferencesProvider>
        <App />
      </AccessibilityPreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
);
