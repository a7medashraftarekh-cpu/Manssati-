// nav.js - يُستدعى من كل صفحة لعرض الهيدر والفوتر بشكل موحّد، ولمعرفة حالة تسجيل الدخول والدور
import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase-config.js?v=5";

/**
 * أداة تشخيص مؤقتة: أي خطأ غير متوقع (زي أخطاء Firestore Permission/Index)
 * هيظهر في شريط أحمر أعلى الصفحة بدل ما يختفي في الـ Console فقط - عشان
 * تقدر تاخد سكرين شوت للرسالة الحقيقية بسهولة من الموبايل بدون أدوات مطوّرين.
 */
/**
 * أداة تشخيص مؤقتة: أي خطأ غير متوقع (زي أخطاء Firestore Permission/Index)
 * هيظهر في شريط أحمر أعلى الصفحة - لكن فقط لو الرابط فيه ?debug=1، عشان
 * الطلاب والزوار العاديين ميشوفوش أي رسائل تقنية أبدًا. لو عايز تشوف الأخطاء
 * وقت الاختبار، افتح أي صفحة وضيف ?debug=1 في آخر الرابط.
 */
const debugMode = new URLSearchParams(location.search).get("debug") === "1";

function showErrorBanner(message) {
  if (!debugMode) return;
  if (document.getElementById("debug-error-banner")) return; // بنر واحد بس في المرة
  const banner = document.createElement("div");
  banner.id = "debug-error-banner";
  banner.style.cssText = "position:fixed;top:0;right:0;left:0;z-index:9999;background:#d94848;color:#fff;padding:12px 16px;font-size:12px;line-height:1.6;direction:ltr;text-align:left;word-break:break-all;max-height:40vh;overflow-y:auto;";
  banner.innerHTML = `<b>خطأ (Debug):</b> ${message}`;
  document.body.prepend(banner);
}

window.addEventListener("error", (e) => {
  const location = e.filename ? ` [${e.filename.split("/").pop()}:${e.lineno}]` : "";
  showErrorBanner((e.message || String(e)) + location);
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message || e.reason?.code || String(e.reason);
  // نطبع أول 3 أسطر من الـ stack trace - بتوضح غالبًا اسم الدالة والملف اللي سبب المشكلة
  const stackLines = (e.reason?.stack || "").split("\n").slice(0, 3).join(" | ");
  showErrorBanner(`${msg}<br><span style="opacity:.8;font-size:10px;">${stackLines}</span>`);
});


export function renderHeader() {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="nav-row">
      <a href="index.html" class="brand">🎓 <span id="site-name">أكاديميتي</span></a>
      <nav class="nav-links">
        <a href="index.html">الرئيسية</a>
        <a href="units.html">الوحدات</a>
      </nav>
      <div class="nav-actions" id="nav-actions"></div>
      <button class="mobile-toggle" id="mobile-toggle">☰</button>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      <a href="index.html">الرئيسية</a>
      <a href="units.html">الوحدات</a>
      <div id="mobile-nav-actions"></div>
    </div>
  `;
  document.body.prepend(header);

  document.getElementById("mobile-toggle").addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.toggle("open");
  });

  return header;
}

export function renderFooter() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-grid">
      <div>
        <h3 style="color:#fff;margin-bottom:10px;" id="footer-site-name">أكاديميتي</h3>
        <p style="font-size:14px;color:#94a3b8;" id="footer-desc">منصة تعليمية عربية حديثة تساعدك على التعلم بخطوات واضحة ومنظمة.</p>
      </div>
      <div>
        <h4 style="color:#fff;margin-bottom:10px;">روابط سريعة</h4>
        <ul id="footer-quick-links" style="font-size:14px;display:flex;flex-direction:column;gap:8px;">
          <li><a href="units.html">الوحدات</a></li>
          <li><a href="login.html">تسجيل الدخول</a></li>
          <li><a href="register.html">إنشاء حساب</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:#fff;margin-bottom:10px;">تواصل معنا</h4>
        <p style="font-size:14px;margin-bottom:6px;" id="footer-contact">ahmed.and.hasan0@gmail.com</p>
        <p style="font-size:14px;margin-bottom:6px;color:#94a3b8;">01080343968</p>
        <p style="font-size:13px;color:#94a3b8;margin-top:10px;direction:ltr;text-align:right;">
          Designed &amp; Developed by
          <a href="https://eng-a7med-ashraf.vercel.app/" target="_blank" rel="noreferrer" style="color:#dcae4c;font-weight:700;">ENG A7MED ASHRAF</a>
        </p>
      </div>
    </div>
    <div class="footer-bottom">© <span id="footer-year"></span> أكاديميتي. جميع الحقوق محفوظة.</div>
  `;
  document.body.appendChild(footer);
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  return footer;
}

/**
 * يستمع لحالة تسجيل الدخول، يجلب ملف تعريف المستخدم من Firestore (بما فيه الدور)،
 * ويحدّث أزرار الهيدر تلقائيًا. callback(userProfile|null) تُستدعى عند كل تغيير.
 */
export function watchAuth(callback) {
  onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      updateNavActions(null);
      callback(null);
      return;
    }
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    const profile = snap.exists() ? { id: fbUser.uid, ...snap.data() } : null;
    updateNavActions(profile);
    callback(profile);
  });
}

function updateNavActions(profile) {
  const desktop = document.getElementById("nav-actions");
  const mobile = document.getElementById("mobile-nav-actions");
  const footerLinks = document.getElementById("footer-quick-links");

  let html;
  if (profile) {
    html = `
      ${profile.role === "ADMIN" ? '<a href="admin.html" class="btn btn-outline btn-sm">لوحة الأدمن</a>' : ""}
      <a href="dashboard.html" class="btn btn-outline btn-sm">لوحتي</a>
      <button class="btn btn-primary btn-sm" id="logout-btn">تسجيل الخروج</button>
    `;
  } else {
    html = `
      <a href="login.html" class="btn btn-outline btn-sm">تسجيل الدخول</a>
      <a href="register.html" class="btn btn-gold btn-sm">ابدأ الآن</a>
    `;
  }

  if (desktop) desktop.innerHTML = html;
  if (mobile) mobile.innerHTML = html;

  if (footerLinks) {
    footerLinks.innerHTML = profile
      ? `<li><a href="units.html">الوحدات</a></li><li><a href="dashboard.html">لوحتي</a></li>${
          profile.role === "ADMIN" ? '<li><a href="admin.html">لوحة الأدمن</a></li>' : ""
        }`
      : `<li><a href="units.html">الوحدات</a></li><li><a href="login.html">تسجيل الدخول</a></li><li><a href="register.html">إنشاء حساب</a></li>`;
  }

  document.querySelectorAll("#logout-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    })
  );
}

/** يحمي صفحة بحيث لا يدخلها إلا مستخدم مسجّل (وبدور ADMIN لو requireAdmin=true) */
export function protectPage({ requireAdmin = false } = {}) {
  return new Promise((resolve) => {
    watchAuth((profile) => {
      if (!profile) {
        window.location.href = "login.html";
        return;
      }
      if (requireAdmin && profile.role !== "ADMIN") {
        window.location.href = "index.html";
        return;
      }
      resolve(profile);
    });
  });
}
