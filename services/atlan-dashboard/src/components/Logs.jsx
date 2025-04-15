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
  TextField,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterListIcon,
  // FileDownload as FileDownloadIcon
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import TimeRangePicker from './TimeRangePicker';
import Loader from './Loader';
import api from '../services/api';

const Logs = () => {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  
  // Form states
  const [service, setService] = useState('service-a');
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Details dialog
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Advanced filters
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filterComponent, setFilterComponent] = useState('');
  const [filterTraceId, setFilterTraceId] = useState('');
  
  // Available services
  const [availableServices] = useState(['service-a', 'correlation-engine', 'ai-analyzer']);
  
  // Log levels with colors
  const logLevels = {
    trace: { color: '#9e9e9e', label: 'TRACE' },
    debug: { color: '#2196f3', label: 'DEBUG' },
    info: { color: '#4caf50', label: 'INFO' },
    warn: { color: '#ff9800', label: 'WARN' },
    error: { color: '#f44336', label: 'ERROR' },
    fatal: { color: '#9c27b0', label: 'FATAL' },
  };
  
  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      
      // Prepare filters
      const filters = {};
      
      if (logLevel !== 'all') {
        filters.level = logLevel;
      }
      
      if (filterComponent) {
        filters.component = filterComponent;
      }
      
      if (filterTraceId) {
        filters.traceId = filterTraceId;
      }
      
      // Fetch logs from API
      const data = await api.getLogs(service, timeRange, filters);
      setLogs(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      showError(`Failed to fetch logs: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Filter logs based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLogs(logs);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = logs.filter(log => 
        log.message?.toLowerCase().includes(lowercasedTerm) || 
        log.component?.toLowerCase().includes(lowercasedTerm) || 
        log.traceId?.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredLogs(filtered);
    }
    
    setPage(0); // Reset to first page when filtering
  }, [logs, searchTerm]);
  
  // Fetch logs when service or time range changes
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, timeRange, logLevel]);
  
  const handleServiceChange = (event) => {
    setService(event.target.value);
  };
  
  const handleLogLevelChange = (event) => {
    setLogLevel(event.target.value);
  };
  
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleRowClick = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };
  
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };
  
  const handleRefresh = () => {
    fetchLogs();
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleToggleFilters = () => {
    setFilterExpanded(!filterExpanded);
  };
  
  const handleApplyAdvancedFilters = () => {
    fetchLogs();
  };
  
  const handleClearAdvancedFilters = () => {
    setFilterComponent('');
    setFilterTraceId('');
  };
  
  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showError('No logs to export');
      return;
    }
    
    // Convert logs to CSV format
    const headers = ['Timestamp', 'Level', 'Service', 'Component', 'TraceID', 'Message'];
    const csvRows = [headers.join(',')];
    
    filteredLogs.forEach(log => {
      // Escape quotes in message
      const message = log.message ? `"${log.message.replace(/"/g, '""')}"` : '';
      
      const row = [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.service,
        log.component || '',
        log.traceId || '',
        message
      ];
      
      csvRows.push(row.join(','));
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    // Create download link and click it
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `logs_${service}_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Logs exported successfully');
  };
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };
  
  const getLogLevelChip = (level) => {
    const logLevelInfo = logLevels[level?.toLowerCase()] || { color: '#9e9e9e', label: level?.toUpperCase() || 'UNKNOWN' };
    
    return (
      <Chip 
        label={logLevelInfo.label} 
        size="small" 
        sx={{ 
          backgroundColor: logLevelInfo.color,
          color: '#fff',
          fontWeight: 500
        }} 
      />
    );
  };
  
  if (loading) {
    return <Loader message="Loading logs..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Log Explorer
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
              <InputLabel>Log Level</InputLabel>
              <Select
                value={logLevel}
                onChange={handleLogLevelChange}
                label="Log Level"
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="trace">Trace</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="fatal">Fatal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <TimeRangePicker 
              timeRange={timeRange} 
              onTimeRangeChange={handleTimeRangeChange} 
            />
          </Grid>
          
          <Grid item xs={10} sm={8} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={2} sm={4} md={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Tooltip title="Refresh logs">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Toggle advanced filters">
                <IconButton onClick={handleToggleFilters}>
                  <FilterListIcon color={filterExpanded ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          
          {/* Advanced Filters */}
          <Grid item xs={12}>
            <Collapse in={filterExpanded}>
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Advanced Filters
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Component"
                        placeholder="Filter by component"
                        value={filterComponent}
                        onChange={(e) => setFilterComponent(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Trace ID"
                        placeholder="Filter by trace ID"
                        value={filterTraceId}
                        onChange={(e) => setFilterTraceId(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained" 
                          onClick={handleApplyAdvancedFilters}
                          size="small"
                        >
                          Apply Filters
                        </Button>
                        <Button 
                          variant="outlined" 
                          onClick={handleClearAdvancedFilters}
                          size="small"
                        >
                          Clear
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Logs Table */}
      <Paper>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">
            Logs
            {filteredLogs.length > 0 && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({filteredLogs.length} entries)
              </Typography>
            )}
          </Typography>
          
          <Tooltip title="Export logs as CSV">
            <IconButton onClick={handleExportLogs} disabled={filteredLogs.length === 0}>
              {/* <FileDownloadIcon /> */} FA
            </IconButton>
          </Tooltip>
        </Box>
        
        <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Component</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Trace ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log, index) => (
                    <TableRow 
                      key={index}
                      hover
                      onClick={() => handleRowClick(log)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                      <TableCell>{getLogLevelChip(log.level)}</TableCell>
                      <TableCell>{log.component || '-'}</TableCell>
                      <TableCell>
                        <Typography noWrap sx={{ maxWidth: 500 }}>
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.traceId ? (
                          <Tooltip title="Click to see related logs">
                            <Chip 
                              label={log.traceId.slice(0, 8) + '...'}
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilterTraceId(log.traceId);
                                setFilterExpanded(true);
                              }}
                            />
                          </Tooltip>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No logs found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting your filters or time range
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Log Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Log Details
          {selectedLog && (
            <Typography variant="caption" display="block" color="text.secondary">
              {formatTimestamp(selectedLog.timestamp)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Service</Typography>
                <Typography variant="body1" gutterBottom>{selectedLog.service}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Level</Typography>
                <Typography variant="body1" gutterBottom>{getLogLevelChip(selectedLog.level)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Component</Typography>
                <Typography variant="body1" gutterBottom>{selectedLog.component || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Trace ID</Typography>
                <Typography variant="body1" gutterBottom>{selectedLog.traceId || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Message</Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default', whiteSpace: 'pre-wrap' }}>
                  {selectedLog.message}
                </Paper>
              </Grid>
              {selectedLog.stack && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Stack Trace</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                    {selectedLog.stack}
                  </Paper>
                </Grid>
              )}
              {selectedLog.metadata && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Metadata</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default', whiteSpace: 'pre-wrap' }}>
                    {typeof selectedLog.metadata === 'object'
                      ? JSON.stringify(selectedLog.metadata, null, 2)
                      : selectedLog.metadata}
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedLog?.traceId && (
            <Button 
              onClick={() => {
                setFilterTraceId(selectedLog.traceId);
                setFilterExpanded(true);
                handleCloseDetails();
                handleApplyAdvancedFilters();
              }}
            >
              View Related Logs
            </Button>
          )}
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Logs;
              