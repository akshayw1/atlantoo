const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = mongoose.Schema.Types;

const AnomalySchema = new mongoose.Schema({
  type: String,
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
  endpoint: String,
  spanId: String,
  service: String
});

const SolutionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  steps: [String],
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  source: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai'
  },
  implementationStatus: {
    type: String,
    enum: ['proposed', 'approved', 'in_progress', 'implemented', 'failed'],
    default: 'proposed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const IncidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'mitigated', 'resolved'],
    default: 'active'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  affectedEndpoints: [String],
  impactedServices: [String],
  detectionSource: {
    type: String,
    enum: ['anomaly_detection', 'manual', 'correlation'],
    default: 'anomaly_detection'
  },
  errorLocation: {
    service: { type: String },
    file: { type: String },
    className: { type: String },
    methodName: { type: String },
    lineNumber: { type: Number },
    exceptionType: { type: String },
    exceptionMessage: { type: String }
  },
  pullRequestInfo: String,
  aiEnhancedTitle: String,
  aiDescription: String,
  rootCauseHypothesis: String,
  recommendedNextSteps: [String],
  anomalies: [AnomalySchema],
  hasSolutions: {
    type: Boolean,
    default: false
  },
  solutions: [SolutionSchema],
  resolvedBy: {
    type: String,
    default: null
  },
  resolutionSummary: {
    type: String,
    default: null
  },
  metadata: {
    type: Map,
    of: String
  },
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
IncidentSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

const Incident = mongoose.model('Incident', IncidentSchema);

module.exports = Incident;