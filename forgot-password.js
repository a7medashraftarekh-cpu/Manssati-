import { renderHeader, renderFooter } from "./nav.js?v=2";
import { auth, sendPasswordResetEmail } from "./firebase-config.js?v=2";

renderHeader();
renderFooter();

const form = document.getElementById("forgot-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "جارٍ الإرسال...";
  const email = document.getElementById("email").value;

  try {
    await sendPasswordResetEmail(auth, email, { url: `${location.origin}/reset-password.html` });
  } catch {
    // نتعمّد تجاهل الخطأ لعدم كشف إن كان البريد مسجّلًا أم لا
  }

  document.getElementById("form-wrap").style.display = "none";
  const msg = document.getElementById("success-msg");
  msg.textContent = "إذا كان هذا البريد مسجّلًا لدينا، فستصلك رسالة تحتوي رابط استعادة كلمة المرور.";
  msg.style.display = "block";
});
