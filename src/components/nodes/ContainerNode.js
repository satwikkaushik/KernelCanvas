import React from 'react';
import { useDrag } from 'react-dnd';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import ContainerIcon from '@mui/icons-material/ViewInAr';

const ContainerNode = ({ id, x, y, data, onMove, onSelect, onConnect }) => {
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

  const handleStartContainer = async (event) => {
    event.stopPropagation();
    try {
      await fetch('http://localhost:5000/api/containers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: data.Id,
        }),
      });
    } catch (error) {
      console.error('Error starting container:', error);
    }
  };

  const handleStopContainer = async (event) => {
    event.stopPropagation();
    try {
      await fetch('http://localhost:5000/api/containers/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: data.Id,
        }),
      });
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  };

  // Get container name without the leading '/'
  const containerName = data.Names ? data.Names[0].replace(/^\//, '') : 'Container';
  
  // Get container status
  const isRunning = data.State === 'running';

  return (
    <Paper
      ref={drag}
      className={`canvas-node node-container`}
      sx={{
        left: x,
        top: y,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        minWidth: 200,
        zIndex: 100,
      }}
      elevation={3}
      onClick={() => onSelect()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <ContainerIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {containerName}
        </Typography>
        <Chip
          label={data.State}
          size="small"
          color={isRunning ? 'success' : 'default'}
          sx={{ ml: 1 }}
        />
      </Box>
      
      <Typography variant="caption" sx={{ display: 'block' }}>
        Image: {data.Image}
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <IconButton
          size="small"
          color="success"
          disabled={isRunning}
          onClick={handleStartContainer}
          sx={{ mr: 0.5 }}
        >
          <PlayArrowIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          disabled={!isRunning}
          onClick={handleStopContainer}
        >
          <StopIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ContainerNode;
