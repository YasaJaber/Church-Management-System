#!/bin/bash

# سكريبت اختبار النشر المحلي
echo "🚀 بدء اختبار النشر المحلي..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من إصدار Node.js
NODE_VERSION=$(node -v)
echo "📦 إصدار Node.js: $NODE_VERSION"

# تثبيت التبعيات
echo "📥 تثبيت التبعيات..."
npm install

# فحص الأخطاء
echo "🔍 فحص الأخطاء..."
npm run lint

# بناء المشروع
echo "🏗️ بناء المشروع..."
export NODE_ENV=production
export NEXT_PUBLIC_USE_PRODUCTION=true
export NEXT_PUBLIC_API_URL=https://church-management-system-b6h7.onrender.com/api

npm run build

# التحقق من نجاح البناء
if [ $? -eq 0 ]; then
    echo "✅ تم البناء بنجاح!"
    echo "🚀 يمكنك الآن رفع المشروع على Render"
    echo ""
    echo "📋 خطوات النشر على Render:"
    echo "1. ارفع الكود على GitHub"
    echo "2. أنشئ Web Service في Render"
    echo "3. اربطه بالمستودع"
    echo "4. اضبط متغيرات البيئة"
    echo "5. اضغط Deploy"
    echo ""
    echo "📚 راجع RENDER_DEPLOYMENT_GUIDE.md للتفاصيل الكاملة"
else
    echo "❌ فشل في البناء. يرجى مراجعة الأخطاء أعلاه."
    exit 1
fi
