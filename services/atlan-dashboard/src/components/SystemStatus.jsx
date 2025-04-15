import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Button,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Router as RouterIcon,
//   DNS as DnsIcon,
  Language as LanguageIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  ArrowCircleUp as ArrowUpIcon,
  ArrowCircleDown as ArrowDownIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './comman/Loader';
import api from '../services/api';

const SystemStatus = () => {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    correlation: { status: 'UNKNOWN' },
    analyzer: { status: 'UNKNOWN' },
  });
  
  const fetchSystemStatus = async () => {
    try {
      setRefreshing(true);
      
      const status = await api.getSystemStatus();
      setSystemStatus(status);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching system status:', err);
      showError(`Failed to fetch system status: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSystemStatus();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(() => {
      fetchSystemStatus();
    }, 30000);
    
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleRefresh = () => {
    fetchSystemStatus();
  };
  
  const getStatusChip = (status) => {
    switch (status) {
      case 'UP':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Up" 
            color="success" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'DOWN':
        return (
          <Chip 
            icon={<CancelIcon />} 
            label="Down" 
            color="error" 
            sx={{ fontWeight: 500 }}
          />
        );
      case 'DEGRADED':
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Degraded" 
            color="warning" 
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return (
          <Chip 
            icon={<InfoIcon />} 
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
  
  const getServiceIcon = (serviceType) => {
    switch (serviceType) {
      case 'correlation-engine':
        return <MemoryIcon />;
      case 'ai-analyzer':
        return <SpeedIcon />;
      case 'database':
        return <StorageIcon />;
      case 'api':
        return <RouterIcon />;
      case 'dns':
        return <DnsIcon />;
      case 'external':
        return <LanguageIcon />;
      default:
        return <InfoIcon />;
    }
  };
  
  if (loading) {
    return <Loader message="Loading system status..." />;
  }
  
  const isSystemHealthy = 
    systemStatus.correlation.status === 'UP' && 
    systemStatus.analyzer.status === 'UP';
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          System Status
        </Typography>
        
        <Tooltip title="Refresh status">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Overall Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              Overall System Health
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isSystemHealthy ? (
                <CheckCircleIcon color="success" fontSize="large" />
              ) : (
                <CancelIcon color="error" fontSize="large" />
              )}
              <Typography variant="h6">
                {isSystemHealthy ? 'All Systems Operational' : 'System Degraded'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Last Updated
            </Typography>
            <Typography variant="body1">
              {formatDateTime(new Date())}
            </Typography>
            <Button 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ mt: 1 }}
            >
              Refresh Status
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Service Status Cards */}
      <Typography variant="h5" gutterBottom>
        Service Status
      </Typography>
      <Grid container spacing={3}>
        {/* Correlation Engine */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Correlation Engine"
              subheader={`Status: ${systemStatus.correlation.status}`}
              avatar={<MemoryIcon />}
              action={getStatusChip(systemStatus.correlation.status)}
            />
            <Divider />
            <CardContent>
              {systemStatus.correlation.status === 'UP' ? (
                <Box>
                  {systemStatus.correlation.details && (
                    <List dense>
                      {Object.entries(systemStatus.correlation.details).map(([key, value]) => (
                        <ListItem key={key}>
                          <ListItemIcon>
                            {getServiceIcon(key)}
                          </ListItemIcon>
                          <ListItemText
                            primary={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            secondary={typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                          />
                          {typeof value === 'boolean' && (
                            value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              ) : (
                <Alert severity="error">
                  {systemStatus.correlation.error || 'The correlation engine is currently unavailable.'}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* AI Analyzer */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="AI Analyzer"
              subheader={`Status: ${systemStatus.analyzer.status}`}
              avatar={<SpeedIcon />}
              action={getStatusChip(systemStatus.analyzer.status)}
            />
            <Divider />
            <CardContent>
              {systemStatus.analyzer.status === 'UP' ? (
                <Box>
                  {systemStatus.analyzer.details && (
                    <List dense>
                      {Object.entries(systemStatus.analyzer.details).map(([key, value]) => (
                        <ListItem key={key}>
                          <ListItemIcon>
                            {getServiceIcon(key)}
                          </ListItemIcon>
                          <ListItemText
                            primary={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            secondary={typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                          />
                          {typeof value === 'boolean' && (
                            value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              ) : (
                <Alert severity="error">
                  {systemStatus.analyzer.error || 'The AI analyzer is currently unavailable.'}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* External Services */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="External Services"
              subheader="Monitoring APIs and services"
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <DnsIcon color="primary" />
                        <Typography variant="subtitle1">Jaeger Tracing</Typography>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Distributed tracing backend service
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <StorageIcon color="primary" />
                        <Typography variant="subtitle1">VictoriaMetrics</Typography>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Time-series database for metrics
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <StorageIcon color="primary" />
                        <Typography variant="subtitle1">Elasticsearch</Typography>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Search and analytics engine for logs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <StorageIcon color="primary" />
                        <Typography variant="subtitle1">MongoDB</Typography>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Database for correlation and analysis data
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <LanguageIcon color="warning" />
                        <Typography variant="subtitle1">AI API</Typography>
                        <Chip 
                          label="Degraded" 
                          color="warning" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Gemini API for AI analysis
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <RouterIcon color="primary" />
                        <Typography variant="subtitle1">SMTP Server</Typography>
                        <Chip 
                          label="Online" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Email notifications service
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* System Resources */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="System Resources"
              subheader="Current resource utilization"
            />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>CPU Usage</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        bgcolor: 'background.default', 
                        height: 10, 
                        borderRadius: 5,
                        mr: 2
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: '45%', 
                          bgcolor: 'primary.main', 
                          height: 10, 
                          borderRadius: 5 
                        }} 
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 40 }}>45%</Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        bgcolor: 'background.default', 
                        height: 10, 
                        borderRadius: 5,
                        mr: 2
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: '68%', 
                          bgcolor: 'warning.main', 
                          height: 10, 
                          borderRadius: 5 
                        }} 
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 40 }}>68%</Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>Disk Usage</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        bgcolor: 'background.default', 
                        height: 10, 
                        borderRadius: 5,
                        mr: 2
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: '32%', 
                          bgcolor: 'success.main', 
                          height: 10, 
                          borderRadius: 5 
                        }} 
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 40 }}>32%</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Network Traffic</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <ArrowUpIcon color="primary" fontSize="small" />
                      </Grid>
                      <Grid item xs>
                        <Typography variant="body2">Out: 12.5 MB/s</Typography>
                      </Grid>
                    </Grid>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <ArrowDownIcon color="secondary" fontSize="small" />
                      </Grid>
                      <Grid item xs>
                        <Typography variant="body2">In: 8.2 MB/s</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>Database Connections</Typography>
                  <Typography variant="body1">
                    24 active / 100 maximum
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Average Response Time</Typography>
                  <Typography variant="body1">
                    98ms
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemStatus;