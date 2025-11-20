const helmet = require('helmet');

/**
 * Helmet Security Configuration
 * Provides protection against common web vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME Sniffing
 * - And more...
 */

const helmetConfig = helmet({
  // Content Security Policy - defines trusted content sources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for frontend
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        // Allowed frontend origins
        "https://church-management-web.onrender.com",
        "https://church-management-system-1-i51l.onrender.com",
        "https://church-management-system-six.vercel.app",
        "https://church-management-system.vercel.app",
        "https://*.vercel.app"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Cross-Origin-Embedder-Policy: disabled to allow cross-origin resources
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin-Resource-Policy: allow cross-origin requests
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control: prevent DNS prefetching
  dnsPrefetchControl: { allow: false },
  
  // Frameguard: prevent clickjacking by denying iframe embedding
  frameguard: { action: 'deny' },
  
  // Hide Powered-By: remove X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security (HSTS): force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open: prevent IE from executing downloads in site context
  ieNoOpen: true,
  
  // No Sniff: prevent MIME type sniffing
  noSniff: true,
  
  // Origin Agent Cluster: isolate origins
  originAgentCluster: true,
  
  // Permitted Cross-Domain Policies: restrict Flash/PDF cross-domain access
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  
  // Referrer Policy: control referrer information
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // XSS Filter: enable browser XSS protection
  xssFilter: true,
});

module.exports = helmetConfig;
