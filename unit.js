import { renderHeader, renderFooter, watchAuth } from "./nav.js";
import { getUnit, listLessonsByUnit, listUserEnrollments } from "./db.js";

renderHeader();
renderFooter();

const params = new URLSearchParams(location.search);
const slug = params.get("slug");
let currentUser = null;

watchAuth((profile) => { currentUser = profile; render(); });

async function render() {
  if (!slug) return;
  const unit = await getUnit(slug);
  if (!unit) {
    document.getElementById("unit-header").innerHTML = `<p class="text-danger">هذه الوحدة غير موجودة.</p>`;
    return;
  }

  const lessons = await listLessonsByUnit(unit.id, { onlyPublished: true });

  let ownsUnit = false;
  const ownedLessonIds = new Set();
  if (currentUser) {
    const enrollments = await listUserEnrollments(currentUser.id);
    ownsUnit = enrollments.some((e) => e.unitId === unit.id);
    enrollments.forEach((e) => e.lessonId && ownedLessonIds.add(e.lessonId));
  }

  const priceHtml = unit.isOfferActive && unit.offerPrice
    ? `<span class="price-strike">${unit.price} ج.م</span> <span class="price-main" style="font-size:20px;">${unit.offerPrice} ج.م</span>`
    : `<span class="price-main" style="font-size:20px;">${unit.price} ج.م</span>`;

  document.getElementById("unit-header").innerHTML = `
    <h1 style="color:var(--brand-900);">${unit.title}</h1>
    <p class="text-muted">${unit.description}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px;">
      <span class="text-muted">${lessons.length} حصة</span>
      <div style="display:flex;align-items:center;gap:10px;">
        ${priceHtml}
        ${!ownsUnit ? `<button class="btn btn-gold btn-sm" id="buy-unit-btn">شراء الآن</button>` : `<span class="badge badge-success">مملوكة</span>`}
      </div>
    </div>
  `;

  if (!ownsUnit) {
    document.getElementById("buy-unit-btn").addEventListener("click", () => {
      if (!currentUser) { location.href = "login.html"; return; }
      location.href = `checkout.html?type=UNIT&unitId=${unit.id}`;
    });
  }

  document.getElementById("lessons-list").innerHTML = lessons.map((lesson) => {
    const unlocked = lesson.isFree || ownsUnit || ownedLessonIds.has(lesson.id);
    return `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="width:32px;height:32px;border-radius:50%;background:var(--brand-800);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${lesson.number}</span>
          <div>
            <div style="font-weight:700;color:var(--brand-900);">${lesson.title}</div>
            <div class="text-muted" style="font-size:12px;">${Math.round(lesson.durationSec / 60)} دقيقة</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${lesson.isFree ? '<span class="badge">مجانية</span>' : ""}
          ${unlocked
            ? `<a href="lesson.html?id=${lesson.id}" class="btn btn-outline btn-sm">▶ مشاهدة</a>`
            : `<span class="text-muted" style="font-size:13px;">🔒 مقفولة</span>`}
        </div>
      </div>`;
  }).join("");
}
