import React, { useState } from 'react';
import {
  Grid,
  Button,
  ButtonGroup,
  Popover,
  Box,
  Typography,
  TextField,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { addMinutes, addHours, addDays, subMinutes, subHours, subDays } from 'date-fns';

const TimeRangePicker = ({ timeRange, onTimeRangeChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tempStartTime, setTempStartTime] = useState(timeRange.start);
  const [tempEndTime, setTempEndTime] = useState(timeRange.end);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setTempStartTime(timeRange.start);
    setTempEndTime(timeRange.end);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onTimeRangeChange({
      start: tempStartTime,
      end: tempEndTime,
    });
    handleClose();
  };

  const handleQuickRange = (range) => {
    const now = new Date();
    let newStartTime;
    let newEndTime = now;

    switch (range) {
      case '15m':
        newStartTime = subMinutes(now, 15);
        break;
      case '30m':
        newStartTime = subMinutes(now, 30);
        break;
      case '1h':
        newStartTime = subHours(now, 1);
        break;
      case '3h':
        newStartTime = subHours(now, 3);
        break;
      case '6h':
        newStartTime = subHours(now, 6);
        break;
      case '12h':
        newStartTime = subHours(now, 12);
        break;
      case '24h':
        newStartTime = subHours(now, 24);
        break;
      case '2d':
        newStartTime = subDays(now, 2);
        break;
      case '7d':
        newStartTime = subDays(now, 7);
        break;
      default:
        newStartTime = subHours(now, 1);
    }

    onTimeRangeChange({
      start: newStartTime,
      end: newEndTime,
    });
  };

  const formatTimeRange = () => {
    const formatDate = (date) => {
      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
                     date.getMonth() === today.getMonth() &&
                     date.getFullYear() === today.getFullYear();
      
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };
    
    return `${formatDate(timeRange.start)} - ${formatDate(timeRange.end)}`;
  };

  const open = Boolean(anchorEl);
  const id = open ? 'time-range-popover' : undefined;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        startIcon={<AccessTimeIcon />}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {formatTimeRange()}
      </Button>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 320 }}>
          <Typography variant="subtitle1" gutterBottom>
            Time Range
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Quick Ranges
            </Typography>
            <ButtonGroup size="small" variant="outlined" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Button onClick={() => handleQuickRange('15m')}>15m</Button>
              <Button onClick={() => handleQuickRange('30m')}>30m</Button>
              <Button onClick={() => handleQuickRange('1h')}>1h</Button>
              <Button onClick={() => handleQuickRange('3h')}>3h</Button>
              <Button onClick={() => handleQuickRange('6h')}>6h</Button>
              <Button onClick={() => handleQuickRange('12h')}>12h</Button>
              <Button onClick={() => handleQuickRange('24h')}>24h</Button>
              <Button onClick={() => handleQuickRange('2d')}>2d</Button>
              <Button onClick={() => handleQuickRange('7d')}>7d</Button>
            </ButtonGroup>
          </Box>
          
          <Typography variant="caption" display="block" gutterBottom>
            Custom Range
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <DateTimePicker
                label="Start Time"
                value={tempStartTime}
                onChange={setTempStartTime}
                maxDate={tempEndTime}
                renderInput={(params) => <TextField size="small" fullWidth {...params} />}
              />
            </Grid>
            <Grid item xs={6}>
              <DateTimePicker
                label="End Time"
                value={tempEndTime}
                onChange={setTempEndTime}
                minDate={tempStartTime}
                maxDate={new Date()}
                renderInput={(params) => <TextField size="small" fullWidth {...params} />}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="text" onClick={handleClose} size="small">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleApply} size="small">
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </LocalizationProvider>
  );
};

export default TimeRangePicker;