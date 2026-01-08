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

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Ranking Pádel";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/icon.png",
  };
  self.registration.showNotification(title, options);
});
