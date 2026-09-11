// firebase-config.js
// إعدادات Firebase - عدّل القيم دي بقيم مشروعك الحقيقي من Firebase Console
// (Project Settings > General > Your apps > Web app)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode,
  updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
// Storage اختياري في هذا المشروع (الفيديوهات تُستضاف على يوتيوب Unlisted افتراضيًا
// لتفادي شرط خطة Blaze). سيبناه مُصدَّرًا هنا فقط لو حبيت تفعّله بنفسك لاحقًا.
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbTMWEeKZ6Lw2JhDA2_f4qFey4AFN6pyI",
  authDomain: "manssite-b9dbf.firebaseapp.com",
  projectId: "manssite-b9dbf",
  storageBucket: "manssite-b9dbf.firebasestorage.app",
  messagingSenderId: "74672324973",
  appId: "1:74672324973:web:aff8a37090bc61520f5a64"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode,
  updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, serverTimestamp, increment,
  ref, getDownloadURL
};
