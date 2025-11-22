# Runner Service

Execution environment service that runs inside Kubernetes pods to provide isolated workspaces with real-time terminal access, file operations, and application hosting.

## Overview

The Runner is the core execution environment for user projects. Each user gets their own runner pod with:
- **PTY (Pseudo-Terminal)**: Full shell access via node-pty
- **WebSocket Server**: Real-time bidirectional communication
- **File System Operations**: Read, write, list files in workspace
- **Application Hosting**: Serves user's application on port 3000
- **Workspace**: Mounted volume with project files from S3

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express 4.21
- **Language**: TypeScript 5.3
- **WebSocket**: Socket.io 4.7
- **Terminal**: node-pty 1.0 (native addon)
- **AWS SDK**: aws-sdk 2.1692 (for S3 operations)
- **Container**: Docker (runs in Kubernetes pods)
- **Development**: nodemon + ts-node

## Project Structure

```
runner/
├── src/
│   ├── index.ts        # Main Express server
│   ├── ws.ts           # WebSocket event handlers
│   ├── pty.ts          # PTY terminal management
│   ├── fs.ts           # File system operations
│   └── aws.ts          # AWS utilities
├── Dockerfile          # Container image definition
├── dist/               # Compiled JavaScript (generated)
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── .env               # Environment variables (not in git)
```

## Ports

