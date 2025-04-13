// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Correlations from './components/Correlations';
import Analysis from './components/Analysis';

// These would be imported in a full implementation
const Metrics = () => <Box p={3}>Metrics Explorer</Box>;
const Logs = () => <Box p={3}>Logs Explorer</Box>;
const Traces = () => <Box p={3}>Traces Explorer</Box>;
const Incidents = () => <Box p={3}>Incidents Management</Box>;
const Remediation = () => <Box p={3}>Remediation Actions</Box>;

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <Toolbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/traces" element={<Traces />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/correlations" element={<Correlations />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/remediation" element={<Remediation />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;