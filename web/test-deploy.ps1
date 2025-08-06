# سكريبت اختبار النشر المحلي - PowerShell
Write-Host "🚀 بدء اختبار النشر المحلي..." -ForegroundColor Green

# التحقق من وجود Node.js
try {
    $nodeVersion = node -v
    Write-Host "📦 إصدار Node.js: $nodeVersion" -ForegroundColor Blue
} catch {
    Write-Host "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً." -ForegroundColor Red
    exit 1
}

# تثبيت التبعيات
Write-Host "📥 تثبيت التبعيات..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل في تثبيت التبعيات" -ForegroundColor Red
    exit 1
}

# فحص الأخطاء
Write-Host "🔍 فحص الأخطاء..." -ForegroundColor Yellow
npm run lint

# بناء المشروع
Write-Host "🏗️ بناء المشروع..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
$env:NEXT_PUBLIC_USE_PRODUCTION = "true"
$env:NEXT_PUBLIC_API_URL = "https://church-management-system-b6h7.onrender.com/api"

npm run build

# التحقق من نجاح البناء
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم البناء بنجاح!" -ForegroundColor Green
    Write-Host "🚀 يمكنك الآن رفع المشروع على Render" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 خطوات النشر على Render:" -ForegroundColor Cyan
    Write-Host "1. ارفع الكود على GitHub" -ForegroundColor White
    Write-Host "2. أنشئ Web Service في Render" -ForegroundColor White
    Write-Host "3. اربطه بالمستودع" -ForegroundColor White
    Write-Host "4. اضبط متغيرات البيئة" -ForegroundColor White
    Write-Host "5. اضغط Deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 راجع RENDER_DEPLOYMENT_GUIDE.md للتفاصيل الكاملة" -ForegroundColor Cyan
} else {
    Write-Host "❌ فشل في البناء. يرجى مراجعة الأخطاء أعلاه." -ForegroundColor Red
    exit 1
}
