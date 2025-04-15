import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Typography,
  Badge,
  Tooltip,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as MetricsIcon,
  Receipt as LogsIcon,
  AccountTree as TracesIcon,
  Warning as IncidentsIcon,
  Compare as CorrelationsIcon,
  Psychology as AnalysisIcon,
  BuildCircle as RemediationIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [incidentCount, setIncidentCount] = useState(0);
  const [remediationCount, setRemediationCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch active incidents count
        const incidents = await api.getIncidents('active');
        setIncidentCount(incidents.length || 0);
        
        // Fetch pending remediations count
        const remediations = await api.getRemediations('pending');
        setRemediationCount(remediations.length || 0);
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }
    };
    
    fetchCounts();
    
    // Update counts every minute
    const intervalId = setInterval(fetchCounts, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/',
      tooltip: 'System overview'
    },
    { 
      text: 'Metrics', 
      icon: <MetricsIcon />, 
      path: '/metrics',
      tooltip: 'Visualize service metrics'
    },
    { 
      text: 'Logs', 
      icon: <LogsIcon />, 
      path: '/logs',
      tooltip: 'Search and filter logs'
    },
    { 
      text: 'Traces', 
      icon: <TracesIcon />, 
      path: '/traces',
      tooltip: 'Distributed tracing'
    },
    { 
      text: 'Incidents', 
      icon: <IncidentsIcon />, 
      path: '/incidents',
      tooltip: 'View and manage incidents',
      badge: incidentCount
    },
    { 
      text: 'Correlations', 
      icon: <CorrelationsIcon />, 
      path: '/correlations',
      tooltip: 'Telemetry correlation analysis'
    },
    { 
      text: 'Analysis', 
      icon: <AnalysisIcon />, 
      path: '/analysis',
      tooltip: 'AI-powered root cause analysis'
    },
    { 
      text: 'Remediation', 
      icon: <RemediationIcon />, 
      path: '/remediation',
      tooltip: 'Approve or reject remediation actions',
      badge: remediationCount
    },
    { 
      text: 'System Status', 
      icon: <SettingsIcon />, 
      path: '/system-status',
      tooltip: 'Check system health'
    },
  ];

  const drawer = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          ObservDash
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <Tooltip title={item.tooltip} key={item.text} placement="right" arrow>
            <ListItem
              button
              component={NavLink}
              to={item.path}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                borderLeft: location.pathname === item.path ? '4px solid #1976d2' : '4px solid transparent',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                }}
              >
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="navigation menu"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;