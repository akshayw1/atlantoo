import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Alert,
  AlertTitle,
  CircularProgress,
  IconButton,
  Tooltip,
  Link,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Build as BuildIcon,
  Timeline as TimelineIcon,
  ArrowBack as ArrowBackIcon,
  Launch as LaunchIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './comman/Loader';
import api from '../services/api';

const AnalysisDetail = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  
  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Fetch analysis details
      const analysisData = await api.getAnalysis(analysisId);
      setAnalysis(analysisData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analysis details:', err);
      showError(`Failed to fetch analysis details: ${err.message}`);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAnalysisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);
  
  const handleBackClick = () => {
    navigate('/analysis');
  };
  
  const handleViewSource = () => {
    if (!analysis) return;
    
    const { sourceType, sourceId } = analysis;
    if (sourceType === 'correlation') {
      navigate(`/correlations/${sourceId}`);
    } else if (sourceType === 'incident') {
      navigate(`/incidents/${sourceId}`);
    }
  };
  
  const getStatusChip = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Completed" 
            color="success" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'processing':
        return (
          <Chip 
            icon={<PendingIcon />} 
            label="Processing" 
            color="primary" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'failed':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Failed" 
            color="error" 
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return (
          <Chip 
            label={status || 'Unknown'} 
            sx={{ fontWeight: 500 }}
          />
        );
    }
  };
  
  const getSourceTypeChip = (sourceType) => {
    switch (sourceType) {
      case 'correlation':
        return (
          <Chip 
            label="Correlation" 
            color="primary" 
            variant="outlined"
          />
        );
      case 'incident':
        return (
          <Chip 
            label="Incident" 
            color="error" 
            variant="outlined"
          />
        );
      default:
        return (
          <Chip 
            label={sourceType || 'Unknown'} 
            variant="outlined"
          />
        );
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const getConfidenceIndicator = (confidence) => {
    if (!confidence && confidence !== 0) return null;
    
    let color;
    if (confidence >= 80) color = 'success.main';
    else if (confidence >= 50) color = 'primary.main';
    else if (confidence >= 30) color = 'warning.main';
    else color = 'error.main';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5" color={color}>
          {confidence}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          confidence
        </Typography>
      </Box>
    );
  };
  
  if (loading) {
    return <Loader message="Loading analysis details..." />;
  }
  
  if (!analysis) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Analysis not found. The analysis may have been deleted or you may not have permission to view it.
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Analyses
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            AI Analysis
          </Typography>
        </Box>
        
        <Box>
          {getStatusChip(analysis.status)}
        </Box>
      </Box>
      
      {/* Analysis Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {analysis.title || `Analysis #${analysis.id.slice(0, 8)}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {getSourceTypeChip(analysis.sourceType)}
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={handleViewSource}
                  >
                    View {analysis.sourceType}
                  </Button>
                </Box>
              </Box>
              
              {analysis.status === 'completed' && (
                <Box>{getConfidenceIndicator(analysis.confidence)}</Box>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Analysis ID
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
              {analysis.id}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Source
            </Typography>
            <Typography variant="body1">
              {analysis.sourceType} {analysis.sourceId ? `(${analysis.sourceId.slice(0, 8)}...)` : ''}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Created At
            </Typography>
            <Typography variant="body1">
              {formatDateTime(analysis.createdAt)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Completed At
            </Typography>
            <Typography variant="body1">
              {analysis.status === 'completed' ? formatDateTime(analysis.completedAt) : 'Not completed yet'}
            </Typography>
          </Grid>
          
          {analysis.summary && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Summary
              </Typography>
              <Typography variant="body1" paragraph>
                {analysis.summary}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {analysis.status === 'processing' && (
        <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
            <Typography variant="h6">
              Analysis in progress...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a few minutes to complete.
            </Typography>
          </Box>
        </Paper>
      )}
      
      {analysis.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Analysis Failed</AlertTitle>
          <Typography variant="body1">
            {analysis.error || 'The analysis process encountered an error and could not be completed.'}
          </Typography>
        </Alert>
      )}
      
      {analysis.status === 'completed' && (
        <>
          {/* Root Cause Analysis */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Root Cause Analysis
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" paragraph>
                  {analysis.rootCause || 'No root cause analysis available.'}
                </Typography>
              </Box>
              
              {analysis.factors && analysis.factors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Contributing Factors
                  </Typography>
                  
                  <List disablePadding>
                    {analysis.factors.map((factor, index) => (
                      <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                        <ListItemIcon>
                          <WarningIcon color={factor.severity === 'critical' ? 'error' : 'warning'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={factor.name}
                          secondary={factor.description}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
            
            {analysis.timeline && analysis.timeline.length > 0 && (
              <>
                <Divider />
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Incident Timeline
                  </Typography>
                  
                  <Stepper orientation="vertical" sx={{ mt: 2 }}>
                    {analysis.timeline.map((event, index) => (
                      <Step key={index} active completed>
                        <StepLabel StepIconComponent={TimelineIcon}>
                          <Typography variant="body2" fontWeight="500">
                            {event.title || `Event ${index + 1}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(event.timestamp)}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {event.description}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              </>
            )}
          </Paper>
          
          {/* Recommendations */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              
              {analysis.recommendations && analysis.recommendations.length > 0 ? (
                <List>
                  {analysis.recommendations.map((recommendation, index) => (
                    <ListItem key={index} alignItems="flex-start" sx={{ mb: 2, p: 0 }}>
                      <ListItemIcon>
                        <LightbulbIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {recommendation.title || `Recommendation ${index + 1}`}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" paragraph>
                              {recommendation.description}
                            </Typography>
                            
                            {recommendation.priority && (
                              <Chip 
                                label={`Priority: ${recommendation.priority.toUpperCase()}`}
                                color={
                                  recommendation.priority === 'high' ? 'error' :
                                  recommendation.priority === 'medium' ? 'warning' : 'info'
                                }
                                size="small"
                                sx={{ mr: 1 }}
                              />
                            )}
                            
                            {recommendation.effort && (
                              <Chip 
                                label={`Effort: ${recommendation.effort.toUpperCase()}`}
                                variant="outlined"
                                size="small"
                              />
                            )}
                            
                            {recommendation.remediationId && (
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mt: 1 }}
                                startIcon={<BuildIcon />}
                                onClick={() => navigate(`/remediation/${recommendation.remediationId}`)}
                              >
                                View Remediation
                              </Button>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No recommendations available for this analysis.
                </Alert>
              )}
            </Box>
          </Paper>
          
          {/* Additional Information */}
          <Paper>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              
              <Grid container spacing={3}>
                {analysis.metrics && analysis.metrics.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader 
                        title="Related Metrics" 
                        titleTypographyProps={{ variant: 'subtitle1' }}
                      />
                      <Divider />
                      <CardContent>
                        <List dense disablePadding>
                          {analysis.metrics.map((metric, index) => (
                            <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                              <ListItemIcon>
                                <TimelineIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={metric.name}
                                secondary={metric.description}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {analysis.patterns && analysis.patterns.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader 
                        title="Detected Patterns" 
                        titleTypographyProps={{ variant: 'subtitle1' }}
                      />
                      <Divider />
                      <CardContent>
                        <List dense disablePadding>
                          {analysis.patterns.map((pattern, index) => (
                            <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                              <ListItemIcon>
                                <PsychologyIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={pattern.name}
                                secondary={pattern.description}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
              
              {!(analysis.metrics?.length > 0 || analysis.patterns?.length > 0) && (
                <Alert severity="info">
                  No additional information available for this analysis.
                </Alert>
              )}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AnalysisDetail;