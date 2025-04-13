import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  ArrowDropUp as ArrowUpIcon,
  ArrowDropDown as ArrowDownIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { useToast } from '../context/ToastContext';
import Loader from './Loader';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState({ service: '', data: [] });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get system status
        const systemStatus = await api.getSystemStatus();
        
        // Transform system status into service list
        const serviceList = [
          {
            name: 'Correlation Engine',
            status: systemStatus.correlation.status === 'UP' ? 'healthy' : 'critical',
            details: systemStatus.correlation.details || {}
          },
          {
            name: 'AI Analyzer',
            status: systemStatus.analyzer.status === 'UP' ? 'healthy' : 'critical',
            details: systemStatus.analyzer.details || {}
          }
        ];
        
        setServices(serviceList);
        
        // Get active incidents
        const activeIncidents = await api.getIncidents('active', 5);
        setIncidents(activeIncidents);
        
        // Get metrics for a service (using the first service from the list for demo)
        if (serviceList.length > 0) {
          const serviceName = 'service-a'; // Default to service-a for now
          const now = new Date();
          const timeRange = {
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
            end: now
          };
          
          const metricsData = await api.getMetrics(serviceName, timeRange);
          setMetrics({
            service: serviceName,
            data: metricsData
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [showError]);
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (loading) {
    return <Loader message="Loading dashboard data..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Service Status Cards */}
        {services.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.name}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(service.status)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {service.name}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      <Chip 
                        size="small" 
                        label={service.status.toUpperCase()} 
                        color={service.status === 'healthy' ? 'success' : service.status === 'warning' ? 'warning' : 'error'}
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {service.details.lastChecked ? formatDate(service.details.lastChecked) : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {/* Active Incidents */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%' }}>
            <CardHeader 
              title="Active Incidents"
              action={
                <Button 
                  size="small" 
                  variant="text" 
                  onClick={() => navigate('/incidents')}
                >
                  View All
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ maxHeight: 300, overflow: 'auto' }}>
              {incidents.length > 0 ? (
                <List>
                  {incidents.map((incident) => (
                    <ListItem
                      key={incident.id}
                      button
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      sx={{ py: 1 }}
                    >
                      <ListItemIcon>
                        {incident.severity === 'critical' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <WarningIcon color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={incident.title}
                        secondary={`Service: ${incident.service} | Detected: ${formatDate(incident.detectedAt)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No active incidents
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Paper>
        </Grid>
        
        {/* Metrics Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%' }}>
            <CardHeader 
              title={`${metrics.service} Request Rate`}
              action={
                <Button 
                  size="small" 
                  variant="text" 
                  onClick={() => navigate('/metrics')}
                >
                  View Details
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ height: 300 }}>
              {metrics.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip labelFormatter={formatDate} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1976d2" 
                      name="Requests/min" 
                      dot={false}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No metrics data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Paper>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item>
                  <Button 
                    variant="contained" 
                    onClick={() => navigate('/correlations')}
                    startIcon={<TrendingUpIcon />}
                  >
                    New Correlation
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="contained" 
                    onClick={() => navigate('/logs')}
                  >
                    View Logs
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="contained" 
                    onClick={() => navigate('/traces')}
                  >
                    View Traces
                  </Button>
                </Grid>
                <Grid item>
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={() => navigate('/incidents')}
                    startIcon={<ErrorIcon />}
                  >
                    Manage Incidents
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;