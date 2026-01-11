/* public/firebase-messaging-sw.js */
/* eslint-disable no-undef */
/* global importScripts, firebase, clients, self */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// ✅ Pegá tu config real (la misma de src/firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyDA1HhTOIe3vfVu86l7AUMi9eVS_k2tpXw",
  authDomain: "ranking-padel-oficial.firebaseapp.com",
  projectId: "ranking-padel-oficial",
  storageBucket: "ranking-padel-oficial.firebasestorage.app",
  messagingSenderId: "991249039996",
  appId: "1:991249039996:web:b67f0afbb90dfad6167ff9",
});

const messaging = firebase.messaging();

// ✅ BACKGROUND: cuando la app está cerrada o en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] onBackgroundMessage:", payload);

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Ranking Pádel";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "Tenés una nueva notificación";

  const desafioId = payload?.data?.desafio_id;
  const url = desafioId
    ? `/?open_desafio=${encodeURIComponent(desafioId)}`
    : "/";

  self.registration.showNotification(title, {
    body,
    data: { url },
  });
});

// ✅ Click en notificación: abrir/enfocar la app en el detalle
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
