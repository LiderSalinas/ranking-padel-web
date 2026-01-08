// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDA1HhTOIe3vfVu86l7AUMi9eVS_k2tpXw",
  authDomain: "ranking-padel-oficial.firebaseapp.com",
  projectId: "ranking-padel-oficial",
  storageBucket: "ranking-padel-oficial.firebasestorage.app",
  messagingSenderId: "991249039996",
  appId: "1:991249039996:web:b67f0afbb90dfad6167ff9",
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
