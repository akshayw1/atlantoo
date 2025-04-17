import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Check as CheckIcon,
  TimerOutlined as TimerIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './Loader';
import api from '../services/api';

const IncidentList = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [incidentStats, setIncidentStats] = useState({
    active: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
  });
  
  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Available services (in a real app, fetch this from the backend)
  const [availableServices] = useState(['auth-service', 'correlation-engine', 'ai-analyzer']);
  
  const fetchIncidents = async () => {
    try {
      setRefreshing(true);
      
      // Fetch incidents from API
      const data = await api.getIncidents(activeTab);
      setIncidents(data);
      
      // Calculate stats
      const stats = {
        active: data.filter(incident => incident.status === 'active').length,
        resolved: data.filter(incident => incident.status === 'resolved').length,
        critical: data.filter(incident => incident.severity === 'critical').length,
        warning: data.filter(incident => incident.severity === 'warning').length,
      };
      setIncidentStats(stats);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      showError(`Failed to fetch incidents: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Filter incidents based on search term and filters
  useEffect(() => {
    let filtered = incidents;
    
    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(incident => incident.severity === severityFilter);
    }
    
    // Filter by service
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(incident => incident.service === serviceFilter);
    }
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(incident => 
        incident.title.toLowerCase().includes(lowercasedTerm) ||
        incident.description?.toLowerCase().includes(lowercasedTerm) ||
        incident.service.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    setFilteredIncidents(filtered);
    setPage(0); // Reset to first page when filtering
  }, [incidents, searchTerm, severityFilter, serviceFilter]);
  
  // Fetch incidents when tab changes
  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleSeverityFilterChange = (event) => {
    setSeverityFilter(event.target.value);
  };
  
  const handleServiceFilterChange = (event) => {
    setServiceFilter(event.target.value);
  };
  
  const handleRefresh = () => {
    fetchIncidents();
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleIncidentClick = (incidentId) => {
    navigate(`/incidents/${incidentId}`);
  };
  
  const getSeverityChip = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Critical" 
            color="error" 
            size="small" 
          />
        );
      case 'warning':
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Warning" 
            color="warning" 
            size="small" 
          />
        );
      default:
        return (
          <Chip 
            label={severity || 'Unknown'} 
            size="small" 
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
            size="small" 
          />
        );
      case 'resolved':
        return (
          <Chip 
            icon={<CheckIcon />} 
            label="Resolved" 
            color="success" 
            size="small" 
          />
        );
      default:
        return (
          <Chip 
            label={status || 'Unknown'} 
            size="small" 
          />
        );
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };
  
  const formatDuration = (start, end) => {
    if (!start) return '';
    
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    
    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ${minutes % 60}m`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };
  
  if (loading) {
    return <Loader message="Loading incidents..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Incidents
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Active Incidents
              </Typography>
              <Typography variant="h4">
                {incidentStats.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Resolved Incidents
              </Typography>
              <Typography variant="h4">
                {incidentStats.resolved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Critical Incidents
              </Typography>
              <Typography variant="h4" color="error.main">
                {incidentStats.critical}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Warning Incidents
              </Typography>
              <Typography variant="h4" color="warning.main">
                {incidentStats.warning}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filters and Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
          >
            <Tab label="Active Incidents" value="active" />
            <Tab label="Resolved Incidents" value="resolved" />
          </Tabs>
        </Box>
        
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severityFilter}
                  onChange={handleSeverityFilterChange}
                  label="Severity"
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Service</InputLabel>
                <Select
                  value={serviceFilter}
                  onChange={handleServiceFilterChange}
                  label="Service"
                >
                  <MenuItem value="all">All Services</MenuItem>
                  {availableServices.map(service => (
                    <MenuItem key={service} value={service}>{service}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Refresh incidents">
                  <IconButton onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Incidents Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Severity</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Detected At</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIncidents.length > 0 ? (
                filteredIncidents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((incident) => (
                    <TableRow
                      key={incident.id}
                      hover
                      onClick={() => handleIncidentClick(incident.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{getSeverityChip(incident.severity)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {incident.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{incident.service}</TableCell>
                      <TableCell>{getStatusChip(incident.status)}</TableCell>
                      <TableCell>{formatDateTime(incident.detectedAt)}</TableCell>
                      <TableCell>{formatDuration(incident.detectedAt, incident.resolvedAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incidents/${incident.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No incidents found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || severityFilter !== 'all' || serviceFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : `No ${activeTab} incidents at this time`}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredIncidents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default IncidentList;