import React, { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Fab from '@mui/material/Fab';
import FolderIcon from '@mui/icons-material/Folder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import NetworkNode from './nodes/NetworkNode';
import ImageNode from './nodes/ImageNode';
import VolumeNode from './nodes/VolumeNode';
import * as dockerApi from '../services/dockerApi';

// Function to convert Windows path to Linux format
const convertToLinuxPath = (windowsPath) => {
  // Return empty string if path is empty
  if (!windowsPath) return '';
  
  // Replace backslashes with forward slashes
  let linuxPath = windowsPath.replace(/\\/g, '/');
  
  // Handle drive letter (e.g., C: -> /c)
  if (/^[a-zA-Z]:/.test(linuxPath)) {
    const driveLetter = linuxPath.charAt(0).toLowerCase();
    linuxPath = `/${driveLetter}${linuxPath.slice(2)}`;
  }
  console.log('Converted path:', linuxPath);
  return linuxPath;
};

const Canvas = ({ networks, onNodeSelect }) => {
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [pendingImageDrop, setPendingImageDrop] = useState(null);
  const [containerConfig, setContainerConfig] = useState({
    name: '',
    ports: '',
    env: []
  });
  const [envInput, setEnvInput] = useState('');
  
  // Volume-related state and dialog
  const [volumeDialogOpen, setVolumeDialogOpen] = useState(false);
  const [volumeConfig, setVolumeConfig] = useState({
    name: '',
    path: '',
    permissions: 'rw',   // 'rw' for read-write or 'ro' for read-only
    ownerId: '',         // Optional UID for the volume
    groupId: ''          // Optional GID for the volume
  });

  // Connection-related state
  const [activeConnection, setActiveConnection] = useState(null);
  const [connectionPoints, setConnectionPoints] = useState({});
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const canvasRef = useRef(null);
  const tempConnectionRef = useRef(null);
  // Define drop handling for the canvas
  const [{ isOver }, drop] = useDrop({
    accept: ['NETWORK', 'IMAGE'],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();
      
      // Calculate relative position on canvas
      const x = offset.x - canvasRect.left;
      const y = offset.y - canvasRect.top;
      
      handleDrop(item, x, y);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Set up a global registry for connection points
  useEffect(() => {
    window.updateConnectionPoint = (nodeId, pointData) => {
      setConnectionPoints(prev => ({
        ...prev,
        [nodeId]: pointData
      }));
    };

    window.activeConnection = activeConnection;

    return () => {
      delete window.updateConnectionPoint;
      delete window.activeConnection;
    };
  }, [activeConnection]);

  // Update temporary connection line while dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (activeConnection && tempConnectionRef.current) {
        const { clientX, clientY } = e;
        drawTemporaryConnection(clientX, clientY);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeConnection) {
        cancelConnection();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeConnection]);

  // Handle events from React DevTools
  window.addEventListener('error', (e) => {
    console.error('Window error:', e);
  });
  // Draw a temporary connection that follows the mouse
  const drawTemporaryConnection = (mouseX, mouseY) => {
    if (!tempConnectionRef.current || !activeConnection) return;
    
    const { sourceX, sourceY } = activeConnection;
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    
    // Convert mouse coordinates to canvas-relative
    const relativeMouseX = mouseX - canvasRect.left;
    const relativeMouseY = mouseY - canvasRect.top;
    
    // Calculate angle and length for the line
    const dx = relativeMouseX - sourceX;
    const dy = relativeMouseY - sourceY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Set the line position and rotation
    tempConnectionRef.current.style.width = `${length}px`;
    tempConnectionRef.current.style.left = `${sourceX}px`;
    tempConnectionRef.current.style.top = `${sourceY}px`;
    tempConnectionRef.current.style.transform = `rotate(${angle}deg)`;
    tempConnectionRef.current.style.display = 'block';
  };

  // Cancel the active connection
  const cancelConnection = () => {
    if (tempConnectionRef.current) {
      tempConnectionRef.current.style.display = 'none';
    }
    setActiveConnection(null);
  };

  // Add the volume dialog open/close handlers
  const handleVolumeDialogOpen = () => {
    setVolumeConfig({ name: '', path: '' });
    setVolumeDialogOpen(true);
  };

  const handleVolumeDialogClose = () => {
    setVolumeDialogOpen(false);
  };

  // Handle starting a connection from a node
  const handleStartConnection = (sourceId, sourceType, position, sourceData) => {
    // Only allow connections to start from volume nodes
    if (sourceType !== 'VOLUME') {
      setFeedback({
        open: true,
        message: 'Connections must start from volume nodes',
        severity: 'error'
      });
      return;
    }

    setActiveConnection({
      sourceId,
      sourceType,
      sourceX: position.x,
      sourceY: position.y,
      sourceData
    });
  };

  // Handle completing a connection to a target node
  const handleEndConnection = (targetId, targetType, position, targetData) => {
    // Only allow connections to end at image nodes
    if (!activeConnection || targetType !== 'IMAGE') {
      setFeedback({
        open: true,
        message: 'Connections must end at image nodes',
        severity: 'error'
      });
      return;
    }
    
    // Hide the temporary connection line
    if (tempConnectionRef.current) {
      tempConnectionRef.current.style.display = 'none';
    }
    
    const { sourceId, sourceData } = activeConnection;
    
    // Create a connection object with volume security information
    const newConnection = {
      id: `conn-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      sourceX: activeConnection.sourceX,
      sourceY: activeConnection.sourceY,
      targetX: position.x,
      targetY: position.y,
      volumeData: sourceData,
    };
    
    // Update the image node with the volume path and security information
    setCanvasNodes(canvasNodes.map(node => {
      if (node.id === targetId) {
        // Add the volume path and security information to the container config
        return {
          ...node,
          data: {
            ...node.data,
            containerConfig: {
              ...node.data.containerConfig,
              volumePath: sourceData.path,
              volumeName: sourceData.name,
              volumePermissions: sourceData.permissions || 'rw',
              volumeOwnerId: sourceData.ownerId || '',
              volumeGroupId: sourceData.groupId || ''
            }
          }
        };
      }
      return node;
    }));
    
    // Add the connection to the list
    setConnections([...connections, newConnection]);
    
    // Show success message with permission details
    const permissionType = sourceData.permissions === 'ro' ? 'read-only' : 'read-write';
    let successMessage = `Connected volume "${sourceData.name}" to container - mounted at /data/${sourceData.name} with ${permissionType} access`;
    
    // Add ownership details to message if specified
    if (sourceData.ownerId || sourceData.groupId) {
      const ownershipInfo = [];
      if (sourceData.ownerId) ownershipInfo.push(`UID: ${sourceData.ownerId}`);
      if (sourceData.groupId) ownershipInfo.push(`GID: ${sourceData.groupId}`);
      successMessage += ` (${ownershipInfo.join(', ')})`;
    }
    
    setFeedback({
      open: true,
      message: successMessage,
      severity: 'success',
      autoHideDuration: 4000
    });
    
    // Reset the active connection
    setActiveConnection(null);
  };

  const handleVolumeCreate = () => {
    // Get a random position for the volume node
    const x = Math.random() * 300 + 100;
    const y = Math.random() * 200 + 100;

    // Convert Windows path to Linux path if provided
    const convertedPath = convertToLinuxPath(volumeConfig.path);

    // Create a new volume node
    const id = `volume-${Date.now()}`;
    const newNode = {
      id,
      type: 'VOLUME',
      x,
      y,
      data: {
        name: volumeConfig.name || 'New Volume',
        path: convertedPath || '/path/to/volume',
        permissions: volumeConfig.permissions || 'rw',
        ownerId: volumeConfig.ownerId || '',
        groupId: volumeConfig.groupId || ''
      }
    };

    setCanvasNodes([...canvasNodes, newNode]);
    setVolumeDialogOpen(false);
    
    setFeedback({
      open: true,
      message: `Volume "${volumeConfig.name}" created with ${volumeConfig.permissions === 'ro' ? 'read-only' : 'read-write'} access`,
      severity: 'success',
      autoHideDuration: 4000
    });
  };
  // Handle node deletion
  const handleNodeDelete = (nodeId) => {
    // Ask for confirmation first
    const nodeToDelete = canvasNodes.find(node => node.id === nodeId);
    const nodeType = nodeToDelete?.type?.toLowerCase() || 'node';
    
    if (!window.confirm(`Are you sure you want to delete this ${nodeType}? Any connections to this node will also be removed.`)) {
      return;
    }
    
    // Remove any connections associated with this node
    const filteredConnections = connections.filter(conn => 
      conn.sourceId !== nodeId && conn.targetId !== nodeId
    );
    
    // If connections were removed, update the state
    if (filteredConnections.length !== connections.length) {
      setConnections(filteredConnections);
    }
    
    // Remove the node from the canvas
    setCanvasNodes(canvasNodes.filter(node => node.id !== nodeId));
      // Show feedback
    setFeedback({
      open: true,
      message: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} removed from canvas`,
      severity: 'info',
      autoHideDuration: 4000
    });
  };

  // Handle dropping an item onto the canvas
  const handleDrop = (item, x, y) => {
    if (item.type === 'IMAGE') {
      // For images, open the config dialog first
      setPendingImageDrop({
        item,
        position: { x, y }
      });
      
      // Reset the config form
      setContainerConfig({
        name: '',
        ports: '',
        env: []
      });
      setEnvInput('');
      
      // Open the dialog
      setConfigDialogOpen(true);
    } else {
      const id = `${item.type.toLowerCase()}-${Date.now()}`;
      
      const newNode = {
        id,
        type: item.type,
        x,
        y,
        data: item.data,
      };
      
      setCanvasNodes([...canvasNodes, newNode]);
    }
  };

  const handleAddEnvVar = () => {
    if (envInput.trim()) {
      setContainerConfig(prev => ({
        ...prev,
        env: [...prev.env, envInput.trim()]
      }));
      setEnvInput('');
    }
  };

  const handleRemoveEnvVar = (index) => {
    setContainerConfig(prev => ({
      ...prev,
      env: prev.env.filter((_, i) => i !== index)
    }));
  };

  const handleConfigDialogClose = () => {
    setConfigDialogOpen(false);
    setPendingImageDrop(null);
  };

  const handleConfigComplete = () => {
    if (!pendingImageDrop) return;
    
    const { item, position } = pendingImageDrop;
    const id = `image-${Date.now()}`;
    
    // Create a new node with the image data and container config
    const newNode = {
      id,
      type: 'IMAGE',
      x: position.x,
      y: position.y,
      data: {
        ...item.data,
        containerConfig: {
          ...containerConfig,
          // Convert env array to string format if needed by API
          envString: containerConfig.env.join(',')
        }
      }
    };
    
    setCanvasNodes([...canvasNodes, newNode]);
    setConfigDialogOpen(false);
    setPendingImageDrop(null);
  };

  // Handle dragging a node on the canvas
  const handleNodeMove = (id, deltaX, deltaY) => {
    setCanvasNodes(
      canvasNodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            x: node.x + deltaX,
            y: node.y + deltaY,
          };
        }
        return node;
      })
    );
    
    // Update connections when nodes move
    setConnections(
      connections.map(conn => {
        if (conn.sourceId === id) {
          return {
            ...conn,
            sourceX: conn.sourceX + deltaX,
            sourceY: conn.sourceY + deltaY,
          };
        }
        if (conn.targetId === id) {
          return {
            ...conn,
            targetX: conn.targetX + deltaX,
            targetY: conn.targetY + deltaY,
          };
        }
        return conn;
      })
    );
  };

  // Create a connection between two nodes
  const handleCreateConnection = (sourceId, targetId, sourcePos, targetPos) => {
    const newConnection = {
      id: `conn-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      sourceX: sourcePos.x,
      sourceY: sourcePos.y,
      targetX: targetPos.x,
      targetY: targetPos.y,
    };
    
    setConnections([...connections, newConnection]);
  };
  // Enhanced connection line with tooltip
  const renderConnectionWithTooltip = (conn) => {
    const dx = conn.targetX - conn.sourceX;
    const dy = conn.targetY - conn.sourceY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Get volume data for tooltip
    const volumeName = conn.volumeData?.name || 'Unknown volume';
    const volumePath = conn.volumeData?.path || '/path';
    
    // Build tooltip text with security information
    const isReadOnly = conn.volumeData?.permissions === 'ro';
    const accessMode = isReadOnly ? 'read-only' : 'read-write';
    
    let tooltipText = `Volume mount: ${volumeName} → /data/${volumeName} (${accessMode})`;
    
    // Add ownership details if present
    const ownerInfo = [];
    if (conn.volumeData?.ownerId) ownerInfo.push(`UID: ${conn.volumeData.ownerId}`);
    if (conn.volumeData?.groupId) ownerInfo.push(`GID: ${conn.volumeData.groupId}`);
    
    if (ownerInfo.length > 0) {
      tooltipText += `\nOwnership: ${ownerInfo.join(', ')}`;
    }
    
    return (
      <Tooltip 
        key={conn.id}
        title={tooltipText}
        placement="top"
      >
        <div
          className="connection-line"
          style={{
            position: 'absolute',
            left: conn.sourceX,
            top: conn.sourceY,
            width: length,
            height: '3px',
            backgroundColor: isReadOnly ? '#f44336' : '#4caf50', // Red for read-only, green for read-write
            transformOrigin: 'left center',
            transform: `rotate(${angle}deg)`,
            zIndex: 90,
            boxShadow: `0 0 5px rgba(${isReadOnly ? '244, 67, 54' : '76, 175, 80'}, 0.8)`,
            cursor: 'pointer'
          }}
        />
      </Tooltip>
    );
  };
  // Setup the drop target functionality
  useEffect(() => {
    // No need for this effect since we're using the useDrop hook
    return () => {};
  }, []);

  // Handle running all containers
  const handleRunContainers = async () => {
    // Filter out image nodes from canvasNodes
    const imageNodes = canvasNodes.filter(node => node.type === 'IMAGE');
    
    if (imageNodes.length === 0) {
      setFeedback({
        open: true,
        message: 'No images to run as containers',
        severity: 'warning'
      });
      return;
    }
    
    setFeedback({
      open: true,
      message: `Creating ${imageNodes.length} containers...`,
      severity: 'info'
    });
    
    // Track success and failure
    let successCount = 0;
    let failureCount = 0;
    
    // Create containers from each image node
    for (const node of imageNodes) {
      try {
        // Extract the image name and tag
        const imageName = node.data.RepoTags && node.data.RepoTags.length > 0 
          ? node.data.RepoTags[0]
          : node.data.imageName || 'unknown';
        
        // Prepare container configuration
        const containerConfig = {
          Image: imageName,
          name: node.data.containerConfig?.name || `container_${Date.now()}`,
          Cmd: node.data.containerConfig?.cmd || [],
          ExposedPorts: {},
          HostConfig: {
            PortBindings: {},
            Binds: []
          },
          Env: node.data.containerConfig?.env || [],
          // Pass volume security options for the API
          volumePermissions: node.data.containerConfig?.volumePermissions,
          volumeOwnerId: node.data.containerConfig?.volumeOwnerId,
          volumeGroupId: node.data.containerConfig?.volumeGroupId
        };
        
        // Add port mappings if specified
        if (node.data.containerConfig?.ports) {
          const portMappings = node.data.containerConfig.ports.split(',');
          portMappings.forEach(mapping => {
            const [hostPort, containerPort] = mapping.trim().split(':');
            if (hostPort && containerPort) {
              // Define the exposed port
              containerConfig.ExposedPorts[`${containerPort}/tcp`] = {};
              
              // Define the port binding
              containerConfig.HostConfig.PortBindings[`${containerPort}/tcp`] = [
                { HostIp: '0.0.0.0', HostPort: hostPort }
              ];
            }
          });
        }
        
        // Add volume binding if connected to a volume
        if (node.data.containerConfig?.volumePath && node.data.containerConfig?.volumeName) {
          // Build the bind string with proper options
          const volumePath = node.data.containerConfig.volumePath;
          const volumeName = node.data.containerConfig.volumeName;
          const containerPath = `/data/${volumeName}`;
          
          // Add security options
          const securityOptions = [];
          
          // Add read-only flag if permissions are 'ro'
          if (node.data.containerConfig.volumePermissions === 'ro') {
            securityOptions.push('ro');
          } else {
            securityOptions.push('rw');
          }
          
          // Add ownership options if provided
          if (node.data.containerConfig.volumeOwnerId) {
            securityOptions.push(`uid=${node.data.containerConfig.volumeOwnerId}`);
          }
          
          if (node.data.containerConfig.volumeGroupId) {
            securityOptions.push(`gid=${node.data.containerConfig.volumeGroupId}`);
          }
          
          // Add the z option for SELinux shared label
          securityOptions.push('z');
          
          // Create the bind string with all options
          const bindString = securityOptions.length > 0 
            ? `${volumePath}:${containerPath}:${securityOptions.join(',')}`
            : `${volumePath}:${containerPath}`;
          
          containerConfig.HostConfig.Binds.push(bindString);
        }
        
        // Create the container
        const response = await dockerApi.createContainer(containerConfig);
        
        // Start the container
        await dockerApi.startContainer(response.containerId);
        
        successCount++;
      } catch (error) {
        console.error('Error creating/starting container:', error);
        failureCount++;
      }
    }
    
    // Show final status
    if (failureCount === 0) {
      setFeedback({
        open: true,
        message: `Successfully created and started ${successCount} containers`,
        severity: 'success'
      });
    } else {
      setFeedback({
        open: true,
        message: `Created ${successCount} containers with ${failureCount} failures`,
        severity: 'warning'
      });
    }
  };

  return (
    <>      <Box
        id="canvas"
        ref={(el) => {
          drop(el);
          canvasRef.current = el;
        }}
        className="canvas-container"
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: isOver ? 'rgba(25, 118, 210, 0.05)' : 'inherit',
          transition: 'background-color 0.2s ease',
        }}
      >
        {/* Temporary connection line */}        <div
          ref={tempConnectionRef}
          className="temp-connection-line"
          style={{
            position: 'absolute',
            height: '3px',
            backgroundColor: '#4caf50',
            transformOrigin: 'left center',
            zIndex: 90,
            display: 'none',
            boxShadow: '0 0 5px rgba(76, 175, 80, 0.8)'
          }}
        />{/* Volume button */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          <Tooltip title="Create Volume">
            <Fab
              color="primary"
              size="small"
              onClick={handleVolumeDialogOpen}
              aria-label="create volume"
            >
              <FolderIcon />
            </Fab>
          </Tooltip>
        </Box>

        {canvasNodes.length === 0 && (
          <Paper elevation={0} sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            padding: 3,
            backgroundColor: 'transparent',
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="text.secondary">
              Drag and drop Docker components here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Images, Networks, or create Volumes
            </Typography>
          </Paper>
        )}
        
        {/* Render connections between nodes */}
        {connections.map(conn => renderConnectionWithTooltip(conn))}        {/* Render all nodes placed on the canvas */}
        {canvasNodes.map(node => {
          switch (node.type) {
            case 'NETWORK':
              return (                <NetworkNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
                  onDelete={handleNodeDelete}
                />
              );
            case 'IMAGE':
              return (                <ImageNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
                  onEndConnection={handleEndConnection}
                  onCancelConnection={cancelConnection}
                  onDelete={handleNodeDelete}
                />
              );
            case 'VOLUME':
              return (                <VolumeNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
                  onStartConnection={handleStartConnection}
                  onDelete={handleNodeDelete}
                  connections={connections}
                />
              );
            default:
              return null;
          }
        })}
      </Box>

      {/* Image Configuration Dialog */}
      <Dialog 
        open={configDialogOpen} 
        onClose={handleConfigDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure Container Settings
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Container Name"
              variant="outlined"
              margin="normal"
              value={containerConfig.name}
              onChange={(e) => setContainerConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a name for this container"
            />
            
            <TextField
              fullWidth
              label="Port Mappings"
              variant="outlined"
              margin="normal"
              value={containerConfig.ports}
              onChange={(e) => setContainerConfig(prev => ({ ...prev, ports: e.target.value }))}
              placeholder="host:container, e.g. 8080:80,3000:3000"
              helperText="Format: hostPort:containerPort, comma separated for multiple"
            />
            
            <Box sx={{ mt: 3, mb: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Environment Variables
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={envInput}
                  onChange={(e) => setEnvInput(e.target.value)}
                  placeholder="KEY=VALUE"
                  sx={{ mr: 1 }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddEnvVar}
                  disabled={!envInput.trim()}
                >
                  Add
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                {containerConfig.env.map((envVar, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                      p: 1,
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2">{envVar}</Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleRemoveEnvVar(index)}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
              
              {containerConfig.env.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No environment variables added
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfigDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleConfigComplete}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Volume Dialog */}
      <Dialog 
        open={volumeDialogOpen} 
        onClose={handleVolumeDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create Volume
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Volume Name"
              variant="outlined"
              margin="normal"
              value={volumeConfig.name}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a name for this volume"
            />
            
            <TextField
              fullWidth
              label="Local Path"
              variant="outlined"
              margin="normal"
              value={volumeConfig.path}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, path: e.target.value }))}
              placeholder="Enter local storage path"
              helperText="Example: /path/to/local/storage"
            />
            
            <FormControl component="fieldset" margin="normal">
              <Typography variant="subtitle2">Access Permissions</Typography>
              <Box sx={{ display: 'flex', mt: 1 }}>
                <Button 
                  variant={volumeConfig.permissions === 'rw' ? 'contained' : 'outlined'} 
                  onClick={() => setVolumeConfig(prev => ({ ...prev, permissions: 'rw' }))
                  }
                  sx={{ mr: 1 }}
                  size="small"
                >
                  Read-Write
                </Button>
                <Button 
                  variant={volumeConfig.permissions === 'ro' ? 'contained' : 'outlined'} 
                  onClick={() => setVolumeConfig(prev => ({ ...prev, permissions: 'ro' }))
                  }
                  size="small"
                >
                  Read-Only
                </Button>
              </Box>
            </FormControl>
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Advanced Security Options
            </Typography>
            
            <TextField
              fullWidth
              label="Owner ID (UID)"
              variant="outlined"
              margin="normal"
              value={volumeConfig.ownerId}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, ownerId: e.target.value }))}
              placeholder="e.g., 1000"
              helperText="User ID for file ownership"
              size="small"
              type="number"
            />
            
            <TextField
              fullWidth
              label="Group ID (GID)"
              variant="outlined" 
              margin="normal"
              value={volumeConfig.groupId}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, groupId: e.target.value }))}
              placeholder="e.g., 1000"
              helperText="Group ID for file ownership"
              size="small"
              type="number"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVolumeDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleVolumeCreate}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>      {/* Feedback Snackbar */}
      <Snackbar 
        open={feedback.open} 
        autoHideDuration={feedback.autoHideDuration || 6000} 
        onClose={() => setFeedback(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ zIndex: 2000 }}
      >
        <Alert 
          onClose={() => setFeedback(prev => ({ ...prev, open: false }))} 
          severity={feedback.severity}
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Canvas;
