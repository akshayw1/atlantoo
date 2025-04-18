const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const tracesClient = require('./telemetry/traces-client');
const metricsClient = require('./telemetry/metrics-client');
const logsClient = require('./telemetry/logs-client');
const Incident = require('../models/incident');
const Correlation = require('../models/correlation');
const logger = require('pino')();

class CorrelationService {
  constructor() {
    this.aiAnalyzerUrl = process.env.AI_ANALYZER_URL || 'http://ai-analyzer:3002';
    logger.info('Correlation service initialized');
  }

  // Main correlation function - analyzes a time window for anomalies
  async correlateByTimeWindow(params) {
    const {
      serviceName,
      startTime,
      endTime,
      threshold = 0.05 
    } = params;

    logger.info(`Starting correlation for service ${serviceName} from ${startTime} to ${endTime}`);

    const timeRange = {
      start: new Date(startTime),
      end: new Date(endTime)
    };

    // Create a correlation ID
    const correlationId = uuidv4();

    // Gather telemetry data
    const [traces, metricsData, logs] = await Promise.all([
      this._getTraces(serviceName, timeRange),
      this._getMetrics(serviceName, timeRange),
      this._getLogs(serviceName, timeRange)
    ]);

    // Check for threshold-based anomalies
    const thresholdAnomalies = this._detectThresholdAnomalies(metricsData, threshold);

    // Create telemetry context for AI analyzer
    const telemetryContext = {
      traces,
      metrics: metricsData,
      logs,
      timeRange,
      serviceName
    };


    console.log('Checking for AI anmaliess:');

    // Check for AI-based anomalies if there's enough data
    const aiAnomalies = await this._detectAIAnomalies(telemetryContext);

    console.log('AI anomalies:', aiAnomalies);
    // If no AI anomalies, use the last AI response
    const aiResponse = this.lastAiResponse || {
      summary: {
        title: 'No AI anomalies detected',
        description: 'No anomalies detected by AI analysis',
        severity: 'low',
        rootCauseHypothesis: null,
        recommendedNextSteps: null
      }
    };

    // Combine anomalies
    const allAnomalies = [...thresholdAnomalies, ...aiAnomalies];

    // If anomalies detected, create an incident
    let incident = null;
    if (allAnomalies.length > 0) {
      // Determine severity based on anomaly type and count
      const severity = this._calculateSeverity(allAnomalies);
      const aiTitle = aiResponse.summary?.title || "AI-detected anomaly";
      const aiDescription = aiResponse.summary?.description || "AI analysis detected an anomaly";

      // Extract impacted services
      const impactedServices = this._extractImpactedServices(traces, logs);

      // Create the incident
      incident = await this._createIncident(
        serviceName,
        timeRange,
        allAnomalies,
        aiResponse.summary?.severity || severity,
        impactedServices, {
        title: aiTitle,
        description: aiDescription,
        rootCause: aiResponse.summary?.rootCauseHypothesis,
        nextSteps: aiResponse.summary?.recommendedNextSteps
      }
      );

      // Store the correlation
      await this._storeCorrelation(
        correlationId,
        incident._id,
        timeRange,
        traces,
        metricsData,
        logs,
        allAnomalies
      );

      // Trigger AI analysis for solution recommendations
      if (incident) {
        await this._triggerAISolutionAnalysis(incident._id);
      }

      logger.info(`Correlation completed with ID: ${correlationId}. Found ${allAnomalies.length} anomalies.`);
    } else {
      logger.info(`Correlation completed with ID: ${correlationId}. No anomalies detected.`);
    }

    return {
      correlationId,
      incidentId: incident ? incident._id : null,
      timeWindow: timeRange,
      anomaliesDetected: allAnomalies.length > 0,
      anomalyCount: allAnomalies.length,
      thresholdAnomalies: thresholdAnomalies.length,
      // aiAnomalies: aiAnomalies.length
      aiAnomalies: [...aiAnomalies,...thresholdAnomalies]
    };
  }

