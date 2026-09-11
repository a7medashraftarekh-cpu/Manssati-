// nav.js - يُستدعى من كل صفحة لعرض الهيدر والفوتر بشكل موحّد، ولمعرفة حالة تسجيل الدخول والدور
import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase-config.js";

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
        <ul style="font-size:14px;display:flex;flex-direction:column;gap:8px;">
          <li><a href="units.html">الوحدات</a></li>
          <li><a href="login.html">تسجيل الدخول</a></li>
          <li><a href="register.html">إنشاء حساب</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:#fff;margin-bottom:10px;">تواصل معنا</h4>
        <p style="font-size:14px;" id="footer-contact">support@example.com</p>
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
  if (!desktop) return;

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
  desktop.innerHTML = html;
  if (mobile) mobile.innerHTML = html;

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
