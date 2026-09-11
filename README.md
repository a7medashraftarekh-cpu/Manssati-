# أكاديميتي — منصة تعليمية عربية (HTML / CSS / JS بسيط + Firebase)

مشروع **ثابت بالكامل** (Static) بدون أي فريموورك وبدون أي سيرفر خاص بك - كل الملفات HTML/CSS/JS عادية، ومتصلة مباشرة بـ Firebase (Firestore + Authentication + Storage) من المتصفح.

## ⚠️ الفرق عن نسخة السيرفر (اقرأ هذا أولًا)

بما إنه لا يوجد سيرفر، في نقطة واحدة أضعف أمنيًا ولازم تعرفها:

**تأكيد الدفع**: في `checkout.js`، بعد "الدفع"، الكود بيعلّم الطلب كـ `PAID` مباشرة من المتصفح. في نسخة حقيقية للإنتاج، هذا يجب أن يحدث فقط من **Webhook مُتحقَّق من التوقيع من خادم بوابة الدفع** (Paymob) - وهذا يحتاج كود خادم صغير (الحل القياسي هو **Firebase Cloud Functions**، وهي ميزة ضمن Firebase نفسه ولا تحتاج سيرفر منفصل، لكنها كود JavaScript يُكتب ويُنشر بأمر `firebase deploy --only functions`). لو حبيت أضيفها لاحقًا قولّي.

كل شيء آخر (الأدوار، صلاحية الوصول للفيديو، من يقدر يعدّل الوحدات) محمي فعليًا عبر **Firestore/Storage Security Rules** المرفقة، مش JavaScript في المتصفح.

---

## 1) إعداد Firebase

1. أنشئ مشروعًا على [console.firebase.google.com](https://console.firebase.google.com).
2. فعّل **Firestore Database** (Production mode).
3. فعّل **Authentication → Sign-in method → Email/Password**.
4. فعّل **Storage**.
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
   firebase init   # اختر Firestore + Storage، واختر نفس المشروع، ولا تستبدل الملفات الموجودة
   firebase deploy --only firestore:rules,storage:rules
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

## 5) رفع فيديو لدرس (مهم - اتبع الترتيب بالضبط)

بسبب طريقة حماية الفيديو (انظر `storage.rules`)، اسم الملف في Storage **يجب** أن يكون بالضبط معرّف مستند الدرس في Firestore:

1. أنشئ الحصة أولًا من `admin.html` (بدون فيديو).
2. من Firebase Console → Firestore → `lessons` → افتح الحصة اللي عملتها وانسخ **معرّف المستند (Document ID)** الظاهر أعلى الصفحة.
3. من Firebase Console → Storage → ارفع ملف الفيديو، وسمّه بالظبط بهذا المعرّف داخل مجلد `lessons/` — مثال: لو المعرّف `aZ3kP9xQ`، يبقى المسار `lessons/aZ3kP9xQ` (بدون امتداد، الفيديو هيشتغل عادي حتى من غير .mp4).
4. ارجع لـ `admin.html` → عدّل الحصة → حقل "مسار الفيديو" اكتب `lessons/aZ3kP9xQ`.

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
