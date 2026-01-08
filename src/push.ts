// src/push.ts
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

const VAPID_KEY =
  "BLRVNfkATYLT79KiKGaJ-NwSIj5jg5EIYna0XLr9f8zR0zqX_hBW4bn95tHQA11C1lzYbGWpfnpy8ALYkHqtCvg"; // <-- TU VAPID NUEVO

export async function activarNotificaciones(): Promise<string | null> {
  try {
    const permiso = await Notification.requestPermission();
    console.log("🔔 Notification permission:", permiso);

    if (permiso !== "granted") {
      console.warn("❌ Permiso de notificaciones denegado");
      return null;
    }

    // Registrar / reutilizar SW
    let registration = await navigator.serviceWorker.getRegistration(
      "/firebase-messaging-sw.js"
    );

    if (!registration) {
      registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("✅ SW registrado:", registration.scope);
    } else {
      console.log("✅ SW ya existía:", registration.scope);
    }

    // Pedir token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("🔥 TOKEN FCM FINAL:", token);
    return token || null;
  } catch (error) {
    console.error("❌ Error activando notificaciones:", error);
    return null;
  }
}