  // Analyze a specific trace and find issues
  async correlateByTraceId(traceId) {
    logger.info(`Starting correlation for trace ID: ${traceId}`);

    // Get the trace
    const trace = await tracesClient.getTrace(traceId);
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    // Determine time range from the trace (with buffer)
    const spanTimestamps = trace.spans.map(span => span.startTime);
    const earliestTime = Math.min(...spanTimestamps);
    const latestTime = Math.max(
      ...trace.spans.map(span => span.startTime + span.duration)
    );

    // Convert from microseconds and add buffer
    const startTime = new Date(earliestTime / 1000 - 30000); // 30 seconds before
    const endTime = new Date(latestTime / 1000 + 30000);     // 30 seconds after

    // Extract service name from trace
    const primarySpan = trace.spans.find(span =>
      !span.references || span.references.length === 0
    ) || trace.spans[0];

    const serviceName = trace.processes[primarySpan.processID]?.serviceName;

    // Get related telemetry
    const timeRange = { start: startTime, end: endTime };
    const [metricsData, logs] = await Promise.all([
      this._getMetrics(serviceName, timeRange),
      logsClient.getLogsByTraceId(traceId, 100)
    ]);

    // Check for errors in this trace
    const traceAnomalies = this._analyzeTraceForAnomalies(trace);

    // Create a correlation ID
    const correlationId = uuidv4();

    // If anomalies found, create incident
    let incident = null;
    if (traceAnomalies.length > 0) {
      // Determine severity based on anomalies
      const severity = this._calculateSeverity(traceAnomalies);

      // Get services involved in this trace
      const impactedServices = Object.values(trace.processes)
        .map(p => p.serviceName)
        .filter(Boolean);

      // Create the incident
      incident = await this._createIncident(
        serviceName,
        timeRange,
        traceAnomalies,
        severity,
        impactedServices
      );

      // Store correlation
      await this._storeCorrelation(
        correlationId,
        incident._id,
        timeRange,
        [trace],
        metricsData,
        logs,
        traceAnomalies
      );

      // Trigger AI analysis
      if (incident) {
        await this._triggerAISolutionAnalysis(incident._id);
      }

      logger.info(`Trace correlation completed with ID: ${correlationId}. Found ${traceAnomalies.length} anomalies.`);
    } else {
      logger.info(`Trace correlation completed with ID: ${correlationId}. No anomalies detected.`);
    }

    return {
      correlationId,
      incidentId: incident ? incident._id : null,
      traceId,
      serviceName,
      timeWindow: timeRange,
      anomaliesDetected: traceAnomalies.length > 0,
      anomalyCount: traceAnomalies.length
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

      // Get basic metrics with confirmed working queries
      results.requestRate = await metricsClient.getRequestRateByService(serviceName, timeRange);
      results.errorRate = await metricsClient.getErrorRateByService(serviceName, timeRange);
      results.latency = await metricsClient.getLatencyByService(serviceName, timeRange);

      // Try to get resource metrics
      try {
        results.cpuUsage = await metricsClient.getCpuUsageByService(serviceName, timeRange);
        results.memoryUsage = await metricsClient.getJvmMemoryUsage(serviceName, timeRange);
      } catch (error) {
        logger.debug(`Resource metrics unavailable: ${error.message}`);
      }

      // Try to get database metrics
      try {
        results.dbConnections = await metricsClient.getDbConnectionPoolMetrics(serviceName, timeRange);
      } catch (error) {
        logger.debug(`DB metrics unavailable: ${error.message}`);
      }

      logger.debug(`Retrieved metrics for service ${serviceName}`);
      return results;
    } catch (error) {
      logger.error(`Error fetching metrics: ${error.message}`);
      return {};
    }
  }

  async _getLogs(serviceName, timeRange) {
    try {
      const logs = await logsClient.getLogs(serviceName, timeRange, 500);
      logger.debug(`Retrieved ${logs.length} logs for service ${serviceName}`);
      return logs;
    } catch (error) {
      logger.error(`Error fetching logs: ${error.message}`);
      return [];
    }
  }

