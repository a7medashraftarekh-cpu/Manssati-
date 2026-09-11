import { renderHeader, renderFooter } from "./nav.js";
import { auth, verifyPasswordResetCode, confirmPasswordReset } from "./firebase-config.js";

renderHeader();
renderFooter();

const params = new URLSearchParams(location.search);
const oobCode = params.get("oobCode");

const form = document.getElementById("reset-form");
const errorMsg = document.getElementById("error-msg");
const submitBtn = document.getElementById("submit-btn");

if (!oobCode) {
  document.getElementById("card").innerHTML = `<p class="text-danger text-center">رابط الاستعادة غير صالح.</p>`;
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "جارٍ الحفظ...";

    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, document.getElementById("password").value);
      form.style.display = "none";
      const msg = document.getElementById("success-msg");
      msg.textContent = "تم تغيير كلمة المرور بنجاح! سيتم تحويلك لتسجيل الدخول...";
      msg.style.display = "block";
      setTimeout(() => (location.href = "login.html"), 2000);
    } catch {
      errorMsg.textContent = "رابط الاستعادة غير صالح أو منتهي الصلاحية.";
      errorMsg.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "حفظ كلمة المرور";
    }
  });
}
