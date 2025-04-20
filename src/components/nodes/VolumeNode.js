import React from 'react';
import { useDrag } from 'react-dnd';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import VolumeIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';

const VolumeNode = ({ id, x, y, data, onMove, onSelect, onConnect }) => {
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

  const handleDeleteVolume = async (event) => {
    event.stopPropagation();
    try {
      await fetch(`http://localhost:5000/api/volumes/${data.Name}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting volume:', error);
    }
  };

  return (
    <Paper
      ref={drag}
      className="canvas-node node-volume"
      sx={{
        left: x,
        top: y,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        minWidth: 180,
        zIndex: 100,
      }}
      elevation={3}
      onClick={() => onSelect()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <VolumeIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {data.Name || 'Volume'}
        </Typography>
        <Chip
          label={data.Driver || 'local'}
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>
      
      {data.Mountpoint && (
        <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Mount: {data.Mountpoint}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <IconButton
          size="small"
          color="error"
          onClick={handleDeleteVolume}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default VolumeNode;
