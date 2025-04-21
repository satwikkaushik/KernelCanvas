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
import ImageIcon from '@mui/icons-material/Image';
import StorageIcon from '@mui/icons-material/Storage';

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
  const nodeType = node.type;
  const nodeData = node.data;

  useEffect(() => {
    if (nodeType !== 'CONTAINER') return;
    
    setLoading(true);
    
    const socket = io('http://localhost:5000');
    
    // Request container stats
    socket.emit('container-stats', nodeData.Id);
    
    // Listen for stats updates
    socket.on('stats-update', (data) => {
      if (data.containerId === nodeData.Id) {
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
    socket.emit('container-logs', nodeData.Id);
    
    // Listen for log updates
    socket.on('logs-update', (data) => {
      if (data.containerId === nodeData.Id) {
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
  }, [nodeType, nodeData]);

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
          containerId: nodeData.Id,
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
          containerId: nodeData.Id,
        }),
      });
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  };

  const handleDeleteContainer = async () => {
    try {
      await fetch(`http://localhost:5000/api/containers/${nodeData.Id}`, {
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
  };

  // Format bytes to human readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Render image details
  const renderImageDetails = () => {
    if (!nodeData) return <Typography>No image data available</Typography>;
    
    // Parse tag information
    const imageTag = nodeData.RepoTags && nodeData.RepoTags.length > 0 
      ? nodeData.RepoTags[0] 
      : 'Unknown:latest';
    
    const [name, version] = imageTag.split(':');
    const displayName = name.split('/').pop();

    return (
      <>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <ImageIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            {displayName}
            <Typography variant="caption" component="div" color="text.secondary">
              Tag: {version || 'latest'}
            </Typography>
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Image ID" 
              secondary={nodeData.Id ? nodeData.Id.substring(7, 19) : 'Unknown'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Created" 
              secondary={formatDate(nodeData.Created)} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Size" 
              secondary={formatBytes(nodeData.Size || 0)} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Virtual Size" 
              secondary={formatBytes(nodeData.VirtualSize || 0)} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Repository Tags" 
              secondary={
                nodeData.RepoTags ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {nodeData.RepoTags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                ) : 'None'
              } 
            />
          </ListItem>
          {nodeData.Architecture && (
            <ListItem>
              <ListItemText 
                primary="Architecture" 
                secondary={nodeData.Architecture} 
              />
            </ListItem>
          )}
          {nodeData.Os && (
            <ListItem>
              <ListItemText 
                primary="OS" 
                secondary={nodeData.Os} 
              />
            </ListItem>
          )}
        </List>
      </>
    );
  };

  // Render volume details
  const renderVolumeDetails = () => {
    if (!nodeData) return <Typography>No volume data available</Typography>;
    
    return (
      <>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <StorageIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            {nodeData.Name}
            <Typography variant="caption" component="div" color="text.secondary">
              Driver: {nodeData.Driver}
            </Typography>
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Name" 
              secondary={nodeData.Name} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Driver" 
              secondary={nodeData.Driver} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Mountpoint" 
              secondary={nodeData.Mountpoint || 'None'} 
            />
          </ListItem>
          {nodeData.userPath && (
            <ListItem>
              <ListItemText 
                primary="User Path" 
                secondary={nodeData.userPath} 
              />
            </ListItem>
          )}
          <ListItem>
            <ListItemText 
              primary="Created" 
              secondary={nodeData.CreatedAt || 'Unknown'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Scope" 
              secondary={nodeData.Scope || 'local'} 
            />
          </ListItem>
          {nodeData.Labels && Object.keys(nodeData.Labels).length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Labels" 
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    {Object.entries(nodeData.Labels).map(([key, value]) => (
                      <Typography key={key} variant="body2" component="div">
                        <strong>{key}:</strong> {value}
                      </Typography>
                    ))}
                  </Box>
                } 
              />
            </ListItem>
          )}
          {nodeData.Options && Object.keys(nodeData.Options).length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Options" 
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    {Object.entries(nodeData.Options).map(([key, value]) => (
                      <Typography key={key} variant="body2" component="div">
                        <strong>{key}:</strong> {value}
                      </Typography>
                    ))}
                  </Box>
                } 
              />
            </ListItem>
          )}
        </List>
      </>
    );
  };

  // Render container details
  const renderContainerDetails = () => {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
          <Button
            startIcon={<PlayArrowIcon />}
            variant="contained"
            color="success"
            size="small"
            onClick={handleStartContainer}
            disabled={nodeData.State === 'running'}
          >
            Start
          </Button>
          <Button
            startIcon={<StopIcon />}
            variant="contained"
            color="warning"
            size="small"
            onClick={handleStopContainer}
            disabled={nodeData.State !== 'running'}
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
                secondary={nodeData.Id?.substring(0, 12)} 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Image" 
                secondary={nodeData.Image} 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Created" 
                secondary={new Date(nodeData.Created * 1000).toLocaleString()} 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Status" 
                secondary={
                  <Chip 
                    label={nodeData.State} 
                    color={nodeData.State === 'running' ? 'success' : 'default'}
                    size="small"
                  />
                } 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ports" 
                secondary={
                  nodeData.Ports && nodeData.Ports.length > 0
                    ? nodeData.Ports.map(port => 
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
    );
  };

  return (
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
          {nodeType === 'CONTAINER'
            ? `Container: ${nodeData.Names ? nodeData.Names[0].replace(/^\//, '') : 'Unknown'}`
            : nodeType === 'IMAGE'
            ? `Image: ${(nodeData.RepoTags && nodeData.RepoTags.length > 0) ? nodeData.RepoTags[0].split(':')[0].split('/').pop() : 'Unknown'}`
            : nodeType === 'VOLUME'
            ? `Volume: ${nodeData.Name || 'Unknown'}`
            : `${nodeType}: ${node.id}`}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      {nodeType === 'CONTAINER' && renderContainerDetails()}
      {nodeType === 'IMAGE' && renderImageDetails()}
      {nodeType === 'VOLUME' && renderVolumeDetails()}
      
      {nodeType !== 'CONTAINER' && nodeType !== 'IMAGE' && nodeType !== 'VOLUME' && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">
            Details for {nodeType} coming soon!
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default ContainerDetails;
