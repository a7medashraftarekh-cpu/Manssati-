import { renderHeader, renderFooter, protectPage } from "./nav.js?v=2";
import { updateUserProfile } from "./db.js?v=2";
import { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "./firebase-config.js?v=2";

renderHeader();
renderFooter();

protectPage().then((user) => {
  document.getElementById("name").value = user.name || "";
  document.getElementById("phone").value = user.phone || "";

  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profile-msg");
    try {
      await updateUserProfile(user.id, {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value
      });
      msg.className = "text-success";
      msg.textContent = "تم حفظ التعديلات بنجاح.";
      msg.style.display = "block";
    } catch {
      msg.className = "text-danger";
      msg.textContent = "حدث خطأ ما.";
      msg.style.display = "block";
    }
  });

  document.getElementById("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("password-msg");
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;

    try {
      const fbUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
      msg.className = "text-success";
      msg.textContent = "تم تغيير كلمة المرور بنجاح.";
      msg.style.display = "block";
      document.getElementById("password-form").reset();
    } catch (err) {
      msg.className = "text-danger";
      msg.textContent = err?.code?.includes("wrong-password") || err?.code?.includes("invalid-credential")
        ? "كلمة المرور الحالية غير صحيحة."
        : "حدث خطأ أثناء تغيير كلمة المرور.";
      msg.style.display = "block";
    }
  });
});
