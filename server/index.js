const express = require('express');
const http = require('http');
const cors = require('cors');
const Docker = require('dockerode');
const socketIo = require('socket.io');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to Docker daemon
const docker = new Docker();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Listen for container stats requests
  socket.on('container-stats', async (containerId) => {
    try {
      const container = docker.getContainer(containerId);
      
      // Stream container stats
      const stats = await container.stats({ stream: true });
      
      stats.on('data', (chunk) => {
        const rawStats = JSON.parse(chunk.toString());
        
        // Process and send stats to client
        socket.emit('stats-update', {
          containerId,
          stats: {
            cpu: calculateCPUPercentage(rawStats),
            memory: {
              usage: rawStats.memory_stats.usage,
              limit: rawStats.memory_stats.limit,
              percentage: (rawStats.memory_stats.usage / rawStats.memory_stats.limit * 100).toFixed(2)
            },
            network: rawStats.networks ? {
              rx_bytes: rawStats.networks.eth0.rx_bytes,
              tx_bytes: rawStats.networks.eth0.tx_bytes
            } : {}
          }
        });
      });
      
      socket.on('disconnect', () => {
        stats.destroy();
      });
      
    } catch (error) {
      socket.emit('error', { message: `Error getting container stats: ${error.message}` });
    }
  });
  
  // Listen for container logs requests
  socket.on('container-logs', async (containerId) => {
    try {
      const container = docker.getContainer(containerId);
      const logs = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true
      });
      
      logs.on('data', (chunk) => {
        socket.emit('logs-update', {
          containerId,
          log: chunk.toString()
        });
      });
      
      socket.on('disconnect', () => {
        logs.destroy();
      });
      
    } catch (error) {
      socket.emit('error', { message: `Error getting container logs: ${error.message}` });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Helper function to calculate CPU percentage
function calculateCPUPercentage(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  
  if (systemDelta > 0 && cpuDelta > 0) {
    return ((cpuDelta / systemDelta) * 100 * stats.cpu_stats.online_cpus).toFixed(2);
  }
  
  return 0;
}

// API Routes
// Containers
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/start', async (req, res) => {
  try {
    const { containerId } = req.body;
    const container = docker.getContainer(containerId);
    await container.start();
    res.json({ message: 'Container started successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/stop', async (req, res) => {
  try {
    const { containerId } = req.body;
    const container = docker.getContainer(containerId);
    await container.stop();
    res.json({ message: 'Container stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/create', async (req, res) => {
  try {
    const containerConfig = req.body;
    const container = await docker.createContainer(containerConfig);
    res.json({ 
      message: 'Container created successfully',
      containerId: container.id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.remove({ force: true });
    res.json({ message: 'Container removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Images
app.get('/api/images', async (req, res) => {
  try {
    const images = await docker.listImages();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/images/pull', async (req, res) => {
  try {
    const { imageName, tag = 'latest' } = req.body;
    
    docker.pull(`${imageName}:${tag}`, (err, stream) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      docker.modem.followProgress(stream, (err, output) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Image pulled successfully', output });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/images/build', async (req, res) => {
  try {
    const { dockerfile, tag } = req.body;
    
    // This is a simplified version - in a real app, you'd handle file uploads
    const buildStream = await docker.buildImage({
      context: dockerfile,
      src: ['Dockerfile']
    }, { t: tag });
    
    docker.modem.followProgress(buildStream, (err, output) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ message: 'Image built successfully', output });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Hub Search API proxy to avoid CORS issues
app.get('/api/search/images', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Using the v2 Docker Hub Registry API which is more reliable
    const response = await fetch(`https://registry.hub.docker.com/v2/search/repositories?query=${query}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error searching Docker Hub:', error);    
    res.status(500).json({ error: error.message });
  }
});

// Volumes
app.get('/api/volumes', async (req, res) => {
  try {
    const volumes = await docker.listVolumes();
    res.json(volumes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/volumes/create', async (req, res) => {
  try {
    const { name, driver = 'local', driverOpts = {} } = req.body;
    const volume = await docker.createVolume({
      Name: name,
      Driver: driver,
      DriverOpts: driverOpts
    });
    res.json({ 
      message: 'Volume created successfully',
      volume 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/volumes/:name', async (req, res) => {
  try {
    const volume = docker.getVolume(req.params.name);
    await volume.remove();
    res.json({ message: 'Volume removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Networks
app.get('/api/networks', async (req, res) => {
  try {
    const networks = await docker.listNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/networks/create', async (req, res) => {
  try {
    const { name, driver = 'bridge', options = {} } = req.body;
    const network = await docker.createNetwork({
      Name: name,
      Driver: driver,
      Options: options
    });
    res.json({ 
      message: 'Network created successfully',
      network 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/networks/:id', async (req, res) => {
  try {
    const network = docker.getNetwork(req.params.id);
    await network.remove();
    res.json({ message: 'Network removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
