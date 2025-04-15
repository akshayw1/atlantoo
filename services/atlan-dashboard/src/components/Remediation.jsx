import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Tabs,
  Tab,
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
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Build as BuildIcon,
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useToast } from '../context/ToastContext';
import Loader from './comman/Loader';
import api from '../services/api';

const Remediation = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [remediations, setRemediations] = useState([]);
  const [filteredRemediations, setFilteredRemediations] = useState([]);
  
  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Action dialogs
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRemediation, setSelectedRemediation] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  
  const fetchRemediations = async () => {
    try {
      setRefreshing(true);
      
      const data = await api.getRemediations(activeTab);
      setRemediations(data);
      setFilteredRemediations(data);
      
      setRefreshing(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching remediations:', err);
      showError(`Failed to fetch remediations: ${err.message}`);
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Filter remediations based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRemediations(remediations);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = remediations.filter(remediation => 
        remediation.id?.toLowerCase().includes(lowercasedTerm) ||
        remediation.title?.toLowerCase().includes(lowercasedTerm) ||
        remediation.description?.toLowerCase().includes(lowercasedTerm) ||
        remediation.service?.toLowerCase().includes(lowercasedTerm) ||
        remediation.analysisId?.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredRemediations(filtered);
    }
    
    setPage(0); // Reset to first page when filtering
  }, [remediations, searchTerm]);
  
  // Initial data fetch
  useEffect(() => {
    fetchRemediations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleRefresh = () => {
    fetchRemediations();
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleViewDetails = (remediation) => {
    setSelectedRemediation(remediation);
    setDetailsDialogOpen(true);
  };
  
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedRemediation(null);
  };
  
  const handleOpenApproveDialog = (remediation) => {
    setSelectedRemediation(remediation);
    setActionReason('');
    setApproveDialogOpen(true);
  };
  
  const handleCloseApproveDialog = () => {
    setApproveDialogOpen(false);
    setSelectedRemediation(null);
    setActionReason('');
  };
  
  const handleOpenRejectDialog = (remediation) => {
    setSelectedRemediation(remediation);
    setActionReason('');
    setRejectDialogOpen(true);
  };
  
  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
    setSelectedRemediation(null);
    setActionReason('');
  };
  
  const handleReasonChange = (event) => {
    setActionReason(event.target.value);
  };
  
  const handleApproveRemediation = async () => {
    try {
      setProcessingAction(true);
      
      await api.approveRemediation(selectedRemediation.id);
      
      showSuccess('Remediation approved successfully');
      setProcessingAction(false);
      setApproveDialogOpen(false);
      setSelectedRemediation(null);
      setActionReason('');
      
      // Refresh data
      fetchRemediations();
    } catch (err) {
      console.error('Error approving remediation:', err);
      showError(`Failed to approve remediation: ${err.message}`);
      setProcessingAction(false);
    }
  };
  
  const handleRejectRemediation = async () => {
    try {
      setProcessingAction(true);
      
      await api.rejectRemediation(selectedRemediation.id);
      
      showSuccess('Remediation rejected successfully');
      setProcessingAction(false);
      setRejectDialogOpen(false);
      setSelectedRemediation(null);
      setActionReason('');
      
      // Refresh data
      fetchRemediations();
    } catch (err) {
      console.error('Error rejecting remediation:', err);
      showError(`Failed to reject remediation: ${err.message}`);
      setProcessingAction(false);
    }
  };
  
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Chip 
            icon={<PendingIcon />} 
            label="Pending" 
            color="primary" 
            size="small" 
          />
        );
      case 'approved':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Approved" 
            color="success" 
            size="small" 
          />
        );
      case 'rejected':
        return (
          <Chip 
            icon={<CancelIcon />} 
            label="Rejected" 
            color="error" 
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
      case 'completed':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Completed" 
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
  
  const getImpactChip = (impact) => {
    switch (impact) {
      case 'high':
        return (
          <Chip 
            label="High Impact" 
            color="error" 
            variant="outlined"
            size="small" 
          />
        );
      case 'medium':
        return (
          <Chip 
            label="Medium Impact" 
            color="warning" 
            variant="outlined"
            size="small" 
          />
        );
      case 'low':
        return (
          <Chip 
            label="Low Impact" 
            color="info" 
            variant="outlined"
            size="small" 
          />
        );
      default:
        return (
          <Chip 
            label={impact ? `${impact} Impact` : 'Unknown Impact'} 
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
  
  if (loading) {
    return <Loader message="Loading remediations..." />;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Remediation Management
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Pending Approvals
              </Typography>
              <Typography variant="h4" color="primary.main">
                {remediations.filter(r => r.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Completed Remediations
              </Typography>
              <Typography variant="h4" color="success.main">
                {remediations.filter(r => r.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Failed Remediations
              </Typography>
              <Typography variant="h4" color="error.main">
                {remediations.filter(r => r.status === 'failed').length}
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
            <Tab label="Pending Approvals" value="pending" />
            <Tab label="Approved" value="approved" />
            <Tab label="Completed" value="completed" />
            <Tab label="Rejected" value="rejected" />
          </Tabs>
        </Box>
        
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search remediations..."
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
                <Tooltip title="Refresh remediations">
                  <IconButton onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Remediations Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRemediations.length > 0 ? (
                filteredRemediations
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((remediation) => (
                    <TableRow
                      key={remediation.id}
                      hover
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BuildIcon fontSize="small" color="primary" />
                          <Typography variant="body2">
                            {remediation.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{remediation.service}</TableCell>
                      <TableCell>{getImpactChip(remediation.impact)}</TableCell>
                      <TableCell>{getStatusChip(remediation.status)}</TableCell>
                      <TableCell>{formatDateTime(remediation.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(remediation.updatedAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<InfoIcon />}
                            onClick={() => handleViewDetails(remediation)}
                          >
                            Details
                          </Button>
                          
                          {remediation.status === 'pending' && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleOpenApproveDialog(remediation)}
                              >
                                Approve
                              </Button>
                              
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => handleOpenRejectDialog(remediation)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No remediations found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm 
                        ? 'Try adjusting your search term'
                        : `No ${activeTab} remediations at this time`}
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
          count={filteredRemediations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedRemediation && (
          <>
            <DialogTitle>
              Remediation Details
              <Typography variant="caption" display="block" color="text.secondary">
                ID: {selectedRemediation.id}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6">{selectedRemediation.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
                    {getStatusChip(selectedRemediation.status)}
                    {getImpactChip(selectedRemediation.impact)}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedRemediation.description}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Service
                  </Typography>
                  <Typography variant="body1">
                    {selectedRemediation.service}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Analysis ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedRemediation.analysisId ? (
                      <Button
                        size="small"
                        onClick={() => {
                          handleCloseDetailsDialog();
                          navigate(`/analysis/${selectedRemediation.analysisId}`);
                        }}
                      >
                        {selectedRemediation.analysisId}
                      </Button>
                    ) : (
                      'N/A'
                    )}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Steps
                  </Typography>
                  
                  {selectedRemediation.steps && selectedRemediation.steps.length > 0 ? (
                    <Box sx={{ pl: 2 }}>
                      <ol>
                        {selectedRemediation.steps.map((step, index) => (
                          <li key={index}>
                            <Typography variant="body1" paragraph>
                              {step}
                            </Typography>
                          </li>
                        ))}
                      </ol>
                    </Box>
                  ) : (
                    <Typography variant="body1">
                      No detailed steps available.
                    </Typography>
                  )}
                </Grid>
                
                {selectedRemediation.potentialImpact && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Potential Impact
                    </Typography>
                    <Typography variant="body1">
                      {selectedRemediation.potentialImpact}
                    </Typography>
                  </Grid>
                )}
                
                {selectedRemediation.status !== 'pending' && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Approval Information
                    </Typography>
                    <Typography variant="body1">
                      <strong>Status:</strong> {selectedRemediation.status}
                    </Typography>
                    {selectedRemediation.approvedBy && (
                      <Typography variant="body1">
                        <strong>Approved By:</strong> {selectedRemediation.approvedBy}
                      </Typography>
                    )}
                    {selectedRemediation.approvedAt && (
                      <Typography variant="body1">
                        <strong>Approved At:</strong> {formatDateTime(selectedRemediation.approvedAt)}
                      </Typography>
                    )}
                    {selectedRemediation.rejectedBy && (
                      <Typography variant="body1">
                        <strong>Rejected By:</strong> {selectedRemediation.rejectedBy}
                      </Typography>
                    )}
                    {selectedRemediation.rejectedAt && (
                      <Typography variant="body1">
                        <strong>Rejected At:</strong> {formatDateTime(selectedRemediation.rejectedAt)}
                      </Typography>
                    )}
                    {selectedRemediation.reason && (
                      <Typography variant="body1">
                        <strong>Reason:</strong> {selectedRemediation.reason}
                      </Typography>
                    )}
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedRemediation.status === 'pending' && (
                <>
                  <Button 
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      handleCloseDetailsDialog();
                      handleOpenApproveDialog(selectedRemediation);
                    }}
                  >
                    Approve
                  </Button>
                  <Button 
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      handleCloseDetailsDialog();
                      handleOpenRejectDialog(selectedRemediation);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button onClick={handleCloseDetailsDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Approve Dialog */}
      <Dialog
        open={approveDialogOpen}
        onClose={handleCloseApproveDialog}
      >
        <DialogTitle>Approve Remediation</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to approve this remediation? This will initiate the automatic remediation process.
          </DialogContentText>
          
          {selectedRemediation && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                {selectedRemediation.title}
              </Typography>
              <Typography variant="body2">
                Service: {selectedRemediation.service}
              </Typography>
              <Typography variant="body2">
                Impact: {selectedRemediation.impact}
              </Typography>
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Approval Notes (optional)"
            multiline
            rows={3}
            value={actionReason}
            onChange={handleReasonChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleApproveRemediation}
            disabled={processingAction}
            startIcon={processingAction ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleCloseRejectDialog}
      >
        <DialogTitle>Reject Remediation</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting this remediation.
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Rejection Reason"
            multiline
            rows={3}
            value={actionReason}
            onChange={handleReasonChange}
            required
            error={rejectDialogOpen && !actionReason}
            helperText={rejectDialogOpen && !actionReason ? "Reason is required" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleRejectRemediation}
            disabled={processingAction || !actionReason}
            startIcon={processingAction ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Remediation;