#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// قائمة الصفحات التي تحتاج dynamic loading
const pagesNeedingDynamic = [
  'attendance',
  'children-tracking', 
  'children',
  'classes',
  'consecutive-attendance',
  'individual-tracking',
  'login',
  'pastoral-care',
  'servants-attendance',
  'servants-follow-up',
  'servants-tracking',
  'servants',
  'service-leader-dashboard',
  'statistics',
  'advanced-statistics',
  'dashboard'
]

const appDir = path.join(__dirname, 'src', 'app')

pagesNeedingDynamic.forEach(pageName => {
  const pageDir = path.join(appDir, pageName)
  const pageFile = path.join(pageDir, 'page.tsx')
  
  if (fs.existsSync(pageFile)) {
    let content = fs.readFileSync(pageFile, 'utf8')
    
    // إزالة أي exports سابقة
    content = content.replace(/export const dynamic = 'force-dynamic'/g, '')
    content = content.replace(/export const revalidate = \d+/g, '')
    
    // إضافة dynamic و force dynamic rendering
    const newContent = content.replace(
      "'use client'",
      `'use client'

export const dynamic = 'force-dynamic'`
    )
    
    fs.writeFileSync(pageFile, newContent)
    console.log(`✅ Updated ${pageName}/page.tsx`)
  } else {
    console.log(`❌ File not found: ${pageFile}`)
  }
})

console.log('🎉 تم تحديث جميع الصفحات بنجاح!')
