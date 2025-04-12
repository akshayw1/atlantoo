const axios = require('axios');
const config = require('../../config');
const logger = require('pino')();

class MetricsClient {
  constructor() {
    this.baseUrl = config.victoriaMetricsUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
    logger.info(`Metrics client initialized with base URL: ${this.baseUrl}`);
  }

  async query(query, time) {
    try {
      const response = await this.client.get('/api/v1/query', {
        params: {
          query,
          time: time ? Math.floor(time.getTime() / 1000) : undefined
        }
      });
      
      logger.debug(`Metrics query executed: ${query}`);
      return response.data.data?.result || [];
    } catch (error) {
      logger.error(`Error executing metrics query: ${error.message}`);
      throw new Error(`Failed to execute metrics query: ${error.message}`);
    }
  }

  async queryRange(query, start, end, step = '15s') {
    try {
      const response = await this.client.get('/api/v1/query_range', {
        params: {
          query,
          start: Math.floor(start.getTime() / 1000),
          end: Math.floor(end.getTime() / 1000),
          step
        }
      });
      
      logger.debug(`Range metrics query executed: ${query}`);
      return response.data.data?.result || [];
    } catch (error) {
      logger.error(`Error executing range metrics query: ${error.message}`);
      throw new Error(`Failed to execute range metrics query: ${error.message}`);
    }
  }

  async getRequestRateByService(serviceName, timeRange) {
    const query = `sum(rate(manual_requests_total{job="${serviceName}"}[5m])) by (route)`;
    return this.queryRange(query, timeRange.start, timeRange.end);
  }

  async getErrorRateByService(serviceName, timeRange) {
    // This assumes we have status code labels in our metrics
    const query = `sum(rate(manual_requests_total{job="${serviceName}",status_code=~"5.."}[5m])) / sum(rate(manual_requests_total{job="${serviceName}"}[5m]))`;
    return this.queryRange(query, timeRange.start, timeRange.end);
  }

  async getLatencyByService(serviceName, timeRange) {
    const query = `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket{job="${serviceName}"}[5m])) by (le, route))`;
    return this.queryRange(query, timeRange.start, timeRange.end);
  }
}

module.exports = new MetricsClient();