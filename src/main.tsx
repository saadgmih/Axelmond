import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./production-shield";
import App from "./App.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import "./index.css";
import { AccessibilityPreferencesProvider } from "./hooks/useAccessibilityPreferences.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <AccessibilityPreferencesProvider>
        <App />
      </AccessibilityPreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
);