  // Threshold-based anomaly detection
  _detectThresholdAnomalies(metricsData, threshold = 0.05) {
    const anomalies = [];

    // Check for error rate spikes
    if (metricsData.errorRate) {
      metricsData.errorRate.forEach(series => {
        const values = series.values || [];

        values.forEach(([timestamp, value]) => {
          if (parseFloat(value) > threshold * 100) { // Convert to percentage
            anomalies.push({
              type: 'error_rate_threshold',
              metric: 'error_rate',
              timestamp: new Date(timestamp * 1000),
              value: parseFloat(value),
              threshold: threshold * 100,
              endpoint: series.metric?.uri || 'unknown',
              detectionMethod: 'threshold'
            });
          }
        });
      });
    }

    // Check for latency spikes
    if (metricsData.latency) {
      // Use P95 latency threshold of 500ms
      const latencyThreshold = 500; // ms

      metricsData.latency.forEach(series => {
        const values = series.values || [];

        values.forEach(([timestamp, value]) => {
          if (parseFloat(value) > latencyThreshold) {
            anomalies.push({
              type: 'latency_threshold',
              metric: 'latency',
              timestamp: new Date(timestamp * 1000),
              value: parseFloat(value),
              threshold: latencyThreshold,
              endpoint: series.metric?.uri || 'unknown',
              detectionMethod: 'threshold'
            });
          }
        });
      });
    }

    // Check for CPU spikes
    if (metricsData.cpuUsage) {
      const cpuThreshold = 80; // 80% CPU usage

      metricsData.cpuUsage.forEach(series => {
        const values = series.values || [];

        values.forEach(([timestamp, value]) => {
          if (parseFloat(value) > cpuThreshold) {
            anomalies.push({
              type: 'cpu_threshold',
              metric: 'cpu_usage',
              timestamp: new Date(timestamp * 1000),
              value: parseFloat(value),
              threshold: cpuThreshold,
              detectionMethod: 'threshold'
            });
          }
        });
      });
    }

    // Check for memory spikes
    if (metricsData.memoryUsage) {
      const memoryThreshold = 85; // 85% memory usage

      metricsData.memoryUsage.forEach(series => {
        const values = series.values || [];

        values.forEach(([timestamp, value]) => {
          if (parseFloat(value) > memoryThreshold) {
            anomalies.push({
              type: 'memory_threshold',
              metric: 'memory_usage',
              timestamp: new Date(timestamp * 1000),
              value: parseFloat(value),
              threshold: memoryThreshold,
              detectionMethod: 'threshold'
            });
          }
        });
      });
    }

    return anomalies;
  }

  // Analyze trace for anomalies
  _analyzeTraceForAnomalies(trace) {
    const anomalies = [];

    // Check for error spans
    trace.spans.forEach(span => {
      // Check for error tags
      const hasErrorTag = span.tags && span.tags.some(tag =>
        tag.key === 'error' && (tag.value === true || tag.value === 'true')
      );

      // Check for error status codes
      const statusCodeTag = span.tags && span.tags.find(tag => tag.key === 'http.status_code');
      const statusCode = statusCodeTag ? parseInt(statusCodeTag.value) : null;
      const isErrorStatus = statusCode && statusCode >= 400;

      if (hasErrorTag || isErrorStatus) {
        anomalies.push({
          type: 'span_error',
          spanId: span.spanID,
          operationName: span.operationName,
          service: trace.processes[span.processID]?.serviceName || 'unknown',
          timestamp: new Date(span.startTime / 1000),
          statusCode,
          detectionMethod: 'trace_analysis',
          tags: span.tags || []
        });
      }

      // Check for slow spans (> 1 second)
      if (span.duration > 1000000) { // > 1 second in microseconds
        anomalies.push({
          type: 'span_latency',
          spanId: span.spanID,
          operationName: span.operationName,
          service: trace.processes[span.processID]?.serviceName || 'unknown',
          timestamp: new Date(span.startTime / 1000),
          duration: span.duration / 1000, // Convert to milliseconds
          threshold: 1000, // ms
          detectionMethod: 'trace_analysis'
        });
      }
    });

    return anomalies;
  }

  // Call AI anomaly detection
  async _detectAIAnomalies(telemetryContext) {
    try {
      // Skip AI detection if not enough data
      if (!telemetryContext.logs.length && !telemetryContext.traces.length) {
        return [];
      }

      console.log('Calling AI analyzer for anomaly detection');
      

      // Prepare the request data
      const requestData = {
        serviceName: telemetryContext.serviceName,
        timeRange: {
          start: telemetryContext.timeRange.start.toISOString(),
          end: telemetryContext.timeRange.end.toISOString()
        },
        telemetryStats: {
          logCount: telemetryContext.logs.length,
          traceCount: telemetryContext.traces.length,
          metricTypes: Object.keys(telemetryContext.metrics)
        },
        // Include sample data
        sampleLogs: telemetryContext.logs.slice(0, 10),
        sampleTraces: telemetryContext.traces.slice(0, 3).map(t => t.traceID),
        // Include error data
        errorLogs: telemetryContext.logs
          .filter(log => log.level && ['error', 'fatal'].includes(log.level.toLowerCase()))
          .slice(0, 20)
      };

      console.log('Request data for AI analyzer:');

      // Call the AI analyzer API
      const response = await axios.post(
        `${this.aiAnalyzerUrl}/api/detect/anomaly`,
        requestData,
        { timeout: 10000 }
      );

      console.log('AI analyzer response:', response.data);
      if (response.status !== 200) {
        throw new Error(`AI analyzer returned status ${response.status}`);
      }

      // Store the full AI response for later use
      this.lastAiResponse = response.data;

      if (response.data && response.data.anomalies) {
        // Add detection method to the anomalies
        const aiAnomalies = response.data.anomalies.map(anomaly => ({
          ...anomaly,
          detectionMethod: 'ai'
        }));

        logger.info(`AI anomaly detection found ${aiAnomalies.length} anomalies`);
        return aiAnomalies;
      }

      return [];
    } catch (error) {
      logger.error(`Error in AI anomaly detection: ${error.message}`);
      return [];
    }
  }

