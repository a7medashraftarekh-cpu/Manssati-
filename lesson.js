import { renderHeader, renderFooter, watchAuth } from "./nav.js?v=3";
import { getLesson, getUnit, listLessonsByUnit, userHasAccessToLesson, listUserProgress, markLessonCompleted, getProgress } from "./db.js?v=3";

renderHeader();
renderFooter();

const params = new URLSearchParams(location.search);
const lessonId = params.get("id");
let currentUser = null;

watchAuth((profile) => { currentUser = profile; render(); });

/** يقبل ID خام أو رابط يوتيوب كامل بأي صيغة، ويرجّع ID الفيديو فقط */
function extractYoutubeId(value) {
  if (!value) return null;
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = value.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(value.trim())) return value.trim();
  return null;
}

/** رابط فيديو مباشر (Cloudinary أو أي استضافة أخرى) - أي رابط https غير يوتيوب */
function isDirectVideoUrl(value) {
  return /^https?:\/\//.test(value) && !value.includes("youtube.com") && !value.includes("youtu.be");
}

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

  // ---- التحقق من الصلاحية ----
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
    if (isDirectVideoUrl(lesson.videoId)) {
      videoWrap.innerHTML = `<video src="${lesson.videoId}" controls controlsList="nodownload" style="width:100%;height:100%;"></video>`;
    } else {
      const ytId = extractYoutubeId(lesson.videoId);
      if (ytId) {
        videoWrap.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        videoWrap.innerHTML = `<div style="color:#fff;padding:40px;text-align:center;"><p>رابط الفيديو غير صالح.</p></div>`;
      }
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
  const siblings = await listLessonsByUnit(unit.id, { onlyPublished: true });
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const prevLink = document.getElementById("prev-link");
  const nextLink = document.getElementById("next-link");
  if (idx > 0) { prevLink.href = `lesson.html?id=${siblings[idx - 1].id}`; prevLink.style.visibility = "visible"; }
  if (idx < siblings.length - 1) { nextLink.href = `lesson.html?id=${siblings[idx + 1].id}`; nextLink.style.visibility = "visible"; }

  if (currentUser) renderProgress(unit.id, siblings);
}

async function renderProgress(unitId, siblingsMaybe) {
  const siblings = siblingsMaybe || await listLessonsByUnit(unitId, { onlyPublished: true });
  const progress = await listUserProgress(currentUser.id);
  const completedIds = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId));
  const completedInUnit = siblings.filter((l) => completedIds.has(l.id)).length;
  const pct = siblings.length ? Math.round((completedInUnit / siblings.length) * 100) : 0;
  document.getElementById("progress-pct").textContent = `${pct}%`;
  document.getElementById("progress-fill").style.width = `${pct}%`;
}
