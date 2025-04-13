// src/components/Sidebar.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as MetricsIcon,
  Subject as LogsIcon,
  AccountTree as TracesIcon,
  Error as IncidentsIcon,
  Link as CorrelationsIcon,
  Psychology as AnalysisIcon,
  BuildCircle as RemediationIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Metrics', icon: <MetricsIcon />, path: '/metrics' },
  { text: 'Logs', icon: <LogsIcon />, path: '/logs' },
  { text: 'Traces', icon: <TracesIcon />, path: '/traces' },
  { text: 'Incidents', icon: <IncidentsIcon />, path: '/incidents' },
  { text: 'Correlations', icon: <CorrelationsIcon />, path: '/correlations' },
  { text: 'AI Analysis', icon: <AnalysisIcon />, path: '/analysis' },
  { text: 'Remediation', icon: <RemediationIcon />, path: '/remediation' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Atlan Observability
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'white',
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'primary.main',
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;