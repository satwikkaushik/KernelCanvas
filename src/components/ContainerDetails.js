import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';

import { io } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// TabPanel component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`details-tabpanel-${index}`}
      aria-labelledby={`details-tab-${index}`}
      {...other}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ContainerDetails = ({ node, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cpuData, setCpuData] = useState({
    labels: [],
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  });
  const [memoryData, setMemoryData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Memory Usage (MB)',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  });

  const drawerWidth = 350;
  const isContainer = node.type === 'CONTAINER';
  const containerData = node.data;

  useEffect(() => {
    if (!isContainer || !containerData) return;
    
    setLoading(true);
    
    const socket = io('http://localhost:5000');
    
    // Request container stats
    socket.emit('container-stats', containerData.Id);
    
    // Listen for stats updates
    socket.on('stats-update', (data) => {
      if (data.containerId === containerData.Id) {
        setStats(data.stats);
        setLoading(false);
        
        // Update CPU chart data
        setCpuData(prev => {
          const newLabels = [...prev.labels, new Date().toLocaleTimeString()].slice(-10);
          const newData = [...prev.datasets[0].data, data.stats.cpu].slice(-10);
          
          return {
            labels: newLabels,
            datasets: [
              {
                ...prev.datasets[0],
                data: newData,
              },
            ],
          };
        });
        
        // Update Memory chart data
        setMemoryData(prev => {
          const memoryMB = (data.stats.memory.usage / (1024 * 1024)).toFixed(2);
          const newLabels = [...prev.labels, new Date().toLocaleTimeString()].slice(-10);
          const newData = [...prev.datasets[0].data, memoryMB].slice(-10);
          
          return {
            labels: newLabels,
            datasets: [
              {
                ...prev.datasets[0],
                data: newData,
              },
            ],
          };
        });
      }
    });
    
    // Request container logs
    socket.emit('container-logs', containerData.Id);
    
    // Listen for log updates
    socket.on('logs-update', (data) => {
      if (data.containerId === containerData.Id) {
        setLogs(prev => [...prev, data.log].slice(-100)); // Keep last 100 log lines
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setLoading(false);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [isContainer, containerData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStartContainer = async () => {
    try {
      await fetch('http://localhost:5000/api/containers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: containerData.Id,
        }),
      });
    } catch (error) {
      console.error('Error starting container:', error);
    }
  };

  const handleStopContainer = async () => {
    try {
      await fetch('http://localhost:5000/api/containers/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: containerData.Id,
        }),
      });
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  };

  const handleDeleteContainer = async () => {
    try {
      await fetch(`http://localhost:5000/api/containers/${containerData.Id}`, {
        method: 'DELETE',
      });
      onClose();
    } catch (error) {
      console.error('Error deleting container:', error);
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    maintainAspectRatio: false,
  };  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative', // This makes it work with the flex layout in App.js
          height: '100%',
          borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" noWrap component="div">
          {isContainer
            ? `Container: ${containerData.Names ? containerData.Names[0].replace(/^\//, '') : 'Unknown'}`
            : `${node.type}: ${node.id}`}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      {isContainer && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
            <Button
              startIcon={<PlayArrowIcon />}
              variant="contained"
              color="success"
              size="small"
              onClick={handleStartContainer}
              disabled={containerData.State === 'running'}
            >
              Start
            </Button>
            <Button
              startIcon={<StopIcon />}
              variant="contained"
              color="warning"
              size="small"
              onClick={handleStopContainer}
              disabled={containerData.State !== 'running'}
            >
              Stop
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              variant="contained"
              color="error"
              size="small"
              onClick={handleDeleteContainer}
            >
              Delete
            </Button>
          </Box>

          <Divider />
          
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="container detail tabs"
            variant="fullWidth"
          >
            <Tab label="Info" />
            <Tab label="Stats" />
            <Tab label="Logs" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Container ID" 
                  secondary={containerData.Id?.substring(0, 12)} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Image" 
                  secondary={containerData.Image} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Created" 
                  secondary={new Date(containerData.Created * 1000).toLocaleString()} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Status" 
                  secondary={
                    <Chip 
                      label={containerData.State} 
                      color={containerData.State === 'running' ? 'success' : 'default'}
                      size="small"
                    />
                  } 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Ports" 
                  secondary={
                    containerData.Ports && containerData.Ports.length > 0
                      ? containerData.Ports.map(port => 
                          `${port.IP || ''}:${port.PublicPort || ''}->${port.PrivatePort}/${port.Type}`
                        ).join(', ')
                      : 'None'
                  } 
                />
              </ListItem>
            </List>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : stats ? (
              <>
                <Box sx={{ mb: 4, height: '200px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    CPU Usage
                  </Typography>
                  <Line options={chartOptions} data={cpuData} height={180} />
                </Box>
                
                <Box sx={{ mb: 4, height: '200px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Memory Usage
                  </Typography>
                  <Line options={chartOptions} data={memoryData} height={180} />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Current Stats
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      CPU: {stats.cpu}%
                    </Typography>
                    <Typography variant="body2">
                      Memory: {(stats.memory.usage / (1024 * 1024)).toFixed(2)} MB / {(stats.memory.limit / (1024 * 1024)).toFixed(2)} MB ({stats.memory.percentage}%)
                    </Typography>
                    {stats.network && (
                      <Typography variant="body2">
                        Network: {(stats.network.rx_bytes / (1024 * 1024)).toFixed(2)} MB received, {(stats.network.tx_bytes / (1024 * 1024)).toFixed(2)} MB sent
                      </Typography>
                    )}
                  </Paper>
                </Box>
              </>
            ) : (
              <Typography>No stats available</Typography>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : logs.length > 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  height: 'calc(100% - 30px)',
                  backgroundColor: '#f5f5f5',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {logs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </Paper>
            ) : (
              <Typography>No logs available</Typography>
            )}
          </TabPanel>
        </>
      )}
      
      {!isContainer && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">
            Details for {node.type} coming soon!
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default ContainerDetails;
