# Runner

Containerized execution environment that runs inside Kubernetes pods — provides a PTY terminal, WebSocket file/terminal I/O, and application hosting.

## Tech Stack

Node.js 20 · Express · TypeScript · Socket.io · node-pty · Docker

## Project Structure

```
runner/
├── src/
│   ├── index.ts     # Express + HTTP server, initializes WebSocket
│   ├── ws.ts        # WebSocket event handlers (file ops, terminal)
│   ├── pty.ts       # PTY terminal management (node-pty)
│   ├── fs.ts        # File system operations (read, write, list)
│   └── aws.ts       # AWS utilities
├── Dockerfile       # Container image (node:20)
├── dist/            # Compiled JS (generated)
├── tsconfig.json
└── package.json
```

## Ports

| Port | Purpose |
|------|---------|
| **3001** | WebSocket server — terminal I/O + file operations |
| **3000** | User application (where user's code runs) |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `fetchDir` | `{ path }` | List directory contents |
| `fetchContent` | `{ path }` | Read file content |
| `updateContent` | `{ path, content }` | Write file to disk |
| `terminal:write` | `{ data }` | Send input to PTY |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `file:refresh` | `{ tree }` | Updated file tree structure |
| `file:content` | `{ content }` | File content response |
| `terminal:data` | `{ data }` | Terminal output (ANSI preserved) |

## Dockerfile

```dockerfile
FROM node:20
WORKDIR /code
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

> **Note**: The runner is NOT started manually. It runs only inside K8s pods created by the Orchestrator.

## Build and Deploy

```powershell
# 1. Build TypeScript
npm run build

# 2. Build Docker image
docker build -t <your-dockerhub-username>/runner:latest .

# 3. Push to Docker Hub
docker login
docker push <your-dockerhub-username>/runner:latest
```

Update `orchestrator/service.yaml` with your image reference.

## Pod Lifecycle

1. **Orchestrator** creates K8s Deployment with runner image
2. **initContainer** (aws-cli) copies project code from S3 → `/workspace`
3. **Runner container** starts with `/workspace` mounted
4. WebSocket server listens on port 3001
5. PTY shell spawns (bash/sh) with CWD `/workspace`
6. Frontend connects via `{replId}.iluvcats.me` for WebSocket
7. User app served at `{replId}.catclub.tech` on port 3000
8. On stop, Orchestrator deletes the Deployment

## Local Development (Optional)

For testing without K8s:

```powershell
npm install
npm run dev    # Starts on port 3001
```

## Docker Testing

```powershell
docker build -t runner:test .
docker run -p 3000:3000 -p 3001:3001 runner:test
curl http://localhost:3001
```
