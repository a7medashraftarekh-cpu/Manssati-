import { renderHeader, renderFooter, watchAuth } from "./nav.js";
import { listUnits, listLessonsByUnit } from "./db.js";
import { db, collection, getDocs } from "./firebase-config.js";

renderHeader();
renderFooter();
watchAuth(() => {});

async function init() {
  const units = await listUnits({ onlyPublished: true });
  const preview = units.slice(0, 6);

  document.getElementById("stat-units").textContent = units.length;

  const usersSnap = await getDocs(collection(db, "users"));
  document.getElementById("stat-students").textContent = usersSnap.docs.filter((d) => d.data().role === "STUDENT").length;

  const lessonsSnap = await getDocs(collection(db, "lessons"));
  document.getElementById("stat-lessons").textContent = lessonsSnap.size;

  const container = document.getElementById("units-preview");
  if (preview.length === 0) {
    container.innerHTML = `<p class="text-muted">لا توجد وحدات متاحة حاليًا.</p>`;
    return;
  }

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

init();
