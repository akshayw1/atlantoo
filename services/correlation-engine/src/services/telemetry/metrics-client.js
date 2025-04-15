// If you're missing the complete metrics-client.js implementation, here's a minimal version:
const axios = require('axios');
const logger = require('pino')();
class MetricsClient {
  constructor() {
    this.baseUrl = process.env.VICTORIA_METRICS_URL || 'http://victoria-metrics:8428';
    this.apiPath = '/api/v1';
    
    logger.info(`Metrics client initialized with VictoriaMetrics endpoint: ${this.baseUrl}`);
  }
  
  /**
   * Perform a direct PromQL query to VictoriaMetrics
   */
  async query(query, time = new Date()) {
    try {
      const params = {
        query: query,
        time: Math.floor(time.getTime() / 1000)
      };
      
      const response = await axios.get(`${this.baseUrl}${this.apiPath}/query`, { params });
      
      if (response.data && response.data.data && response.data.data.result) {
        return response.data.data.result;
      }
      
      return [];
    } catch (error) {
      logger.error(`Error querying metrics: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Perform a range query to VictoriaMetrics
   */
  async queryRange(query, timeRange, step = '15s') {
    try {
      const params = {
        query: query,
        start: Math.floor(timeRange.start.getTime() / 1000),
        end: Math.floor(timeRange.end.getTime() / 1000),
        step: step
      };
      
      const response = await axios.get(`${this.baseUrl}${this.apiPath}/query_range`, { params });
      
      if (response.data && response.data.data && response.data.data.result) {
        return response.data.data.result;
      }
      
      return [];
    } catch (error) {
      logger.error(`Error querying metrics range: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get HTTP request rate by service
   */
  async getRequestRateByService(service, timeRange, step = '15s') {
    const query = `sum(rate(http_server_requests_seconds_count{job="${service}"}[5m])) by (uri, method, status)`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get HTTP error rate by service
   */
  async getErrorRateByService(service, timeRange, step = '15s') {
    const query = `sum(rate(http_server_requests_seconds_count{job="${service}", status=~"5..|4.."}[5m])) by (uri) / sum(rate(http_server_requests_seconds_count{job="${service}"}[5m])) by (uri) * 100`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get HTTP latency by service
   */
  async getLatencyByService(service, timeRange, step = '15s') {
    const query = `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{job="${service}"}[5m])) by (uri, le))`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get JVM memory usage as percentage
   */
  async getJvmMemoryUsage(service, timeRange, step = '15s') {
    const query = `sum(jvm_memory_used_bytes{job="${service}",area="heap"}) / sum(jvm_memory_max_bytes{job="${service}",area="heap"}) * 100`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get database connection pool metrics
   */
  async getDbConnectionPoolMetrics(service, timeRange, step = '15s') {
    const query = `sum(hikaricp_connections_active{job="${service}"}) / sum(hikaricp_connections_max{job="${service}"}) * 100`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get CPU usage as percentage
   */
  async getCpuUsageByService(service, timeRange, step = '15s') {
    const query = `process_cpu_usage{job="${service}"} * 100`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get GC pause time
   */
  async getGcPauseTime(service, timeRange, step = '15s') {
    const query = `rate(jvm_gc_pause_seconds_sum{job="${service}"}[5m]) / rate(jvm_gc_pause_seconds_count{job="${service}"}[5m])`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get thread states
   */
  async getThreadStates(service, timeRange, step = '15s') {
    const query = `jvm_threads_states{job="${service}"}`;
    return this.queryRange(query, timeRange, step);
  }
  
  /**
   * Get all service health metrics
   */
  async getServiceHealthMetrics(service, timeRange, step = '15s') {
    try {
      const [requestRate, errorRate, latency, memoryUsage, dbConnections, cpuUsage] = await Promise.all([
        this.getRequestRateByService(service, timeRange, step),
        this.getErrorRateByService(service, timeRange, step),
        this.getLatencyByService(service, timeRange, step),
        this.getJvmMemoryUsage(service, timeRange, step),
        this.getDbConnectionPoolMetrics(service, timeRange, step),
        this.getCpuUsageByService(service, timeRange, step)
      ]);
      
      return {
        requestRate,
        errorRate,
        latency,
        memoryUsage,
        dbConnections,
        cpuUsage
      };
    } catch (error) {
      logger.error(`Error fetching health metrics: ${error.message}`);
      return {};
    }
  }
}

const metricsClient = new MetricsClient();
module.exports = metricsClient;