- **3001**: WebSocket server for terminal and file operations
- **3000**: User application port (where user's code runs)

## API and WebSocket Events

### HTTP Endpoints

#### GET `/files`
Basic health/status endpoint for file operations.

---

### WebSocket Events (Port 3001)

#### Client → Server

**`fetchDir`** - List directory contents
```typescript
socket.emit('fetchDir', { path: '/workspace' });
```
Response: Emits `file:refresh` with file tree structure.

**`fetchContent`** - Read file content
```typescript
socket.emit('fetchContent', { path: '/workspace/index.js' });
```
Response: Emits `file:content` with file content string.

**`updateContent`** - Write file content
```typescript
socket.emit('updateContent', { 
  path: '/workspace/index.js',
  content: 'console.log("Hello");'
});
```
Response: Writes file and emits `file:refresh`.

**`terminal:write`** - Send terminal input
```typescript
socket.emit('terminal:write', { data: 'ls -la\n' });
```
Response: Command executed in PTY, output sent via `terminal:data`.

#### Server → Client

**`file:refresh`** - File tree updated
```typescript
{
  tree: [
    { name: 'index.js', type: 'file', path: '/workspace/index.js' },
    { name: 'src', type: 'directory', path: '/workspace/src', children: [...] }
  ]
}
```

**`file:content`** - File content response
```typescript
{
  content: 'const express = require("express");...'
}
```

**`terminal:data`** - Terminal output
```typescript
{
  data: 'user@container:~$ ls\nindex.js package.json\n'
}
```

## Configuration

### Environment Variables

Create a `.env` file in the `runner/` directory:

```env
# AWS Configuration (for S3 operations if needed)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# Server Ports
PORT=3001
USER_PORT=3000

# Workspace Path
WORKSPACE=/workspace
```

### Dockerfile

The runner is containerized and runs in Kubernetes:

```dockerfile
FROM node:18-alpine

# Install dependencies for node-pty (requires build tools)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy compiled code
COPY dist ./dist

# Workspace volume mount point
VOLUME /workspace

# Expose ports
EXPOSE 3000 3001

# Start the runner
CMD ["node", "dist/index.js"]
```

## Development

> **Important**: The runner service is designed to run ONLY inside Docker containers within Kubernetes pods. It is NOT started manually on your local machine.

### Install Dependencies (for building)
```powershell
npm install
```

### Build TypeScript
```powershell
npm run build
```
This is required before building the Docker image.

### Local Testing (Optional)
For testing runner code changes without Kubernetes:
```powershell
npm run dev
```
This starts the runner locally on ports 3000/3001, but it won't have the full Kubernetes environment.

## How It Works

### Pod Lifecycle

1. **Pod Creation**: Orchestrator creates Deployment with runner image
2. **InitContainer**: Copies project files from S3 to `/workspace` volume
3. **Runner Container Starts**:
   - Mounts `/workspace` volume with project files
   - Starts Express server on port 3001
   - Starts WebSocket server on port 3001
   - Initializes PTY with bash/sh shell
   - Optionally starts user's application on port 3000
4. **Frontend Connects**: WebSocket connection established
5. **User Interacts**: Terminal commands, file edits, app preview
6. **Pod Deletion**: Orchestrator deletes Deployment when session ends

### File System Operations

**fetchDir** (`fs.ts`):
- Recursively reads directory structure
- Returns tree with files and folders
- Excludes `node_modules`, `.git`, etc.

**fetchContent** (`fs.ts`):
- Reads file from disk using Node.js `fs.readFile`
- Returns content as string

**updateContent** (`fs.ts`):
- Writes content to file using Node.js `fs.writeFile`
- Creates parent directories if needed
- Triggers file tree refresh

### Terminal (PTY)

**Initialization** (`pty.ts`):
- Spawns PTY process with bash or sh
- Sets working directory to `/workspace`
- Configures terminal size (cols/rows)

**Input/Output**:
- Frontend sends keystrokes via `terminal:write`
- PTY executes command in shell
- Output streamed back via `terminal:data`
- ANSI escape codes preserved for colors/formatting

**Process Management**:
- PTY process runs for lifetime of pod
- Graceful cleanup on disconnect
- Shell state persists across WebSocket reconnections

### WebSocket Server

**Connection Flow**:
1. Frontend connects to `ws://{replId}.yourdomain.com:3001`
2. Socket.io establishes connection
3. Server registers event handlers
4. Frontend can send/receive events
5. Connection persists until frontend disconnects or pod terminates

**Event Handlers** (`ws.ts`):
- `fetchDir` → calls file system module
- `fetchContent` → reads file
- `updateContent` → writes file
- `terminal:write` → sends to PTY

## Building and Deploying

### Prerequisites
- Docker installed and running
- Docker Hub account (or other container registry)

### 1. Build TypeScript First
```powershell
npm run build
```

### 2. Build Docker Image
```powershell
docker build -t your-dockerhub-username/runner:latest .
```
Replace `your-dockerhub-username` with your actual Docker Hub username.

### 3. Login to Docker Hub
```powershell
docker login
```
Enter your Docker Hub credentials when prompted.

### 4. Push to Docker Hub
```powershell
docker push your-dockerhub-username/runner:latest
```

### 5. Update Orchestrator Manifest
Edit `orchestrator/service.yaml` and replace the image reference:
```yaml
containers:
  - name: runner
    image: your-dockerhub-username/runner:latest  # Use your actual image
```

### 6. Deploy via Orchestrator
Once the orchestrator is running and your Kubernetes cluster is configured, the orchestrator will automatically pull and deploy your runner image when users create new environments.

> **Note**: The image must be publicly accessible on Docker Hub, or you need to configure Kubernetes image pull secrets for private registries.

## Integration with Other Services

### Init Service
- Init Service creates project in S3 at `s3://bucket/code/{replId}/`
- Pod's initContainer copies files to `/workspace`

### Orchestrator
- Orchestrator creates Deployment with runner image
- Sets up Service and Ingress for pod access
- Deletes resources when user stops environment

### Frontend
- Frontend connects WebSocket to `{replId}.yourdomain.com:3001`
- Sends file/terminal events
- Receives real-time updates
- Displays user app in iframe at `{replId}.yourdomain.com:3000`

## Security Considerations

- **Sandboxing**: Each user gets isolated pod (Kubernetes namespace isolation)
- **Resource Limits**: Set CPU/memory limits in Deployment manifest
- **Network Policies**: Restrict pod-to-pod communication
- **File System**: Workspace is ephemeral; data lost when pod deleted
- **Shell Access**: Users have full shell access within their pod
- **Escape Prevention**: Ensure users can't escape container or access host
- **Secrets**: Don't expose AWS credentials to user environment

## Testing

### Manual Testing Locally
```powershell
# Start runner
npm run dev

# In another terminal, test with curl
curl http://localhost:3001/files
```

### WebSocket Testing
Use a WebSocket client (wscat, Postman):
```powershell
npm install -g wscat
wscat -c ws://localhost:3001
> {"event": "fetchDir", "data": {"path": "/workspace"}}
```

### Docker Testing
```powershell
# Build image
docker build -t runner:test .

# Run container
docker run -p 3000:3000 -p 3001:3001 runner:test

# Test connection
curl http://localhost:3001/files
```

## Troubleshooting

### node-pty Build Errors
node-pty requires native compilation:
```powershell
# Ensure build tools are installed
npm install --build-from-source
```

In Docker, ensure alpine has build dependencies:
```dockerfile
RUN apk add --no-cache python3 make g++
```

### WebSocket Connection Failed
- Check CORS settings in `index.ts`
- Verify port 3001 is accessible
- Check firewall rules
- Inspect browser console for errors

### Terminal Not Responding
- Check PTY process is running
- Verify shell exists in container (`/bin/bash` or `/bin/sh`)
- Check PTY logs for errors

### File Operations Failing
- Verify `/workspace` directory exists
- Check file permissions
- Ensure path is absolute and within `/workspace`

### Pod Crashes in Kubernetes
```powershell
# Check pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>

# Check initContainer logs
kubectl logs <pod-name> -c copy-s3-resources
```

## Performance Considerations

- **Resource Limits**: Set limits to prevent resource exhaustion
- **Terminal Buffer**: Limit output buffer size to prevent memory issues
- **File Watch**: Don't implement file watching (high CPU usage)
- **Connection Limits**: Limit concurrent WebSocket connections per pod
- **Cleanup**: Gracefully close PTY and WebSocket on shutdown

## Monitoring

Recommended metrics:
- Pod CPU/memory usage
- WebSocket connection count
- Active PTY processes
- File operation latency
- Error rate

## Future Enhancements

- [ ] Add file upload/download via HTTP
- [ ] Implement file watching for auto-refresh
- [ ] Add multiple terminal sessions
- [ ] Support custom shells (zsh, fish)
- [ ] Add code execution timeout
- [ ] Implement resource usage reporting
- [ ] Add collaborative editing support
- [ ] Persist workspace to S3 on exit
- [ ] Add snapshot/restore functionality
- [ ] Implement security scanning

## Known Issues

- PTY may not work on Windows containers (use Linux containers)
- Large file operations can block event loop (use streams for big files)
- Terminal colors may not render correctly in some browsers

## License

MIT
