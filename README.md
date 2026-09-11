# أكاديميتي — منصة تعليمية عربية (HTML / CSS / JS بسيط + Firebase)

مشروع **ثابت بالكامل** (Static) بدون أي فريموورك وبدون أي سيرفر خاص بك - كل الملفات HTML/CSS/JS عادية، ومتصلة مباشرة بـ Firebase (Firestore + Authentication) من المتصفح. الفيديوهات مستضافة على يوتيوب (Unlisted) لتفادي شرط خطة Blaze المطلوبة لـ Firebase Storage.

## ⚠️ الفرق عن نسخة السيرفر (اقرأ هذا أولًا)

بما إنه لا يوجد سيرفر، في نقطة واحدة أضعف أمنيًا ولازم تعرفها:

**تأكيد الدفع**: في `checkout.js`، بعد "الدفع"، الكود بيعلّم الطلب كـ `PAID` مباشرة من المتصفح. في نسخة حقيقية للإنتاج، هذا يجب أن يحدث فقط من **Webhook مُتحقَّق من التوقيع من خادم بوابة الدفع** (Paymob) - وهذا يحتاج كود خادم صغير (الحل القياسي هو **Firebase Cloud Functions**، وهي ميزة ضمن Firebase نفسه ولا تحتاج سيرفر منفصل، لكنها كود JavaScript يُكتب ويُنشر بأمر `firebase deploy --only functions`). لو حبيت أضيفها لاحقًا قولّي.

كل شيء آخر (الأدوار، من يقدر يعدّل الوحدات، صلاحية الشراء) محمي فعليًا عبر **Firestore Security Rules** المرفقة، مش JavaScript في المتصفح. حماية الفيديو نفسها معتمدة على خاصية "Unlisted" في يوتيوب (انظر القسم 5).

---

## 1) إعداد Firebase

