const axios = require('axios');
const config = require('../../config');
const logger = require('pino')();

class TracesClient {
  constructor() {
    this.baseUrl = config.jaegerUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
    logger.info(`Traces client initialized with base URL: ${this.baseUrl}`);
  }

  async getTraces(serviceName, timeRange, limit = 20) {
    try {
      // Convert to Jaeger API format (microseconds)
      const start = Math.floor(timeRange.start.getTime() * 1000);
      const end = Math.floor(timeRange.end.getTime() * 1000);
      
      const response = await this.client.get('/api/traces', {
        params: {
          service: serviceName,
          start,
          end,
          limit
        }
      });
      
      logger.debug(`Retrieved ${response.data.data?.length || 0} traces for service ${serviceName}`);
      return response.data.data || [];
    } catch (error) {
      logger.error(`Error fetching traces: ${error.message}`);
      throw new Error(`Failed to fetch traces: ${error.message}`);
    }
  }

  async getTrace(traceId) {
    try {
      const response = await this.client.get(`/api/traces/${traceId}`);
      return response.data.data?.[0] || null;
    } catch (error) {
      logger.error(`Error fetching trace ${traceId}: ${error.message}`);
      throw new Error(`Failed to fetch trace: ${error.message}`);
    }
  }

  async findErrorTraces(serviceName, timeRange, limit = 20) {
    // Get traces then filter for errors
    const traces = await this.getTraces(serviceName, timeRange, limit * 2);
    return traces.filter(trace => {
      return trace.spans.some(span => span.tags.some(tag => 
        (tag.key === 'error' && tag.value === true) || 
        (tag.key === 'http.status_code' && parseInt(tag.value) >= 500)
      ));
    }).slice(0, limit);
  }
}

module.exports = new TracesClient();