/** @type {import('next').NextConfig} */
const nextConfig = {
  // إزالة output: 'export' للنشر على Render كـ Node.js app
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: [
      'localhost', 
      'church-management-system-vk3m.onrender.com', 
      'church-management-system-b6h7.onrender.com',
      // أضف المزيد من النطاقات حسب الحاجة
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // إعدادات خاصة بـ Render
  poweredByHeader: false,
  generateEtags: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
