import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

window.addEventListener("load", () => {
  // ✅ 1) Ocultar splash (fake splash del index.html)
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 250);
  }

  // ✅ 2) Registrar Service Worker de Firebase
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log("✅ SW registrado:", registration.scope);
      })
      .catch((err) => {
        console.error("❌ Error registrando SW:", err);
      });
  }
});
