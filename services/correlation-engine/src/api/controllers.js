const correlationService = require('../services/correlation-service');
const Incident = require('../models/incident');
const Correlation = require('../models/correlation');
const logger = require('pino')();

// Correlation controllers
exports.correlateByTimeWindow = async (req, res) => {
  try {
    const { serviceName, startTime, endTime } = req.body;
    
    if (!serviceName || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const result = await correlationService.correlateByTimeWindow({
      serviceName,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });
    
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Error in correlateByTimeWindow: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

exports.correlateByTraceId = async (req, res) => {
  try {
    const { traceId } = req.params;
    
    if (!traceId) {
      return res.status(400).json({ error: 'Missing trace ID' });
    }
    
    const result = await correlationService.correlateByTraceId(traceId);
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Error in correlateByTraceId: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

exports.getPRinfo = async (req, res) => {
  try {
    const { prData, incidentId } = req.body;

    // Validate presence
    if (!prData || !incidentId) {
      return res.status(400).json({ error: 'Missing prData or incidentId' });
    }

    // Validate incident exists
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Store PR info
    incident.pullRequestInfo = prData;
    await incident.save();

    res.status(200).json({ message: 'PR info saved successfully', prInfo: prData });
  } catch (error) {
    logger.error(`Error in getPRinfo: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getCorrelation = async (req, res) => {
  try {
    const { correlationId } = req.params;
    
    const correlation = await Correlation.findOne({ correlationId });
    
    if (!correlation) {
      return res.status(404).json({ error: 'Correlation not found' });
    }
    
    res.status(200).json(correlation);
  } catch (error) {
    logger.error(`Error in getCorrelation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCorrelations = async (req, res) => {

  try {
  
    
    const correlations = await Correlation.find({});
    
    if (!correlations) {
      return res.status(404).json({ error: 'Correlations not found' });
    }
    
    res.status(200).json(correlations);
  } catch (error) {
    logger.error(`Error in getCorrelations: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};


// Incident controllers
exports.getIncidents = async (req, res) => {
  try {
    const { status, service, limit = 20, offset = 0 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (service) query.service = service;
    
    const incidents = await Incident.find(query)
      .sort({ startTime: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await Incident.countDocuments(query);
    
    res.status(200).json({
      incidents,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error(`Error in getIncidents: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

exports.getIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    const incident = await Incident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    // Get related correlations
    const correlations = await Correlation.find({ incidentId });
    
    res.status(200).json({
        incident,
        correlations
      });
    } catch (error) {
      logger.error(`Error in getIncident: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  };

  exports.updateIncidentWithAnalysis = async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { analysis } = req.body;
      
      if (!analysis) {
        return res.status(400).json({ error: 'Missing analysis data' });
      }
      
      const incident = await Incident.findById(incidentId);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      // Add analysis to incident metadata
      if (!incident.metadata) {
        incident.metadata = new Map();
      }
      
      incident.metadata.set('analysisId', analysis.id);
      incident.metadata.set('rootCauses', JSON.stringify(analysis.rootCauses));
      incident.metadata.set('priority', analysis.priority);
      incident.metadata.set('confidence', String(analysis.confidence));
      
      await incident.save();
      
      res.status(200).json({ 
        success: true,
        message: 'Incident updated with analysis'
      });
    } catch (error) {
      logger.error(`Error in updateIncidentWithAnalysis: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  };
  
  exports.updateIncidentStatus = async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { status } = req.body;
      
      if (!status || !['active', 'investigating', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const incident = await Incident.findById(incidentId);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      incident.status = status;
      
      // If resolved or closed, set end time
      if (['resolved', 'closed'].includes(status) && !incident.endTime) {
        incident.endTime = new Date();
      }
      
      await incident.save();
      
      res.status(200).json(incident);
    } catch (error) {
      logger.error(`Error in updateIncidentStatus: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  };
    