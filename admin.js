import { renderHeader, renderFooter, protectPage } from "./nav.js?v=2";
import {
  listUnits, listLessonsByUnit, createUnit, updateUnit, deleteUnit,
  createLesson, updateLesson, deleteLesson, getLesson,
  listUsers, updateUserProfile, listAllOrders, listOffers, createOffer, updateOffer, deleteOffer,
  getSettings, updateSettings
} from "./db.js?v=2";
import { db, collection, getDocs } from "./firebase-config.js?v=2";
import { uploadVideoToCloudinary } from "./cloudinary-config.js?v=2";

renderHeader();
renderFooter();

let adminUser = null;

// ---------------- Tab switching ----------------
document.querySelectorAll("#admin-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    document.querySelectorAll("#admin-nav a").forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${sec}`).classList.add("active");
    loadSection(sec);
  });
});

function loadSection(sec) {
  if (sec === "dashboard") loadDashboard();
  if (sec === "users") loadUsers();
  if (sec === "units") loadUnits();
  if (sec === "lessons") loadLessons();
  if (sec === "orders") loadOrders();
  if (sec === "offers") loadOffers();
  if (sec === "settings") loadSettings();
}

// ---------------- Confirm modal helper ----------------
function confirmAction(text) {
  return new Promise((resolve) => {
    document.getElementById("confirm-text").textContent = text;
    const modal = document.getElementById("confirm-modal");
    modal.classList.add("open");
    document.getElementById("confirm-ok").onclick = () => { modal.classList.remove("open"); resolve(true); };
    document.getElementById("confirm-cancel").onclick = () => { modal.classList.remove("open"); resolve(false); };
  });
}

