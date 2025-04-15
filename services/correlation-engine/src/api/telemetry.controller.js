const metricsClient = require('../services/telemetry/metrics-client');
const logsClient = require('../services/telemetry/logs-client');
const tracesClient = require('../services/telemetry/traces-client');
const logger = require('pino')();

/**
 * Metrics controller functions
 */

exports.getMetrics = async (req, res) => {
  try {
    const { service, start, end, type = 'requestRate', step = '15s' } = req.query;
    
    if (!service || !start || !end) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide service, start, and end times.' 
      });
    }
    
    // Validate time inputs
    let timeRange;
    try {
      timeRange = {
        start: new Date(start),
        end: new Date(end)
      };
      
      if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return res.status(400).json({ 
        error: `Invalid time format: ${error.message}`,
        receivedParams: { start, end }
      });
    }
    
    let metricsData = [];
    let formattedData = [];
    
    // For error rate, we'll use the request rate data and calculate it differently
    if (type === 'errorRate') {
      // Get request data with status codes
      const requestRateData = await metricsClient.getRequestRateByService(service, timeRange, step);
      
      // First convert to our formatted structure to preserve all metadata
      const requestDetails = [];
      requestRateData.forEach(metricSeries => {
        const metric = metricSeries.metric || {};
        const values = metricSeries.values || [];
        
        values.forEach(([timestamp, value]) => {
          requestDetails.push({
            timestamp,
            value: parseFloat(value),
            uri: metric.uri || '',
            status: metric.status || '',
            method: metric.method || 'ALL',
            service
          });
        });
      });
      
      // Group by timestamp and URI to calculate error rates
      const groupedByTime = {};
      
      // Group all requests by timestamp and URI
      requestDetails.forEach(detail => {
        const timeKey = detail.timestamp;
        const uriKey = detail.uri;
        
        if (!groupedByTime[timeKey]) {
          groupedByTime[timeKey] = {};
        }
        
        if (!groupedByTime[timeKey][uriKey]) {
          groupedByTime[timeKey][uriKey] = {
            total: 0,
            errors: 0,
            errorDetails: [],
            timestamp: detail.timestamp,
            uri: detail.uri,
            method: detail.method,
            service: detail.service
          };
        }
        
        const count = detail.value || 0;
        groupedByTime[timeKey][uriKey].total += count;
        
        // Check if this is an error status
        const status = detail.status;
        const isError = status.startsWith('4') || status.startsWith('5');
        
        if (isError) {
          groupedByTime[timeKey][uriKey].errors += count;
          // Store error details for reporting
          groupedByTime[timeKey][uriKey].errorDetails.push({
            status,
            count
          });
        }
      });
      
      // Convert the grouped data to our formatted output
      Object.values(groupedByTime).forEach(uriMap => {
        Object.values(uriMap).forEach(data => {
          // Calculate error rate as percentage
          const errorRate = data.total > 0 ? (data.errors / data.total) * 100 : 0;
          
          // For each time point, add one entry per URI showing the error rate
          formattedData.push({
            timestamp: new Date(data.timestamp * 1000).toISOString(),
            value: errorRate,
            uri: data.uri,
            status: data.errorDetails.length > 0 ? 
                   data.errorDetails.map(d => d.status).join(',') : "", // Include all error statuses
            method: data.method,
            service: data.service,
            metricName: "errorRate",
            totalRequests: data.total,
            errorRequests: data.errors
          });
        });
      });
    } else {
      // For other metrics, use the existing client methods
      const metricFunctions = {
        'requestRate': async () => metricsClient.getRequestRateByService(service, timeRange, step),
        'latency': async () => metricsClient.getLatencyByService(service, timeRange, step),
        'cpuUsage': async () => metricsClient.getCpuUsageByService(service, timeRange, step),
        'memoryUsage': async () => metricsClient.getJvmMemoryUsage(service, timeRange, step),
        'dbConnections': async () => metricsClient.getDbConnectionPoolMetrics(service, timeRange, step),
        'gcPauseTime': async () => metricsClient.getGcPauseTime(service, timeRange, step),
        'threadStates': async () => metricsClient.getThreadStates(service, timeRange, step)
      };
      
      if (type in metricFunctions) {
        metricsData = await metricFunctions[type]();
        
        // Transform the data to a format expected by the frontend
        metricsData.forEach(metricSeries => {
          const metric = metricSeries.metric || {};
          const values = metricSeries.values || [];
          
          values.forEach(([timestamp, value]) => {
            formattedData.push({
              timestamp: new Date(timestamp * 1000).toISOString(),
              value: parseFloat(value),
              uri: metric.uri || '',
              status: metric.status || '',
              method: metric.method || 'ALL',
              area: metric.area || '',
              service,
              metricName: metric.calculated || metric.__name__ || type
            });
          });
        });
      } else {
        return res.status(400).json({ 
          error: `Unknown metric type: ${type}`,
          availableTypes: [...Object.keys(metricFunctions), 'errorRate']
        });
      }
    }
    
    res.status(200).json(formattedData);
  } catch (error) {
    console.error(`Error fetching metrics: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ 
      error: `Failed to fetch metrics: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


/**
 * Logs controller functions
 */
exports.getLogs = async (req, res) => {
  try {
    const { 
      service, 
      start, 
      end, 
      level,
      logger: loggerName,
      search,
      traceId,
      limit = 100
    } = req.query;
    
    if (!service && !traceId) {
      return res.status(400).json({ error: 'Missing required parameter: either service or traceId must be provided' });
    }
    
    let logs = [];
        // Add validation for start and end
        let startTime, endTime;
        try {
          startTime = start ? new Date(start) : new Date(Date.now() - 3600000);
          if (isNaN(startTime.getTime())) {
            throw new Error(`Invalid start time: ${start}`);
          }
          
          endTime = end ? new Date(end) : new Date();
          if (isNaN(endTime.getTime())) {
            throw new Error(`Invalid end time: ${end}`);
          }
          
          console.log(`Validated time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
        } catch (error) {
          return res.status(400).json({ 
            error: `Invalid time format: ${error.message}`,
            receivedParams: { start, end }
          });
        }
    
    // Handle trace-specific logs
    if (traceId) {
      logs = await logsClient.getLogsByTraceId(traceId, parseInt(limit));
    } 
    // Handle search query
    else if (search) {
      const timeRange = {
        start: start ? new Date(start) : new Date(Date.now() - 3600000), // Default to 1 hour ago
        end: end ? new Date(end) : new Date()
      };
      logs = await logsClient.searchLogs(service, search, timeRange, parseInt(limit));
    }
    // Handle error logs specifically
    else if (level && (level.toLowerCase() === 'error' || level.toLowerCase() === 'fatal' || level.toLowerCase() === 'warn')) {
      const timeRange = {
        start: start ? new Date(start) : new Date(Date.now() - 3600000), // Default to 1 hour ago
        end: end ? new Date(end) : new Date()
      };
      logs = await logsClient.getErrorLogs(service, timeRange, parseInt(limit));
    }
    // Regular log retrieval
    else {
      const timeRange = {
        start: start ? new Date(start) : new Date(Date.now() - 3600000),
        end: end ? new Date(end) : new Date()
      };
      logs = await logsClient.getLogs(service, timeRange, parseInt(limit));
    }
    
    // Additional filtering based on level or logger if not handled by client
    if (level && level.toLowerCase() !== 'error' && level.toLowerCase() !== 'fatal' && level.toLowerCase() !== 'warn') {
      logs = logs.filter(log => (log.level || '').toLowerCase() === level.toLowerCase());
    }
    
    if (loggerName) {
      logs = logs.filter(log => {
        const loggerField = log.logger_name || log.logger || '';
        return loggerField.includes(loggerName);
      });
    }
    
    // Sort logs by timestamp (newest first)
    logs.sort((a, b) => {
      const timestampA = a['@timestamp'] || a.timestamp || '';
      const timestampB = b['@timestamp'] || b.timestamp || '';
      return new Date(timestampB) - new Date(timestampA);
    });
    
    res.status(200).json(logs);
  } catch (error) {
    logger.error(`Error fetching logs: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch logs: ${error.message}` });
  }
};

/**
 * Correlation controller functions
 */
exports.getCorrelatedLogs = async (req, res) => {
  try {
    const { traceId, limit = 100 } = req.query;
    
    if (!traceId) {
      return res.status(400).json({ error: 'Missing required parameter: traceId' });
    }
    
    const logs = await logsClient.getCorrelatedLogs(traceId, parseInt(limit));
    
    // Sort logs by timestamp (chronological order for correlation display)
    logs.sort((a, b) => {
      const timestampA = a['@timestamp'] || a.timestamp || '';
      const timestampB = b['@timestamp'] || b.timestamp || '';
      return new Date(timestampA) - new Date(timestampB);
    });
    
    res.status(200).json(logs);
  } catch (error) {
    logger.error(`Error fetching correlated logs: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch correlated logs: ${error.message}` });
  }
};

/**
 * Traces controller functions
 */
exports.getTraces = async (req, res) => {
  try {
    const {
      service,
      start,
      end,
      operation,
      minDuration,
      maxDuration,
      tags,
      limit = 20
    } = req.query;
    
    if (!service) {
      return res.status(400).json({ error: 'Missing required parameter: service' });
    }
    
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 3600000),
      end: end ? new Date(end) : new Date()
    };
    
    let traces;
    
    // Special handling for error traces if tags include error=true
    if (tags && tags.includes('error=true')) {
      traces = await tracesClient.findErrorTraces(service, timeRange, parseInt(limit));
    } else {
      traces = await tracesClient.getTraces(service, timeRange, parseInt(limit));
    }
    
    // Additional client-side filtering
    if (operation || minDuration || maxDuration) {
      traces = traces.filter(trace => {
        // Filter by operation
        if (operation && !trace.spans.some(span => 
          span.operationName && span.operationName.includes(operation))) {
          return false;
        }
        
        // Filter by duration
        if (minDuration && trace.duration < parseInt(minDuration)) {
          return false;
        }
        
        if (maxDuration && trace.duration > parseInt(maxDuration)) {
          return false;
        }
        
        return true;
      });
    }
    
    res.status(200).json(traces);
  } catch (error) {
    logger.error(`Error fetching traces: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch traces: ${error.message}` });
  }
};

exports.getTrace = async (req, res) => {
  try {
    const { traceId } = req.params;
    
    if (!traceId) {
      return res.status(400).json({ error: 'Missing trace ID' });
    }
    
    const trace = await tracesClient.getTrace(traceId);
    
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    
    res.status(200).json(trace);
  } catch (error) {
    logger.error(`Error fetching trace: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch trace: ${error.message}` });
  }
};

/**
 * Correlation engine
 */
exports.correlateIssues = async (req, res) => {
  try {
    const { 
      service, 
      start, 
      end, 
      metricThreshold = 0.1,  // 10% error rate threshold
      limit = 5               // Top 5 issues
    } = req.query;
    
    if (!service || !start || !end) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide service, start, and end times.' 
      });
    }
    
    const timeRange = {
      start: new Date(start),
      end: new Date(end)
    };
    
    // 1. Identify error rate anomalies
    const errorRateMetrics = await metricsClient.getErrorRateByService(service, timeRange);
    
    // Find time periods with high error rates
    const anomalyPeriods = [];
    errorRateMetrics.forEach(metricSeries => {
      const values = metricSeries.values || [];
      
      values.forEach(([timestamp, value]) => {
        if (parseFloat(value) > metricThreshold) {
          anomalyPeriods.push({
            timestamp: new Date(timestamp * 1000),
            errorRate: parseFloat(value),
            endpoint: metricSeries.metric?.route || 'unknown'
          });
        }
      });
    });
    
    // 2. For each anomaly period, get error logs in a narrow time window
    const correlatedIssues = [];
    
    for (const anomaly of anomalyPeriods.slice(0, limit)) {
      // Create a narrow time window around the anomaly (±30 seconds)
      const anomalyTimeRange = {
        start: new Date(anomaly.timestamp.getTime() - 30000),
        end: new Date(anomaly.timestamp.getTime() + 30000)
      };
      
      // Get error logs in this time window
      const errorLogs = await logsClient.getErrorLogs(service, anomalyTimeRange, 20);
      
      // Get traces with errors in this time window
      let errorTraces = [];
      if (errorLogs.length > 0) {
        // Extract trace IDs from logs
        const traceIds = errorLogs
          .filter(log => log.trace_id)
          .map(log => log.trace_id);
        
        // Get traces for these trace IDs
        if (traceIds.length > 0) {
          const uniqueTraceIds = [...new Set(traceIds)];
          errorTraces = await Promise.all(
            uniqueTraceIds.slice(0, 5).map(id => tracesClient.getTrace(id))
          );
          errorTraces = errorTraces.filter(trace => trace); // Remove null values
        }
      }
      
      correlatedIssues.push({
        anomalyTime: anomaly.timestamp,
        endpoint: anomaly.endpoint,
        errorRate: anomaly.errorRate,
        errorLogs: errorLogs,
        relatedTraces: errorTraces,
        possibleCauses: errorLogs.map(log => log.message).slice(0, 5)
      });
    }
    
    res.status(200).json({
      service,
      timeRange,
      correlatedIssues
    });
  } catch (error) {
    logger.error(`Error in correlation engine: ${error.message}`);
    res.status(500).json({ error: `Failed to correlate issues: ${error.message}` });
  }
};

/**
 * Health check controller
 */
exports.getHealth = async (req, res) => {
  try {
    // Basic health check - test clients
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        metrics: { status: 'UP' },
        logs: { status: 'UP' },
        traces: { status: 'UP' }
      }
    };
    
    // Test metrics client
    try {
      await metricsClient.query('up', new Date());
    } catch (error) {
      health.services.metrics = { 
        status: 'DOWN',
        error: error.message
      };
      health.status = 'DEGRADED';
    }
    
    // Test logs client
    try {
      await logsClient.esClient.ping();
    } catch (error) {
      health.services.logs = { 
        status: 'DOWN',
        error: error.message
      };
      health.status = 'DEGRADED';
    }
    
    // Test traces client
    try {
      // Just a basic request to check if the service is responding
      await tracesClient.client.get('/api/services');
    } catch (error) {
      health.services.traces = { 
        status: 'DOWN',
        error: error.message
      };
      health.status = 'DEGRADED';
    }
    
    res.status(200).json(health);
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({ 
      status: 'DOWN',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};