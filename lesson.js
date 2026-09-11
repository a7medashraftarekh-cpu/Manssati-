import { renderHeader, renderFooter, watchAuth } from "./nav.js";
import { getLesson, getUnit, listLessonsByUnit, userHasAccessToLesson, listUserProgress, markLessonCompleted, getProgress } from "./db.js";
import { storage, ref, getDownloadURL } from "./firebase-config.js";

renderHeader();
renderFooter();

const params = new URLSearchParams(location.search);
const lessonId = params.get("id");
let currentUser = null;

watchAuth((profile) => { currentUser = profile; render(); });

async function render() {
  const lesson = await getLesson(lessonId);
  if (!lesson) {
    document.getElementById("video-wrap").innerHTML = `<p style="color:#fff;padding:20px;">الدرس غير موجود.</p>`;
    return;
  }
  const unit = await getUnit(lesson.unitId);
  document.getElementById("back-link").href = `unit.html?slug=${unit.slug}`;
  document.getElementById("back-link").textContent = `← رجوع إلى ${unit.title}`;
  document.getElementById("lesson-title").textContent = lesson.title;
  document.getElementById("lesson-desc").textContent = lesson.description;

  // ---- التحقق من الصلاحية (فحص فوري في الواجهة؛ الحماية الحقيقية في Storage Security Rules) ----
  let allowed = lesson.isFree;
  if (!allowed && currentUser) {
    allowed = currentUser.role === "ADMIN" || await userHasAccessToLesson(currentUser.id, unit.id, lesson.id);
  }

  const videoWrap = document.getElementById("video-wrap");
  if (!allowed) {
    videoWrap.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;">🔒<p>لا تملك صلاحية مشاهدة هذا الدرس.</p></div>`;
  } else if (!lesson.videoId) {
    videoWrap.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;"><p>لم يتم رفع فيديو لهذا الدرس بعد.</p></div>`;
  } else {
    try {
      const url = await getDownloadURL(ref(storage, lesson.videoId));
      videoWrap.innerHTML = `<video src="${url}" controls controlsList="nodownload"></video>`;
    } catch {
      videoWrap.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;"><p>تعذّر تحميل الفيديو.</p></div>`;
    }
  }

  // ---- إكمال الدرس ----
  const completeBtn = document.getElementById("complete-btn");
  if (currentUser && allowed) {
    const existing = await getProgress(currentUser.id, lesson.id);
    if (existing?.isCompleted) {
      completeBtn.textContent = "✔ تم إكمال الدرس";
      completeBtn.disabled = true;
    }
    completeBtn.addEventListener("click", async () => {
      completeBtn.disabled = true;
      completeBtn.textContent = "جارٍ الحفظ...";
      await markLessonCompleted(currentUser.id, lesson.id);
      completeBtn.textContent = "✔ تم إكمال الدرس";
      renderProgress(unit.id);
    });
  } else {
    completeBtn.style.display = "none";
  }

  // ---- التنقل بين الدروس + شريط التقدّم ----
  const siblings = await listLessonsByUnit(unit.id);
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const prevLink = document.getElementById("prev-link");
  const nextLink = document.getElementById("next-link");
  if (idx > 0) { prevLink.href = `lesson.html?id=${siblings[idx - 1].id}`; prevLink.style.visibility = "visible"; }
  if (idx < siblings.length - 1) { nextLink.href = `lesson.html?id=${siblings[idx + 1].id}`; nextLink.style.visibility = "visible"; }

  if (currentUser) renderProgress(unit.id, siblings);
}

async function renderProgress(unitId, siblingsMaybe) {
  const siblings = siblingsMaybe || await listLessonsByUnit(unitId);
  const progress = await listUserProgress(currentUser.id);
  const completedIds = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId));
  const completedInUnit = siblings.filter((l) => completedIds.has(l.id)).length;
  const pct = siblings.length ? Math.round((completedInUnit / siblings.length) * 100) : 0;
  document.getElementById("progress-pct").textContent = `${pct}%`;
  document.getElementById("progress-fill").style.width = `${pct}%`;
}
