// src/main.tsx
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

  // Espera a que React pinte al menos 1 frame
  requestAnimationFrame(() => {
    splash.classList.add("hidden");
    // deja tiempo para la transición (tiene 200ms en tu CSS)
    setTimeout(() => {
      splash.remove();
    }, 250);
  });
})();

// ✅ 2) Registrar Service Worker de Firebase
// Recomendado: hacerlo después del load para evitar pelear con el primer render
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
