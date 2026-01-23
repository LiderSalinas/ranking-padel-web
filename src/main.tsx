/*main.tsx*/
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ✅ 1) Ocultar splash lo antes posible (sin esperar "load")
(() => {
  const splash = document.getElementById("splash-screen");
  if (!splash) return;

  requestAnimationFrame(() => {
    splash.classList.add("hidden");
    setTimeout(() => {
      splash.remove();
    }, 250);
  });
})();

// ✅ 2) Registrar Service Worker de Firebase
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log("✅ SW registrado:", registration.scope);
      })
      .catch((err) => {
        console.error("❌ Error registrando SW:", err);
      });
  });
}
