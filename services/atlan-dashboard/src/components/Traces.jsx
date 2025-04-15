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
  Button,
  Chip,
  IconButton,
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
  Collapse,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  CompareArrows as CompareArrowsIcon,
  Timeline as TimelineIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  ArrowRight as ArrowRightIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import TimeRangePicker from './TimeRangePicker';
import Loader from './Loader';
import api from '../services/api';

// Component for displaying a trace timeline
const TraceTimeline = ({ spans }) => {
  if (!spans || spans.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography variant="body1" color="text.secondary">
          No spans available for this trace
        </Typography>
      </Box>
    );
  }

  // Sort spans by start time
  const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime);
  
  // Find earliest and latest timestamps
  const earliestTime = sortedSpans[0].startTime;
  const latestTime = Math.max(...sortedSpans.map(span => span.startTime + span.duration));
  const totalDuration = latestTime - earliestTime;
  
  // Calculate offset and width percentages for each span
  const spanItems = sortedSpans.map(span => {
    const offsetPercent = ((span.startTime - earliestTime) / totalDuration) * 100;
    const widthPercent = (span.duration / totalDuration) * 100;
    const hasError = span.tags.some(tag => (tag.key === 'error' && tag.value === true) || 
                                    (tag.key === 'http.status_code' && parseInt(tag.value) >= 500));
    
    return {
      ...span,
      offsetPercent,
      widthPercent,
      hasError
    };
  });
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ position: 'relative', height: `${spans.length * 35 + 30}px`, mb: 2 }}>
        {/* Time axis */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20 }}>
          <Box sx={{ position: 'absolute', left: 0, width: '100%', height: 1, bgcolor: 'divider' }} />
          {[0, 25, 50, 75, 100].map(pos => (
            <React.Fragment key={pos}>
              <Box sx={{ position: 'absolute', left: `${pos}%`, height: 5, width: 1, bgcolor: 'divider' }} />
              <Typography 
                variant="caption" 
                sx={{ position: 'absolute', left: `${pos}%`, top: 7, transform: 'translateX(-50%)' }}
              >
                {`${Math.round(earliestTime + (totalDuration * pos / 100)) / 1000}ms`}
              </Typography>
            </React.Fragment>
          ))}
        </Box>
        
        {/* Span bars */}
        {spanItems.map((span, index) => (
          <Box
            key={span.spanId}
            sx={{
              position: 'absolute',
              top: `${index * 35 + 30}px`,
              left: `${span.offsetPercent}%`,
              width: `${Math.max(span.widthPercent, 0.5)}%`,
              height: 24,
              bgcolor: span.hasError ? 'error.light' : 'primary.light',
              border: 1,
              borderColor: span.hasError ? 'error.main' : 'primary.main',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              px: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: span.hasError ? 'error.main' : 'primary.main',
                color: 'white',
                zIndex: 1
              }
            }}
          >
            <Tooltip title={`${span.operationName} (${span.duration / 1000}ms)`}>
              <Typography variant="caption" noWrap>
                {span.operationName}
              </Typography>
            </Tooltip>
          </Box>
        ))}
        
        {/* Service names */}
        {spanItems.map((span, index) => (
          <Typography
            key={`service-${span.spanId}`}
            variant="caption"
            sx={{ 
              position: 'absolute', 
              top: `${index * 35 + 35}px`, 
              left: 0, 
              width: '15%', 
              textAlign: 'right',
              pr: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {span.process?.serviceName || 'unknown'}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

// Main component
const Traces = () => {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [traces, setTraces] = useState([]);
  const [filteredTraces, setFilteredTraces] = useState([]);
  
  // Form states
  const [service, setService] = useState('service-a');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Trace details dialog
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [traceDetailsLoading, setTraceDetailsLoading] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  
  // Advanced filters
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filterOperation, setFilterOperation] = useState('');
  const [filterMinDuration, setFilterMinDuration] = useState('');
  const [filterMaxDuration, setFilterMaxDuration] = useState('');
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  
  // Available services
  const [availableServices] = useState(['service-a', 'correlation-engine', 'ai-analyzer']);
  
  const fetchTraces = async () => {
    try {
      setRefreshing(true);
      
      // Prepare filters
      const filters = {};
      
      if (filterOperation) {
        filters.operation = filterOperation;
      }
      
      if (filterMinDuration) {
        filters.minDuration = filterMinDuration;
      }
      
      if (filterMaxDuration) {
        filters.maxDuration = filterMaxDuration;
      }
      
      if (filterErrorsOnly) {
        filters.tags = 'error=true';
      }
      
      // Fetch traces from API
      let data;
      if (filterErrorsOnly) {
        data = await api.findErrorTraces(service, timeRange, 100);
      } else {
        data = await api.getTraces(service, timeRange, 100);
      }
      
      setTraces(data);
      setFilteredTraces(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching traces:', err);
      showError(`Failed to fetch traces: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  const fetchTraceDetails = async (traceId) => {
    try {
      setTraceDetailsLoading(true);
      const data = await api.getTrace(traceId);
      setSelectedTrace(data);
      setTraceDetailsLoading(false);
    } catch (err) {
      console.error('Error fetching trace details:', err);
      showError(`Failed to fetch trace details: ${err.message}`);
      setTraceDetailsLoading(false);
    }
  };
  
  // Filter traces based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTraces(traces);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = traces.filter(trace => 
        trace.traceID?.toLowerCase().includes(lowercasedTerm) || 
        trace.spans?.some(span => 
          span.operationName?.toLowerCase().includes(lowercasedTerm) ||
          span.process?.serviceName?.toLowerCase().includes(lowercasedTerm)
        )
      );
      setFilteredTraces(filtered);
    }
    
    setPage(0); // Reset to first page when filtering
  }, [traces, searchTerm]);
  
  // Fetch traces when service or time range changes
  useEffect(() => {
    fetchTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, timeRange]);
  
  const handleServiceChange = (event) => {
    setService(event.target.value);
  };
  
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleTraceClick = (traceId) => {
    setSelectedTraceId(traceId);
    setDetailsOpen(true);
    fetchTraceDetails(traceId);
  };
  
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedTrace(null);
    setSelectedTraceId(null);
    setSelectedTabIndex(0);
  };
  
  const handleRefresh = () => {
    fetchTraces();
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
    fetchTraces();
  };
  
  const handleClearAdvancedFilters = () => {
    setFilterOperation('');
    setFilterMinDuration('');
    setFilterMaxDuration('');
    setFilterErrorsOnly(false);
  };
  
  const handleTabChange = (event, newValue) => {
    setSelectedTabIndex(newValue);
  };
  
  const handleCreateCorrelation = async (traceId) => {
    try {
      setRefreshing(true);
      await api.createCorrelationByTraceId(traceId);
      showSuccess('Correlation created successfully');
      setRefreshing(false);
    } catch (err) {
      console.error('Error creating correlation:', err);
      showError(`Failed to create correlation: ${err.message}`);
      setRefreshing(false);
    }
  };
  
  const formatDuration = (microseconds) => {
    if (microseconds < 1000) {
      return `${microseconds}μs`;
    } else if (microseconds < 1000000) {
      return `${(microseconds / 1000).toFixed(2)}ms`;
    } else {
      return `${(microseconds / 1000000).toFixed(2)}s`;
    }
  };
  
  const getStatusIcon = (trace) => {
    const hasError = trace.spans?.some(span => 
      span.tags?.some(tag => 
        (tag.key === 'error' && tag.value === true) || 
        (tag.key === 'http.status_code' && parseInt(tag.value) >= 500)
      )
    );
    
    return hasError ? (
      <ErrorIcon color="error" fontSize="small" />
    ) : (
      <SuccessIcon color="success" fontSize="small" />
    );
  };
  
  if (loading) {
    return <Loader message="Loading traces..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trace Explorer
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
          
          <Grid item xs={12} sm={4} md={3}>
            <TimeRangePicker 
              timeRange={timeRange} 
              onTimeRangeChange={handleTimeRangeChange} 
            />
          </Grid>
          
          <Grid item xs={10} sm={6} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search traces..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={2} md={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Tooltip title="Refresh traces">
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
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Operation Name"
                        placeholder="Filter by operation"
                        value={filterOperation}
                        onChange={(e) => setFilterOperation(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Min Duration (ms)"
                        type="number"
                        placeholder="Minimum"
                        value={filterMinDuration}
                        onChange={(e) => setFilterMinDuration(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Max Duration (ms)"
                        type="number"
                        placeholder="Maximum"
                        value={filterMaxDuration}
                        onChange={(e) => setFilterMaxDuration(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Show only</InputLabel>
                        <Select
                          value={filterErrorsOnly ? "errors" : "all"}
                          onChange={(e) => setFilterErrorsOnly(e.target.value === "errors")}
                          label="Show only"
                        >
                          <MenuItem value="all">All Traces</MenuItem>
                          <MenuItem value="errors">Error Traces</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
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
      
      {/* Traces Table */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">
            Traces
            {filteredTraces.length > 0 && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({filteredTraces.length} found)
              </Typography>
            )}
          </Typography>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Trace ID</TableCell>
                <TableCell>Root Operation</TableCell>
                <TableCell>Services</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Spans</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTraces.length > 0 ? (
                filteredTraces
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((trace) => {
                    const rootSpan = trace.spans?.find(span => !span.references?.length) || trace.spans?.[0];
                    const services = [...new Set(trace.spans?.map(span => span.process?.serviceName))].filter(Boolean);
                    const startTime = new Date(trace.spans?.[0]?.startTime / 1000);
                    
                    return (
                      <TableRow 
                        key={trace.traceID}
                        hover
                        onClick={() => handleTraceClick(trace.traceID)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{getStatusIcon(trace)}</TableCell>
                        <TableCell>
                          <Tooltip title={trace.traceID}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {trace.traceID.slice(0, 8)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{rootSpan?.operationName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {services.map(service => (
                              <Chip 
                                key={service} 
                                label={service} 
                                size="small" 
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDuration(trace.duration || 0)}</TableCell>
                        <TableCell>{trace.spans?.length || 0}</TableCell>
                        <TableCell>{startTime.toLocaleString()}</TableCell>
                        <TableCell>
                          <Tooltip title="Create correlation from this trace">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateCorrelation(trace.traceID);
                              }}
                            >
                              <CompareArrowsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No traces found
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
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredTraces.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Trace Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Trace Details
          {selectedTrace && (
            <Typography variant="caption" display="block" color="text.secondary">
              ID: {selectedTraceId} | Duration: {formatDuration(selectedTrace.duration || 0)}
            </Typography>
          )}
        </DialogTitle>
        
        <Divider />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTabIndex} onChange={handleTabChange}>
            <Tab label="Timeline" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Spans" icon={<InfoIcon />} iconPosition="start" />
          </Tabs>
        </Box>
        
        <DialogContent dividers>
          {traceDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedTrace ? (
            <>
              {selectedTabIndex === 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Trace Timeline
                  </Typography>
                  <TraceTimeline spans={selectedTrace.spans} />
                </Box>
              )}
              
              {selectedTabIndex === 1 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Span Details
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Service</TableCell>
                          <TableCell>Operation</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Start Time</TableCell>
                          <TableCell>Tags</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTrace.spans.map(span => (
                          <TableRow key={span.spanId}>
                            <TableCell>{span.process?.serviceName || 'unknown'}</TableCell>
                            <TableCell>{span.operationName}</TableCell>
                            <TableCell>{formatDuration(span.duration)}</TableCell>
                            <TableCell>{new Date(span.startTime / 1000).toLocaleTimeString()}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {span.tags?.map((tag, index) => (
                                  <Tooltip 
                                    key={index} 
                                    title={`${tag.key}: ${tag.value}`}
                                  >
                                    <Chip 
                                      size="small" 
                                      label={`${tag.key}: ${tag.value.toString().slice(0, 10)}${tag.value.toString().length > 10 ? '...' : ''}`}
                                      color={tag.key === 'error' && tag.value === true ? 'error' : 'default'}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No trace data available
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => handleCreateCorrelation(selectedTraceId)}
            color="primary"
            startIcon={<CompareArrowsIcon />}
          >
            Create Correlation
          </Button>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Traces;