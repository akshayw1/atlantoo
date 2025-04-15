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
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Lightbulb as LightbulbIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './Loader';
import api from '../services/api';

const AnalysisList = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  
  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const fetchAnalyses = async () => {
    try {
      setRefreshing(true);
      
      const data = await api.getAnalyses();
      setAnalyses(data);
      setFilteredAnalyses(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      showError(`Failed to fetch analyses: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Filter analyses based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAnalyses(analyses);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = analyses.filter(analysis => 
        analysis.id?.toLowerCase().includes(lowercasedTerm) ||
        analysis.title?.toLowerCase().includes(lowercasedTerm) ||
        analysis.summary?.toLowerCase().includes(lowercasedTerm) ||
        analysis.sourceType?.toLowerCase().includes(lowercasedTerm) ||
        analysis.sourceId?.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredAnalyses(filtered);
    }
    
    setPage(0); // Reset to first page when filtering
  }, [analyses, searchTerm]);
  
  // Initial data fetch
  useEffect(() => {
    fetchAnalyses();
  }, []);
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleRefresh = () => {
    fetchAnalyses();
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleAnalysisClick = (analysisId) => {
    navigate(`/analysis/${analysisId}`);
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
  
  const getSourceTypeChip = (sourceType) => {
    switch (sourceType) {
      case 'correlation':
        return (
          <Chip 
            label="Correlation" 
            color="primary" 
            variant="outlined"
            size="small" 
          />
        );
      case 'incident':
        return (
          <Chip 
            label="Incident" 
            color="error" 
            variant="outlined"
            size="small" 
          />
        );
      default:
        return (
          <Chip 
            label={sourceType || 'Unknown'} 
            variant="outlined"
            size="small" 
          />
        );
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };
  
  const getConfidenceChip = (confidence) => {
    if (!confidence && confidence !== 0) return null;
    
    let color;
    if (confidence >= 80) color = 'success';
    else if (confidence >= 50) color = 'primary';
    else if (confidence >= 30) color = 'warning';
    else color = 'error';
    
    return (
      <Chip 
        label={`${confidence}%`}
        color={color}
        size="small" 
        variant="outlined"
      />
    );
  };
  
  if (loading) {
    return <Loader message="Loading analyses..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Analysis
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Analyses
              </Typography>
              <Typography variant="h4">
                {analyses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Completed Analyses
              </Typography>
              <Typography variant="h4" color="success.main">
                {analyses.filter(a => a.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" color="primary.main">
                {analyses.filter(a => a.status === 'processing').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search analyses..."
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
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Tooltip title="Refresh analyses">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Analyses Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Completed At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAnalyses.length > 0 ? (
                filteredAnalyses
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      hover
                      onClick={() => handleAnalysisClick(analysis.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PsychologyIcon fontSize="small" color="primary" />
                          <Typography variant="body2">
                            {analysis.title || `Analysis #${analysis.id.slice(0, 8)}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {getSourceTypeChip(analysis.sourceType)}
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {analysis.sourceId ? analysis.sourceId.slice(0, 8) + '...' : 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(analysis.status)}</TableCell>
                      <TableCell>{getConfidenceChip(analysis.confidence)}</TableCell>
                      <TableCell>{formatDateTime(analysis.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(analysis.completedAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/analysis/${analysis.id}`);
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
                      No analyses found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm 
                        ? 'Try adjusting your search term'
                        : 'Create a new analysis from an incident or correlation'}
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
          count={filteredAnalyses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" icon={<LightbulbIcon />}>
          <AlertTitle>About AI Analysis</AlertTitle>
          AI analysis can be initiated from incidents or correlations. The AI will analyze logs, metrics, and traces to identify potential root causes and suggest remediations.
        </Alert>
      </Box>
    </Box>
  );
};

export default AnalysisList;