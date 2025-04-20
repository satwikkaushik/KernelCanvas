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

export const startContainer = async (containerId) => {
  try {
    const response = await api.post('/containers/start', { containerId });
    return response.data;
  } catch (error) {
    console.error('Error starting container:', error);
    throw error;
  }
};

export const stopContainer = async (containerId) => {
  try {
    const response = await api.post('/containers/stop', { containerId });
    return response.data;
  } catch (error) {
    console.error('Error stopping container:', error);
    throw error;
  }
};

export const createContainer = async (containerConfig) => {
  try {
    const response = await api.post('/containers/create', containerConfig);
    return response.data;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
};

export const deleteContainer = async (containerId) => {
  try {
    const response = await api.delete(`/containers/${containerId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting container:', error);
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

export const pullImage = async (imageName, tag = 'latest') => {
  try {
    // Ensure imageName is valid before checking includes
    if (!imageName) {
      throw new Error('Image name is empty or undefined');
    }
    
    // Format the image name properly for Docker
    // Make sure we're sending a properly formatted Docker image name
    const formattedName = imageName.includes('/') ? imageName : `library/${imageName}`;
    
    const response = await api.post('/images/pull', { 
      imageName: formattedName, 
      tag 
    });
    return response.data;
  } catch (error) {
    console.error('Error pulling image:', error);
    throw error;
  }
};

export const buildImage = async (dockerfile, tag) => {
  try {
    const response = await api.post('/images/build', { dockerfile, tag });
    return response.data;
  } catch (error) {
    console.error('Error building image:', error);
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
