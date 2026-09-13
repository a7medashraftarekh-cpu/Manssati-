// db.js - دوال مساعدة موحّدة للتعامل مع Firestore من كل صفحات الموقع
import {
  db, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "./firebase-config.js?v=4";

// ---------- Units ----------
export async function listUnits({ onlyPublished = false } = {}) {
  // مهم: القواعد الأمنية (firestore.rules) بتشترط isPublished==true صراحة.
  // Firestore لا يقبل جلب كل المستندات ثم الفلترة في الكود لاحقًا - لازم يكون
  // شرط الفلترة موجود في الاستعلام (Query) نفسه، وإلا يُرفض الطلب بالكامل.
  const constraints = onlyPublished
    ? [where("isPublished", "==", true), orderBy("order", "asc")]
    : [orderBy("order", "asc")];
  const snap = await getDocs(query(collection(db, "units"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUnit(slug) {
  const snap = await getDoc(doc(db, "units", slug));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUnit(slug, data) {
  await setDoc(doc(db, "units", slug), { ...data, slug, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateUnit(slug, data) {
  await updateDoc(doc(db, "units", slug), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteUnit(slug) {
  await deleteDoc(doc(db, "units", slug));
}

// ---------- Lessons ----------
export async function listLessonsByUnit(unitId, { onlyPublished = false } = {}) {
  // نفس الملاحظة: شرط isPublished لازم يكون داخل الاستعلام نفسه لو onlyPublished=true
  const constraints = onlyPublished
    ? [where("unitId", "==", unitId), where("isPublished", "==", true), orderBy("order", "asc")]
    : [where("unitId", "==", unitId), orderBy("order", "asc")];
  const snap = await getDocs(query(collection(db, "lessons"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLesson(id) {
  const snap = await getDoc(doc(db, "lessons", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createLesson(data) {
  const ref = await addDoc(collection(db, "lessons"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateLesson(id, data) {
  await updateDoc(doc(db, "lessons", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteLesson(id) {
  await deleteDoc(doc(db, "lessons", id));
}

// ---------- Enrollments (صلاحية الوصول) ----------
function enrollmentId(userId, unitId, lessonId) {
  return `${userId}__${unitId || "x"}__${lessonId || "x"}`;
}

export async function grantEnrollment({ userId, unitId, lessonId, orderId }) {
  const id = enrollmentId(userId, unitId, lessonId);
  await setDoc(doc(db, "enrollments", id), {
    userId, unitId: unitId || null, lessonId: lessonId || null, orderId: orderId || null,
    grantedAt: serverTimestamp()
  });
}

export async function listUserEnrollments(userId) {
  const snap = await getDocs(query(collection(db, "enrollments"), where("userId", "==", userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function userHasAccessToLesson(userId, unitId, lessonId) {
  const enrollments = await listUserEnrollments(userId);
  return enrollments.some((e) => e.unitId === unitId || e.lessonId === lessonId);
}

// ---------- Orders ----------
export async function createOrder(data) {
  const ref = await addDoc(collection(db, "orders"), {
    ...data, status: "PENDING", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function getOrder(id) {
  const snap = await getDoc(doc(db, "orders", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function markOrderPaid(id) {
  await updateDoc(doc(db, "orders", id), { status: "PAID", updatedAt: serverTimestamp() });
}

export async function listOrdersByUser(userId) {
  const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", userId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllOrders() {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Progress ----------
export async function markLessonCompleted(userId, lessonId) {
  await setDoc(doc(db, "progress", `${userId}_${lessonId}`), {
    userId, lessonId, isCompleted: true, lastWatchedAt: serverTimestamp()
  });
}

export async function getProgress(userId, lessonId) {
  const snap = await getDoc(doc(db, "progress", `${userId}_${lessonId}`));
  return snap.exists() ? snap.data() : null;
}

export async function listUserProgress(userId) {
  const snap = await getDocs(query(collection(db, "progress"), where("userId", "==", userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Offers ----------
export async function listOffers() {
  const snap = await getDocs(query(collection(db, "offers"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createOffer(data) {
  await addDoc(collection(db, "offers"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateOffer(id, data) {
  await updateDoc(doc(db, "offers", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteOffer(id) {
  await deleteDoc(doc(db, "offers", id));
}

// ---------- Settings (Singleton) ----------
export async function getSettings() {
  const snap = await getDoc(doc(db, "settings", "settings"));
  return snap.exists() ? snap.data() : null;
}

export async function updateSettings(data) {
  await setDoc(doc(db, "settings", "settings"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ---------- Users ----------
export async function listUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
}