1. أنشئ مشروعًا على [console.firebase.google.com](https://console.firebase.google.com).
2. فعّل **Firestore Database** (Production mode).
3. فعّل **Authentication → Sign-in method → Email/Password**.
5. من **Project Settings → General → Your apps** أضف "Web app" وانسخ القيم.
6. افتح ملف `firebase-config.js` وضع القيم بدل `PUT_YOUR_...`:
   ```js
   const firebaseConfig = {
     apiKey: "...", authDomain: "...", projectId: "...",
     storageBucket: "...", messagingSenderId: "...", appId: "..."
   };
   ```
7. ثبّت `firebase-tools` وانشر القواعد (مهم جدًا - بدونها البيانات غير محمية):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init   # اختر Firestore فقط، واختر نفس المشروع، ولا تستبدل الملفات الموجودة
   firebase deploy --only firestore:rules
   ```

## 2) التشغيل محليًا

المتصفحات لا تسمح بتحميل ES Modules (`type="module"`) من `file://` مباشرة - تحتاج سيرفر محلي بسيط (أي سيرفر، حتى لو مؤقت):

```bash
# أي طريقة تناسبك:
npx serve .
# أو
python3 -m http.server 8080
```

ثم افتح `http://localhost:8080` (أو المنفذ الذي ظهر لك).

## 3) إنشاء أول حساب أدمن

1. افتح `register.html` وسجّل حسابًا عاديًا (هيتسجّل تلقائيًا بدور `STUDENT`).
2. من Firebase Console → Firestore Database → مجموعة `users` → افتح المستند بنفس الـ UID بتاعك → غيّر الحقل `role` من `STUDENT` إلى `ADMIN` يدويًا.
3. سجّل خروج ودخول تاني، وهتلاقي "لوحة الأدمن" ظاهرة في القائمة.
4. من هنا، تقدر ترقّي أي حساب تاني لأدمن من داخل `admin.html` نفسه.

## 4) إضافة وحدة ودرس (من لوحة الأدمن مباشرة)

- `admin.html` → تبويب "الوحدات" → "+ إضافة وحدة".
- تبويب "الدروس" → "+ إضافة حصة" (اختر الوحدة، رقم الحصة، السعر...).

## 5) رفع فيديو لدرس (Cloudinary - رفع ملف حقيقي، مجاني، بدون بطاقة)

الفيديوهات بترفع كملف حقيقي من لوحة الأدمن مباشرة عبر خدمة **Cloudinary** المجانية (بدون أي بطاقة بنكية):

1. سجّل حساب مجاني على [cloudinary.com](https://cloudinary.com) (بالبريد أو Google/GitHub).
2. من الصفحة الرئيسية (Dashboard) بعد الدخول، هتلاقي **Cloud name** ظاهر فوق - انسخه.
3. من ⚙️ **Settings → Upload** → انزل لقسم **Upload presets** → **Add upload preset**:
   - **Signing Mode: Unsigned** (لازم تحددها كده بالظبط، وإلا الرفع من المتصفح مش هيشتغل)
   - احفظ، وانسخ اسم الـ Preset.
4. افتح ملف `cloudinary-config.js` وحط القيمتين:
   ```js
   export const CLOUDINARY_CLOUD_NAME = "اسم-الـ-cloud-بتاعك";
   export const CLOUDINARY_UPLOAD_PRESET = "اسم-الـ-preset-بتاعك";
   ```
5. ارفع الملف المُعدَّل على GitHub.
6. من `admin.html` → تبويب "الدروس" → أضف/عدّل الحصة → اختار ملف الفيديو من جهازك → اضغط "رفع الملف" → استنى شريط التقدّم لحد 100% → هيتحط الرابط تلقائيًا، احفظ الحصة.

**بديل بدون رفع ملف:** لو مش عايز تستخدم Cloudinary، تقدر تحط رابط يوتيوب (Unlisted) مباشرة في نفس الحقل بدل الرفع - النظام بيتعرّف تلقائيًا على نوع الرابط.

الحصة المجانية على Cloudinary بتعطيك 25 GB تخزين/نقل شهريًا تقريبًا - كفاية جدًا لبداية منصة تعليمية.

## 6) النشر (استضافة)

المشروع ملفات ثابتة بحتة - أي استضافة ثابتة تشتغل، أشهرها:

**Firebase Hosting** (الأسهل لأنه نفس المشروع):
```bash
firebase deploy --only hosting
```

**أو GitHub Pages / Netlify / Vercel**: ارفع كل الملفات كما هي على GitHub، وفعّل GitHub Pages من إعدادات الريبو (Settings → Pages → اختر الفرع الرئيسي). المجلدات في الريبو مدعومة بالكامل بطبيعة الحال — لكن هذا المشروع أصلًا مفيهوش مجلدات، كل الملفات على مستوى واحد.

بعد النشر، أضف دومين الاستضافة الجديد في: Firebase Console → Authentication → Settings → Authorized domains (وإلا هيفشل تسجيل الدخول).

---

## هيكل المشروع (كل الملفات على مستوى واحد، بدون أي مجلد)

| الملف | الوظيفة |
|---|---|
| `index.html` / `home.js` | الصفحة الرئيسية |
| `units.html` / `units.js` | كل الوحدات |
| `unit.html` / `unit.js` | تفاصيل وحدة + قائمة الحصص |
| `lesson.html` / `lesson.js` | مشغّل الفيديو + التقدّم |
| `login.html` `register.html` `forgot-password.html` `reset-password.html` + ملفات js | المصادقة (Firebase Auth) |
| `dashboard.html` / `dashboard.js` | لوحة الطالب |
| `profile.html` / `profile.js` | تعديل البيانات |
| `checkout.html` / `checkout.js` | الدفع (مبسّط) |
| `admin.html` / `admin.js` | لوحة التحكم الكاملة (كل الأقسام في ملف واحد بتبويبات) |
| `firebase-config.js` | إعدادات Firebase (عدّلها بمشروعك) |
| `db.js` | دوال Firestore المشتركة |
| `nav.js` | الهيدر/الفوتر وحالة تسجيل الدخول |
| `styles.css` | كل التنسيقات |
| `firestore.rules` `storage.rules` | قواعد الحماية - **الأهم في المشروع كله** |
