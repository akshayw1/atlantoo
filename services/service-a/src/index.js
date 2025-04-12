// Load OpenTelemetry instrumentation first
const { counter } = require('./instrumentation');
const express = require('express');
const logger = require('./logger');
const { trace } = require('@opentelemetry/api');

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON
app.use(express.json());

// Middleware to count all requests
app.use((req, res, next) => {
  // Increment our manual counter
  counter.add(1, { route: req.path, method: req.method });
  next();
});

// Create some sample routes
app.get('/', (req, res) => {
  logger.info('Root endpoint called');
  res.send('Hello from Service A!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.debug('Health check called');
  res.status(200).json({ status: 'UP' });
});

// Endpoint that generates a lot of logs
app.get('/logs', (req, res) => {
  logger.info('Logs endpoint called');
  
  for (let i = 0; i < 10; i++) {
    logger.info(`Generated log message ${i}`, { iteration: i });
  }
  
  logger.warn('This is a warning log');
  logger.error('This is an error log');
  
  res.status(200).json({ status: 'Logs generated' });
});

// Endpoint that has variable performance
app.get('/process/:id', (req, res) => {
  const id = req.params.id;
  const tracer = trace.getTracer('default');
  
  logger.info(`Processing request for ID: ${id}`);
  
  const span = tracer.startSpan('process-data');
  
  // Simulate variable processing time based on ID
  const processingTime = parseInt(id) % 10 * 100;
  
  setTimeout(() => {
    span.end();
    logger.info(`Completed processing ID: ${id}`, { processingTime });
    res.status(200).json({ 
      id, 
      processingTime, 
      result: `Processed data for ID: ${id}` 
    });
  }, processingTime);
});

// Endpoint that sometimes produces errors
app.get('/risky', (req, res) => {
  const tracer = trace.getTracer('default');
  const span = tracer.startSpan('risky-operation');
  
  logger.info('Risky endpoint called');
  
  // Random chance of error
  if (Math.random() < 0.3) {
    const error = new Error('Something went wrong!');
    logger.error('Risky operation failed', { error: error.message });
    span.end();
    return res.status(500).json({ error: 'Operation failed' });
  }
  
  span.end();
  logger.info('Risky operation completed successfully');
  res.status(200).json({ status: 'Success' });
});

// Start the server
app.listen(port, () => {
  logger.info(`Service A listening on port ${port}`);
});
