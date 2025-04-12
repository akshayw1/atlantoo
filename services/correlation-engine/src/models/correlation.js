const mongoose = require('mongoose');

const correlationSchema = new mongoose.Schema({
  incidentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Incident',
    required: true 
  },
  correlationId: { type: String, required: true, unique: true },
  timeWindow: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  telemetry: {
    traces: [{
      traceId: { type: String, required: true },
      serviceName: { type: String },
      operationName: { type: String },
      timestamp: { type: Date },
      durationMs: { type: Number },
      hasError: { type: Boolean }
    }],
    metrics: [{
      name: { type: String, required: true },
      labels: { type: Map, of: String },
      values: [{
        timestamp: { type: Date },
        value: { type: Number }
      }],
      anomalyScore: { type: Number }
    }],
    logs: [{
      level: { type: String },
      message: { type: String },
      timestamp: { type: Date },
      service: { type: String },
      traceId: { type: String },
      attributes: { type: Map, of: String }
    }]
  },
  analysisResults: {
    rootCauses: [{
      cause: { type: String },
      confidence: { type: Number },
      relatedEvents: [{ type: String }]
    }],
    impactedServices: [String],
    anomalyDetected: { type: Boolean, default: false },
    patternId: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Correlation', correlationSchema);