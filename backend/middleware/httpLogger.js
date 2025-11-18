const logger = require('../utils/logger');

const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request (sanitized)
  logger.http('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    const duration = Date.now() - start;
    
    // Only log response metadata, not sensitive data
    logger.http('Outgoing response', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    
    return originalJson(body);
  };
  
  next();
};

module.exports = httpLogger;

