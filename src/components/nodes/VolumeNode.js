import React, { useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FolderIcon from '@mui/icons-material/Folder';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';

const VolumeNode = ({ id, x, y, data, onMove, onSelect, onStartConnection, onDelete, connections }) => {
  const nodeRef = useRef(null);
  const connectorRef = useRef(null);

  // Set up drag handler
  const [{ isDragging }, drag] = useDrag({
    type: 'NODE',
    item: { id, type: 'NODE' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      
      if (delta && onMove) {
        const x = Math.round(delta.x);
        const y = Math.round(delta.y);
        onMove(id, x, y);
      }
    },
  });

  // Set drag ref to the paper element
  drag(nodeRef);
  // Get connector position for wiring
  useEffect(() => {
    if (nodeRef.current && connectorRef.current && window.updateConnectionPoint) {
      const rect = nodeRef.current.getBoundingClientRect();
      const connectorRect = connectorRef.current.getBoundingClientRect();
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();
      
      window.updateConnectionPoint(id, {
        x: connectorRect.left + connectorRect.width / 2 - canvasRect.left,
        y: connectorRect.top + connectorRect.height / 2 - canvasRect.top,
        nodeType: 'VOLUME',
        data: data
      });
    }
  }, [id, x, y, data]);

  // Function to check if volume is connected to any containers
  const isConnected = () => {
    return connections.some(conn => conn.sourceId === id);
  };
  
  // Determine if this volume is connected to any containers
  const connected = isConnected();

  // Function to find connected image names
  const getConnectedImageNames = () => {
    if (!connections) return [];
    
    const connectedImages = [];
    connections.forEach(conn => {
      if (conn.sourceId === id) {
        // Find the target image node
        const targetId = conn.targetId;
        if (targetId.startsWith('image-')) {
          // This is a connection to an image
          connectedImages.push(targetId);
        }
      }
    });
    
    return connectedImages;
  };
  
  const connectedImages = getConnectedImageNames();

  const handleConnectorMouseDown = (e) => {
    e.stopPropagation();
    if (onStartConnection) {
      const rect = connectorRef.current.getBoundingClientRect();
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();
      onStartConnection(id, 'VOLUME', {
        x: rect.left + rect.width / 2 - canvasRect.left,
        y: rect.top + rect.height / 2 - canvasRect.top
      }, data);
    }
  };
  return (    <Paper
      ref={nodeRef}
      className="canvas-node node-volume"
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 'auto',
        zIndex: 100,
        borderBottom: connected ? '4px solid #4caf50' : 'none',
      }}
      elevation={3}
      onClick={() => onSelect && onSelect()}
    >
      <FolderIcon color={connected ? "success" : "primary"} fontSize="medium" />      <Typography variant="caption" sx={{ mt: 0.5, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.name || 'Volume'}
      </Typography>      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.path || '/path'}
      </Typography>
      
      {connected && (
        <Chip
          label={`${connectedImages.length} connection${connectedImages.length !== 1 ? 's' : ''}`}
          size="small"
          color="success"
          variant="outlined"
          sx={{ mt: 0.5, fontSize: '0.6rem' }}
        />
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
        <IconButton
          size="small"
          color="error"          onClick={(e) => {
            e.stopPropagation();
            if (onDelete) {
              onDelete(id);
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>

        {/* Connection point */}
        <Box 
          ref={connectorRef}
          className="node-connector"
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            ml: 1,
            '&:hover': {
              transform: 'scale(1.1)',
            }
          }}
          onMouseDown={handleConnectorMouseDown}
        >
          <LinkIcon fontSize="small" sx={{ color: 'white' }} />
        </Box>
      </Box>
    </Paper>
  );
};

export default VolumeNode;
