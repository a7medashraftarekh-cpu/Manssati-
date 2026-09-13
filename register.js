import { renderHeader, renderFooter } from "./nav.js?v=4";
import { auth, createUserWithEmailAndPassword, updateProfile, db, doc, setDoc, serverTimestamp } from "./firebase-config.js?v=4";

renderHeader();
renderFooter();

const form = document.getElementById("register-form");
const errorMsg = document.getElementById("error-msg");
const submitBtn = document.getElementById("submit-btn");

function friendlyError(code) {
  if (code.includes("email-already-in-use")) return "هذا البريد الإلكتروني مستخدم من قبل.";
  if (code.includes("weak-password")) return "كلمة المرور ضعيفة جدًا (8 أحرف على الأقل).";
  if (code.includes("invalid-email")) return "بريد إلكتروني غير صحيح.";
  return "حدث خطأ ما، حاول مرة أخرى.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "جارٍ الإنشاء...";

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // ملف التعريف في Firestore - قواعد الحماية (firestore.rules) تفرض role=STUDENT و status=ACTIVE دائمًا هنا
    await setDoc(doc(db, "users", cred.user.uid), {
      name, email: email.toLowerCase().trim(), role: "STUDENT", status: "ACTIVE",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });

    location.href = "dashboard.html";
  } catch (err) {
    errorMsg.textContent = friendlyError(err?.code || "");
    errorMsg.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "إنشاء الحساب";
  }
});
