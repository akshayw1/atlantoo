const cron = require('node-cron');
const correlationService = require('./correlation-service');
const metricsClient = require('./telemetry/metrics-client');
const logger = require('pino')();
``
class SchedulerService {
  constructor() {
    this.jobs = [];
    this.runningCheck = false;
    this.isRunning = false; // Boolean flag to control scheduler state
    this.activeServices = new Set(['auth-service']); // Default monitored service
    this.anomalyCheckInterval = process.env.ANOMALY_CHECK_INTERVAL || '*/30 * * * *'; // Every minute by default
    this.healthCheckInterval = process.env.HEALTH_CHECK_INTERVAL || '0 */6 * * *'; // Every 6 hours by default
    
    logger.info('Scheduler service initialized');
  }
  
  // Start scheduling jobs
  start() {
    if (this.isRunning) {
      logger.info('Scheduler is already running');
      return;
    }

    // Set running state to true
    this.isRunning = true;

    // Schedule jobs but only execute if isRunning is true
    this.jobs.push(cron.schedule(this.anomalyCheckInterval, () => {
      if (this.isRunning) {
        this.runAnomalyCheck();
      } else {
        logger.debug('Anomaly check skipped: Scheduler is stopped');
      }
    }));
    
    this.jobs.push(cron.schedule(this.healthCheckInterval, () => {
      if (this.isRunning) {
        this.runHealthCheck();
      } else {
        logger.debug('Health check skipped: Scheduler is stopped');
      }
    }));
    
    logger.info(`Scheduler started. Anomaly checks every ${this.anomalyCheckInterval}, health checks every ${this.healthCheckInterval}`);
  }

  // Stop scheduler by setting isRunning to false
  stop() {
    if (!this.isRunning) {
      logger.info('Scheduler is already stopped');
      return;
    }

    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  // Check if scheduler is running
  isSchedulerRunning() {
    return this.isRunning;
  }

  // Main anomaly detection check that runs per schedule
  async runAnomalyCheck() {
    // Prevent concurrent runs
    if (this.runningCheck) {
      logger.debug('Skipping anomaly check as previous check still running');
      return;
    }
    
    this.runningCheck = true;
    logger.info('Starting scheduled anomaly check');
    
    try {
      for (const service of this.activeServices) {
        await this.checkServiceAnomalies(service);
      }
    } catch (error) {
      logger.error(`Error in anomaly check: ${error.message}`);
    } finally {
      this.runningCheck = false;
      logger.info('Completed scheduled anomaly check');
    }
  }

  // Check a specific service for anomalies
  async checkServiceAnomalies(serviceName) {
    try {
      logger.info(`Checking anomalies for service: ${serviceName}`);
      
      // Use a short time window (last 5 minutes)
      const timeRange = this.getTimeRangeForAnomalyCheck();
      
      // Run correlation for this time window
      const result = await correlationService.correlateByTimeWindow({
        serviceName,
        startTime: timeRange.start,
        endTime: timeRange.end,
        threshold: 0.05 // 5% error rate threshold
      });
      
      if (result.anomaliesDetected) {
        logger.info(`Anomalies detected for ${serviceName}: ${result.anomalyCount} anomalies found`);
      } else {
        logger.debug(`No anomalies detected for ${serviceName}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error checking service ${serviceName}: ${error.message}`);
      return null;
    }
  }

  // Run health check (longer time period analysis)
  async runHealthCheck() {
    logger.info('Starting scheduled health check');
    
    try {
      for (const service of this.activeServices) {
        await this.checkServiceHealth(service);
      }
    } catch (error) {
      logger.error(`Error in health check: ${error.message}`);
    }
    
    logger.info('Completed scheduled health check');
  }

  // Check a specific service's health over a longer period
  async checkServiceHealth(serviceName) {
    try {
      logger.info(`Running health check for service: ${serviceName}`);
      
      // Use a longer time window (last hour)
      const timeRange = this.getTimeRangeForHealthCheck();
      
      // Run a more comprehensive correlation
      const result = await correlationService.correlateByTimeWindow({
        serviceName,
        startTime: timeRange.start,
        endTime: timeRange.end,
        threshold: 0.03 // Lower threshold for health check (3%)
      });
      
      return result;
    } catch (error) {
      logger.error(`Error checking health for service ${serviceName}: ${error.message}`);
      return null;
    }
  }

  // Get a 5-minute time window for anomaly checks
  getTimeRangeForAnomalyCheck() {
    const end = new Date();
    const start = new Date(end);
    start.setMinutes(end.getMinutes() - 5);
    return { start, end };
  }

  // Get a 1-hour time window for health checks
  getTimeRangeForHealthCheck() {
    const end = new Date();
    const start = new Date(end);
    start.setHours(end.getHours() - 1);
    return { start, end };
  }

  // Get list of currently active services
  getActiveServices() {
    return Array.from(this.activeServices);
  }
  
  // Add a service to monitor
  addService(serviceName) {
    this.activeServices.add(serviceName);
    logger.info(`Now monitoring service: ${serviceName}`);
  }

  // Remove a service from monitoring
  removeService(serviceName) {
    this.activeServices.delete(serviceName);
    logger.info(`Stopped monitoring service: ${serviceName}`);
  }
}

module.exports = new SchedulerService();