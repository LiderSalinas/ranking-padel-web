// src/push.ts
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase"; // asumimos que tu firebase.ts exporta `app`

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

  // Registramos el SW (tiene que estar en /public/firebase-messaging-sw.js)
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
