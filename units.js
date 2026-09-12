import { renderHeader, renderFooter, watchAuth } from "./nav.js?v=2";
import { listUnits, listLessonsByUnit } from "./db.js?v=2";

renderHeader();
renderFooter();
watchAuth(() => {});

async function init() {
  const units = await listUnits({ onlyPublished: true });
  const container = document.getElementById("units-list");

  if (units.length === 0) {
    container.innerHTML = `<p class="text-muted">لا توجد وحدات متاحة حاليًا.</p>`;
    return;
  }

  const cards = await Promise.all(units.map(async (u) => {
    const lessons = await listLessonsByUnit(u.id, { onlyPublished: true });
    const discountPct = u.isOfferActive && u.offerPrice ? Math.round((1 - u.offerPrice / u.price) * 100) : null;
    const priceHtml = u.isOfferActive && u.offerPrice
      ? `<span class="price-strike">${u.price} ج.م</span> <span class="price-main">${u.offerPrice} ج.م</span>`
      : `<span class="price-main">${u.price} ج.م</span>`;
    return `
      <div class="card" style="display:flex;flex-direction:column;">
        <div class="cover"></div>
        <h3 style="color:var(--brand-900);margin:6px 0;">${u.title}</h3>
        <p class="text-muted" style="font-size:14px;flex:1;">${u.description}</p>
        <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:13px;">
          <span class="text-muted">${lessons.length} حصة</span>
          ${discountPct ? `<span class="badge">خصم ${discountPct}%</span>` : ""}
        </div>
        <div style="margin-bottom:12px;">${priceHtml}</div>
        <div style="display:flex;gap:8px;">
          <a href="unit.html?slug=${u.slug}" class="btn btn-outline btn-sm" style="flex:1;">عرض الوحدة</a>
          <a href="unit.html?slug=${u.slug}" class="btn btn-gold btn-sm" style="flex:1;">شراء الوحدة</a>
        </div>
      </div>`;
  }));
  container.innerHTML = cards.join("");
}

init();
