// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get system status
        const status = await api.getSystemStatus();
        setSystemStatus(status);

        // Get active incidents
        const incidentsResponse = await api.getIncidents('active', 5);
        setIncidents(incidentsResponse.incidents || []);

        // Get metrics (simulated data for now)
        setMetrics(generateDummyMetrics());

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh dashboard data every minute
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateDummyMetrics = () => {
    return {
      requestRate: [
        { name: '9:00', service_a: 45, service_b: 32 },
        { name: '10:00', service_a: 58, service_b: 38 },
        { name: '11:00', service_a: 62, service_b: 40 },
        { name: '12:00', service_a: 78, service_b: 45 },
        { name: '13:00', service_a: 91, service_b: 53 },
        { name: '14:00', service_a: 74, service_b: 49 },
      ],
      errorRate: [
        { name: '9:00', service_a: 2, service_b: 1 },
        { name: '10:00', service_a: 3, service_b: 2 },
        { name: '11:00', service_a: 5, service_b: 3 },
        { name: '12:00', service_a: 1, service_b: 2 },
        { name: '13:00', service_a: 0, service_b: 1 },
        { name: '14:00', service_a: 3, service_b: 2 },
      ],
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Platform Overview
      </Typography>

      {/* System Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Correlation Engine
                </Typography>
                <Box display="flex" alignItems="center">
                  {systemStatus.correlation?.status === 'UP' ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {systemStatus.correlation?.status || 'UNKNOWN'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  AI Analyzer
                </Typography>
                <Box display="flex" alignItems="center">
                  {systemStatus.analyzer?.status === 'UP' ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {systemStatus.analyzer?.status || 'UNKNOWN'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Service A
                </Typography>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    UP
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Database
                </Typography>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" />
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    UP
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Metrics Visualization */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Key Metrics</Typography>
          <Button
            variant="outlined"
            startIcon={<TimelineIcon />}
            onClick={() => navigate('/metrics')}
          >
            View All Metrics
          </Button>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Request Rate
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.requestRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="service_a" stroke="#1976d2" name="Service A" />
                <Line type="monotone" dataKey="service_b" stroke="#03a9f4" name="Service B" />
              </LineChart>
            </ResponsiveContainer>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Error Rate
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.errorRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="service_a" fill="#f44336" name="Service A" />
                <Bar dataKey="service_b" fill="#ff9800" name="Service B" />
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        </Grid>
      </Paper>

      {/* Active Incidents */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Active Incidents</Typography>
          <Button
            variant="outlined"
            startIcon={<ErrorIcon />}
            onClick={() => navigate('/incidents')}
            color="error"
          >
            View All Incidents
          </Button>
        </Box>
        {incidents.length === 0 ? (
          <Alert severity="success">No active incidents! Everything is running smoothly.</Alert>
        ) : (
          <Grid container spacing={2}>
            {incidents.map((incident) => (
              <Grid item xs={12} sm={6} md={4} key={incident._id || incident.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      {incident.severity === 'critical' ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                      <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                        {incident.title || `Incident in ${incident.service}`}
                      </Typography>
                    </Box>
                    <Typography color="textSecondary" gutterBottom>
                      Service: {incident.service}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      Started: {new Date(incident.startTime).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" component="div">
                      Status: {incident.status}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/incidents/${incident._id || incident.id}`)}>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Quick Actions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/correlations')}
            >
              Trigger Correlation
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/analysis')}
            >
              Run AI Analysis
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/logs')}
            >
              View Recent Logs
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={() => navigate('/traces')}
            >
              Explore Traces
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Dashboard;