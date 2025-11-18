const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
});

// Strict rate limiter for authentication endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count successful requests
  skipSuccessfulRequests: true,
});

// API rate limiter - 200 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: 'Too many API requests, please slow down.'
  },
});

// Speed limiter - Slow down repeated requests gradually
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // Begin adding 500ms of delay per request above 50
  // Request number 51 is delayed by 500ms
  // Request number 52 is delayed by 1000ms
  // Request number 53 is delayed by 1500ms, etc.
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  speedLimiter,
};

