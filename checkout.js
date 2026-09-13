import { renderHeader, renderFooter, protectPage } from "./nav.js?v=4";
import { getUnit, getLesson, createOrder, markOrderPaid, grantEnrollment } from "./db.js?v=4";

renderHeader();
renderFooter();

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
    <p style="font-size:26px;font-weight:800;color:var(--brand-800);margin-bottom:20px;">${price} ج.م</p>
    <p class="text-muted" style="font-size:12px;margin-bottom:20px;line-height:1.7;">
      ⚠️ ملاحظة: هذا مشروع بسيط بدون سيرفر، لذا خطوة الدفع هنا مبسّطة لأغراض العرض التجريبي فقط.
      في مشروع إنتاج حقيقي، تأكيد الدفع يجب أن يأتي من Webhook مُتحقَّق منه من خادم بوابة الدفع
      (مثل Paymob) لا من المتصفح مباشرة - وهذا يتطلب وجود خادم أو Firebase Cloud Functions.
    </p>
    <button class="btn btn-gold btn-block" id="pay-btn">تأكيد الدفع (تجريبي)</button>
  `;

  document.getElementById("pay-btn").addEventListener("click", async () => {
    const btn = document.getElementById("pay-btn");
    btn.disabled = true;
    btn.textContent = "جارٍ المعالجة...";

    const orderId = await createOrder({
      userId: user.id,
      subtotal: price,
      discount: 0,
      total: price,
      currency: "EGP",
      items: [{ itemType: type, unitId: unitId || null, lessonId: lessonId || null, unitPrice: price }],
      payment: { provider: "demo", status: "PENDING", amount: price, currency: "EGP" }
    });

    await markOrderPaid(orderId);
    await grantEnrollment({ userId: user.id, unitId: unitId || null, lessonId: lessonId || null, orderId });

    card.innerHTML = `
      <h1 style="color:var(--brand-900);">✔ تم الشراء بنجاح</h1>
      <p class="text-muted" style="margin:12px 0 20px;">يمكنك الآن مشاهدة المحتوى.</p>
      <a href="dashboard.html" class="btn btn-gold btn-block">اذهب إلى لوحتي</a>
    `;
  });
});
