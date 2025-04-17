const mongoose = require('mongoose');
const { Schema } = mongoose;


const AnomalySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  detectionMethod: {
    type: String,
    required: true,
    enum: ['threshold', 'trace_analysis', 'ai']
  },
  metric: String,
  value: Number,
  threshold: Number,
  endpoint: String
});

const CorrelationSchema = new mongoose.Schema({
  // Correlation identifiers
  correlationId: {
    type: String,
    required: true,
    unique: true
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  
  // Time range for this correlation
  timeWindow: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  
  // Summary of telemetry analyzed
  telemetrySummary: {
    trace: {
      type: [Schema.Types.Mixed], // array of any kind of object
      default: []
    },
    log: {
      type: [Schema.Types.Mixed],
      default: []
    },
    metric: {
      type: [Schema.Types.Mixed],
      default: []
    }
  },
  
  // Detected anomalies
  anomalies: [AnomalySchema],
  
  // AI analysis results
  aiAnalysisStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  aiAnalysisResult: {
    rootCause: {
      description: String,
      confidence: Number
    },
    suggestedSolutions: [{
      description: String,
      steps: [String],
      confidence: Number
    }],
    relatedIncidents: [String],
    analysisTimestamp: Date
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['created', 'analyzing', 'incident_created', 'completed'],
    default: 'created'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Set updatedAt before update
CorrelationSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

const Correlation = mongoose.model('Correlation', CorrelationSchema);

module.exports = Correlation;