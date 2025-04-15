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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Check as CheckIcon,
  Timer as TimerIcon,
  Category as CategoryIcon,
  Computer as ComputerIcon,
  Timeline as TimelineIcon,
  BugReport as BugIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  ArrowBack as ArrowBackIcon,
  CallSplit as CallSplitIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './Loader';
import api from '../services/api';

const IncidentDetail = () => {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incident, setIncident] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [traces, setTraces] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  
  // Status update dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  
  // Analysis dialog
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const fetchIncidentData = async () => {
    try {
      setLoading(true);
      
      // Fetch incident details
      const incidentData = await api.getIncident(incidentId);
      setIncident(incidentData);
      
      // Set initial status for the dialog
      setSelectedStatus(incidentData.status);
      
      // Fetch related data if available
      if (incidentData.service && incidentData.detectedAt) {
        // Fetch logs
        const timeRange = {
          start: new Date(incidentData.detectedAt),
          end: incidentData.resolvedAt 
            ? new Date(incidentData.resolvedAt) 
            : new Date()
        };
        
        // Add some margin to the time range (30 minutes before and after)
        timeRange.start = new Date(timeRange.start.getTime() - 30 * 60 * 1000);
        timeRange.end = new Date(timeRange.end.getTime() + 30 * 60 * 1000);
        
        // Fetch logs, metrics, and traces in parallel
        const [logsData, metricsData, tracesData] = await Promise.all([
          api.getLogs(incidentData.service, timeRange),
          api.getMetrics(incidentData.service, timeRange),
          api.getTraces(incidentData.service, timeRange)
        ]);
        
        setLogs(logsData);
        setMetrics(metricsData);
        setTraces(tracesData);
      }
      
      // Fetch analyses if available
      if (incidentData.analyses && incidentData.analyses.length > 0) {
        // In a real app, you'd fetch detailed analysis data
        setAnalyses(incidentData.analyses);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching incident details:', err);
      showError(`Failed to fetch incident details: ${err.message}`);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchIncidentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleStatusDialogOpen = () => {
    setStatusDialogOpen(true);
  };
  
  const handleStatusDialogClose = () => {
    setStatusDialogOpen(false);
  };
  
  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };
  
  const handleStatusNoteChange = (event) => {
    setStatusNote(event.target.value);
  };
  
  const handleUpdateStatus = async () => {
    try {
      setSubmitting(true);
      
      await api.updateIncidentStatus(incidentId, selectedStatus);
      
      // Update local incident object
      setIncident({
        ...incident,
        status: selectedStatus,
        resolvedAt: selectedStatus === 'resolved' ? new Date().toISOString() : incident.resolvedAt
      });
      
      showSuccess(`Incident status updated to ${selectedStatus}`);
      setSubmitting(false);
      setStatusDialogOpen(false);
    } catch (err) {
      console.error('Error updating incident status:', err);
      showError(`Failed to update incident status: ${err.message}`);
      setSubmitting(false);
    }
  };
  
  const handleAnalysisDialogOpen = () => {
    setAnalysisDialogOpen(true);
  };
  
  const handleAnalysisDialogClose = () => {
    setAnalysisDialogOpen(false);
  };
  
  const handleStartAnalysis = async () => {
    try {
      setAnalyzing(true);
      
      // Request analysis from AI
      await api.analyzeIncident(incidentId);
      
      showSuccess('Analysis started successfully');
      setAnalyzing(false);
      setAnalysisDialogOpen(false);
      
      // Refresh data to get the new analysis
      fetchIncidentData();
    } catch (err) {
      console.error('Error starting analysis:', err);
      showError(`Failed to start analysis: ${err.message}`);
      setAnalyzing(false);
    }
  };
  
  const handleBackClick = () => {
    navigate('/incidents');
  };
  
  const handleCreateCorrelation = async () => {
    try {
      setSubmitting(true);
      
      // Create correlation for the incident's time window
      const timeRange = {
        start: new Date(incident.detectedAt),
        end: incident.resolvedAt ? new Date(incident.resolvedAt) : new Date()
      };
      
      await api.createCorrelation(incident.service, timeRange);
      
      showSuccess('Correlation created successfully');
      setSubmitting(false);
    } catch (err) {
      console.error('Error creating correlation:', err);
      showError(`Failed to create correlation: ${err.message}`);
      setSubmitting(false);
    }
  };
  
  const getSeverityChip = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Critical" 
            color="error" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'warning':
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Warning" 
            color="warning" 
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return (
          <Chip 
            label={severity || 'Unknown'} 
            sx={{ fontWeight: 500 }}
          />
        );
    }
  };
  
  const getStatusChip = (status) => {
    switch (status) {
      case 'active':
        return (
          <Chip 
            icon={<TimerIcon />} 
            label="Active" 
            color="primary" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'resolved':
        return (
          <Chip 
            icon={<CheckIcon />} 
            label="Resolved" 
            color="success" 
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
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const formatDuration = (start, end) => {
    if (!start) return 'N/A';
    
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    
    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minutes ${seconds % 60} seconds`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hours ${minutes % 60} minutes`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} days ${hours % 24} hours`;
  };
  
  if (loading) {
    return <Loader message="Loading incident details..." />;
  }
  
  if (!incident) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Incident not found. The incident may have been deleted or you may not have permission to view it.
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Incidents
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Incident Details
        </Typography>
      </Box>
      
      {/* Incident Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {incident.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {getSeverityChip(incident.severity)}
                  {getStatusChip(incident.status)}
                  <Chip 
                    icon={<ComputerIcon />} 
                    label={incident.service}
                    variant="outlined"
                  />
                </Box>
              </Box>
              <Box>
                {incident.status === 'active' ? (
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={handleStatusDialogOpen}
                  >
                    Resolve Incident
                  </Button>
                ) : (
                  <Button 
                    variant="outlined" 
                    onClick={handleStatusDialogOpen}
                  >
                    Change Status
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Incident ID
            </Typography>
            <Typography variant="body1">
              {incident.id}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Detected At
            </Typography>
            <Typography variant="body1">
              {formatDateTime(incident.detectedAt)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Resolved At
            </Typography>
            <Typography variant="body1">
              {incident.status === 'resolved' ? formatDateTime(incident.resolvedAt) : 'Not resolved yet'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {formatDuration(incident.detectedAt, incident.resolvedAt)}
            </Typography>
          </Grid>
          
          {incident.description && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {incident.description}
              </Typography>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<CallSplitIcon />}
                onClick={handleCreateCorrelation}
                disabled={submitting}
              >
                Create Correlation
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<PsychologyIcon />}
                onClick={handleAnalysisDialogOpen}
                disabled={submitting}
              >
                Analyze Incident
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs for related data */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<TimelineIcon />} label="Timeline" />
            <Tab icon={<BugIcon />} label="Logs" />
            <Tab icon={<CategoryIcon />} label="Metrics" />
            <Tab icon={<CallSplitIcon />} label="Traces" />
            <Tab icon={<LightbulbIcon />} label="Analysis" />
          </Tabs>
        </Box>
        
        {/* Timeline Tab */}
        <Box sx={{ p: 3, display: activeTab === 0 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Incident Timeline
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <ErrorIcon color={incident.severity === 'critical' ? 'error' : 'warning'} />
              </ListItemIcon>
              <ListItemText
                primary="Incident Detected"
                secondary={formatDateTime(incident.detectedAt)}
              />
            </ListItem>
            
            {incident.events?.map((event, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <EventNoteIcon />
                </ListItemIcon>
                <ListItemText
                  primary={event.title}
                  secondary={formatDateTime(event.timestamp)}
                />
              </ListItem>
            ))}
            
            {incident.status === 'resolved' && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Incident Resolved"
                  secondary={formatDateTime(incident.resolvedAt)}
                />
              </ListItem>
            )}
          </List>
        </Box>
        
        {/* Logs Tab */}
        <Box sx={{ p: 3, display: activeTab === 1 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Related Logs
          </Typography>
          
          {logs.length > 0 ? (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List>
                {logs.map((log, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={log.level?.toUpperCase() || 'INFO'} 
                            size="small"
                            color={
                              log.level === 'error' || log.level === 'fatal' ? 'error' :
                              log.level === 'warn' ? 'warning' :
                              'default'
                            }
                          />
                          <Typography variant="body2">
                            {log.message}
                          </Typography>
                        </Box>
                      }
                      secondary={`${formatDateTime(log.timestamp)} - ${log.component || 'unknown'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info">No related logs found for this incident.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/logs')}
            endIcon={<LaunchIcon />}
          >
            View All Logs
          </Button>
        </Box>
        
        {/* Metrics Tab */}
        <Box sx={{ p: 3, display: activeTab === 2 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Related Metrics
          </Typography>
          
          {metrics.length > 0 ? (
            <Grid container spacing={2}>
              {/* You'd display charts here with the metrics data */}
              <Grid item xs={12}>
                <Alert severity="info">
                  Metrics visualization would be displayed here based on the data from the API.
                </Alert>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No related metrics found for this incident.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/metrics')}
            endIcon={<LaunchIcon />}
          >
            View All Metrics
          </Button>
        </Box>
        
        {/* Traces Tab */}
        <Box sx={{ p: 3, display: activeTab === 3 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Related Traces
          </Typography>
          
          {traces.length > 0 ? (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List>
                {traces.map((trace) => (
                  <ListItem 
                    key={trace.traceID}
                    button
                    onClick={() => navigate(`/traces?traceId=${trace.traceID}`)}
                  >
                    <ListItemIcon>
                      <TimelineIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Trace: ${trace.traceID.substring(0, 8)}...`}
                      secondary={`${trace.spans?.[0]?.operationName || 'Unknown operation'} - ${formatDuration(trace.spans?.[0]?.startTime, trace.spans?.[0]?.startTime + trace.spans?.[0]?.duration)}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => navigate(`/traces?traceId=${trace.traceID}`)}>
                        <LaunchIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info">No related traces found for this incident.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/traces')}
            endIcon={<LaunchIcon />}
          >
            View All Traces
          </Button>
        </Box>
        
        {/* Analysis Tab */}
        <Box sx={{ p: 3, display: activeTab === 4 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            AI Analysis
          </Typography>
          
          {analyses.length > 0 ? (
            <Box>
              {analyses.map((analysis, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardHeader
                    title={analysis.title || 'AI Analysis'}
                    subheader={formatDateTime(analysis.timestamp || analysis.createdAt)}
                    action={
                      <Button 
                        size="small" 
                        endIcon={<LaunchIcon />}
                        onClick={() => navigate(`/analysis/${analysis.id}`)}
                      >
                        View Details
                      </Button>
                    }
                  />
                  <Divider />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Root Cause Analysis
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {analysis.rootCause || analysis.summary || 'No root cause analysis available.'}
                    </Typography>
                    
                    {analysis.recommendations && (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Recommendations
                        </Typography>
                        <List dense>
                          {analysis.recommendations.map((rec, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon>
                                <LightbulbIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No analysis has been performed for this incident yet. Click the "Analyze Incident" button to start an analysis.
            </Alert>
          )}
          
          <Button 
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleAnalysisDialogOpen}
            startIcon={<PsychologyIcon />}
            disabled={submitting}
          >
            {analyses.length > 0 ? 'Run New Analysis' : 'Analyze Incident'}
          </Button>
        </Box>
      </Paper>
      
      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleStatusDialogClose}>
        <DialogTitle>Update Incident Status</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Change the status of this incident. If you're resolving the incident, consider adding a note about the resolution.
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={handleStatusChange}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Resolution Note (optional)"
            multiline
            rows={4}
            value={statusNote}
            onChange={handleStatusNoteChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStatusDialogClose}>Cancel</Button>
          <Button 
            onClick={handleUpdateStatus} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onClose={handleAnalysisDialogClose}>
        <DialogTitle>Analyze Incident</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Initiate AI analysis on this incident. The AI will analyze logs, metrics, and traces to identify potential root causes and suggest remediations.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAnalysisDialogClose}>Cancel</Button>
          <Button 
            onClick={handleStartAnalysis} 
            variant="contained"
            color="primary"
            disabled={analyzing}
          >
            {analyzing ? <CircularProgress size={24} /> : 'Start Analysis'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentDetail;