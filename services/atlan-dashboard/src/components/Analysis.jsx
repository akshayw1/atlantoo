import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  Lightbulb as LightbulbIcon,
  Circle as CircleIcon,
  ArrowRight as ArrowRightIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import api from '../services/api';

const Analysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyses();
    console.log('Fetching analyses...');
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAnalyses();
      setAnalyses(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      setError('Failed to load analyses. Please try again later.');
      setLoading(false);
    }
  };

  const handleSelectAnalysis = async (analysisId) => {
    try {
      setLoading(true);
      const response = await api.getAnalysis(analysisId);
      setSelectedAnalysis(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analysis details:', err);
      setError('Failed to load analysis details. Please try again later.');
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'info';
    if (confidence >= 0.4) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading && !selectedAnalysis && analyses.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ bgcolor: 'background.default' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" color="primary">
          AI Analysis Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalyses}
          sx={{ borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Analysis List */}
        <Grid item xs={12} md={selectedAnalysis ? 4 : 12}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom color="text.primary">
              Recent Analysis Results
            </Typography>
            {analyses.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No analysis results found.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <TableRow
                        key={analysis._id}
                        hover
                        selected={selectedAnalysis?._id === analysis._id}
                        onClick={() => handleSelectAnalysis(analysis._id)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>{analysis.serviceName}</TableCell>
                        <TableCell>{new Date(analysis.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={analysis.summary.severity}
                            size="small"
                            color={getSeverityColor(analysis.summary.severity)}
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <CircleIcon
                              fontSize="small"
                              color={getConfidenceColor(analysis.summary.confidence)}
                              sx={{ mr: 1 }}
                            />
                            {Math.round(analysis.summary.confidence * 100)}%
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Analysis Details */}
        {selectedAnalysis && (
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom color="text.primary">
                Analysis Details
              </Typography>
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom color="text.primary">
                    Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Analysis ID:</strong> {selectedAnalysis._id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Service:</strong> {selectedAnalysis.serviceName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Time Range:</strong>{' '}
                        {new Date(selectedAnalysis.timeRange.start).toLocaleString()} -{' '}
                        {new Date(selectedAnalysis.timeRange.end).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Created At:</strong>{' '}
                        {new Date(selectedAnalysis.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Severity:</strong>{' '}
                        <Chip
                          label={selectedAnalysis.summary.severity}
                          size="small"
                          color={getSeverityColor(selectedAnalysis.summary.severity)}
                          sx={{ borderRadius: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2">
                        <strong>Confidence:</strong>{' '}
                        {Math.round(selectedAnalysis.summary.confidence * 100)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Anomalies */}
              <Accordion sx={{ mb: 2, borderRadius: 2, boxShadow: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center">
                    <BugIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="subtitle1">Anomalies</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedAnalysis.anomalies.map((anomaly, index) => (
                    <Card key={index} sx={{ mb: 2, borderRadius: 2, boxShadow: 1 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2">{anomaly.description}</Typography>
                          <Chip
                            label={`${Math.round(anomaly.confidence * 100)}% confidence`}
                            size="small"
                            color={getConfidenceColor(anomaly.confidence)}
                            sx={{ borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          <strong>Type:</strong> {anomaly.type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          <strong>Severity:</strong> {anomaly.severity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          <strong>Timestamp:</strong> {new Date(anomaly.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          <strong>Detection Logic:</strong> {anomaly.detectionLogic}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          Evidence:
                        </Typography>
                        <List dense>
                          {anomaly.evidenceReferences.logs.map((log, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon sx={{ minWidth: '30px' }}>
                                <ArrowRightIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={log} secondary="Log" />
                            </ListItem>
                          ))}
                          {anomaly.evidenceReferences.traces.map((trace, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon sx={{ minWidth: '30px' }}>
                                <ArrowRightIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={trace} secondary="Trace ID" />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* Summary */}
              <Typography variant="subtitle1" gutterBottom>
                <Box display="flex" alignItems="center">
                  <LightbulbIcon sx={{ mr: 1, color: 'warning.main' }} />
                  Summary
                </Box>
              </Typography>
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedAnalysis.summary.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {selectedAnalysis.summary.description}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Root Cause Hypothesis:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {selectedAnalysis.summary.rootCauseHypothesis}
                  </Typography>
                </CardContent>
              </Card>

              {/* Recommended Next Steps */}
              <Accordion sx={{ mb: 2, borderRadius: 2, boxShadow: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center">
                    <LightbulbIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="subtitle1">Recommended Next Steps</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {selectedAnalysis.summary.recommendedNextSteps.map((step, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: '30px' }}>
                          <ArrowRightIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={step} />
                      </ListItem>
                    ))}
                  </List>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => window.alert('Remediation approved! This would trigger the remediation workflow.')}
                      sx={{ borderRadius: 2 }}
                    >
                      Approve Remediation
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Analysis;