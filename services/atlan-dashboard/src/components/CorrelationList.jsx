import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import TimeRangePicker from './TimeRangePicker';
import Loader from './Loader';
import api from '../services/api';

const CorrelationList = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [correlations, setCorrelations] = useState([]);
  const [filteredCorrelations, setFilteredCorrelations] = useState([]);
  
  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Create correlation dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  });
  const [creatingCorrelation, setCreatingCorrelation] = useState(false);
  
  // Available services
  const [availableServices] = useState(['auth-service', 'correlation-engine', 'ai-analyzer']);
  
  const fetchCorrelations = async () => {
    try {
      setRefreshing(true);
      
      const data = await api.getCorrelations();
      setCorrelations(data);
      setFilteredCorrelations(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching correlations:', err);
      showError(`Failed to fetch correlations: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Filter correlations based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCorrelations(correlations);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = correlations.filter(correlation => 
        correlation.id?.toLowerCase().includes(lowercasedTerm) ||
        correlation.serviceName?.toLowerCase().includes(lowercasedTerm) ||
        correlation.status?.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredCorrelations(filtered);
    }
    
    setPage(0); // Reset to first page when filtering
  }, [correlations, searchTerm]);
  
  // Initial data fetch
  useEffect(() => {
    fetchCorrelations();
  }, []);
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleRefresh = () => {
    fetchCorrelations();
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleCorrelationClick = (correlationId) => {
    navigate(`/correlations/${correlationId}`);
  };
  
  const handleCreateDialogOpen = () => {
    setSelectedService(availableServices[0]);
    setTimeRange({
      start: new Date(Date.now() - 3600000), // 1 hour ago
      end: new Date(),
    });
    setCreateDialogOpen(true);
  };
  
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  const handleServiceChange = (event) => {
    setSelectedService(event.target.value);
  };
  
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };
  
  const handleCreateCorrelation = async () => {
    try {
      setCreatingCorrelation(true);
      
      await api.createCorrelation(selectedService, timeRange);
      
      showSuccess('Correlation created successfully');
      setCreatingCorrelation(false);
      setCreateDialogOpen(false);
      
      // Refresh data to include the new correlation
      fetchCorrelations();
    } catch (err) {
      console.error('Error creating correlation:', err);
      showError(`Failed to create correlation: ${err.message}`);
      setCreatingCorrelation(false);
    }
  };
  
  const handleAnalyzeCorrelation = async (correlationId) => {
    try {
      setRefreshing(true);
      
      await api.analyzeCorrelation(correlationId);
      
      showSuccess('Analysis started successfully');
      setRefreshing(false);
      
      // Refresh data to include the analysis status update
      fetchCorrelations();
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
            size="small" 
          />
        );
      case 'processing':
        return (
          <Chip 
            icon={<PendingIcon />} 
            label="Processing" 
            color="primary" 
            size="small" 
          />
        );
      case 'failed':
        return (
          <Chip 
            icon={<ErrorIcon />} 
            label="Failed" 
            color="error" 
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
    if (!start || !end) return '';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };
  
  if (loading) {
    return <Loader message="Loading correlations..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Telemetry Correlations
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Correlations
              </Typography>
              <Typography variant="h4">
                {correlations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Processed Correlations
              </Typography>
              <Typography variant="h4" color="success.main">
                {correlations.filter(c => c.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Failed Correlations
              </Typography>
              <Typography variant="h4" color="error.main">
                {correlations.filter(c => c.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search correlations..."
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
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateDialogOpen}
              >
                Create Correlation
              </Button>
              
              <Tooltip title="Refresh correlations">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Correlations Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Time Window</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCorrelations.length > 0 ? (
                filteredCorrelations
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((correlation) => (
                    <TableRow
                      key={correlation.id}
                      hover
                      onClick={() => handleCorrelationClick(correlation.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {correlation.id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{correlation.serviceName}</TableCell>
                      <TableCell>
                        {formatDateTime(correlation.startTime)} - {formatDateTime(correlation.endTime)}
                      </TableCell>
                      <TableCell>{formatDuration(correlation.startTime, correlation.endTime)}</TableCell>
                      <TableCell>{formatDateTime(correlation.createdAt)}</TableCell>
                      <TableCell>{getStatusChip(correlation.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/correlations/${correlation.id}`);
                            }}
                          >
                            View
                          </Button>
                          
                          {(correlation.status !== 'processing' && !correlation.analysisId) && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PsychologyIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeCorrelation(correlation.id);
                              }}
                            >
                              Analyze
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No correlations found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm 
                        ? 'Try adjusting your search term'
                        : 'Create a new correlation to get started'}
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
          count={filteredCorrelations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Create Correlation Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Correlation</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a service and time window to correlate telemetry data. This will analyze logs, metrics, and traces within the specified time range.
          </DialogContentText>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Service</InputLabel>
                <Select
                  value={selectedService}
                  onChange={handleServiceChange}
                  label="Service"
                >
                  {availableServices.map(service => (
                    <MenuItem key={service} value={service}>{service}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Time Window
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimeRangePicker 
                  timeRange={timeRange} 
                  onTimeRangeChange={handleTimeRangeChange} 
                />
                <Typography variant="body2" color="text.secondary">
                  Duration: {formatDuration(timeRange.start, timeRange.end)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateCorrelation} 
            variant="contained"
            disabled={creatingCorrelation}
          >
            {creatingCorrelation ? <CircularProgress size={24} /> : 'Create Correlation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CorrelationList;