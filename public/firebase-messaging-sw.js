/* public/firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDA1HhTOIe3vfVu86l7AUMi9eVS_k2tpXw",
  authDomain: "ranking-padel-oficial.firebaseapp.com",
  projectId: "ranking-padel-oficial",
  storageBucket: "ranking-padel-oficial.firebasestorage.app",
  messagingSenderId: "991249039996",
  appId: "1:991249039996:web:b67f0afbb90dfad6167ff9",
});

const messaging = firebase.messaging();

// ✅ cuando llega push con la app cerrada o en background
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Ranking Pádel";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/icon.png",
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});

// ✅ al tocar la notificación, abrir la app en una URL que vos controlás
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const desafioId = data?.desafio_id;

  // si mandás desafio_id, abrimos directo a ese desafío
  const url = desafioId ? `/?open_desafio=${encodeURIComponent(desafioId)}` : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // si ya hay pestaña abierta, enfocarla
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      // si no, abrir nueva
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
