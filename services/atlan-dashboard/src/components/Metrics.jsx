import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  // FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

import { useToast } from '../context/ToastContext';
import TimeRangePicker from './TimeRangePicker';
import Loader from './Loader';
import api from '../services/api';

const Metrics = () => {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Form states
  const [service, setService] = useState('service-a');
  const [metricType, setMetricType] = useState('requestRate');
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  });
  
  // Data states
  const [metricData, setMetricData] = useState([]);
  const [availableServices] = useState(['service-a', 'correlation-engine', 'ai-analyzer']);
  
  // Metric types with labels and colors
  const metricTypes = [
    { value: 'requestRate', label: 'Request Rate', color: '#1976d2', unit: 'req/min' },
    { value: 'errorRate', label: 'Error Rate', color: '#f44336', unit: '%' },
    { value: 'latency', label: 'Latency', color: '#ff9800', unit: 'ms' },
    { value: 'cpu', label: 'CPU Usage', color: '#2196f3', unit: '%' },
    { value: 'memory', label: 'Memory Usage', color: '#4caf50', unit: '%' },
  ];
  
  // Get the current metric type object
  const currentMetricType = metricTypes.find(type => type.value === metricType) || metricTypes[0];
  
  const fetchMetricData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Fetch metric data from API
      const data = await api.getMetrics(service, timeRange);
      setMetricData(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching metric data:', err);
      setError(err.message);
      showError(`Failed to fetch metrics: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMetricData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, metricType, timeRange]);
  
  const handleServiceChange = (event) => {
    setService(event.target.value);
  };
  
  const handleMetricTypeChange = (event) => {
    setMetricType(event.target.value);
  };
  
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };
  
  const handleRefresh = () => {
    fetchMetricData();
  };
  
  const handleExport = () => {
    // Convert metric data to CSV format
    if (metricData.length === 0) {
      showError('No data to export');
      return;
    }
    
    const headers = ['Timestamp', `${currentMetricType.label} (${currentMetricType.unit})`];
    const csvRows = [headers.join(',')];
    
    metricData.forEach(item => {
      const row = [
        new Date(item.timestamp).toISOString(),
        item.value
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    // Create download link and click it
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${service}_${metricType}_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Metrics data exported successfully');
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (loading) {
    return <Loader message="Loading metrics data..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Metrics Explorer
      </Typography>
      
      {/* Filters Paper */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Service</InputLabel>
              <Select
                value={service}
                onChange={handleServiceChange}
                label="Service"
              >
                {availableServices.map((svc) => (
                  <MenuItem key={svc} value={svc}>{svc}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Metric</InputLabel>
              <Select
                value={metricType}
                onChange={handleMetricTypeChange}
                label="Metric"
              >
                {metricTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <TimeRangePicker 
              timeRange={timeRange} 
              onTimeRangeChange={handleTimeRangeChange} 
            />
          </Grid>
          
          <Grid item xs={12} sm={2} md={5}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Export data as CSV">
                <IconButton onClick={handleExport} disabled={metricData.length === 0}>
                  {/* <FileDownloadIcon /> FA */}
                  FA
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {currentMetricType.label} - {service}
            </Typography>
            <Box sx={{ height: 400 }}>
              {metricData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatDate}
                      label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }}
                    />
                    <YAxis 
                      label={{ 
                        value: `${currentMetricType.label} (${currentMetricType.unit})`, 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <ChartTooltip
                      labelFormatter={formatDate}
                      formatter={(value) => [`${value} ${currentMetricType.unit}`, currentMetricType.label]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={currentMetricType.label}
                      stroke={currentMetricType.color}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body1" color="text.secondary">
                    No data available for the selected time range
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            {metricData.length > 0 ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Average
                      </Typography>
                      <Typography variant="h5">
                        {(metricData.reduce((sum, item) => sum + item.value, 0) / metricData.length).toFixed(2)} {currentMetricType.unit}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Maximum
                      </Typography>
                      <Typography variant="h5">
                        {Math.max(...metricData.map(item => item.value)).toFixed(2)} {currentMetricType.unit}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Minimum
                      </Typography>
                      <Typography variant="h5">
                        {Math.min(...metricData.map(item => item.value)).toFixed(2)} {currentMetricType.unit}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Current
                      </Typography>
                      <Typography variant="h5">
                        {metricData[metricData.length - 1].value.toFixed(2)} {currentMetricType.unit}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 150 }}>
                <Typography variant="body1" color="text.secondary">
                  No statistics available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Data Table */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Raw Data
            </Typography>
            {metricData.length > 0 ? (
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell align="right">{currentMetricType.label} ({currentMetricType.unit})</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...metricData].reverse().slice(0, 50).map((row, index) => (
                      <TableRow
                        key={index}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          {new Date(row.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">{row.value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography variant="body1" color="text.secondary">
                  No data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Metrics;