import { renderHeader, renderFooter } from "./nav.js?v=2";
import { auth, signInWithEmailAndPassword } from "./firebase-config.js?v=2";

renderHeader();
renderFooter();

const form = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "جارٍ الدخول...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.href = "dashboard.html";
  } catch {
    errorMsg.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    errorMsg.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "دخول";
  }
});
