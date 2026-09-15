import { renderHeader, renderFooter, protectPage } from "./nav.js?v=5";
import { getUnit, getLesson, createOrder } from "./db.js?v=5";

renderHeader();
renderFooter();

const VODAFONE_CASH_NUMBER = "01080343968";

const params = new URLSearchParams(location.search);
const type = params.get("type"); // UNIT | LESSON
const unitId = params.get("unitId");
const lessonId = params.get("lessonId");

protectPage().then(async (user) => {
  const card = document.getElementById("checkout-card");

  // السعر يُقرأ دائمًا من Firestore هنا مباشرة - لا يُقبل أي سعر من رابط الصفحة
  let item, price, title;
  if (type === "UNIT" && unitId) {
    item = await getUnit(unitId);
    price = item?.isOfferActive && item?.offerPrice ? item.offerPrice : item?.price;
    title = item?.title;
  } else if (type === "LESSON" && lessonId) {
    item = await getLesson(lessonId);
    price = item?.isOfferActive && item?.offerPrice ? item.offerPrice : item?.price;
    title = item?.title;
  }

  if (!item) {
    card.innerHTML = `<p class="text-danger">العنصر المطلوب غير موجود.</p>`;
    return;
  }

  card.innerHTML = `
    <h1 style="color:var(--brand-900);margin-bottom:6px;">إتمام الشراء</h1>
    <p class="text-muted" style="margin-bottom:20px;">${title}</p>
    <p style="font-size:26px;font-weight:800;color:var(--brand-800);margin-bottom:24px;">${price} ج.م</p>

    <div style="background:var(--slate-50);border-radius:12px;padding:16px;margin-bottom:20px;text-align:right;">
      <p style="font-weight:700;color:var(--brand-900);margin-bottom:8px;">1) حوّل المبلغ عبر فودافون كاش إلى الرقم:</p>
      <p style="font-size:22px;font-weight:800;color:var(--brand-800);direction:ltr;text-align:center;letter-spacing:2px;">${VODAFONE_CASH_NUMBER}</p>
    </div>

    <form id="verify-form" style="text-align:right;">
      <p style="font-weight:700;color:var(--brand-900);margin-bottom:10px;">2) اكتب جزء من رقمك اللي حوّلت منه (للتحقق فقط):</p>
      <div style="display:flex;gap:10px;">
        <div class="field" style="flex:1;">
          <label>أول 3 أرقام</label>
          <input type="text" id="sender-first3" maxlength="3" pattern="[0-9]{3}" placeholder="010" required>
        </div>
        <div class="field" style="flex:1;">
          <label>آخر رقمين</label>
          <input type="text" id="sender-last2" maxlength="2" pattern="[0-9]{2}" placeholder="23" required>
        </div>
      </div>
      <p class="text-muted" style="font-size:12px;margin-bottom:16px;">مثال: لو رقمك 01012345678 → أول 3 أرقام: 010 - آخر رقمين: 78</p>
      <p class="text-danger" id="verify-error" style="display:none;font-size:13px;margin-bottom:12px;"></p>
      <button type="submit" class="btn btn-gold btn-block" id="submit-btn">إرسال للمراجعة</button>
    </form>

    <p class="text-muted" style="font-size:12px;margin-top:16px;line-height:1.7;">
      بعد الإرسال، سيراجع الأدمن عملية التحويل ويؤكّد الطلب يدويًا، وستصلك الصلاحية فور التأكيد - يمكنك متابعة حالة الطلب من "لوحتي".
    </p>
  `;

  document.getElementById("verify-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("verify-error");
    const submitBtn = document.getElementById("submit-btn");
    const first3 = document.getElementById("sender-first3").value.trim();
    const last2 = document.getElementById("sender-last2").value.trim();

    if (!/^\d{3}$/.test(first3) || !/^\d{2}$/.test(last2)) {
      errorEl.textContent = "تأكد من كتابة 3 أرقام في الخانة الأولى و2 في الثانية.";
      errorEl.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "جارٍ الإرسال...";

    await createOrder({
      userId: user.id,
      subtotal: price,
      discount: 0,
      total: price,
      currency: "EGP",
      items: [{ itemType: type, unitId: unitId || null, lessonId: lessonId || null, unitPrice: price }],
      payment: {
        provider: "vodafone_cash",
        status: "PENDING",
        amount: price,
        currency: "EGP",
        senderFirst3: first3,
        senderLast2: last2
      }
    });

    card.innerHTML = `
      <h1 style="color:var(--brand-900);">⏳ طلبك قيد المراجعة</h1>
      <p class="text-muted" style="margin:12px 0 20px;line-height:1.7;">
        هيراجع الأدمن عملية التحويل ويؤكّد الطلب خلال وقت قصير. هتوصلك الصلاحية فور التأكيد،
        وتقدر تتابع حالة طلبك من "لوحتي".
      </p>
      <a href="dashboard.html" class="btn btn-gold btn-block">اذهب إلى لوحتي</a>
    `;
  });
});
