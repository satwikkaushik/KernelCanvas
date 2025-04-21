import React, { useState } from 'react';
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
import Tooltip from '@mui/material/Tooltip';

import NetworkNode from './nodes/NetworkNode';
import ImageNode from './nodes/ImageNode';
import VolumeNode from './nodes/VolumeNode';

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
    path: ''
  });

  // Define drop handling for the canvas
  const [{ isOver }, drop] = useDrop(() => ({
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
  }));

  // Volume-related handlers
  const handleVolumeDialogOpen = () => {
    setVolumeConfig({ name: '', path: '' });
    setVolumeDialogOpen(true);
  };

  const handleVolumeDialogClose = () => {
    setVolumeDialogOpen(false);
  };

  const handleVolumeCreate = () => {
    // Get a random position for the volume node
    const x = Math.random() * 300 + 100;
    const y = Math.random() * 200 + 100;

    // Create a new volume node
    const id = `volume-${Date.now()}`;
    const newNode = {
      id,
      type: 'VOLUME',
      x,
      y,
      data: {
        name: volumeConfig.name || 'New Volume',
        path: volumeConfig.path || '/path/to/volume'
      }
    };

    setCanvasNodes([...canvasNodes, newNode]);
    setVolumeDialogOpen(false);
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

  // Render connection line between nodes
  const renderConnection = (conn) => {
    const dx = conn.targetX - conn.sourceX;
    const dy = conn.targetY - conn.sourceY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    return (
      <div
        key={conn.id}
        className="connection-line"
        style={{
          left: conn.sourceX,
          top: conn.sourceY,
          width: length,
          transform: `rotate(${angle}deg)`,
        }}
      />
    );
  };

  return (
    <>
      <Box
        id="canvas"
        ref={drop}
        className="canvas-container"
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: isOver ? 'rgba(25, 118, 210, 0.05)' : 'inherit',
          transition: 'background-color 0.2s ease',
        }}
      >
        {/* Volume button */}
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
        {connections.map(conn => renderConnection(conn))}
        
        {/* Render all nodes placed on the canvas */}
        {canvasNodes.map(node => {
          switch (node.type) {
            case 'NETWORK':
              return (
                <NetworkNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
                  onConnect={handleCreateConnection}
                />
              );
            case 'IMAGE':
              return (
                <ImageNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
                />
              );
            case 'VOLUME':
              return (
                <VolumeNode
                  key={node.id}
                  id={node.id}
                  x={node.x}
                  y={node.y}
                  data={node.data}
                  onMove={handleNodeMove}
                  onSelect={() => onNodeSelect(node)}
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
      </Dialog>
    </>
  );
};

export default Canvas;
