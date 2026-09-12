import { renderHeader, renderFooter, protectPage } from "./nav.js";
import { listUserEnrollments, getUnit, listLessonsByUnit, listOrdersByUser, listUserProgress, getLesson } from "./db.js";

renderHeader();
renderFooter();

const statusLabel = { PENDING: "قيد الانتظار", PAID: "مدفوع", FAILED: "فشل", CANCELLED: "ملغي" };
const statusClass = { PENDING: "badge", PAID: "badge badge-success", FAILED: "badge badge-danger", CANCELLED: "badge badge-muted" };

protectPage().then(async (user) => {
  const [enrollments, orders, progress] = await Promise.all([
    listUserEnrollments(user.id),
    listOrdersByUser(user.id),
    listUserProgress(user.id)
  ]);

  // آخر درس شاهده
  const lastProgress = progress.sort((a, b) => (b.lastWatchedAt?.seconds || 0) - (a.lastWatchedAt?.seconds || 0))[0];
  if (lastProgress) {
    const lesson = await getLesson(lastProgress.lessonId);
    if (lesson) {
      document.getElementById("last-watched").innerHTML = `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div><p class="text-muted" style="font-size:13px;">آخر درس شاهدته</p><p style="font-weight:700;color:var(--brand-900);">${lesson.title}</p></div>
          <a href="lesson.html?id=${lesson.id}" class="btn btn-primary btn-sm">متابعة المشاهدة</a>
        </div>`;
    }
  }

  // وحداتي
  const unitEnrollments = enrollments.filter((e) => e.unitId && !e.lessonId);
  const unitsContainer = document.getElementById("my-units");
  if (unitEnrollments.length === 0) {
    unitsContainer.innerHTML = `<p class="text-muted">لم تشترِ أي وحدة بعد.</p>`;
  } else {
    const cards = await Promise.all(unitEnrollments.map(async (e) => {
      const unit = await getUnit(e.unitId);
      if (!unit) return "";
      const lessons = await listLessonsByUnit(unit.id, { onlyPublished: true });
      return `<a href="unit.html?slug=${unit.slug}" class="card"><h3 style="color:var(--brand-900);">${unit.title}</h3><p class="text-muted" style="font-size:14px;">${lessons.length} حصة</p></a>`;
    }));
    unitsContainer.innerHTML = cards.join("");
  }

  // الطلبات
  const ordersBody = document.getElementById("orders-body");
  if (orders.length === 0) {
    ordersBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">لا توجد طلبات بعد.</td></tr>`;
  } else {
    ordersBody.innerHTML = orders.map((o) => `
      <tr>
        <td>${o.id.slice(0, 8)}</td>
        <td>${o.total} ج.م</td>
        <td><span class="${statusClass[o.status] || "badge"}">${statusLabel[o.status] || o.status}</span></td>
        <td>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("ar-EG") : "-"}</td>
      </tr>`).join("");
  }
});
