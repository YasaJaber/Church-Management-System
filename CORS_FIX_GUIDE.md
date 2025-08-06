# حل مشكلة CORS 

## المشكلة:
```
Access to fetch at 'https://church-management-system-b6h7.onrender.com/api/auth/login' 
from origin 'https://church-management-system-1-i51l.onrender.com' 
has been blocked by CORS policy
```

## السبب:
الباك إند لا يسمح بطلبات من رابط الفرونت إند الجديد.

## الحل المُطبق:
✅ تم إضافة رابط الفرونت إند الجديد إلى قائمة CORS المسموحة في الباك إند:
- `https://church-management-system-1-i51l.onrender.com`

## خطوات ما بعد الإصلاح:

### 1. إعادة نشر الباك إند:
- اذهب إلى Render Dashboard
- اختر خدمة الباك إند: `church-management-system-b6h7`
- اضغط "Manual Deploy" -> "Deploy latest commit"
- انتظر حتى يكتمل النشر

### 2. اختبار الاتصال:
- انتظر 2-3 دقائق حتى يُعاد تشغيل الباك إند
- جرب تسجيل الدخول مرة أخرى في الفرونت إند

## للتأكد من حل المشكلة:
1. افتح Developer Tools في المتصفح (F12)
2. اذهب إلى Network tab
3. جرب تسجيل الدخول
4. يجب أن تظهر طلبات API بنجاح بدون أخطاء CORS

## إذا استمرت المشكلة:
قد تحتاج إلى انتظار إعادة تشغيل الباك إند بالكامل (5-10 دقائق).
