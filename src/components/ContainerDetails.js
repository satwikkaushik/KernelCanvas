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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import StorageIcon from '@mui/icons-material/Storage';
import PauseIcon from '@mui/icons-material/Pause';

import { io } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { useSnackbarContext } from '../context/SnackbarContext';
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
  const { showSuccess, showError, showInfo, showWarning } = useSnackbarContext();
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
  };  const handleStartContainer = async () => {
    try {
      showInfo('Starting container...');
      
      const response = await fetch('http://localhost:5000/api/containers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.Id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start container');
      }
      
      // Update container state locally
      await refreshContainerData();
      
      showSuccess('Container started successfully');
    } catch (error) {
      console.error('Error starting container:', error);
      showError(`Failed to start container: ${error.message}`);
    }
  };  const handleStopContainer = async () => {
    try {
      showInfo('Stopping container...');
      
      const response = await fetch('http://localhost:5000/api/containers/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.Id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop container');
      }
      
      // Update container state locally
      await refreshContainerData();
      
      showSuccess('Container stopped successfully');
    } catch (error) {
      console.error('Error stopping container:', error);
      showError(`Failed to stop container: ${error.message}`);
    }
  };    const handleRestartContainer = async () => {
    try {
      showInfo('Restarting container...');
      
      // First stop the container
      const stopResponse = await fetch('http://localhost:5000/api/containers/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.Id,
        }),
      });
      
      if (!stopResponse.ok) {
        const error = await stopResponse.json();
        throw new Error(error.error || 'Failed to stop container during restart');
      }
      
      // Then start it again with a small delay
      setTimeout(async () => {
        const startResponse = await fetch('http://localhost:5000/api/containers/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            containerId: nodeData.Id,
          }),
        });
        
        if (!startResponse.ok) {
          const error = await startResponse.json();
          throw new Error(error.error || 'Failed to start container during restart');
        }
        
        // Update container state locally
        await refreshContainerData();
        
        showSuccess('Container restarted successfully');
      }, 1000); // Add a small delay to ensure the container has time to stop
    } catch (error) {
      console.error('Error restarting container:', error);
      showError(`Failed to restart container: ${error.message}`);
    }
  };  const handleDeleteContainer = async () => {
    try {
      // Confirm before deleting
      if (!confirm(`Are you sure you want to delete container ${nodeData.Names ? nodeData.Names[0].replace(/^\//, '') : 'Unknown'}?`)) {
        return;
      }
      
      showInfo('Deleting container...');
      
      const response = await fetch(`http://localhost:5000/api/containers/${nodeData.Id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete container');
      }
      
      showSuccess('Container deleted successfully');
      
      // Close the details panel
      onClose();
    } catch (error) {
      console.error('Error deleting container:', error);
      showError(`Failed to delete container: ${error.message}`);
    }
  };  const handleCreateContainer = async () => {
    try {
      // Check if a container has already been created from this image
      if (nodeData.containerId) {
        showWarning('Container already created. Use the existing container.');
        return;
      }

      showInfo('Creating container...');
      
      // Extract the image name and tag
      const imageName = nodeData.RepoTags && nodeData.RepoTags.length > 0 
        ? nodeData.RepoTags[0]
        : nodeData.Id;
      
      // Use the image display name or tag as the container name base
      const displayName = imageName.split('/').pop().split(':')[0];
      const containerName = `${displayName}_${Date.now()}`;
      
      // Create container configuration using data already provided during image configuration
      const containerConfig = {
        Image: imageName,
        name: containerName,
        ExposedPorts: {},
        HostConfig: {
          PortBindings: {},
          Binds: []
        }
      };
      
      // If there was a volume or port configuration stored with the image node, use it
      if (nodeData.containerConfig) {
        // Add port mappings if specified during image setup
        if (nodeData.containerConfig.ports) {
          const portMappings = nodeData.containerConfig.ports.split(',');
          portMappings.forEach(mapping => {
            const [hostPort, containerPort] = mapping.trim().split(':');
            if (hostPort && containerPort) {
              containerConfig.ExposedPorts[`${containerPort}/tcp`] = {};
              containerConfig.HostConfig.PortBindings[`${containerPort}/tcp`] = [
                { HostIp: '0.0.0.0', HostPort: hostPort }
              ];
            }
          });
        }
        
        // Add volume binding if connected to a volume
        if (nodeData.containerConfig && nodeData.containerConfig.volumeName && nodeData.containerConfig.volumePath) {
          containerConfig.HostConfig.Binds.push(
            `${nodeData.containerConfig.volumePath}:/data/${nodeData.containerConfig.volumeName}`
          );
          console.log('Added volume binding:', containerConfig.HostConfig.Binds);
        }
        
        // Add environment variables if specified
        if (nodeData.containerConfig.env && nodeData.containerConfig.env.length > 0) {
          containerConfig.Env = nodeData.containerConfig.env;
        }
      }
      
      // Create the container
      const response = await fetch('http://localhost:5000/api/containers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(containerConfig),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store the containerId in the node data
        nodeData.containerId = data.containerId;
        showSuccess(`Container "${containerName}" created successfully`);
      } else {
        throw new Error(data.error || 'Failed to create container');
      }
    } catch (error) {
      console.error('Error creating container:', error);
      showError(`Failed to create container: ${error.message}`);
    }
  };const handlePauseContainer = async () => {
    try {
      showInfo('Pausing container...');
      
      const response = await fetch('http://localhost:5000/api/containers/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.Id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause container');
      }
      
      // Update container state locally
      await refreshContainerData();
      
      showSuccess('Container paused successfully');
    } catch (error) {
      console.error('Error pausing container:', error);
      showError(`Failed to pause container: ${error.message}`);
    }
  };

  const handleUnpauseContainer = async () => {
    try {
      showInfo('Resuming container...');
      
      const response = await fetch('http://localhost:5000/api/containers/unpause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.Id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume container');
      }
      
      // Update container state locally
      await refreshContainerData();
      
      showSuccess('Container resumed successfully');
    } catch (error) {
      console.error('Error resuming container:', error);
      showError(`Failed to resume container: ${error.message}`);
    }
  };
  const handleRunContainer = async () => {
    try {
      if (!nodeData.containerId) {
        showError('No container to run. Please create a container first.');
        return;
      }

      showInfo('Starting container...');
      
      const response = await fetch('http://localhost:5000/api/containers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: nodeData.containerId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start container');
      }
      
      showSuccess('Container started successfully');
    } catch (error) {
      console.error('Error running container:', error);
      showError(`Failed to run container: ${error.message}`);
    }
  };
  // Refresh container data
  const refreshContainerData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/containers`);
      const containers = await response.json();
      
      // Find the current container
      const updatedContainer = containers.find(container => container.Id === nodeData.Id);
      
      if (updatedContainer) {
        // Update the node data with the latest container information
        node.data = updatedContainer;
        
        // Force a re-render by creating a new object
        const updatedNodeData = { ...updatedContainer };
        nodeData.State = updatedNodeData.State;
        
        console.log('Container data refreshed:', updatedContainer);
      }
    } catch (error) {
      console.error('Error refreshing container data:', error);
      showError(`Error refreshing container data: ${error.message}`);
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
  };  // Render image details
  const renderImageDetails = () => {
    if (!nodeData) return <Typography>No image data available</Typography>;
    
    // Parse tag information
    const imageTag = nodeData.RepoTags && nodeData.RepoTags.length > 0 
      ? nodeData.RepoTags[0] 
      : 'Unknown:latest';
    
    const [name, version] = imageTag.split(':');
    const displayName = name.split('/').pop();
    
    // Determine if a container has already been created
    const containerCreated = !!nodeData.containerId;

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
        
        {/* Container Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, p: 1, mb: 2 }}>
          <Button
            startIcon={<StorageIcon />}
            variant="contained"
            color="primary"
            onClick={handleCreateContainer}
            disabled={containerCreated}
          >
            Create Container
          </Button>
          {containerCreated && (
            <Button
              startIcon={<PlayArrowIcon />}
              variant="contained"
              color="success"
              onClick={handleRunContainer}
            >
              Run Container
            </Button>
          )}
        </Box>
        
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
  };  // Render container details
  const renderContainerDetails = () => {
    const isRunning = nodeData.State === 'running';
    const isPaused = nodeData.State === 'paused';
    
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, p: 1 }}>
          <Button
            startIcon={isRunning ? <StopIcon /> : <PlayArrowIcon />}
            variant="contained"
            color={isRunning ? "warning" : "success"}
            size="small"
            onClick={isRunning ? handleStopContainer : handleStartContainer}
            disabled={isPaused}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
          <Button
            startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
            variant="contained"
            color={isPaused ? "info" : "default"}
            size="small"
            onClick={isPaused ? handleUnpauseContainer : handlePauseContainer}
            disabled={!isRunning && !isPaused}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            startIcon={<RestartAltIcon />}
            variant="contained"
            color="primary"
            size="small"
            onClick={handleRestartContainer}
            disabled={!isRunning}
          >
            Restart
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
            </ListItem>            <ListItem>
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
            
            {nodeData.Mounts && nodeData.Mounts.length > 0 && (
              <ListItem>
                <ListItemText 
                  primary="Volume Mounts" 
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {nodeData.Mounts.map((mount, idx) => (
                        <Typography key={idx} variant="body2" component="div">
                          {mount.Source} → {mount.Destination} ({mount.Mode})
                        </Typography>
                      ))}
                    </Box>
                  } 
                />
              </ListItem>
            )}
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
