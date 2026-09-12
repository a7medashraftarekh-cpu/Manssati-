import { renderHeader, renderFooter, watchAuth } from "./nav.js?v=3";
import { listUnits, listLessonsByUnit } from "./db.js?v=3";
import { db, collection, getDocs } from "./firebase-config.js?v=3";

renderHeader();
renderFooter();
watchAuth(() => {});

async function init() {
  // ---- الوحدات (أهم جزء - يتنفذ أولًا ومستقل عن أي حاجة تانية) ----
  const units = await listUnits({ onlyPublished: true });
  const preview = units.slice(0, 6);
  document.getElementById("stat-units").textContent = units.length;

  const container = document.getElementById("units-preview");
  if (preview.length === 0) {
    container.innerHTML = `<p class="text-muted">لا توجد وحدات متاحة حاليًا.</p>`;
  } else {
    const cards = await Promise.all(preview.map(async (u) => {
      const lessons = await listLessonsByUnit(u.id, { onlyPublished: true });
      const priceHtml = u.isOfferActive && u.offerPrice
        ? `<span class="price-strike">${u.price} ج.م</span> <span class="price-main">${u.offerPrice} ج.م</span>`
        : `<span class="price-main">${u.price} ج.م</span>`;
      return `
        <a href="unit.html?slug=${u.slug}" class="card">
          <div class="cover"></div>
          <h3 style="color:var(--brand-900);margin:6px 0;">${u.title}</h3>
          <p class="text-muted" style="font-size:14px;">${u.description}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <span class="text-muted" style="font-size:13px;">${lessons.length} حصة</span>
            <span>${priceHtml}</span>
          </div>
        </a>`;
    }));
    container.innerHTML = cards.join("");
  }

  // ---- إحصائية عدد الطلاب (اختيارية) ----
  // ملاحظة: قواعد الحماية (firestore.rules) بتسمح بقراءة كل مستخدمي المنصة
  // للأدمن فقط لأسباب أمنية، فأي زائر/طالب عادي هيترفض الاستعلام ده تلقائيًا.
  // بنلفّه بـ try/catch عشان الرفض ده ميوقفش باقي الصفحة (زي ما كان بيحصل قبل كده).
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    document.getElementById("stat-students").textContent =
      usersSnap.docs.filter((d) => d.data().role === "STUDENT").length;
  } catch {
    document.getElementById("stat-students").closest(".card").style.display = "none";
  }

  // ---- إحصائية عدد الدروس (اختيارية) ----
  try {
    const lessonsSnap = await getDocs(collection(db, "lessons"));
    document.getElementById("stat-lessons").textContent = lessonsSnap.size;
  } catch {
    document.getElementById("stat-lessons").textContent = "-";
  }
}

init();
