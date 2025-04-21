import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ImageIcon from '@mui/icons-material/PhotoLibrary';
import NetworkIcon from '@mui/icons-material/NetworkWifi';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SvgIcon from '@mui/material/SvgIcon';
import dockerApi from '../services/dockerApi';
import { useSnackbarContext } from '../context/SnackbarContext';

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

const getImageColor = (imageName) => {
  const lowerName = (imageName || "").toLowerCase();
  
  if (lowerName.includes('node')) {
    return 'rgba(139, 195, 74, 0.1)';
  } else if (lowerName.includes('mongo') || lowerName.includes('mongodb')) {
    return 'rgba(76, 175, 80, 0.1)';
  } else if (lowerName.includes('ubuntu')) {
    return 'rgba(255, 87, 34, 0.1)';
  } else {
    return 'rgba(33, 150, 243, 0.1)';
  }
};

// Draggable item component for images
const DraggableImageItem = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'IMAGE',
    item: { type: 'IMAGE', data: item },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Parse tag information
  const imageTag = item.RepoTags && item.RepoTags.length > 0 
    ? item.RepoTags[0] 
    : 'Unknown:latest';
  
  const [name, version] = imageTag.split(':');
  const displayName = name.split('/').pop();

  return (
    <Card
      ref={drag}
      className="draggable-image-item"
      sx={{
        opacity: isDragging ? 0.5 : 1,
        my: 1,
        cursor: 'move',
        backgroundColor: getImageColor(displayName),
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
            {getImageIcon(displayName)}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {version || 'latest'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Draggable item component
const DraggableItem = ({ type, item, icon }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type, data: item },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="draggable-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ mr: 1 }}>{icon}</Box>
        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
          {item.Names ? item.Names[0].replace(/^\//, '') : item.name || item.Name || item.Id?.substring(0, 12)}
        </Typography>
      </Box>
    </div>
  );
};

// TabPanel component to handle tab content
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      {...other}
      style={{ overflowY: 'auto', height: 'calc(100% - 48px)' }}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Sidebar = ({ images, networks, isLoading, open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const drawerWidth = 280;
  const { showSuccess, showError, showInfo } = useSnackbarContext();
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullImageData, setPullImageData] = useState({
    imageName: '',
    tag: 'latest'
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePullDialogOpen = () => {
    setPullDialogOpen(true);
  };

  const handlePullDialogClose = () => {
    setPullDialogOpen(false);
  };

  const handlePullDataChange = (e) => {
    const { name, value } = e.target;
    setPullImageData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePullImage = async () => {
    try {
      setIsPulling(true);
      
      // Using the enhanced API with status updates
      await dockerApi.pullImage(
        pullImageData.imageName, 
        pullImageData.tag,
        ({ status, message }) => {
          if (status === 'pulling') {
            showInfo(message);
          } else if (status === 'success') {
            showSuccess(message);
          } else if (status === 'error') {
            showError(message);
          }
        }
      );
      
      handlePullDialogClose();
      setPullImageData({ imageName: '', tag: 'latest' });
      
      // Refresh the page to show the new image
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error pulling image:', error);
      // Error is already handled by the callback
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative', // This is key for the clipped effect
          height: '100%',
          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Docker Components
        </Typography>
      </Box>
      <Divider />
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="docker components tabs"
        sx={{
          minHeight: '48px',
          '& .MuiTab-root': {
            minHeight: '48px',
            minWidth: '60px',
            fontSize: '0.85rem',
            padding: '8px 12px',
          },
        }}
      >
        <Tab label="Images" />
        <Tab label="Networks" />
      </Tabs>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Images Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<CloudDownloadIcon />}
                onClick={handlePullDialogOpen}
                fullWidth
              >
                Pull Image
              </Button>
            </Box>
            {images.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No images found
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {images.map((image) => (
                  <ListItem key={image.Id} disablePadding sx={{ display: 'block' }}>
                    <Tooltip 
                      title={(image.RepoTags && image.RepoTags.length > 0) ? image.RepoTags[0] : 'No tag'} 
                      placement="right"
                    >
                      <div>
                        <DraggableImageItem item={image} />
                      </div>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Networks Tab */}
          <TabPanel value={tabValue} index={1}>
            {networks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No networks found
              </Typography>
            ) : (
              <List>
                {networks.map((network) => (
                  <ListItem key={network.Id} disablePadding>
                    <Tooltip title={network.Driver} placement="right">
                      <div>
                        <DraggableItem
                          type="NETWORK"
                          item={network}
                          icon={<NetworkIcon />}
                        />
                      </div>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        </>
      )}
      
      {/* Pull Image Dialog */}
      <Dialog open={pullDialogOpen} onClose={handlePullDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Pull Docker Image</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="imageName"
            label="Image Name"
            placeholder="e.g. nginx, ubuntu, postgres"
            type="text"
            fullWidth
            variant="outlined"
            value={pullImageData.imageName}
            onChange={handlePullDataChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="tag"
            label="Tag"
            placeholder="latest, alpine, 1.19"
            type="text"
            fullWidth
            variant="outlined"
            value={pullImageData.tag}
            onChange={handlePullDataChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePullDialogClose} sx={{ color: 'white'}}>Cancel</Button>
          <Button 
            onClick={handlePullImage} 
            variant="contained" 
            color="primary"
            disabled={isPulling || !pullImageData.imageName}
          >
            {isPulling ? 'Pulling...' : 'Pull'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default Sidebar;
