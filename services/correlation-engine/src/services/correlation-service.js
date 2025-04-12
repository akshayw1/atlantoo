const { v4: uuidv4 } = require('uuid');
const tracesClient = require('./telemetry/traces-client');
const metricsClient = require('./telemetry/metrics-client');
const logsClient = require('./telemetry/logs-client');
const Incident = require('../models/incident');
const Correlation = require('../models/correlation');
const logger = require('pino')();

class CorrelationService {
  constructor() {
    logger.info('Correlation service initialized');
  }

  async correlateByTimeWindow(params) {
    const { 
      serviceName, 
      startTime, 
      endTime, 
      includeTraces = true,
      includeMetrics = true,
      includeLogs = true
    } = params;

    logger.info(`Starting correlation for service ${serviceName} from ${startTime} to ${endTime}`);
    
    const timeRange = {
      start: new Date(startTime),
      end: new Date(endTime)
    };
    
    // Create a correlation ID
    const correlationId = uuidv4();
    
    // Gather telemetry data in parallel
    const [traces, metrics, logs] = await Promise.all([
      includeTraces ? this._getTraces(serviceName, timeRange) : [],
      includeMetrics ? this._getMetrics(serviceName, timeRange) : [],
      includeLogs ? this._getLogs(serviceName, timeRange) : []
    ]);
    
    // Create an incident record
    const incident = await this._createIncident(serviceName, timeRange, traces, metrics, logs);
    
    // Store the correlation result
    const correlation = await this._storeCorrelation(correlationId, incident._id, timeRange, traces, metrics, logs);
    
    logger.info(`Correlation completed with ID: ${correlationId}`);
    
    return {
      correlationId,
      incidentId: incident._id,
      timeWindow: timeRange,
      summary: {
        traceCount: traces.length,
        metricCount: Object.keys(metrics).length,
        logCount: logs.length,
        errorCount: logs.filter(log => log.level === 'error').length
      }
    };
  }
  
  async correlateByTraceId(traceId) {
    logger.info(`Starting correlation for trace ID: ${traceId}`);
    
    // Get the trace
    const trace = await tracesClient.getTrace(traceId);
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }
    
    // Determine time range from the trace
    const spanTimestamps = trace.spans.map(span => span.startTime);
    const startTime = new Date(Math.min(...spanTimestamps));
    const endTime = new Date(Math.max(...spanTimestamps));
    
    // Add buffer around the time window
    startTime.setMinutes(startTime.getMinutes() - 5);
    endTime.setMinutes(endTime.getMinutes() + 5);
    
    const serviceName = trace.processes[trace.spans[0].processID].serviceName;
    
    // Get related telemetry
    const timeRange = { start: startTime, end: endTime };
    const [metrics, logs] = await Promise.all([
      this._getMetrics(serviceName, timeRange),
      this._getLogs(serviceName, timeRange)
    ]);
    
    // Find logs with matching trace ID
    const traceRelatedLogs = await logsClient.getLogsByTraceId(traceId);
    
    // Create a correlation ID
    const correlationId = uuidv4();
    
    // Create an incident record
    const incident = await this._createIncident(
      serviceName, 
      timeRange, 
      [trace], 
      metrics, 
      [...logs, ...traceRelatedLogs]
    );
    
    // Store the correlation result
    const correlation = await this._storeCorrelation(
      correlationId, 
      incident._id, 
      timeRange, 
      [trace], 
      metrics, 
      [...logs, ...traceRelatedLogs]
    );
    
    logger.info(`Correlation completed with ID: ${correlationId}`);
    
