import React from 'react';
import { useDrag } from 'react-dnd';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FolderIcon from '@mui/icons-material/Folder';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

const VolumeNode = ({ id, x, y, data, onMove, onSelect }) => {
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

  return (
    <Paper
      ref={drag}
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
      }}
      elevation={3}
      onClick={() => onSelect && onSelect()}
    >
      <FolderIcon color="primary" fontSize="medium" />
      <Typography variant="caption" sx={{ mt: 0.5, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.name || 'Volume'}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.path || '/path'}
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            // We're not implementing delete functionality as per requirements
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default VolumeNode;
