// src/components/Correlations.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import api from '../services/api';

const Correlations = () => {
  const [correlations, setCorrelations] = useState([]);
  const [selectedCorrelation, setSelectedCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openTriggerDialog, setOpenTriggerDialog] = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [correlationFormData, setCorrelationFormData] = useState({
    serviceName: 'service-a',
    startTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    endTime: new Date(),
  });

  useEffect(() => {
    fetchCorrelations();
  }, []);

  const fetchCorrelations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCorrelations();
      setCorrelations(response.correlations || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching correlations:', err);
      setError('Failed to load correlations. Please try again later.');
      setLoading(false);
    }
  };

  const handleSelectCorrelation = async (correlationId) => {
    try {
      setLoading(true);
      const response = await api.getCorrelation(correlationId);
      setSelectedCorrelation(response);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching correlation details:', err);
      setError('Failed to load correlation details. Please try again later.');
      setLoading(false);
    }
  };

  const handleOpenTriggerDialog = () => {
    setOpenTriggerDialog(true);
  };

  const handleCloseTriggerDialog = () => {
    setOpenTriggerDialog(false);
  };

  const handleInputChange = (field, value) => {
    setCorrelationFormData({
      ...correlationFormData,
      [field]: value,
    });
  };

  const handleCreateCorrelation = async () => {
    try {
      setLoading(true);
      const response = await api.createCorrelation(
        correlationFormData.serviceName,
        {
          start: correlationFormData.startTime,
          end: correlationFormData.endTime,
        }
      );
      handleCloseTriggerDialog();
      fetchCorrelations();
      // Automatically select the new correlation
      if (response.correlationId) {
        handleSelectCorrelation(response.correlationId);
      }
    } catch (err) {
      console.error('Error creating correlation:', err);
      setError('Failed to create correlation. Please try again later.');
      setLoading(false);
    }
  };

  const handleAnalyzeCorrelation = async (correlationId) => {
    try {
      setLoadingAnalyze(true);
      await api.analyzeCorrelation(correlationId);
      setLoadingAnalyze(false);
      // Show success message or update UI as needed
    } catch (err) {
      console.error('Error analyzing correlation:', err);
      setError('Failed to trigger analysis. Please try again later.');
      setLoadingAnalyze(false);
    }
  };

  if (loading && !selectedCorrelation && correlations.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Correlations</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCorrelations}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenTriggerDialog}
          >
            Trigger Correlation
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Correlations List */}
        <Grid item xs={12} md={selectedCorrelation ? 4 : 12}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Correlations
            </Typography>
            {correlations.length === 0 ? (
              <Alert severity="info">No correlations found. Create a new correlation to get started.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Time Window</TableCell>
                      <TableCell>Summary</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {correlations.map((correlation) => (
                      <TableRow
                        key={correlation.correlationId}
                        hover
                        selected={selectedCorrelation?.correlationId === correlation.correlationId}
                        onClick={() => handleSelectCorrelation(correlation.correlationId)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{correlation.serviceName}</TableCell>
                        <TableCell>
                          {new Date(correlation.timeWindow.start).toLocaleTimeString()} - 
                          {new Date(correlation.timeWindow.end).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`Traces: ${correlation.summary?.traceCount || 0}`} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                          <Chip 
                            label={`Metrics: ${correlation.summary?.metricCount || 0}`} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                          <Chip 
                            label={`Logs: ${correlation.summary?.logCount || 0}`} 
                            size="small"
                            sx={{ mb: 0.5 }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeCorrelation(correlation.correlationId);
                            }}
                            disabled={loadingAnalyze}
                          >
                            {loadingAnalyze ? <CircularProgress size={24} /> : 'Analyze'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Correlation Details */}
        {selectedCorrelation && (
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Correlation Details
              </Typography>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Correlation ID:</strong> {selectedCorrelation.correlationId}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Service:</strong> {selectedCorrelation.serviceName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Start Time:</strong> {new Date(selectedCorrelation.timeWindow.start).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>End Time:</strong> {new Date(selectedCorrelation.timeWindow.end).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Incident ID:</strong> {selectedCorrelation.incidentId || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Traces:</strong> {selectedCorrelation.summary?.traceCount || 0}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Metrics:</strong> {selectedCorrelation.summary?.metricCount || 0}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Logs:</strong> {selectedCorrelation.summary?.logCount || 0} (Errors: {selectedCorrelation.summary?.errorCount || 0})
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Telemetry Data */}
              <Typography variant="subtitle1" gutterBottom>
                Telemetry Summary
              </Typography>
              
              {/* Traces Section */}
              <Typography variant="subtitle2" gutterBottom>
                Traces
              </Typography>
              {!selectedCorrelation.telemetry?.traces || selectedCorrelation.telemetry?.traces.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>No trace data available</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 200, mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Trace ID</TableCell>
                        <TableCell>Operation</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCorrelation.telemetry?.traces.slice(0, 5).map((trace, index) => (
                        <TableRow key={trace.traceId || index}>
                          <TableCell>{trace.traceId?.substring(0, 8) || 'N/A'}</TableCell>
                          <TableCell>{trace.operationName || 'N/A'}</TableCell>
                          <TableCell>{trace.durationMs || 'N/A'} ms</TableCell>
                          <TableCell>
                            {trace.hasError ? (
                              <Chip size="small" color="error" label="Error" />
                            ) : (
                              <Chip size="small" color="success" label="Success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Logs Section */}
              <Typography variant="subtitle2" gutterBottom>
                Logs
              </Typography>
              {!selectedCorrelation.telemetry?.logs || selectedCorrelation.telemetry?.logs.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>No log data available</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 200, mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCorrelation.telemetry?.logs.slice(0, 5).map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'} 
                              label={log.level} 
                            />
                          </TableCell>
                          <TableCell>{log.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Box mt={3} display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => handleAnalyzeCorrelation(selectedCorrelation.correlationId)}
                  disabled={loadingAnalyze}
                >
                  {loadingAnalyze ? <CircularProgress size={24} /> : 'Run AI Analysis'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Trigger Correlation Dialog */}
      <Dialog open={openTriggerDialog} onClose={handleCloseTriggerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Trigger New Correlation</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="service-name-label">Service</InputLabel>
              <Select
                labelId="service-name-label"
                value={correlationFormData.serviceName}
                label="Service"
                onChange={(e) => handleInputChange('serviceName', e.target.value)}
              >
                <MenuItem value="service-a">Service A</MenuItem>
                <MenuItem value="service-b">Service B</MenuItem>
                <MenuItem value="service-c">Service C</MenuItem>
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Start Time"
                    value={correlationFormData.startTime}
                    onChange={(newValue) => handleInputChange('startTime', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="End Time"
                    value={correlationFormData.endTime}
                    onChange={(newValue) => handleInputChange('endTime', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTriggerDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateCorrelation} 
            variant="contained" 
            startIcon={<LinkIcon />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Correlation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Correlations;