  // Calculate severity based on anomalies
  _calculateSeverity(anomalies) {
    if (!anomalies.length) return 'low';

    // Count different types of anomalies
    const errorCount = anomalies.filter(a =>
      a.type === 'error_rate_threshold' ||
      a.type === 'span_error'
    ).length;

    const latencyCount = anomalies.filter(a =>
      a.type === 'latency_threshold' ||
      a.type === 'span_latency'
    ).length;

    const resourceCount = anomalies.filter(a =>
      a.type === 'cpu_threshold' ||
      a.type === 'memory_threshold'
    ).length;

    // Determine severity based on counts and types
    if (errorCount > 5 || resourceCount > 3) {
      return 'critical';
    } else if (errorCount > 2 || latencyCount > 4 || resourceCount > 1) {
      return 'high';
    } else if (errorCount > 0 || latencyCount > 1) {
      return 'medium';
    }

    return 'low';
  }

  // Extract impacted services from telemetry
  _extractImpactedServices(traces, logs) {
    const services = new Set();

    // Extract from traces
    traces.forEach(trace => {
      Object.values(trace.processes || {}).forEach(process => {
        if (process.serviceName) {
          services.add(process.serviceName);
        }
      });
    });

    // Extract from logs
    logs.forEach(log => {
      if (log.service) {
        services.add(log.service);
      }
    });

    return Array.from(services);
  }

  // Create incident record
  async _createIncident(serviceName, timeRange, anomalies, severity, impactedServices) {
    try {
      // Extract affected endpoints from anomalies
      const affectedEndpoints = new Set();
      anomalies.forEach(anomaly => {
        if (anomaly.endpoint) {
          affectedEndpoints.add(anomaly.endpoint);
        }
      });

      // Get AI-enhanced information if available
      const aiAnomalies = anomalies.filter(a => a.detectionMethod === 'ai');
      const hasAiAnomalies = aiAnomalies.length > 0;

      // Create incident title and details
      let title, description, rootCause, nextSteps;

      if (hasAiAnomalies && this.lastAiResponse?.summary) {
        // Use AI-enhanced information
        title = this.lastAiResponse.summary.title || `${this._getPrimaryAnomalyType(anomalies)} detected in ${serviceName}`;
        description = this.lastAiResponse.summary.description || `Anomalies detected in ${serviceName}`;
        rootCause = this.lastAiResponse.summary.rootCauseHypothesis;
        nextSteps = this.lastAiResponse.summary.recommendedNextSteps;
      } else {
        // Use standard information
        title = `${this._getPrimaryAnomalyType(anomalies)} detected in ${serviceName}`;
        description = `Anomaly detection identified ${anomalies.length} issues in ${serviceName}`;
      }

      // Create incident record
      const incident = new Incident({
        title: title,
        service: serviceName,
        severity: severity || 'medium',
        status: 'active',
        startTime: timeRange.start,
        endTime: null, // Will be set when resolved
        affectedEndpoints: Array.from(affectedEndpoints),
        impactedServices: impactedServices || [serviceName],
        detectionSource: 'anomaly_detection',

        // AI-enhanced fields
        aiEnhancedTitle: hasAiAnomalies && this.lastAiResponse?.summary?.title ? true : false,
        aiDescription: description,
        rootCauseHypothesis: rootCause,
        recommendedNextSteps: nextSteps,

        // No solutions yet
        hasSolutions: false,
        solutions: [],

        // Anomaly details
        anomalies: anomalies.map(a => ({
          type: a.type,
          timestamp: a.timestamp,
          detectionMethod: a.detectionMethod,
          metric: a.metric,
          value: a.value,
          threshold: a.threshold,
          description: a.description,
          confidence: a.confidence,
          patterns: a.patterns
        })),

        metadata: {
          anomalyCount: String(anomalies.length),
          aiDetectedCount: String(anomalies.filter(a => a.detectionMethod === 'ai').length),
          thresholdDetectedCount: String(anomalies.filter(a => a.detectionMethod === 'threshold').length)
        }
      });

      await incident.save();
      logger.info(`Created incident ${incident._id} for service ${serviceName} with ${anomalies.length} anomalies`);
      return incident;
    } catch (error) {
      logger.error(`Error creating incident: ${error.message}`);
      throw error;
    }
  }