    return {
      correlationId,
      incidentId: incident._id,
      traceId,
      serviceName,
      timeWindow: timeRange,
      summary: {
        spanCount: trace.spans.length,
        metricCount: Object.keys(metrics).length,
        logCount: logs.length + traceRelatedLogs.length,
        errorCount: logs.filter(log => log.level === 'error').length
      }
    };
  }
  
  // Helper methods
  async _getTraces(serviceName, timeRange) {
    try {
      const traces = await tracesClient.getTraces(serviceName, timeRange);
      logger.debug(`Retrieved ${traces.length} traces for service ${serviceName}`);
      return traces;
    } catch (error) {
      logger.error(`Error fetching traces: ${error.message}`);
      return [];
    }
  }
  
  async _getMetrics(serviceName, timeRange) {
    try {
      const results = {};
      
      // Get request rate
      results.requestRate = await metricsClient.getRequestRateByService(serviceName, timeRange);
      
      // Get error rate
      results.errorRate = await metricsClient.getErrorRateByService(serviceName, timeRange);
      
      // Get latency
      results.latency = await metricsClient.getLatencyByService(serviceName, timeRange);
      
      logger.debug(`Retrieved metrics for service ${serviceName}`);
      return results;
    } catch (error) {
      logger.error(`Error fetching metrics: ${error.message}`);
      return {};
    }
  }
  
  async _getLogs(serviceName, timeRange) {
    try {
      const logs = await logsClient.getLogs(serviceName, timeRange);
      logger.debug(`Retrieved ${logs.length} logs for service ${serviceName}`);
      return logs;
    } catch (error) {
      logger.error(`Error fetching logs: ${error.message}`);
      return [];
    }
  }
  
  async _createIncident(serviceName, timeRange, traces, metrics, logs) {
    // Determine severity based on telemetry data
    let severity = 'low';
    const errorLogs = logs.filter(log => log.level === 'error');
    
    if (errorLogs.length > 10) {
      severity = 'critical';
    } else if (errorLogs.length > 5) {
      severity = 'high';
    } else if (errorLogs.length > 0) {
      severity = 'medium';
    }
    
    // Extract affected endpoints
    const affectedEndpoints = new Set();
    traces.forEach(trace => {
      trace.spans.forEach(span => {
        if (span.tags) {
          const httpRoute = span.tags.find(tag => tag.key === 'http.route');
          if (httpRoute) {
            affectedEndpoints.add(httpRoute.value);
          }
        }
      });
    });
    
    // Create incident
    const incident = new Incident({
      title: `Incident in ${serviceName}`,
      service: serviceName,
      severity,
      status: 'active',
      startTime: timeRange.start,
      affectedEndpoints: [...affectedEndpoints],
      detectionSource: 'correlation',
      metadata: {
        traceCount: String(traces.length),
        errorLogCount: String(errorLogs.length)
      }
    });
    
    await incident.save();
    logger.info(`Created incident: ${incident._id}`);
    return incident;
  }
  
  async _storeCorrelation(correlationId, incidentId, timeRange, traces, metrics, logs) {
    // Transform traces to the format expected by our model
    const transformedTraces = traces.map(trace => {
      const rootSpan = trace.spans.find(span => !span.references || span.references.length === 0) || trace.spans[0];
      return {
        traceId: trace.traceID,
        serviceName: trace.processes[rootSpan.processID]?.serviceName || 'unknown',
        operationName: rootSpan.operationName,
        timestamp: new Date(rootSpan.startTime / 1000), // Convert from microseconds
        durationMs: rootSpan.duration / 1000, // Convert from microseconds
        hasError: trace.spans.some(span => 
          span.tags && span.tags.some(tag => tag.key === 'error' && tag.value === true)
        )
      };
    });
    
    // Transform metrics
    const transformedMetrics = [];
    
    // Request rate metrics
    if (metrics.requestRate) {
      metrics.requestRate.forEach(series => {
        transformedMetrics.push({
          name: 'request_rate',
          labels: new Map(Object.entries(series.metric || {})),
          values: series.values?.map(point => ({
            timestamp: new Date(point[0] * 1000), // Convert from seconds
            value: point[1]
          })) || [],
          anomalyScore: 0 // This would be calculated in a real system
        });
      });
    }
    
    // Error rate metrics
    if (metrics.errorRate) {
      metrics.errorRate.forEach(series => {
        transformedMetrics.push({
          name: 'error_rate',
          labels: new Map(Object.entries(series.metric || {})),
          values: series.values?.map(point => ({
            timestamp: new Date(point[0] * 1000), // Convert from seconds
            value: point[1]
          })) || [],
          anomalyScore: 0
        });
      });
    }
    
    // Latency metrics
    if (metrics.latency) {
      metrics.latency.forEach(series => {
        transformedMetrics.push({
          name: 'latency_p95',
          labels: new Map(Object.entries(series.metric || {})),
          values: series.values?.map(point => ({
            timestamp: new Date(point[0] * 1000), // Convert from seconds
            value: point[1]
          })) || [],
          anomalyScore: 0
        });
      });
    }
    
    // Transform logs
    const transformedLogs = logs.map(log => ({
      level: log.level,
      message: log.message,
      timestamp: new Date(log.timestamp),
      service: log.service,
      traceId: log.traceId,
      attributes: new Map(Object.entries(log.attributes || {}))
    }));
    
    // Create correlation record
    const correlation = new Correlation({
      incidentId,
      correlationId,
      timeWindow: {
        start: timeRange.start,
        end: timeRange.end
      },
      telemetry: {
        traces: transformedTraces,
        metrics: transformedMetrics,
        logs: transformedLogs
      },
      analysisResults: {
        rootCauses: [],
        impactedServices: [logs[0]?.service || traces[0]?.processes?.[0]?.serviceName],
        anomalyDetected: logs.filter(log => log.level === 'error').length > 0,
        patternId: null
      }
    });
    
    await correlation.save();
    logger.info(`Stored correlation: ${correlationId}`);
    return correlation;
  }
}

module.exports = new CorrelationService();