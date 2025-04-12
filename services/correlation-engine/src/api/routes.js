const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

// Correlation endpoints
router.post('/correlations/time-window', controllers.correlateByTimeWindow);
router.post('/correlations/trace-id/:traceId', controllers.correlateByTraceId);
router.get('/correlations/:correlationId', controllers.getCorrelation);

// Incident endpoints
router.get('/incidents', controllers.getIncidents);
router.get('/incidents/:incidentId', controllers.getIncident);
router.put('/incidents/:incidentId/status', controllers.updateIncidentStatus);

module.exports = router;