// src/services/api.js
import axios from 'axios';

const CORRELATION_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const ANALYZER_API_URL = process.env.REACT_APP_ANALYZER_URL || 'http://localhost:3002/api';

const api = {
  // Metrics API
  getMetrics: async (serviceName, timeRange) => {
    const params = {
      service: serviceName,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    };
    const response = await axios.get(`${CORRELATION_API_URL}/metrics`, { params });
    return response.data;
  },

  // Logs API
  getLogs: async (serviceName, timeRange, filters = {}) => {
    const params = {
      service: serviceName,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
      ...filters
    };
    const response = await axios.get(`${CORRELATION_API_URL}/logs`, { params });
    return response.data;
  },

  // Traces API
  getTraces: async (serviceName, timeRange, filters = {}) => {
    const params = {
      service: serviceName,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
      ...filters
    };
    const response = await axios.get(`${CORRELATION_API_URL}/traces`, { params });
    return response.data;
  },

  getTrace: async (traceId) => {
    const response = await axios.get(`${CORRELATION_API_URL}/traces/${traceId}`);
    return response.data;
  },

  // Incidents API
  getIncidents: async (status, limit = 20) => {
    const params = {
      status,
      limit
    };
    const response = await axios.get(`${CORRELATION_API_URL}/incidents`, { params });
    return response.data;
  },

  getIncident: async (incidentId) => {
    const response = await axios.get(`${CORRELATION_API_URL}/incidents/${incidentId}`);
    return response.data;
  },

  updateIncidentStatus: async (incidentId, status) => {
    const response = await axios.put(`${CORRELATION_API_URL}/incidents/${incidentId}/status`, { status });
    return response.data;
  },

  // Correlations API
  getCorrelations: async () => {
    const response = await axios.get(`${CORRELATION_API_URL}/correlations`);
    return response.data;
  },

  getCorrelation: async (correlationId) => {
    const response = await axios.get(`${CORRELATION_API_URL}/correlations/${correlationId}`);
    return response.data;
  },

  createCorrelation: async (serviceName, timeRange) => {
    const payload = {
      serviceName,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString()
    };
    const response = await axios.post(`${CORRELATION_API_URL}/correlations/time-window`, payload);
    return response.data;
  },

  // AI Analysis API
  getAnalyses: async () => {
    const response = await axios.get(`${ANALYZER_API_URL}/analyses`);
    return response.data;
  },

  getAnalysis: async (analysisId) => {
    const response = await axios.get(`${ANALYZER_API_URL}/analyses/${analysisId}`);
    return response.data;
  },

  analyzeCorrelation: async (correlationId) => {
    const response = await axios.post(`${ANALYZER_API_URL}/analyze/correlation/${correlationId}`);
    return response.data;
  },

  // Remediation API
  getRemediations: async (status) => {
    const params = {
      status
    };
    const response = await axios.get(`${ANALYZER_API_URL}/remediations`, { params });
    return response.data;
  },

  approveRemediation: async (remediationId) => {
    const response = await axios.post(`${ANALYZER_API_URL}/remediations/${remediationId}/approve`);
    return response.data;
  },

  rejectRemediation: async (remediationId) => {
    const response = await axios.post(`${ANALYZER_API_URL}/remediations/${remediationId}/reject`);
    return response.data;
  },

  // System Status API
  getSystemStatus: async () => {
    try {
      const correlationStatus = await axios.get(`${CORRELATION_API_URL}/health`);
      const analyzerStatus = await axios.get(`${ANALYZER_API_URL}/health`);
      
      return {
        correlation: {
          status: correlationStatus.status === 200 ? 'UP' : 'DOWN',
          details: correlationStatus.data,
        },
        analyzer: {
          status: analyzerStatus.status === 200 ? 'UP' : 'DOWN',
          details: analyzerStatus.data,
        }
      };
    } catch (error) {
      return {
        correlation: { status: 'DOWN', error: error.message },
        analyzer: { status: 'DOWN', error: error.message }
      };
    }
  }
};

export default api;