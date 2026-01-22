// src/push.ts
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { app } from "./firebase";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY as string;

let foregroundListenerReady = false;

// ✅ Anti-duplicado de notis en foreground (TTL corto)
const fgDedup = new Map<string, number>();
const FG_DEDUP_TTL_MS = 6_000;

function dedupKeyFromPayload(payload: MessagePayload): string {
  const title = payload.notification?.title || (payload.data?.title as string) || "";
  const body = payload.notification?.body || (payload.data?.body as string) || "";
  const desafioId = (payload.data?.desafio_id as string) || "";
  const event = (payload.data?.event as string) || (payload.data?.type as string) || "";
  return `${event}::${desafioId}::${title}::${body}`.trim();
}

function shouldShowForegroundNotification(payload: MessagePayload): boolean {
  const key = dedupKeyFromPayload(payload);
  const now = Date.now();

  for (const [k, t] of fgDedup.entries()) {
    if (now - t > FG_DEDUP_TTL_MS) fgDedup.delete(k);
  }

  const last = fgDedup.get(key);
  if (last && now - last < FG_DEDUP_TTL_MS) return false;

  fgDedup.set(key, now);
  return true;
}

// ------------------ helpers de compatibilidad ------------------

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function isServiceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function isSecureContextOk(): boolean {
  return typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost");
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|WhatsApp/i.test(ua);
}

function unsupportedMessage(): string {
  if (isIOS()) {
    if (isInAppBrowser()) {
      return "En iPhone, las notificaciones NO funcionan dentro de WhatsApp/Instagram. Abrí el link en Safari.";
    }
    return "En iPhone, activá notificaciones desde Safari y mejor si instalás la app (Agregar a pantalla de inicio).";
  }
  return "Este navegador no soporta notificaciones push. Probá en Chrome (ideal: instalá la PWA).";
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) {
    throw new Error("Este navegador no soporta Service Workers");
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return reg;
}

// ------------------ ✅ BRIDGE PARA TOAST EN FOREGROUND ------------------

let onForegroundToast: ((info: { title: string; body: string; url: string }) => void) | null = null;

export function setOnForegroundToast(
  fn: ((info: { title: string; body: string; url: string }) => void) | null
) {
  onForegroundToast = fn;
}

function emitForegroundToast(payload: MessagePayload) {
  if (!onForegroundToast) return;

  const title =
    payload.notification?.title ||
    (payload.data?.title as string) ||
    "Ranking Pádel";

  const body =
    payload.notification?.body ||
    (payload.data?.body as string) ||
    "Tenés una nueva notificación";

  const desafioId = payload.data?.desafio_id as string | undefined;

  const url =
    desafioId && String(desafioId).trim() !== ""
      ? `/?open_desafio=${encodeURIComponent(desafioId)}`
      : `/`;

  onForegroundToast({ title, body, url });
}

// ------------------ API principal ------------------

export async function activarNotificaciones(): Promise<string> {
  if (!VAPID_KEY) throw new Error("Falta VITE_VAPID_KEY en .env.local / Vercel");
  if (!API_URL) throw new Error("Falta VITE_API_URL");

  if (!isSecureContextOk()) {
    throw new Error("La web debe estar en HTTPS para notificaciones.");
  }

  if (!isNotificationSupported()) {
    throw new Error(unsupportedMessage());
  }

  if (!isServiceWorkerSupported()) {
    throw new Error("Este navegador no soporta Service Workers (necesarios para push).");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permiso de notificaciones denegado");

  const registration = await getOrRegisterServiceWorker();
  try { await navigator.serviceWorker.ready; } catch {}

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

  if (!token) throw new Error("No se pudo obtener el FCM token");

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

export async function activarNotificacionesYGuardar(): Promise<string> {
  const jwt = localStorage.getItem("token");
  if (!jwt) throw new Error("No hay sesión activa (token). Volvé a loguearte.");

  const fcmToken = await activarNotificaciones();
  await registerPushToken(jwt, fcmToken);

  localStorage.setItem("last_fcm_token", fcmToken);
  localStorage.setItem("push_registered_once", "1");
  return fcmToken;
}

export async function tryAutoRegisterPush(): Promise<
  | { ok: true; token: string }
  | {
      ok: false;
      reason: "no_session" | "need_permission" | "denied" | "already_registered" | "unsupported" | "error";
      message?: string;
    }
> {
  const jwt = localStorage.getItem("token");
  if (!jwt) return { ok: false, reason: "no_session" };

  if (!isNotificationSupported()) {
    return { ok: false, reason: "unsupported", message: unsupportedMessage() };
  }

  const perm = Notification.permission;
  if (perm === "denied") return { ok: false, reason: "denied" };
  if (perm !== "granted") return { ok: false, reason: "need_permission" };

  if (!isServiceWorkerSupported()) {
    return { ok: false, reason: "unsupported", message: "Este navegador no soporta Service Workers." };
  }

  try {
    const lastToken = localStorage.getItem("last_fcm_token") || "";
    const alreadyOnce = localStorage.getItem("push_registered_once") === "1";

    if (!VAPID_KEY) return { ok: false, reason: "error", message: "Falta VITE_VAPID_KEY" };

    const registration = await getOrRegisterServiceWorker();
    try { await navigator.serviceWorker.ready; } catch {}

    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) return { ok: false, reason: "error", message: "No se pudo obtener token actual" };

    if (alreadyOnce && lastToken && lastToken === currentToken) {
      return { ok: false, reason: "already_registered" };
    }

    await registerPushToken(jwt, currentToken);

    localStorage.setItem("last_fcm_token", currentToken);
    localStorage.setItem("push_registered_once", "1");

    return { ok: true, token: currentToken };
  } catch (e: any) {
    console.error("❌ tryAutoRegisterPush error:", e);
    return { ok: false, reason: "error", message: e?.message || "Error registrando push" };
  }
}

/**
 * ✅ Listener FOREGROUND (app abierta)
 * ✅ Solución duplicado: en foreground SOLO TOAST, NO showNotification del sistema.
 */
export function listenForegroundPush() {
  if (foregroundListenerReady) return;
  foregroundListenerReady = true;

  (async () => {
    try {
      // no crashear si no hay SW
      if (isServiceWorkerSupported()) {
        await getOrRegisterServiceWorker();
        try { await navigator.serviceWorker.ready; } catch {}
      }

      const messaging = getMessaging(app);

      onMessage(messaging, (payload: MessagePayload) => {
        console.log("📩 PUSH FOREGROUND payload:", payload);

        if (!isNotificationSupported()) return;
        if (Notification.permission !== "granted") return;

        if (!shouldShowForegroundNotification(payload)) {
          console.log("🧯 Foreground push deduplicado");
          return;
        }

        // ✅ SOLO TOAST (nada de showNotification acá)
        emitForegroundToast(payload);
      });
    } catch (e) {
      console.error("❌ Error inicializando listener foreground:", e);
    }
  })();
}
