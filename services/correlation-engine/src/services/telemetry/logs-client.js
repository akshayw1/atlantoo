const logger = require('pino')();
const express = require('express');
const router = express.Router();

class LogsClient {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000; // Keep last 10k logs
    logger.info('Logs client initialized with in-memory storage');
    
    // Setup endpoint to receive logs
    router.post('/logs', (req, res) => {
      const logEntry = {
        ...req.body,
        timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
      };
      this.addLog(logEntry);
      res.status(200).json({ status: 'ok' });
    });
  }

  // Add this router to your Express app
  getRouter() {
    return router;
  }

  // Add a log entry
  addLog(log) {
    logger.debug(`Received log: ${log.level} - ${log.message}`);
    this.logs.push(log);
    
    // Trim logs array if it gets too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  async getLogs(serviceName, timeRange, limit = 100) {
    const filteredLogs = this.logs.filter(log => {
      return log.service === serviceName && 
             new Date(log.timestamp) >= timeRange.start &&
             new Date(log.timestamp) <= timeRange.end;
    });
    
    logger.debug(`Retrieved ${filteredLogs.length} logs for service ${serviceName}`);
    return filteredLogs.slice(-limit);
  }

  async getErrorLogs(serviceName, timeRange, limit = 50) {
    const filteredLogs = this.logs.filter(log => {
      return log.service === serviceName && 
             new Date(log.timestamp) >= timeRange.start &&
             new Date(log.timestamp) <= timeRange.end &&
             (log.level === 'error' || log.level === 'fatal');
    });
    
    logger.debug(`Retrieved ${filteredLogs.length} error logs for service ${serviceName}`);
    return filteredLogs.slice(-limit);
  }
  
  async getLogsByTraceId(traceId, limit = 50) {
    const filteredLogs = this.logs.filter(log => log.traceId === traceId);
    logger.debug(`Retrieved ${filteredLogs.length} logs for trace ${traceId}`);
    return filteredLogs.slice(-limit);
  }
}

const logsClient = new LogsClient();
module.exports = logsClient;
