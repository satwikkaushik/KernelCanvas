// filepath: d:\Nikhil\KernelCanvas\src\components\nodes\ImageNode.js
import React from 'react';
import { useDrag } from 'react-dnd';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import ImageIcon from '@mui/icons-material/PhotoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import SvgIcon from '@mui/material/SvgIcon';

// Custom icons for specific images
const NodeIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M12 21.7C9.2 20 4 16.5 4 11V5l8-3l8 3v6c0 5.5-5.2 9-8 10.7zm0-16c-2.2 0-4 1.8-4 4s1.8 4 4 4s4-1.8 4-4s-1.8-4-4-4z" />
  </SvgIcon>
);

const MongoIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M12 3C7.58 3 4 6.58 4 11c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3s3 1.34 3 3s-1.34 3-3 3z" />
  </SvgIcon>
);

const UbuntuIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93c0-.62.08-1.21.21-1.79L6 11v1c0 1.1.9 2 2 2v1c0 .55.45 1 1 1c.55 0 1-.45 1-1v-1c1.1 0 2-.9 2-2v-1l1.79-.2c.13.58.21 1.17.21 1.8c0 4.08-3.05 7.44-7 7.93z" />
  </SvgIcon>
);

const getImageIcon = (imageName) => {
  const lowerName = (imageName || "").toLowerCase();
  
  if (lowerName.includes('node')) {
    return <NodeIcon sx={{ color: '#8BC34A' }} />;
  } else if (lowerName.includes('mongo') || lowerName.includes('mongodb')) {
    return <MongoIcon sx={{ color: '#4CAF50' }} />;
  } else if (lowerName.includes('ubuntu')) {
    return <UbuntuIcon sx={{ color: '#FF5722' }} />;
  } else {
    return <ImageIcon />;
  }
};

const ImageNode = ({ id, x, y, data, onMove, onSelect }) => {
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

  // Image tag parsing to get a clean name and version
  const imageTag = data.RepoTags && data.RepoTags.length > 0 
    ? data.RepoTags[0]
    : data.imageName || 'Unknown image';
  
  const [name, version] = imageTag.split(':');
  const displayName = name.split('/').pop();
  
  // Container configuration that was set during drop
  const containerConfig = data.containerConfig || {};

  return (
    <Paper
      ref={drag}
      className="canvas-node node-image"
      sx={{
        left: x,
        top: y,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        minWidth: 220,
        zIndex: 100,
      }}
      elevation={3}
      onClick={() => onSelect()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {getImageIcon(displayName)}
        <Typography variant="subtitle2" sx={{ flexGrow: 1, ml: 1 }}>
          {containerConfig.name || displayName}
        </Typography>
        <Chip
          label={version || 'latest'}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 1 }}
        />
      </Box>
      
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
        Image: {displayName}
      </Typography>

      {containerConfig.ports && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          Ports: {containerConfig.ports}
        </Typography>
      )}
      
      {containerConfig.env && containerConfig.env.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          Environment: {containerConfig.env.join(', ')}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            // Handle delete functionality
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ImageNode;