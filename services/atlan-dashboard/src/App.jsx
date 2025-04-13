import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';

// Import layouts
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Import pages
import Dashboard from './components/Dashboard';
import Metrics from './components/Metrics';
import Logs from './components/Logs';
import Traces from './components/Traces';
import IncidentList from './components/IncidentList';
import IncidentDetail from './components/IncidentDetail';
import CorrelationList from './components/CorrelationList';
import CorrelationDetail from './components/CorrelationDetail';
import AnalysisList from './components/AnalysisList';
import AnalysisDetail from './components/AnalysisDetail';
import Remediation from './components/Remediation';
import SystemStatus from './components/SystemStatus';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header handleDrawerToggle={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar /> {/* This is spacing to push content below the app bar */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/traces" element={<Traces />} />
          <Route path="/incidents" element={<IncidentList />} />
          <Route path="/incidents/:incidentId" element={<IncidentDetail />} />
          <Route path="/correlations" element={<CorrelationList />} />
          <Route path="/correlations/:correlationId" element={<CorrelationDetail />} />
          <Route path="/analysis" element={<AnalysisList />} />
          <Route path="/analysis/:analysisId" element={<AnalysisDetail />} />
          <Route path="/remediation" element={<Remediation />} />
          <Route path="/system-status" element={<SystemStatus />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;