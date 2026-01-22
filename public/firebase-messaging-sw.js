/* public/firebase-messaging-sw.js */
/* eslint-disable no-undef */
/* global importScripts, firebase, clients, self */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDA1HhTOIe3vfVu86l7AUMi9eVS_k2tpXw",
  authDomain: "ranking-padel-oficial.firebaseapp.com",
  projectId: "ranking-padel-oficial",
  storageBucket: "ranking-padel-oficial.firebasestorage.app",
  messagingSenderId: "991249039996",
  appId: "1:991249039996:web:b67f0afbb90dfad6167ff9",
});

const messaging = firebase.messaging();

// ✅ DEDUPE SW
const TTL_MS = 8000;
const seen = new Map();

function makeKey(payload) {
  const data = payload?.data || {};
  const desafioId = data.desafio_id || "";
  const event = data.event || data.type || "";
  const title = payload?.notification?.title || data.title || "";
  const body = payload?.notification?.body || data.body || "";
  return `${event}::${desafioId}::${title}::${body}`.trim();
}

function shouldAccept(payload) {
  const k = makeKey(payload);
  const t = Date.now();
  const last = seen.get(k);
  if (last && t - last < TTL_MS) return false;
  seen.set(k, t);

  for (const [key, ts] of seen.entries()) {
    if (t - ts > TTL_MS) seen.delete(key);
  }
  return true;
}

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] onBackgroundMessage:", payload);

  if (!shouldAccept(payload)) {
    console.log("[SW] 🧯 dedupe background");
    return;
  }

  // ✅ Mostrar SIEMPRE (use notification o data)
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Ranking Pádel";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "Tenés una nueva notificación";

  const data = payload?.data || {};
  const desafioId = data.desafio_id;
  const url = desafioId ? `/?open_desafio=${encodeURIComponent(desafioId)}` : "/";

  // ✅ tag para colapsar repetidos
  const tag = `${data.event || "evt"}:${desafioId || "none"}`;

  self.registration.showNotification(title, {
    body,
    tag,
    renotify: false,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(url);
      }
    })()
  );
});