// ---------------- Dashboard ----------------
async function loadDashboard() {
  const [units, usersSnap, lessonsSnap, orders] = await Promise.all([
    listUnits(), getDocs(collection(db, "users")), getDocs(collection(db, "lessons")), listAllOrders()
  ]);
  const users = usersSnap.docs.map((d) => d.data());
  const students = users.filter((u) => u.role === "STUDENT").length;
  const paidOrders = orders.filter((o) => o.status === "PAID");
  const salesAllTime = paidOrders.reduce((s, o) => s + (o.total || 0), 0);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const salesToday = paidOrders.filter((o) => o.createdAt?.toDate?.() >= today).reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById("dashboard-stats").innerHTML = [
    ["👥", "إجمالي المستخدمين", users.length],
    ["🎓", "إجمالي الطلاب", students],
    ["📚", "إجمالي الوحدات", units.length],
    ["▶️", "إجمالي الدروس", lessonsSnap.size],
    ["💰", "إجمالي المبيعات", `${salesAllTime} ج.م`],
    ["📅", "مبيعات اليوم", `${salesToday} ج.م`],
    ["🧾", "إجمالي الطلبات", orders.length],
    ["✅", "طلبات ناجحة", paidOrders.length]
  ].map(([icon, label, value]) => `
    <div class="card stat-card"><div class="stat-icon">${icon}</div><div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>
  `).join("");

  // رسم بياني بسيط بدون مكتبات خارجية - أعمدة CSS لمبيعات آخر 14 يوم
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  const dayTotals = days.map((d) => {
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return paidOrders.filter((o) => { const t = o.createdAt?.toDate?.(); return t >= d && t < next; }).reduce((s, o) => s + (o.total || 0), 0);
  });
  const max = Math.max(...dayTotals, 1);
  document.getElementById("sales-chart").innerHTML = dayTotals.map((v, i) => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
      <div title="${v} ج.م" style="width:100%;background:var(--gold-500);border-radius:4px 4px 0 0;height:${(v / max) * 90 + 2}px;"></div>
      <span style="font-size:9px;color:var(--slate-400);margin-top:4px;">${days[i].getDate()}/${days[i].getMonth() + 1}</span>
    </div>`).join("");

  document.getElementById("recent-users").innerHTML = users.slice(0, 5).map((u) => `
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid var(--slate-100);">
      <span>${u.name}</span><span class="text-muted">${u.createdAt?.toDate?.().toLocaleDateString("ar-EG") || ""}</span>
    </div>`).join("") || `<p class="text-muted">لا يوجد مستخدمون بعد.</p>`;

  document.getElementById("recent-orders").innerHTML = orders.slice(0, 5).map((o) => `
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid var(--slate-100);">
      <span>${o.userId.slice(0, 8)}</span><span style="font-weight:700;">${o.total} ج.م</span>
    </div>`).join("") || `<p class="text-muted">لا توجد طلبات بعد.</p>`;
}

// ---------------- Users ----------------
let allUsers = [];
async function loadUsers() {
  allUsers = await listUsers();
  renderUsers(allUsers);
  document.getElementById("users-search").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderUsers(allUsers.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)));
  };
}

function renderUsers(users) {
  document.getElementById("users-body").innerHTML = users.map((u) => `
    <tr>
      <td>${u.name}</td><td>${u.email}</td>
      <td>${u.role === "ADMIN" ? "أدمن" : "طالب"}</td>
      <td><span class="badge ${u.status === "ACTIVE" ? "badge-success" : "badge-danger"}">${u.status === "ACTIVE" ? "مفعّل" : "معطّل"}</span></td>
      <td>
        <button class="btn btn-outline btn-sm toggle-status" data-id="${u.id}" data-status="${u.status}">${u.status === "ACTIVE" ? "تعطيل" : "تفعيل"}</button>
        <button class="btn btn-outline btn-sm toggle-role" data-id="${u.id}" data-role="${u.role}">${u.role === "ADMIN" ? "خفض لطالب" : "ترقية لأدمن"}</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted">لا يوجد مستخدمون.</td></tr>`;

  document.querySelectorAll(".toggle-status").forEach((btn) => btn.addEventListener("click", async () => {
    await updateUserProfile(btn.dataset.id, { status: btn.dataset.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
    loadUsers();
  }));
  document.querySelectorAll(".toggle-role").forEach((btn) => btn.addEventListener("click", async () => {
    if (btn.dataset.id === adminUser.id) { alert("لا يمكنك تغيير دورك الخاص."); return; }
    await updateUserProfile(btn.dataset.id, { role: btn.dataset.role === "ADMIN" ? "STUDENT" : "ADMIN" });
    loadUsers();
  }));
}

// ---------------- Units ----------------
async function loadUnits() {
  const units = await listUnits();
  const withCounts = await Promise.all(units.map(async (u) => ({ ...u, lessonsCount: (await listLessonsByUnit(u.id)).length })));

  document.getElementById("units-body").innerHTML = withCounts.map((u) => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div>
        <p style="font-weight:700;color:var(--brand-900);">${u.title}</p>
        <p class="text-muted" style="font-size:12px;">${u.lessonsCount} حصة · /${u.slug} ${!u.isPublished ? "· <span class='badge badge-muted'>غير منشورة</span>" : ""}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:700;color:var(--brand-800);">${u.isOfferActive && u.offerPrice ? u.offerPrice : u.price} ج.م</span>
        <button class="btn btn-outline btn-sm edit-unit" data-slug="${u.slug}">✎ تعديل</button>
        <button class="btn btn-outline btn-sm delete-unit" data-slug="${u.slug}">🗑 حذف</button>
      </div>
    </div>`).join("") || `<p class="text-muted">لا توجد وحدات بعد.</p>`;

  document.querySelectorAll(".edit-unit").forEach((btn) => btn.addEventListener("click", () => {
    const unit = withCounts.find((u) => u.slug === btn.dataset.slug);
    showUnitForm(unit);
  }));
  document.querySelectorAll(".delete-unit").forEach((btn) => btn.addEventListener("click", async () => {
    if (await confirmAction("سيتم حذف الوحدة وكل الدروس التابعة لها. هل أنت متأكد؟")) {
      await deleteUnit(btn.dataset.slug);
      loadUnits();
    }
  }));
}

document.getElementById("add-unit-btn").addEventListener("click", () => showUnitForm(null));

function showUnitForm(unit) {
  const wrap = document.getElementById("unit-form-wrap");
  wrap.style.display = "block";
  wrap.innerHTML = `
    <form id="unit-form" class="card">
      <h3 style="color:var(--brand-900);margin-bottom:12px;">${unit ? "تعديل الوحدة" : "إضافة وحدة جديدة"}</h3>
      <div class="field"><label>اسم الوحدة</label><input type="text" id="u-title" required value="${unit?.title || ""}"></div>
      <div class="field"><label>الرابط (slug) - إنجليزي فقط</label><input type="text" id="u-slug" required value="${unit?.slug || ""}" ${unit ? "readonly style='background:var(--slate-100);'" : ""}></div>
      <div class="field"><label>الوصف</label><textarea id="u-desc" rows="3" required>${unit?.description || ""}</textarea></div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>السعر</label><input type="number" step="0.01" id="u-price" required value="${unit?.price ?? ""}"></div>
        <div class="field" style="flex:1;"><label>سعر العرض</label><input type="number" step="0.01" id="u-offer" value="${unit?.offerPrice ?? ""}"></div>
      </div>
      <label><input type="checkbox" id="u-offer-active" style="width:auto;display:inline;" ${unit?.isOfferActive ? "checked" : ""}> تفعيل العرض</label>
      <label><input type="checkbox" id="u-published" style="width:auto;display:inline;" ${unit?.isPublished !== false ? "checked" : ""}> منشورة</label>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="submit" class="btn btn-gold">${unit ? "حفظ التعديلات" : "إنشاء"}</button>
        <button type="button" class="btn btn-outline" id="cancel-unit-form">إلغاء</button>
      </div>
    </form>`;

  document.getElementById("cancel-unit-form").addEventListener("click", () => { wrap.style.display = "none"; wrap.innerHTML = ""; });

  document.getElementById("unit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById("u-title").value,
      description: document.getElementById("u-desc").value,
      price: Number(document.getElementById("u-price").value),
      offerPrice: document.getElementById("u-offer").value ? Number(document.getElementById("u-offer").value) : null,
      isOfferActive: document.getElementById("u-offer-active").checked,
      isPublished: document.getElementById("u-published").checked
    };
    const slug = document.getElementById("u-slug").value;
    if (unit) await updateUnit(slug, data);
    else await createUnit(slug, { ...data, order: (await listUnits()).length });
    wrap.style.display = "none"; wrap.innerHTML = "";
    loadUnits();
  });
}

// ---------------- Lessons ----------------
async function loadLessons() {
  const units = await listUnits();
  const withLessons = await Promise.all(units.map(async (u) => ({ ...u, lessons: await listLessonsByUnit(u.id) })));

  document.getElementById("lessons-body").innerHTML = withLessons.map((u) => `
    <h3 style="color:var(--brand-900);margin:16px 0 8px;">${u.title}</h3>
    ${u.lessons.length === 0 ? `<p class="text-muted" style="font-size:13px;">لا توجد دروس بعد.</p>` : u.lessons.map((l) => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:26px;height:26px;border-radius:50%;background:var(--brand-800);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${l.number}</span>
          <div><p style="font-weight:600;font-size:14px;">${l.title}</p><p class="text-muted" style="font-size:11px;">${Math.round(l.durationSec / 60)} دقيقة</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${l.isFree ? '<span class="badge">مجانية</span>' : ""}
          <span style="font-weight:700;font-size:13px;">${l.isOfferActive && l.offerPrice ? l.offerPrice : l.price} ج.م</span>
          <button class="btn btn-outline btn-sm edit-lesson" data-id="${l.id}">✎</button>
          <button class="btn btn-outline btn-sm delete-lesson" data-id="${l.id}">🗑</button>
        </div>
      </div>`).join("")}
  `).join("");

  document.querySelectorAll(".edit-lesson").forEach((btn) => btn.addEventListener("click", async () => {
    const lesson = await getLesson(btn.dataset.id);
    showLessonForm(lesson, units);
  }));
  document.querySelectorAll(".delete-lesson").forEach((btn) => btn.addEventListener("click", async () => {
    if (await confirmAction("سيتم حذف هذه الحصة نهائيًا. هل أنت متأكد؟")) {
      await deleteLesson(btn.dataset.id);
      loadLessons();
    }
  }));
}

document.getElementById("add-lesson-btn").addEventListener("click", async () => {
  const units = await listUnits();
  showLessonForm(null, units);
});

function showLessonForm(lesson, units) {
  const wrap = document.getElementById("lesson-form-wrap");
  wrap.style.display = "block";
  wrap.innerHTML = `
    <form id="lesson-form" class="card">
      <h3 style="color:var(--brand-900);margin-bottom:12px;">${lesson ? "تعديل الحصة" : "إضافة حصة جديدة"}</h3>
      <div class="field"><label>الوحدة</label>
        <select id="l-unit" required>${units.map((u) => `<option value="${u.id}" ${lesson?.unitId === u.id ? "selected" : ""}>${u.title}</option>`).join("")}</select>
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>اسم الحصة</label><input type="text" id="l-title" required value="${lesson?.title || ""}"></div>
        <div class="field" style="width:100px;"><label>الرقم</label><input type="number" id="l-number" required value="${lesson?.number ?? ""}"></div>
      </div>
      <div class="field"><label>الوصف</label><textarea id="l-desc" rows="2" required>${lesson?.description || ""}</textarea></div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>المدة (ثانية)</label><input type="number" id="l-duration" required value="${lesson?.durationSec ?? 0}"></div>
      </div>
      <div class="field">
        <label>فيديو الحصة</label>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <input type="file" id="l-video-file" accept="video/*" style="margin-bottom:0;">
          <button type="button" class="btn btn-outline btn-sm" id="l-video-upload-btn">رفع الملف</button>
        </div>
        <p class="text-muted" style="font-size:12px;margin-bottom:8px;" id="l-video-upload-status"></p>
        <input type="text" id="l-video" placeholder="سيُملأ تلقائيًا بعد الرفع، أو الصق رابط يوتيوب/فيديو مباشر" value="${lesson?.videoId || ""}">
      </div>
      <div style="display:flex;gap:12px;">
        <div class="field" style="flex:1;"><label>السعر</label><input type="number" step="0.01" id="l-price" required value="${lesson?.price ?? ""}"></div>
        <div class="field" style="flex:1;"><label>سعر العرض</label><input type="number" step="0.01" id="l-offer" value="${lesson?.offerPrice ?? ""}"></div>
      </div>
      <label><input type="checkbox" id="l-offer-active" style="width:auto;display:inline;" ${lesson?.isOfferActive ? "checked" : ""}> تفعيل العرض</label>
      <label><input type="checkbox" id="l-free" style="width:auto;display:inline;" ${lesson?.isFree ? "checked" : ""}> حصة مجانية</label>
      <label><input type="checkbox" id="l-published" style="width:auto;display:inline;" ${lesson?.isPublished !== false ? "checked" : ""}> منشورة</label>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="submit" class="btn btn-gold">${lesson ? "حفظ التعديلات" : "إنشاء"}</button>
        <button type="button" class="btn btn-outline" id="cancel-lesson-form">إلغاء</button>
      </div>
    </form>`;

  document.getElementById("cancel-lesson-form").addEventListener("click", () => { wrap.style.display = "none"; wrap.innerHTML = ""; });

  document.getElementById("l-video-upload-btn").addEventListener("click", async () => {
    const fileInput = document.getElementById("l-video-file");
    const status = document.getElementById("l-video-upload-status");
    const file = fileInput.files[0];
    if (!file) { status.className = "text-danger"; status.textContent = "اختر ملف فيديو أولًا."; return; }

    status.className = "text-muted";
    status.textContent = "جارٍ الرفع... 0%";
    try {
      const url = await uploadVideoToCloudinary(file, (pct) => { status.textContent = `جارٍ الرفع... ${pct}%`; });
      document.getElementById("l-video").value = url;
      status.className = "text-success";
      status.textContent = "✔ تم الرفع بنجاح.";
    } catch (err) {
      status.className = "text-danger";
      status.textContent = err.message || "فشل الرفع.";
    }
  });

  document.getElementById("lesson-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      unitId: document.getElementById("l-unit").value,
      title: document.getElementById("l-title").value,
      number: Number(document.getElementById("l-number").value),
      description: document.getElementById("l-desc").value,
      durationSec: Number(document.getElementById("l-duration").value),
      videoId: document.getElementById("l-video").value || null,
      videoProvider: "url",
      price: Number(document.getElementById("l-price").value),
      offerPrice: document.getElementById("l-offer").value ? Number(document.getElementById("l-offer").value) : null,
      isOfferActive: document.getElementById("l-offer-active").checked,
      isFree: document.getElementById("l-free").checked,
      isPublished: document.getElementById("l-published").checked
    };
    if (lesson) await updateLesson(lesson.id, data);
    else await createLesson({ ...data, order: (await listLessonsByUnit(data.unitId)).length });
    wrap.style.display = "none"; wrap.innerHTML = "";
    loadLessons();
  });
}

// ---------------- Orders ----------------
let allOrders = [];
async function loadOrders() {
  allOrders = await listAllOrders();
  renderOrders(allOrders);
  const filterFn = () => {
    const q = document.getElementById("orders-search").value.toLowerCase();
    const status = document.getElementById("orders-status-filter").value;
    renderOrders(allOrders.filter((o) => (status === "ALL" || o.status === status) && o.userId.toLowerCase().includes(q)));
  };
  document.getElementById("orders-search").oninput = filterFn;
  document.getElementById("orders-status-filter").onchange = filterFn;
}

const orderStatusLabel = { PENDING: "قيد الانتظار", PAID: "مدفوع", FAILED: "فشل", CANCELLED: "ملغي" };
function renderOrders(orders) {
  document.getElementById("orders-body").innerHTML = orders.map((o) => `
    <tr>
      <td>${o.id.slice(0, 8)}</td><td>${o.userId.slice(0, 8)}</td><td>${o.total} ج.م</td>
      <td><span class="badge ${o.status === "PAID" ? "badge-success" : o.status === "FAILED" ? "badge-danger" : ""}">${orderStatusLabel[o.status] || o.status}</span></td>
      <td>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("ar-EG") : "-"}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted">لا توجد طلبات.</td></tr>`;
}

// ---------------- Offers ----------------
async function loadOffers() {
  const offers = await listOffers();
  const typeLabel = { PERCENTAGE: "نسبة خصم %", FIXED: "خصم ثابت", BUNDLE: "حزمة" };

  document.getElementById("offers-body").innerHTML = offers.map((o) => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div><p style="font-weight:700;color:var(--brand-900);">${o.title}</p><p class="text-muted" style="font-size:12px;">${typeLabel[o.type]} · ${o.value}${o.type === "PERCENTAGE" ? "%" : " ج.م"}</p></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge ${o.isActive ? "badge-success" : "badge-muted"}">${o.isActive ? "نشط" : "متوقف"}</span>
        <button class="btn btn-outline btn-sm edit-offer" data-id="${o.id}">✎</button>
        <button class="btn btn-outline btn-sm delete-offer" data-id="${o.id}">🗑</button>
      </div>
    </div>`).join("") || `<p class="text-muted">لا توجد عروض بعد.</p>`;

  document.querySelectorAll(".edit-offer").forEach((btn) => btn.addEventListener("click", () => {
    showOfferForm(offers.find((o) => o.id === btn.dataset.id));
  }));
  document.querySelectorAll(".delete-offer").forEach((btn) => btn.addEventListener("click", async () => {
    if (await confirmAction("سيتم حذف هذا العرض. هل أنت متأكد؟")) { await deleteOffer(btn.dataset.id); loadOffers(); }
  }));
}

document.getElementById("add-offer-btn").addEventListener("click", () => showOfferForm(null));

function showOfferForm(offer) {
  const wrap = document.getElementById("offer-form-wrap");
  wrap.style.display = "block";
  wrap.innerHTML = `
    <form id="offer-form" class="card">
      <h3 style="color:var(--brand-900);margin-bottom:12px;">${offer ? "تعديل العرض" : "إضافة عرض جديد"}</h3>
      <div class="field"><label>عنوان العرض</label><input type="text" id="o-title" required value="${offer?.title || ""}"></div>
      <div class="field"><label>النوع</label>
        <select id="o-type">
          <option value="PERCENTAGE" ${offer?.type === "PERCENTAGE" ? "selected" : ""}>نسبة خصم %</option>
          <option value="FIXED" ${offer?.type === "FIXED" ? "selected" : ""}>خصم ثابت</option>
          <option value="BUNDLE" ${offer?.type === "BUNDLE" ? "selected" : ""}>حزمة (Bundle)</option>
        </select>
      </div>
      <div class="field"><label>القيمة</label><input type="number" step="0.01" id="o-value" required value="${offer?.value ?? ""}"></div>
      <label><input type="checkbox" id="o-active" style="width:auto;display:inline;" ${offer?.isActive !== false ? "checked" : ""}> تفعيل العرض</label>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="submit" class="btn btn-gold">${offer ? "حفظ التعديلات" : "إنشاء"}</button>
        <button type="button" class="btn btn-outline" id="cancel-offer-form">إلغاء</button>
      </div>
    </form>`;

  document.getElementById("cancel-offer-form").addEventListener("click", () => { wrap.style.display = "none"; wrap.innerHTML = ""; });

  document.getElementById("offer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById("o-title").value,
      type: document.getElementById("o-type").value,
      value: Number(document.getElementById("o-value").value),
      unitIds: offer?.unitIds || [],
      isActive: document.getElementById("o-active").checked
    };
    if (offer) await updateOffer(offer.id, data);
    else await createOffer(data);
    wrap.style.display = "none"; wrap.innerHTML = "";
    loadOffers();
  });
}

// ---------------- Settings ----------------
async function loadSettings() {
  const settings = await getSettings();
  document.getElementById("s-siteName").value = settings?.siteName || "أكاديميتي";
  document.getElementById("s-logoUrl").value = settings?.logoUrl || "";
  document.getElementById("s-description").value = settings?.description || "";
  document.getElementById("s-contactEmail").value = settings?.contactEmail || "";
  document.getElementById("s-currency").value = settings?.currency || "EGP";

  document.getElementById("settings-form").onsubmit = async (e) => {
    e.preventDefault();
    await updateSettings({
      siteName: document.getElementById("s-siteName").value,
      logoUrl: document.getElementById("s-logoUrl").value,
      description: document.getElementById("s-description").value,
      contactEmail: document.getElementById("s-contactEmail").value,
      currency: document.getElementById("s-currency").value
    });
    const msg = document.getElementById("settings-msg");
    msg.className = "text-success";
    msg.textContent = "تم حفظ الإعدادات بنجاح.";
    msg.style.display = "block";
  };
}

// ---------------- Init ----------------
protectPage({ requireAdmin: true }).then((user) => {
  adminUser = user;
  loadDashboard();
});
