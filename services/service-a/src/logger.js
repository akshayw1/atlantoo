const winston = require('winston');
const fluent = require('fluent-logger');
const axios = require('axios');

// Determine Fluentd host - use environment variable or fallback
const fluentHost = process.env.FLUENTD_HOST || 'localhost';
const fluentPort = parseInt(process.env.FLUENTD_PORT || '24224');
const correlationEngineUrl = process.env.CORRELATION_ENGINE_URL || 'http://correlation-engine:3001';

// Create Fluentd logger
const fluentLogger = fluent.createFluentSender('auth-service', {
  host: fluentHost,
  port: fluentPort,
  timeout: 3.0,
  reconnectInterval: 60000, // 1 minute
  internalLogger: console
});

// Create a Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME || 'auth-service' },
  transports: [
    // Console transport for local development
    new winston.transports.Console()
  ]
});

// Store original logging functions
const originalLoggerFunctions = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};

// Override logging functions to also send to correlation engine
logger.info = (message, meta = {}) => {
  originalLoggerFunctions.info(message, meta);
  
  // Send to Fluentd
  try {
    fluentLogger.emit('info', { message, ...meta, timestamp: new Date().toISOString() });
  } catch (err) {
    // Silently fail if Fluentd is not available
  }
  
  // Send to correlation engine
  axios.post(`${correlationEngineUrl}/api/logs`, {
    level: 'info',
    message,
    service: process.env.OTEL_SERVICE_NAME || 'auth-service',
    ...meta,
    timestamp: new Date().toISOString()
  }).catch(err => {
    console.error('Failed to send log to correlation engine', err.message);
  });
};

logger.warn = (message, meta = {}) => {
  originalLoggerFunctions.warn(message, meta);
  
  // Send to Fluentd
  try {
    fluentLogger.emit('warn', { message, ...meta, timestamp: new Date().toISOString() });
  } catch (err) {
    // Silently fail if Fluentd is not available
  }
  
  // Send to correlation engine
  axios.post(`${correlationEngineUrl}/api/logs`, {
    level: 'warn',
    message,
    service: process.env.OTEL_SERVICE_NAME || 'auth-service',
    ...meta,
    timestamp: new Date().toISOString()
  }).catch(err => {
    console.error('Failed to send log to correlation engine', err.message);
  });
};

logger.error = (message, meta = {}) => {
  originalLoggerFunctions.error(message, meta);
  
  // Send to Fluentd
  try {
    fluentLogger.emit('error', { message, ...meta, timestamp: new Date().toISOString() });
  } catch (err) {
    // Silently fail if Fluentd is not available
  }
  
  // Send to correlation engine
  axios.post(`${correlationEngineUrl}/api/logs`, {
    level: 'error',
    message,
    service: process.env.OTEL_SERVICE_NAME || 'auth-service',
    ...meta,
    timestamp: new Date().toISOString()
  }).catch(err => {
    console.error('Failed to send log to correlation engine', err.message);
  });
};

logger.debug = (message, meta = {}) => {
  originalLoggerFunctions.debug(message, meta);
  
  // Send to Fluentd
  try {
    fluentLogger.emit('debug', { message, ...meta, timestamp: new Date().toISOString() });
  } catch (err) {
    // Silently fail if Fluentd is not available
  }
  
  // Send to correlation engine
  axios.post(`${correlationEngineUrl}/api/logs`, {
    level: 'debug',
    message,
    service: process.env.OTEL_SERVICE_NAME || 'auth-service',
    ...meta,
    timestamp: new Date().toISOString()
  }).catch(err => {
    console.error('Failed to send log to correlation engine', err.message);
  });
};

module.exports = logger;
