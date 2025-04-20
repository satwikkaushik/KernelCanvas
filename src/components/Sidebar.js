import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ContainerIcon from '@mui/icons-material/ViewInAr';
import ImageIcon from '@mui/icons-material/PhotoLibrary';
import VolumeIcon from '@mui/icons-material/Storage';
import NetworkIcon from '@mui/icons-material/NetworkWifi';
import Tooltip from '@mui/material/Tooltip';
import { useSnackbar } from 'notistack';
import dockerApi from '../services/dockerApi';

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

const Sidebar = ({ containers, images, volumes, networks, isLoading, open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const drawerWidth = 280;
  const { enqueueSnackbar } = useSnackbar();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [newContainerData, setNewContainerData] = useState({
    name: '',
    image: '',
    ports: '',
    env: '',
    volumes: '',
  });
  const [pullImageData, setPullImageData] = useState({
    imageName: '',
    tag: 'latest'
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreateDialogOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };

  const handlePullDialogOpen = () => {
    setPullDialogOpen(true);
  };

  const handlePullDialogClose = () => {
    setPullDialogOpen(false);
  };

  const handleContainerDataChange = (e) => {
    const { name, value } = e.target;
    setNewContainerData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePullDataChange = (e) => {
    const { name, value } = e.target;
    setPullImageData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateContainer = async () => {
    try {
      setIsCreating(true);
      
      // Format ports as array of objects
      const ports = newContainerData.ports 
        ? newContainerData.ports.split(',').map(port => {
            const [hostPort, containerPort] = port.trim().split(':');
            return { hostPort: parseInt(hostPort), containerPort: parseInt(containerPort || hostPort) };
          })
        : [];
      
      // Format env vars as array of string
      const env = newContainerData.env
        ? newContainerData.env.split(',').map(e => e.trim())
        : [];
      
      // Format volumes as array of objects
      const volumes = newContainerData.volumes
        ? newContainerData.volumes.split(',').map(volume => {
            const [source, target] = volume.trim().split(':');
            return { source, target };
          })
        : [];
        
      const containerConfig = {
        name: newContainerData.name,
        Image: newContainerData.image,
        ExposedPorts: ports.reduce((obj, port) => {
          obj[`${port.containerPort}/tcp`] = {};
          return obj;
        }, {}),
        HostConfig: {
          PortBindings: ports.reduce((obj, port) => {
            obj[`${port.containerPort}/tcp`] = [{ HostPort: port.hostPort.toString() }];
            return obj;
          }, {}),
          Binds: volumes.map(v => `${v.source}:${v.target}`)
        },
        Env: env
      };
      
      await dockerApi.createContainer(containerConfig);
      
      enqueueSnackbar('Container created successfully!', { variant: 'success' });
      handleCreateDialogClose();
      setNewContainerData({
        name: '',
        image: '',
        ports: '',
        env: '',
        volumes: '',
      });
      
      // Refresh the page to show the new container
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error creating container:', error);
      enqueueSnackbar(`Error creating container: ${error.message}`, { variant: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePullImage = async () => {
    try {
      setIsPulling(true);
      await dockerApi.pullImage(pullImageData.imageName, pullImageData.tag);
      enqueueSnackbar(`Successfully pulled ${pullImageData.imageName}:${pullImageData.tag}`, { variant: 'success' });
      handlePullDialogClose();
      setPullImageData({ imageName: '', tag: 'latest' });
      
      // Refresh the page to show the new image
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error pulling image:', error);
      enqueueSnackbar(`Error pulling image: ${error.message}`, { variant: 'error' });
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
        <Tab label="Containers" />
        <Tab label="Images" />
        <Tab label="Volumes" />
        <Tab label="Networks" />
      </Tabs>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Containers Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleCreateDialogOpen}
                fullWidth
              >
                Create Container
              </Button>
            </Box>
            {containers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No containers found
              </Typography>
            ) : (
              <List>
                {containers.map((container) => (
                  <ListItem key={container.Id} disablePadding>
                    <Tooltip title={container.Image} placement="right">
                      <div>
                        <DraggableItem
                          type="CONTAINER"
                          item={container}
                          icon={<ContainerIcon color={container.State === 'running' ? 'success' : 'disabled'} />}
                        />
                      </div>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Images Tab */}
          <TabPanel value={tabValue} index={1}>
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
              <List>
                {images.map((image) => (
                  <ListItem key={image.Id} disablePadding>
                    <Tooltip title={image.RepoTags ? image.RepoTags[0] : 'No tag'} placement="right">
                      <div>
                        <DraggableItem
                          type="IMAGE"
                          item={image}
                          icon={<ImageIcon />}
                        />
                      </div>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Volumes Tab */}
          <TabPanel value={tabValue} index={2}>
            {volumes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No volumes found
              </Typography>
            ) : (
              <List>
                {volumes.map((volume) => (
                  <ListItem key={volume.Name} disablePadding>
                    <Tooltip title={volume.Driver} placement="right">
                      <div>
                        <DraggableItem
                          type="VOLUME"
                          item={volume}
                          icon={<VolumeIcon />}
                        />
                      </div>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Networks Tab */}
          <TabPanel value={tabValue} index={3}>
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

      {/* Create Container Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Container</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Container Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newContainerData.name}
            onChange={handleContainerDataChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="image-select-label">Docker Image</InputLabel>
            <Select
              labelId="image-select-label"
              name="image"
              value={newContainerData.image}
              label="Docker Image"
              onChange={handleContainerDataChange}
            >
              {images.map(image => (
                <MenuItem 
                  key={image.Id} 
                  value={image.RepoTags ? image.RepoTags[0] : image.Id.substring(7)}
                >
                  {image.RepoTags ? image.RepoTags[0] : image.Id.substring(7, 19)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="ports"
            label="Port Mappings (hostPort:containerPort, ...)"
            placeholder="8080:80, 3000:3000"
            type="text"
            fullWidth
            variant="outlined"
            value={newContainerData.ports}
            onChange={handleContainerDataChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="env"
            label="Environment Variables (KEY=VALUE, ...)"
            placeholder="NODE_ENV=production, DEBUG=false"
            type="text"
            fullWidth
            variant="outlined"
            value={newContainerData.env}
            onChange={handleContainerDataChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="volumes"
            label="Volume Mappings (hostPath:containerPath, ...)"
            placeholder="/host/path:/container/path, ..."
            type="text"
            fullWidth
            variant="outlined"
            value={newContainerData.volumes}
            onChange={handleContainerDataChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose} sx={{ color: 'white'}}>Cancel</Button>
          <Button 
            onClick={handleCreateContainer} 
            variant="contained" 
            color="primary"
            disabled={isCreating || !newContainerData.image}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
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
