// src/push.ts
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY as string;

export async function activarNotificaciones(): Promise<string> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta Service Workers");
  }

  if (!VAPID_KEY) {
    throw new Error("Falta VITE_VAPID_KEY en .env.local / Vercel");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones denegado");
  }

  // ✅ el SW TIENE que existir en /public/firebase-messaging-sw.js
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("No se pudo obtener el FCM token");
  }

  console.log("✅ FCM TOKEN REAL:", token);
  return token;
}

export async function registerPushToken(jwt: string, fcmToken: string) {
  if (!API_URL) throw new Error("Falta VITE_API_URL");

  const res = await fetch(`${API_URL}/push/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ fcm_token: fcmToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error registrando token: ${res.status} ${text}`);
  }

  return res.json();
}

// ✅ NUEVO: botón “🔔” hace TODO (obtiene token + guarda en Neon)
export async function activarNotificacionesYGuardar(): Promise<string> {
  const jwt = localStorage.getItem("token");
  if (!jwt) throw new Error("No hay sesión activa (token). Volvé a loguearte.");

  const fcmToken = await activarNotificaciones();
  await registerPushToken(jwt, fcmToken);

  localStorage.setItem("last_fcm_token", fcmToken);
  return fcmToken;
}
