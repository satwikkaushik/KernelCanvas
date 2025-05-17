# KernelCanvas - Docker Visualization Tool

KernelCanvas is a visual Docker container management application that lets you drag, drop, and connect Docker components on a canvas.

## Features

- **Drag & Drop Interface**: Easily add Docker images and volumes to the canvas
- **Visual Container Configuration**: Configure container settings visually
- **Volume Connections**: Connect volumes to containers with visual wire connections
- **Container Management**: Create, start, stop, and delete containers directly from the canvas
- **Visual Feedback**: Color-coded connections and borders show connection status

## Components

### Image Nodes

- Drag Docker images onto the canvas
- Configure ports, environment variables
- Create and run containers with a single click
- View container status and logs

### Volume Nodes

- Create and manage Docker volumes
- Connect volumes to container images with visual wires
- View connected containers for each volume

### Connections

- Visually connect volumes to containers
- Automatically generates proper volume mount paths
- Tooltip information about the connection details

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the server with `npm run server`
4. Start the client with `npm start`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Requirements

- Docker daemon running on the host machine
- Node.js and npm

## Usage Tips

- Drag images from the sidebar onto the canvas
- Create volumes with the volume button in the top-left
- Connect volumes to images by dragging from the volume connector to the image connector
- Click on nodes to see details and management options
- Delete nodes with the delete button on each node
