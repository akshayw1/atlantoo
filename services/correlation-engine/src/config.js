module.exports = {
    port: process.env.PORT || 3001,
    jaegerUrl: process.env.JAEGER_URL || 'http://jaeger:16686',
    victoriaMetricsUrl: process.env.VICTORIA_METRICS_URL || 'http://victoria-metrics:8428',
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://mongo:27017/correlation-engine',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    },
    timeWindow: {
      default: 15 * 60 * 1000, // 15 minutes in milliseconds
      max: 60 * 60 * 1000      // 1 hour in milliseconds
    }
  };