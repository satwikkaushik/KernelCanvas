import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import ContainerNode from './nodes/ContainerNode';
import VolumeNode from './nodes/VolumeNode';
import NetworkNode from './nodes/NetworkNode';

const Canvas = ({ containers, volumes, networks, onNodeSelect }) => {
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  // Define drop handling for the canvas
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['CONTAINER', 'VOLUME', 'NETWORK', 'IMAGE'],
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

  // Handle dropping an item onto the canvas
  const handleDrop = (item, x, y) => {
    const id = `${item.type.toLowerCase()}-${Date.now()}`;
    
    const newNode = {
      id,
      type: item.type,
      x,
      y,
      data: item.data,
    };
    
    setCanvasNodes([...canvasNodes, newNode]);
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
            Containers, Images, Volumes, Networks
          </Typography>
        </Paper>
      )}
      
      {/* Render connections between nodes */}
      {connections.map(conn => renderConnection(conn))}
      
      {/* Render all nodes placed on the canvas */}
      {canvasNodes.map(node => {
        switch (node.type) {
          case 'CONTAINER':
            return (
              <ContainerNode
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
                onConnect={handleCreateConnection}
              />
            );
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
          default:
            return null;
        }
      })}
    </Box>
  );
};

export default Canvas;
