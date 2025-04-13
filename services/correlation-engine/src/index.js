const express = require('express');
const cors = require('cors');
const pino = require('pino');
const config = require('./config');
const routes = require('./api/routes');
const db = require('./db');
const logsClient = require('./services/telemetry/logs-client');
const schedulerService = require('./services/scheduler-service');


// Initialize logger
const logger = pino({
  transport: {
    target: 'pino-pretty'
  },
  level: process.env.LOG_LEVEL || 'info'
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Incoming request');
  next();
});

// Add logs receiver endpoint
app.use('/api', logsClient.getRouter());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Connect to database and start server
db.connect().then(() => {
  app.listen(config.port, () => {
    logger.info(`Correlation Engine running on port ${config.port}`);
    // Start the scheduler for continuous monitoring
    schedulerService.start();
  });
}).catch((err) => {
  logger.error('Failed to connect to database', err);
  process.exit(1);
});


// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  db.disconnect().then(() => {
    process.exit(0);
  });
});
