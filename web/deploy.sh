#!/bin/bash

echo "🚀 بدء عملية النشر..."

# تنظيف الملفات القديمة
echo "🧹 تنظيف الملفات القديمة..."
rm -rf .next
rm -rf out

# بناء التطبيق
echo "🔨 بناء التطبيق..."
npm run build

# إنشاء مجلد النشر
echo "📦 إعداد ملفات النشر..."
mkdir -p deployment

# نسخ الملفات المطلوبة
cp -r .next deployment/
cp package.json deployment/
cp next.config.js deployment/
cp -r public deployment/

echo "✅ تم إعداد ملفات النشر في مجلد deployment"
echo "🌐 يمكنك الآن رفع محتويات مجلد deployment إلى Vercel"