  // Get human-readable anomaly type
  _getPrimaryAnomalyType(anomalies) {
    // Count anomaly types
    const typeCounts = {};
    anomalies.forEach(anomaly => {
      typeCounts[anomaly.type] = (typeCounts[anomaly.type] || 0) + 1;
    });

    // Get the most common type
    const primaryType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Map to human-readable name
    const typeNames = {
      'error_rate_threshold': 'High Error Rate',
      'latency_threshold': 'High Latency',
      'cpu_threshold': 'High CPU Usage',
      'memory_threshold': 'High Memory Usage',
      'span_error': 'Error in Request',
      'span_latency': 'Slow Request'
    };

    return typeNames[primaryType] || 'Anomaly';
  }

  // Store correlation record
  async _storeCorrelation(correlationId, incidentId, timeRange, traces, metrics, logs, anomalies) {
    try {
      // Create correlation record
      const correlation = new Correlation({
        correlationId,
        incidentId,
        timeWindow: {
          start: timeRange.start,
          end: timeRange.end
        },
        telemetrySummary: {
          trace: traces,
          log: logs,
          metric: metrics
        },
        anomalies: anomalies.map(a => ({
          type: a.type,
          timestamp: a.timestamp,
          detectionMethod: a.detectionMethod,
          metric: a.metric,
          value: a.value,
          threshold: a.threshold
        })),
        status: 'created',
        aiAnalysisStatus: 'pending'
      });

      await correlation.save();
      logger.info(`Stored correlation: ${correlationId}`);
      return correlation;
    } catch (error) {
      logger.error(`Error storing correlation: ${error.message}`);
      throw error;
    }
  }

  async _triggerAISolutionAnalysis(incidentId) {
    try {
      logger.info(`Requesting AI solution analysis for incident ${incidentId}`);
  
      const response = await axios.post(
        `${this.aiAnalyzerUrl}/api/analyze/incidents/${incidentId}`,
        {}, 
        { timeout: 35000 } // 35 seconds timeout
      );
  
      if (response.data) {
        const { solutions, enhancedRootCause, errorLocation } = response.data;
  
        if (solutions && solutions.length > 0) {
          // Update the incident with solutions and error location
          await this._updateIncidentWithSolutions(
            incidentId,
            solutions,
            enhancedRootCause,
            errorLocation
          );
  
          logger.info(`Updated incident ${incidentId} with ${solutions.length} solutions`);
        } else {
          logger.warn(`No solutions returned for incident ${incidentId}`);
        }
  
        return response.data;
      } else {
        logger.warn(`No response data received for incident ${incidentId}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error triggering AI solution analysis: ${error.message}`);
      return null;
    }
  }

  async _updateIncidentWithSolutions(incidentId, solutions, enhancedRootCause, errorLocation) {
    try {
      logger.info(`Updating incident ${incidentId} with AI solutions`);
  
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }
  
      // Map solutions
      incident.solutions = solutions.map(solution => ({
        description: solution.description,
        steps: solution.steps || [],
        confidence: solution.confidence ?? 0.5,
        source: 'ai',
        implementationStatus: 'proposed'
      }));
  
      incident.hasSolutions = true;
  
      // Update root cause if enhanced
      if (enhancedRootCause) {
        incident.rootCauseHypothesis = enhancedRootCause;
      }
  
      // Update error location if provided
      if (errorLocation) {
        incident.errorLocation = errorLocation;
      }
  
      // Update status
      incident.status = 'investigating';
  
      await incident.save();
      logger.info(`Incident ${incidentId} updated successfully`);
      return incident;
    } catch (error) {
      logger.error(`Error updating incident with solutions: ${error.message}`);
      throw error;
    }
  }

}

module.exports = new CorrelationService();