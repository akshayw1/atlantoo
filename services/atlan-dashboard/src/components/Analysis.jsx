// src/components/Analysis.jsx
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  BugReport as BugIcon,
  Build as BuildIcon,
  Lightbulb as LightbulbIcon,
  Circle as CircleIcon,
  ArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import api from '../services/api';

const Analysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      // Since we're using a mock API for now, we'll use dummy data
      // In a real implementation, you would uncomment this line:
      // const response = await api.getAnalyses();
      const mockAnalyses = generateMockAnalyses();
      setAnalyses(mockAnalyses);
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
      // Since we're using a mock API for now, we'll use dummy data
      // In a real implementation, you would uncomment this line:
      // const response = await api.getAnalysis(analysisId);
      const selectedAnalysis = analyses.find(analysis => analysis._id === analysisId);
      setSelectedAnalysis(selectedAnalysis);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analysis details:', err);
      setError('Failed to load analysis details. Please try again later.');
      setLoading(false);
    }
  };

  const triggerAnalysisForCorrelation = async (correlationId) => {
    try {
      setLoading(true);
      await api.analyzeCorrelation(correlationId);
      await fetchAnalyses();
      setLoading(false);
    } catch (err) {
      console.error('Error triggering analysis:', err);
      setError('Failed to trigger analysis. Please try again later.');
      setLoading(false);
    }
  };

  // Helper to generate confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'info';
    if (confidence >= 0.4) return 'warning';
    return 'error';
  };

  // Helper to generate priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Generate mock analyses data
  const generateMockAnalyses = () => {
    return [
      {
        _id: 'analysis1',
        correlationId: 'correlation1',
        incidentId: 'incident1',
        serviceName: 'service-a',
        analysisType: 'root-cause',
        createdAt: new Date().toISOString(),
        rootCauses: [
          {
            cause: 'High database connection pool utilization',
            confidence: 0.85,
            evidence: [
              'Latency spike in database operations',
              'Connection timeout errors in logs',
              'High number of pending requests'
            ]
          },
          {
            cause: 'Memory pressure on service instance',
            confidence: 0.65,
            evidence: [
              'Increasing memory usage trend',
              'Occasional garbage collection pauses',
              'Slower response times across all endpoints'
            ]
          }
        ],
        affectedServices: ['service-a', 'database'],
        priority: 'high',
        confidence: 0.85,
        solutions: [
          {
            title: 'Increase database connection pool size',
            description: 'The current connection pool size is insufficient for the current load, leading to connection timeouts.',
            steps: [
              'Increase hikariCP maxPoolSize from 10 to 20',
              'Adjust idle timeout to 600000ms (10 minutes)',
              'Apply changes via configuration update'
            ],
            confidence: 0.9,
            impact: 'medium',
            category: 'configuration'
          },
          {
            title: 'Scale up service instances',
            description: 'Current instances are experiencing memory pressure due to high load.',
            steps: [
              'Increase replica count from 2 to 3',
              'Monitor memory usage after scaling'
            ],
            confidence: 0.7,
            impact: 'medium',
            category: 'scaling'
          }
        ]
      },
      {
        _id: 'analysis2',
        correlationId: 'correlation2',
        incidentId: 'incident2',
        serviceName: 'service-b',
        analysisType: 'root-cause',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        rootCauses: [
          {
            cause: 'Network latency between services',
            confidence: 0.75,
            evidence: [
              'Increased response times for external calls',
              'Timeout errors in service communication',
              'Normal CPU and memory utilization'
            ]
          }
        ],
        affectedServices: ['service-b', 'service-c'],
        priority: 'medium',
        confidence: 0.75,
        solutions: [
          {
            title: 'Implement circuit breaker pattern',
            description: 'Prevent cascading failures due to network issues.',
            steps: [
              'Add resilience4j circuit breaker to service-b',
              'Configure fallback behavior for external calls',
              'Set appropriate timeout thresholds'
            ],
            confidence: 0.85,
            impact: 'medium',
            category: 'code'
          }
        ]
      }
    ];
  };

  if (loading && !selectedAnalysis && analyses.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">AI Analysis</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalyses}
          sx={{ mr: 1 }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Analysis List */}
        <Grid item xs={12} md={selectedAnalysis ? 4 : 12}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Analysis Results
            </Typography>
            {analyses.length === 0 ? (
              <Alert severity="info">No analysis results found. Trigger an analysis for a correlation to get started.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Priority</TableCell>
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
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{analysis.serviceName}</TableCell>
                        <TableCell>{new Date(analysis.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip 
                            label={analysis.priority} 
                            size="small"
                            color={getPriorityColor(analysis.priority)} 
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <CircleIcon 
                              fontSize="small" 
                              color={getConfidenceColor(analysis.confidence)} 
                              sx={{ mr: 1 }}
                            />
                            {Math.round(analysis.confidence * 100)}%
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
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Analysis Results
              </Typography>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
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
                        <strong>Correlation ID:</strong> {selectedAnalysis.correlationId}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Incident ID:</strong> {selectedAnalysis.incidentId}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Time:</strong> {new Date(selectedAnalysis.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Priority:</strong> <Chip label={selectedAnalysis.priority} size="small" color={getPriorityColor(selectedAnalysis.priority)} />
                      </Typography>
                      <Typography variant="body2">
                        <strong>Confidence:</strong> {Math.round(selectedAnalysis.confidence * 100)}%
                      </Typography>
                      <Typography variant="body2">
                        <strong>Affected Services:</strong> {selectedAnalysis.affectedServices.join(', ')}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Root Causes */}
              <Typography variant="subtitle1" gutterBottom>
                <Box display="flex" alignItems="center">
                  <BugIcon sx={{ mr: 1 }} />
                  Root Causes
                </Box>
              </Typography>
              {selectedAnalysis.rootCauses.map((cause, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">{cause.cause}</Typography>
                      <Chip 
                        label={`${Math.round(cause.confidence * 100)}% confidence`} 
                        size="small" 
                        color={getConfidenceColor(cause.confidence)} 
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Evidence:</Typography>
                    <List dense>
                      {cause.evidence.map((evidence, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: '30px' }}>
                            <ArrowRightIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={evidence} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ))}

              <Divider sx={{ my: 3 }} />

              {/* Solutions */}
              <Typography variant="subtitle1" gutterBottom>
                <Box display="flex" alignItems="center">
                  <LightbulbIcon sx={{ mr: 1 }} />
                  Recommended Solutions
                </Box>
              </Typography>
              {selectedAnalysis.solutions.map((solution, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle2">{solution.title}</Typography>
                      <Box>
                        <Chip 
                          label={`${Math.round(solution.confidence * 100)}% confidence`} 
                          size="small" 
                          color={getConfidenceColor(solution.confidence)} 
                          sx={{ mr: 0.5 }}
                        />
                        <Chip 
                          label={`${solution.impact} impact`} 
                          size="small" 
                          color={solution.impact === 'high' ? 'error' : solution.impact === 'medium' ? 'warning' : 'info'} 
                          sx={{ mr: 0.5 }}
                        />
                        <Chip 
                          label={solution.category} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2 }}>{solution.description}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Implementation Steps:</Typography>
                    <List dense>
                      {solution.steps.map((step, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: '30px' }}>
                            <BuildIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={step} />
                        </ListItem>
                      ))}
                    </List>
                    <Box display="flex" justifyContent="flex-end" mt={1}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => window.alert('Remediation approved! This would trigger the remediation workflow in a real system.')}
                      >
                        Approve Remediation
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Analysis;