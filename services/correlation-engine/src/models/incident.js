// src/models/incident.js
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  service: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['critical', 'high', 'medium', 'low'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'investigating', 'resolved', 'closed'],
    default: 'active' 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  affectedEndpoints: [String],
  detectionSource: { 
    type: String, 
    enum: ['metric', 'log', 'trace', 'manual', 'correlation'], // Added 'correlation'
    required: true 
  },
  metadata: { type: Map, of: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Incident', incidentSchema);