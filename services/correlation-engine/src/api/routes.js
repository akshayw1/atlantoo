const express = require('express');
const controllers = require('./controllers');
const telemetryController = require('./telemetry.controller');


const router = express.Router();

// Health check endpoint
router.get('/health', telemetryController.getHealth);

// Telemetry data endpoints
router.get('/metrics', telemetryController.getMetrics);
router.get('/logs', telemetryController.getLogs);
router.get('/traces', telemetryController.getTraces);
router.get('/traces/:traceId', telemetryController.getTrace);

// Correlation endpoints
router.post('/correlations/time-window', controllers.correlateByTimeWindow);
router.post('/correlations/trace-id/:traceId', controllers.correlateByTraceId);
router.get('/correlations/:correlationId', controllers.getCorrelation);
router.get('/correlations', controllers.getAllCorrelations);

// Incident endpoints
router.get('/incidents', controllers.getIncidents);
router.get('/incidents/:incidentId', controllers.getIncident);
router.put('/incidents/:incidentId/status', controllers.updateIncidentStatus);
router.post('/incidents/:incidentId/analysis', controllers.updateIncidentWithAnalysis);


module.exports = router;