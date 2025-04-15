const pino = require('pino');
const logger = pino();
const express = require('express');
const router = express.Router();
const { Client } = require('@elastic/elasticsearch');

class LogsClient {
  constructor() {
    // Initialize Elasticsearch client
    this.esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
    });
    
    logger.info('Logs client initialized with Elasticsearch connection');
      // console.log(`[DEBUG] Initializing Elasticsearch client with config: ${JSON.stringify(esConfig)}`);

    
    // Setup endpoint to receive logs (keeping this for backward compatibility)
    router.post('/logs', (req, res) => {
      const logEntry = {
        ...req.body,
        '@timestamp': req.body.timestamp || req.body['@timestamp'] || new Date().toISOString()
      };
      // Forward to Elasticsearch if needed
      this.addLog(logEntry);
      res.status(200).json({ status: 'ok' });
    });
  }

  // Add this router to your Express app
  getRouter() {
    return router;
  }

  // Add a log entry directly to Elasticsearch (optional)
  async addLog(log) {
    try {
      logger.debug(`Forwarding log to Elasticsearch: ${log.level} - ${log.message}`);
      await this.esClient.index({
        index: `auth-service-${new Date().toISOString().split('T')[0].replace(/-/g, '.')}`,
        body: log
      });
    } catch (error) {
      logger.error(`Error forwarding log to Elasticsearch: ${error.message}`);
    }
  }

  async getLogs(serviceName, timeRange, limit = 100) {
    try {
      console.log(`[DEBUG] Getting logs for service: ${serviceName}`);
      console.log(`[DEBUG] Time range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);
      console.log(`[DEBUG] Limit: ${limit}`);
      
      // Using the exact field names from your Elasticsearch mapping
      const queryBody = {
        size: limit,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            must: [
              // Use service.keyword for exact matching
              { term: { 'service.keyword': serviceName } },
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start.toISOString(),
                    lte: timeRange.end.toISOString()
                  }
                }
              }
            ]
          }
        }
      };
      
      console.log(`[DEBUG] Elasticsearch query: ${JSON.stringify(queryBody)}`);
      
      const response = await this.esClient.search({
        index: 'auth-service-*', // This matches your index pattern
        body: queryBody
      });
      
      console.log(`[DEBUG] Elasticsearch response status: ${response.statusCode}`);
      console.log(`[DEBUG] Total hits: ${response.hits?.total?.value || 'unknown'}`);
      
      if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
        console.log(`[DEBUG] First hit: ${JSON.stringify(response.hits.hits[0])}`);
      } else {
        console.log(`[DEBUG] No hits returned`);
        
        // Try a simpler query to see if we get any results
        const testResponse = await this.esClient.search({
          index: 'auth-service-*',
          body: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' } }]
          }
        });
        
        console.log(`[DEBUG] Test query returned ${testResponse.hits?.hits?.length || 0} hits`);
        if (testResponse.hits?.hits?.length > 0) {
          console.log(`[DEBUG] Sample document fields: ${Object.keys(testResponse.hits.hits[0]._source).join(', ')}`);
        }
      }
      
      const logs = response.hits?.hits?.map(hit => hit._source) || [];
      console.log(`[DEBUG] Retrieved ${logs.length} logs for service ${serviceName}`);
      return logs;
    } catch (error) {
      console.error(`[ERROR] Error retrieving logs from Elasticsearch: ${error.message}`);
      console.error(`[ERROR] Stack trace: ${error.stack}`);
      return [];
    }
  }
  
  async getErrorLogs(serviceName, timeRange, limit = 50) {
    try {
      const response = await this.esClient.search({
        index: 'auth-service-*',
        body: {
          size: limit,
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              must: [
                { term: { 'service.keyword': serviceName } },
                { 
                  terms: { 
                    'level.keyword': ['ERROR', 'FATAL', 'error', 'fatal', 'WARN', 'warn'] 
                  } 
                },
                {
                  range: {
                    '@timestamp': {
                      gte: timeRange.start.toISOString(),
                      lte: timeRange.end.toISOString()
                    }
                  }
                }
              ]
            }
          }
        }
      });
      
      const logs = response.hits.hits.map(hit => hit._source);
      logger.debug(`Retrieved ${logs.length} error logs for service ${serviceName}`);
      return logs;
    } catch (error) {
      logger.error(`Error retrieving error logs from Elasticsearch: ${error.message}`);
      return [];
    }
  }
  
  async getLogsByTraceId(traceId, limit = 50) {
    try {
      const response = await this.esClient.search({
        index: 'auth-service-*',
        body: {
          size: limit,
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              should: [
                { term: { 'trace_id': traceId } },
                { term: { 'trace_id.keyword': traceId } }
              ],
              minimum_should_match: 1
            }
          }
        }
      });
      
      const logs = response.hits.hits.map(hit => hit._source);
      logger.debug(`Retrieved ${logs.length} logs for trace ${traceId}`);
      return logs;
    } catch (error) {
      logger.error(`Error retrieving logs by trace ID from Elasticsearch: ${error.message}`);
      return [];
    }
  }
  // New method to get all logs across services with a specific trace ID
  async getCorrelatedLogs(traceId, limit = 100) {
    try {
      const response = await this.esClient.search({
        index: '*', // Search across all indices
        body: {
          size: limit,
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              should: [
                { term: { 'trace_id': traceId } },
                { term: { 'trace_id.keyword': traceId } },
                { term: { 'span_data.trace_id': traceId } },
                { term: { 'span_data.trace_id.keyword': traceId } }
              ],
              minimum_should_match: 1
            }
          }
        }
      });
      
      const logs = response.hits.hits.map(hit => this._formatLogEntry(hit._source));
      logger.debug(`Retrieved ${logs.length} correlated logs for trace ${traceId}`);
      return logs;
    } catch (error) {
      logger.error(`Error retrieving correlated logs: ${error.message}`);
      return [];
    }
  }

  // New method to search logs by message content
  async searchLogs(serviceName, searchTerm, timeRange, limit = 100) {
    try {
      logger.debug(`Searching logs for service ${serviceName} with term "${searchTerm}"`);
      const response = await this.esClient.search({
        index: 'auth-service-*',
        body: {
          size: limit,
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              must: [
                { term: { 'service': serviceName } },
                {
                  range: {
                    '@timestamp': {
                      gte: timeRange.start.toISOString(),
                      lte: timeRange.end.toISOString()
                    }
                  }
                },
                {
                  match: {
                    'message': searchTerm
                  }
                }
              ]
            }
          }
        }
      });
      
      const logs = response.hits.hits.map(hit => this._formatLogEntry(hit._source));
      logger.debug(`Found ${logs.length} logs matching "${searchTerm}" for service ${serviceName}`);
      return logs;
    } catch (error) {
      logger.error(`Error searching logs: ${error.message}`);
      return [];
    }
  }
  
  // Helper method to normalize log entry format
  _formatLogEntry(logEntry) {
    // Create a normalized log entry structure
    return {
      timestamp: logEntry['@timestamp'],
      level: logEntry.level || '',
      message: logEntry.message || '',
      service: logEntry.service || '',
      trace_id: logEntry.trace_id || '',
      span_id: logEntry.span_id || '',
      logger: logEntry.logger_name || logEntry.logger || '',
      thread: logEntry.thread_name || logEntry.thread || '',
      version: logEntry['@version'] || '',
      level_value: logEntry.level_value || '',
      // Add any additional fields
      ...logEntry
    };
  }
}

const logsClient = new LogsClient();
module.exports = logsClient;