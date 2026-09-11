// cloudinary-config.js
// إعدادات Cloudinary لرفع ملفات الفيديو مباشرة من لوحة الأدمن - مجاني بالكامل
// وبدون أي بطاقة بنكية.
//
// طريقة الحصول على القيم:
// 1) سجّل حساب مجاني على https://cloudinary.com (بالبريد أو Google/GitHub - بدون بطاقة).
// 2) من Dashboard الرئيسية بعد تسجيل الدخول، هتلاقي "Cloud name" ظاهر فوق - انسخه.
// 3) من الإعدادات: Settings (⚙️) → Upload → انزل لـ "Upload presets" → Add upload preset
//    - Signing Mode: اختار "Unsigned" (مهم جدًا - بدون كده الرفع من المتصفح مش هيشتغل)
//    - احفظ، وانسخ اسم الـ Preset اللي ظهر.
// 4) حط القيمتين تحت.

export const CLOUDINARY_CLOUD_NAME = "xsgmyhn1";
export const CLOUDINARY_UPLOAD_PRESET = "lms_videos";

/**
 * يرفع ملف فيديو مباشرة لـ Cloudinary من المتصفح (Unsigned Upload) ويرجّع
 * رابط تشغيل مباشر (secure_url) لتخزينه في حقل videoId بمستند الدرس.
 * onProgress: دالة اختيارية تُستدعى بنسبة الرفع (0-100).
 */
export function uploadVideoToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (CLOUDINARY_CLOUD_NAME.startsWith("PUT_YOUR")) {
      reject(new Error("لم يتم ضبط إعدادات Cloudinary بعد في cloudinary-config.js"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("resource_type", "video");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve(data.secure_url);
        } else {
          reject(new Error(data.error?.message || "فشل الرفع"));
        }
      } catch {
        reject(new Error("استجابة غير متوقعة من Cloudinary"));
      }
    };
    xhr.onerror = () => reject(new Error("تعذّر الاتصال بـ Cloudinary"));
    xhr.send(formData);
  });
}
