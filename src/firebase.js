import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAd_Fvlq_cLUUvHmy8XotTXO2gKKdELltU",
  authDomain: "dugun-kamerasi.firebaseapp.com",
  projectId: "dugun-kamerasi",
  storageBucket: "dugun-kamerasi.firebasestorage.app",
  messagingSenderId: "926804966328",
  appId: "1:926804966328:web:c6b423f9471d8cffc06d4d"
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore(app);