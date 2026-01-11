// src/push.ts
import {
  getMessaging,
  getToken,
  onMessage,
  type MessagePayload,
} from "firebase/messaging";
import { app } from "./firebase";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY as string;

let foregroundListenerReady = false;

// ✅ Anti-duplicado de notis en foreground (TTL corto)
const fgDedup = new Map<string, number>();
const FG_DEDUP_TTL_MS = 6_000;

function dedupKeyFromPayload(payload: MessagePayload): string {
  const title =
    payload.notification?.title || (payload.data?.title as string) || "";
  const body =
    payload.notification?.body || (payload.data?.body as string) || "";
  const desafioId = (payload.data?.desafio_id as string) || "";
  return `${desafioId}::${title}::${body}`.trim();
}

function shouldShowForegroundNotification(payload: MessagePayload): boolean {
  const key = dedupKeyFromPayload(payload);
  const now = Date.now();

  // limpia viejos
  for (const [k, t] of fgDedup.entries()) {
    if (now - t > FG_DEDUP_TTL_MS) fgDedup.delete(k);
  }

  const last = fgDedup.get(key);
  if (last && now - last < FG_DEDUP_TTL_MS) return false;

  fgDedup.set(key, now);
  return true;
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta Service Workers");
  }

  // Si ya hay SW registrado, reutilizamos
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  // Si no hay, registramos el de FCM
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return reg;
}

export async function activarNotificaciones(): Promise<string> {
  if (!VAPID_KEY) {
    throw new Error("Falta VITE_VAPID_KEY en .env.local / Vercel");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones denegado");
  }

  // ✅ SW (reutiliza si ya existe)
  const registration = await getOrRegisterServiceWorker();

  // ✅ importante: esperar a que el SW esté listo
  try {
    await navigator.serviceWorker.ready;
  } catch {
    // no es fatal, pero ayuda a estabilizar
  }

  const messaging = getMessaging(app);

  let token = "";
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (e) {
    console.error("❌ getToken error:", e);
    throw new Error("No se pudo obtener el FCM token (getToken falló).");
  }

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

// ✅ Botón 🔔 hace TODO (permiso + token + guarda en Neon)
export async function activarNotificacionesYGuardar(): Promise<string> {
  const jwt = localStorage.getItem("token");
  if (!jwt) throw new Error("No hay sesión activa (token). Volvé a loguearte.");

  const fcmToken = await activarNotificaciones();
  await registerPushToken(jwt, fcmToken);

  localStorage.setItem("last_fcm_token", fcmToken);
  return fcmToken;
}

/**
 * ✅ Listener FOREGROUND (cuando la web está abierta).
 * - Idempotente (no duplica listeners)
 * - Dedupe anti-doble noti
 * - Abre /?open_desafio=ID (relativo) para que funcione en local y Vercel
 */
export function listenForegroundPush() {
  if (foregroundListenerReady) return;
  foregroundListenerReady = true;

  try {
    const messaging = getMessaging(app);

    onMessage(messaging, (payload: MessagePayload) => {
      console.log("📩 PUSH FOREGROUND payload:", payload);

      if (Notification.permission !== "granted") {
        console.warn("🔕 Notificaciones no concedidas (foreground).");
        return;
      }

      // ✅ evita dobles notis
      if (!shouldShowForegroundNotification(payload)) {
        console.log("🧯 Foreground push deduplicado");
        return;
      }

      const title =
        payload.notification?.title ||
        (payload.data?.title as string) ||
        "Ranking Pádel";

      const body =
        payload.notification?.body ||
        (payload.data?.body as string) ||
        "Tenés una nueva notificación";

      const desafioId = payload.data?.desafio_id as string | undefined;

      // ✅ URL relativa (mejor que origin fijo)
      const url =
        desafioId && String(desafioId).trim() !== ""
          ? `/?open_desafio=${encodeURIComponent(desafioId)}`
          : `/`;

      const notif = new Notification(title, {
        body,
        data: { url },
      });

      notif.onclick = () => {
        try {
          window.focus();
          window.location.assign(url);
        } catch {
          window.open(url, "_blank");
        }
      };
    });
  } catch (e) {
    console.error("❌ Error inicializando listener foreground:", e);
  }
}
