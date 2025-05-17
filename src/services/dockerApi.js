import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL
});

// Container operations
export const fetchContainers = async () => {
  try {
    const response = await api.get('/containers');
    return response.data;
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
};

export const startContainer = async (containerId, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'starting', message: 'Starting container...' });
    const response = await api.post('/containers/start', { containerId });
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container started successfully' });
    return response.data;
  } catch (error) {
    console.error('Error starting container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to start container: ${error.message}` });
    throw error;
  }
};

export const pauseContainer = async (containerId, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'pausing', message: 'Pausing container...' });
    const response = await api.post('/containers/pause', { containerId });
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container paused successfully' });
    return response.data;
  } catch (error) {
    console.error('Error pausing container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to pause container: ${error.message}` });
    throw error;
  }
};

export const unpauseContainer = async (containerId, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'unpausing', message: 'Resuming container...' });
    const response = await api.post('/containers/unpause', { containerId });
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container resumed successfully' });
    return response.data;
  } catch (error) {
    console.error('Error resuming container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to resume container: ${error.message}` });
    throw error;
  }
};

export const stopContainer = async (containerId, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'stopping', message: 'Stopping container...' });
    const response = await api.post('/containers/stop', { containerId });
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container stopped successfully' });
    return response.data;
  } catch (error) {
    console.error('Error stopping container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to stop container: ${error.message}` });
    throw error;
  }
};

export const createContainer = async (containerConfig, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'creating', message: 'Creating container...' });
    const response = await api.post('/containers/create', containerConfig);
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container created successfully' });
    return response.data;
  } catch (error) {
    console.error('Error creating container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to create container: ${error.message}` });
    throw error;
  }
};

export const deleteContainer = async (containerId, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'deleting', message: 'Deleting container...' });
    const response = await api.delete(`/containers/${containerId}`);
    if (onStatusChange) onStatusChange({ status: 'success', message: 'Container deleted successfully' });
    return response.data;
  } catch (error) {
    console.error('Error deleting container:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to delete container: ${error.message}` });
    throw error;
  }
};

// Image operations
export const fetchImages = async () => {
  try {
    const response = await api.get('/images');
    return response.data;
  } catch (error) {
    console.error('Error fetching images:', error);
    throw error;
  }
};

export const pullImage = async (imageName, tag = 'latest', onStatusChange) => {
  try {
    // Ensure imageName is valid before checking includes
    if (!imageName) {
      throw new Error('Image name is empty or undefined');
    }
    
    // Notify that the pull is starting
    if (onStatusChange) onStatusChange({ 
      status: 'pulling', 
      message: `Pulling ${imageName}:${tag}...` 
    });
    
    // Format the image name properly for Docker
    const formattedName = imageName.includes('/') ? imageName : `library/${imageName}`;
    
    const response = await api.post('/images/pull', { 
      imageName: formattedName, 
      tag 
    });
    
    // Notify that the pull completed successfully
    if (onStatusChange) onStatusChange({ 
      status: 'success', 
      message: `Successfully pulled ${imageName}:${tag}` 
    });
    
    return response.data;
  } catch (error) {
    console.error('Error pulling image:', error);
    if (onStatusChange) onStatusChange({ 
      status: 'error', 
      message: `Failed to pull ${imageName}:${tag}: ${error.message}` 
    });
    throw error;
  }
};

export const buildImage = async (dockerfile, tag, onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange({ status: 'building', message: `Building image: ${tag}...` });
    const response = await api.post('/images/build', { dockerfile, tag });
    if (onStatusChange) onStatusChange({ status: 'success', message: `Image ${tag} built successfully` });
    return response.data;
  } catch (error) {
    console.error('Error building image:', error);
    if (onStatusChange) onStatusChange({ status: 'error', message: `Failed to build image: ${error.message}` });
    throw error;
  }
};

// Volume operations
export const fetchVolumes = async () => {
  try {
    const response = await api.get('/volumes');
    return response.data.Volumes || [];
  } catch (error) {
    console.error('Error fetching volumes:', error);
    throw error;
  }
};

export const createVolume = async (name, driver = 'local', driverOpts = {}) => {
  try {
    const response = await api.post('/volumes/create', { name, driver, driverOpts });
    return response.data;
  } catch (error) {
    console.error('Error creating volume:', error);
    throw error;
  }
};

export const deleteVolume = async (volumeName) => {
  try {
    const response = await api.delete(`/volumes/${volumeName}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting volume:', error);
    throw error;
  }
};

// Network operations
export const fetchNetworks = async () => {
  try {
    const response = await api.get('/networks');
    return response.data;
  } catch (error) {
    console.error('Error fetching networks:', error);
    throw error;
  }
};

export const createNetwork = async (name, driver = 'bridge', options = {}) => {
  try {
    const response = await api.post('/networks/create', { name, driver, options });
    return response.data;
  } catch (error) {
    console.error('Error creating network:', error);
    throw error;
  }
};

export const deleteNetwork = async (networkId) => {
  try {
    const response = await api.delete(`/networks/${networkId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting network:', error);
    throw error;
  }
};

// Export all functions as a Docker API service
const dockerApi = {
  // Containers
  fetchContainers,
  startContainer,
  pauseContainer,
  unpauseContainer,
  stopContainer,
  createContainer,
  deleteContainer,
  
  // Images
  fetchImages,
  pullImage,
  buildImage,
  
  // Volumes
  fetchVolumes,
  createVolume,
  deleteVolume,
  
  // Networks
  fetchNetworks,
  createNetwork,
  deleteNetwork
};

export default dockerApi;
