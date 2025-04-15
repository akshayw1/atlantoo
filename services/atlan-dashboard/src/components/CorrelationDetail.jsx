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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Receipt as ReceiptIcon,
  AccountTree as AccountTreeIcon,
  Psychology as PsychologyIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CompareArrows as CompareArrowsIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

import { useToast } from '../context/ToastContext';
import Loader from './comman/Loader';
import api from '../services/api';

const CorrelationDetail = () => {
  const { correlationId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [correlation, setCorrelation] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data for tabs
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [traces, setTraces] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  
  const fetchCorrelationData = async () => {
    try {
      setLoading(true);
      
      // Fetch correlation details
      const correlationData = await api.getCorrelation(correlationId);
      setCorrelation(correlationData);
      
      // Fetch related data based on correlation time window
      if (correlationData.serviceName && correlationData.startTime && correlationData.endTime) {
        const timeRange = {
          start: new Date(correlationData.startTime),
          end: new Date(correlationData.endTime)
        };
        
        // Fetch logs, metrics, and traces in parallel
        const [logsData, metricsData, tracesData] = await Promise.all([
          api.getLogs(correlationData.serviceName, timeRange),
          api.getMetrics(correlationData.serviceName, timeRange),
          api.getTraces(correlationData.serviceName, timeRange)
        ]);
        
        setLogs(logsData);
        setMetrics(metricsData);
        setTraces(tracesData);
      }
      
      // Fetch analysis if available
      if (correlationData.analysisId) {
        const analysisData = await api.getAnalysis(correlationData.analysisId);
        setAnalysis(analysisData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching correlation details:', err);
      showError(`Failed to fetch correlation details: ${err.message}`);
      setLoading(false);
    }
  };
  
  const refreshData = async () => {
    try {
      setRefreshing(true);
      await fetchCorrelationData();
      showSuccess('Data refreshed successfully');
      setRefreshing(false);
    } catch (err) {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchCorrelationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correlationId]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleBackClick = () => {
    navigate('/correlations');
  };
  
  const handleAnalyzeCorrelation = async () => {
    try {
      setRefreshing(true);
      
      await api.analyzeCorrelation(correlationId);
      
      showSuccess('Analysis started successfully');
      setRefreshing(false);
      
      // Refresh data to include the analysis status update
      fetchCorrelationData();
    } catch (err) {
      console.error('Error starting analysis:', err);
      showError(`Failed to start analysis: ${err.message}`);
      setRefreshing(false);
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
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ${minutes % 60} minutes`;
  };
  
  const getLogLevelChip = (level) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return <Chip label={level.toUpperCase()} size="small" color="error" />;
      case 'warn':
        return <Chip label={level.toUpperCase()} size="small" color="warning" />;
      case 'info':
        return <Chip label={level.toUpperCase()} size="small" color="info" />;
      case 'debug':
      case 'trace':
        return <Chip label={level.toUpperCase()} size="small" color="default" />;
      default:
        return <Chip label={level?.toUpperCase() || 'UNKNOWN'} size="small" />;
    }
  };
  
  if (loading) {
    return <Loader message="Loading correlation details..." />;
  }
  
  if (!correlation) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Correlation not found. The correlation may have been deleted or you may not have permission to view it.
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Correlations
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
            Correlation Details
          </Typography>
        </Box>
        
        <Tooltip title="Refresh data">
          <IconButton onClick={refreshData} disabled={refreshing}>
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Correlation Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  Correlation for {correlation.serviceName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {getStatusChip(correlation.status)}
                  <Chip 
                    icon={<TimelineIcon />} 
                    label={formatDuration(correlation.startTime, correlation.endTime)}
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Box>
                {!correlation.analysisId && correlation.status !== 'processing' && (
                  <Button 
                    variant="contained" 
                    startIcon={<PsychologyIcon />}
                    onClick={handleAnalyzeCorrelation}
                    disabled={refreshing}
                  >
                    Analyze Correlation
                  </Button>
                )}
                
                {correlation.analysisId && (
                  <Button 
                    variant="outlined" 
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/analysis/${correlation.analysisId}`)}
                  >
                    View Analysis
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Correlation ID
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
              {correlation.id}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Time Window
            </Typography>
            <Typography variant="body1">
              {formatDateTime(correlation.startTime)} - {formatDateTime(correlation.endTime)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Created At
            </Typography>
            <Typography variant="body1">
              {formatDateTime(correlation.createdAt)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body1">
              {getStatusChip(correlation.status)}
            </Typography>
          </Grid>
          
          {correlation.analysisId && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Analysis Summary
                </Typography>
                <Typography variant="body1">
                  {analysis ? analysis.summary || 'No summary available' : 'Loading analysis...'}
                </Typography>
                <Button 
                  sx={{ mt: 1 }}
                  size="small"
                  endIcon={<VisibilityIcon />}
                  onClick={() => navigate(`/analysis/${correlation.analysisId}`)}
                >
                  View Full Analysis
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Tabs for related data */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<TimelineIcon />} label="Metrics" />
            <Tab icon={<ReceiptIcon />} label="Logs" />
            <Tab icon={<AccountTreeIcon />} label="Traces" />
            <Tab icon={<CompareArrowsIcon />} label="Correlations" />
          </Tabs>
        </Box>
        
        {/* Metrics Tab */}
        <Box sx={{ p: 3, display: activeTab === 0 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Metrics
          </Typography>
          
          {metrics.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="Request Rate" />
                  <Divider />
                  <CardContent>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                          />
                          <YAxis />
                          <ChartTooltip 
                            formatter={(value) => [`${value} req/min`, 'Request Rate']}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#1976d2" 
                            name="Request Rate" 
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No metrics data available for this correlation time window.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/metrics')}
          >
            View All Metrics
          </Button>
        </Box>
        
        {/* Logs Tab */}
        <Box sx={{ p: 3, display: activeTab === 1 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Logs
          </Typography>
          
          {logs.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Component</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                      <TableCell>{getLogLevelChip(log.level)}</TableCell>
                      <TableCell>
                        <Typography noWrap sx={{ maxWidth: 400 }}>
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.component || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No logs available for this correlation time window.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/logs')}
          >
            View All Logs
          </Button>
        </Box>
        
        {/* Traces Tab */}
        <Box sx={{ p: 3, display: activeTab === 2 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Traces
          </Typography>
          
          {traces.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Trace ID</TableCell>
                    <TableCell>Root Operation</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Spans</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traces.map((trace) => {
                    const rootSpan = trace.spans?.find(span => !span.references?.length) || trace.spans?.[0];
                    const startTime = new Date(trace.spans?.[0]?.startTime / 1000);
                    
                    return (
                      <TableRow key={trace.traceID}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {trace.traceID.slice(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{rootSpan?.operationName || 'Unknown'}</TableCell>
                        <TableCell>
                          {trace.duration ? `${(trace.duration / 1000).toFixed(2)}ms` : 'N/A'}
                        </TableCell>
                        <TableCell>{trace.spans?.length || 0}</TableCell>
                        <TableCell>{startTime.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/traces?traceId=${trace.traceID}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No traces available for this correlation time window.</Alert>
          )}
          
          <Button 
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/traces')}
          >
            View All Traces
          </Button>
        </Box>
        
        {/* Correlations Tab */}
        <Box sx={{ p: 3, display: activeTab === 3 ? 'block' : 'none' }}>
          <Typography variant="h6" gutterBottom>
            Correlated Metrics and Events
          </Typography>
          
          {correlation.correlations && correlation.correlations.length > 0 ? (
            <List>
              {correlation.correlations.map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {item.type === 'metric' ? <TimelineIcon /> : <ReceiptIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={`Correlation Score: ${item.score.toFixed(2)}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No correlations have been identified yet. Run an analysis to find correlations between metrics, logs, and traces.
            </Alert>
          )}
          
          {!correlation.analysisId && correlation.status !== 'processing' && (
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              startIcon={<PsychologyIcon />}
              onClick={handleAnalyzeCorrelation}
              disabled={refreshing}
            >
              Run Analysis
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default CorrelationDetail;