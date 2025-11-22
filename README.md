# Syncode

A cloud-based code execution platform that provides isolated development environments with real-time terminal access and file management capabilities.

## Overview

Syncode is a microservices-based platform that allows users to create, manage, and execute code in isolated Kubernetes pods. It provides a web-based IDE with Monaco editor, real-time terminal access via WebSocket, and file system operations.

## Architecture

The platform consists of four main services:

### 1. Frontend (`frontend/`)
- **Technology**: React + TypeScript + Vite
- **Port**: 5173 (development)
- **Purpose**: Web-based IDE interface with Monaco editor, terminal emulator (xterm), and file explorer
- **Key Features**:
  - Code editing with syntax highlighting
  - Real-time terminal via WebSocket
  - File tree navigation and operations
  - Project creation and environment management

### 2. Init Service (`init-service/`)
- **Technology**: Node.js + Express + TypeScript
- **Port**: 3001
- **Purpose**: Initialize new projects by copying templates from S3
- **Key Features**:
  - Template retrieval from AWS S3
  - Project structure creation
  - Language-specific boilerplate setup

### 3. Orchestrator (`orchestrator/`)
- **Technology**: Node.js + Express + Kubernetes Client + TypeScript
- **Port**: 3002
- **Purpose**: Manage Kubernetes resources (Deployments, Services, Ingress)
- **Key Features**:
  - Dynamic pod creation and deletion
  - Service and Ingress management
  - Resource lifecycle orchestration
  - Health monitoring

### 4. Runner (`runner/`)
- **Technology**: Node.js + Express + Socket.io + node-pty + TypeScript
- **Ports**: 3000 (user app), 3001 (WebSocket)
- **Deployment**: Docker container in Kubernetes pods (pulled from Docker Hub)
- **Purpose**: Provide isolated execution environment within Kubernetes pods
- **Key Features**:
  - PTY (pseudo-terminal) for shell access
  - WebSocket server for real-time communication
  - File system operations (read, write, list)
  - User application hosting

> **Note**: The runner service runs ONLY as a Docker container inside Kubernetes pods. It is not started manually. You must build the Docker image and push it to Docker Hub, then reference it in the orchestrator's `service.yaml`.

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- Monaco Editor (code editor)
- xterm.js (terminal emulator)
- Emotion (CSS-in-JS)
- Socket.io Client (real-time communication)
- React Router (navigation)

### Backend Services
- Node.js
- Express
- TypeScript
- Socket.io (WebSocket)
- node-pty (terminal emulation)
- AWS SDK (S3 operations)
- Kubernetes Client (@kubernetes/client-node)

### Infrastructure
- Kubernetes (container orchestration)
- Docker (containerization)
- AWS S3 (template storage)
- Nginx Ingress Controller

## Project Structure

```
Syncode/
├── frontend/              # React web application
│   ├── src/
│   │   ├── components/    # UI components
│   │   └── assets/        # Static assets
│   └── package.json
├── init-service/          # Project initialization service
│   ├── src/
│   │   ├── index.ts       # Express server
│   │   └── aws.ts         # S3 operations
│   └── package.json
├── orchestrator/          # Kubernetes orchestration service
│   ├── src/
│   │   ├── index.ts       # Express server + k8s logic
│   │   └── aws.ts         # AWS configuration
│   ├── service.yaml       # Kubernetes manifests template
│   └── package.json
├── runner/                # Execution environment service
│   ├── src/
│   │   ├── index.ts       # Main server
│   │   ├── ws.ts          # WebSocket handlers
│   │   ├── pty.ts         # Terminal emulation
│   │   └── fs.ts          # File system operations
│   ├── Dockerfile         # Container image
│   └── package.json
├── k8s/                   # Kubernetes configuration
│   └── ingress-controller.yaml
├── QUICKSTART.md          # Quick setup guide
├── DEPLOYMENT_DIAGRAM.md  # Architecture documentation
└── ACTIVITY_DIAGRAM.md    # Workflow documentation
```

## Prerequisites

- Node.js 18+ and npm/yarn (for frontend and backend services)
- Docker (for building and pushing runner image)
- Docker Hub account (for hosting runner image)
- Kubernetes cluster (for production deployment)
- AWS account with S3 access (for template storage)
- kubectl (for Kubernetes operations)

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for detailed local development setup instructions.

## Workflow

1. **User creates a project** → Frontend sends request to Init Service
2. **Init Service** → Copies template from S3 to designated location
3. **Frontend requests environment** → Calls Orchestrator to create pod
4. **Orchestrator** → Creates Kubernetes Deployment, Service, and Ingress
5. **Runner Pod starts** → Copies project files from S3 to workspace
6. **Frontend connects** → Establishes WebSocket connection to Runner
7. **User interacts** → Code editing, terminal commands, file operations
8. **User stops environment** → Orchestrator deletes Kubernetes resources

## Environment Variables

### Init Service
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `PORT` - Server port (default: 3001)

### Orchestrator
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `PORT` - Server port (default: 3002)
- `KUBECONFIG` - Path to kubeconfig file (for local development)

### Runner
- `AWS_ACCESS_KEY_ID` - AWS credentials (for S3 access in initContainer)
- `AWS_SECRET_ACCESS_KEY` - AWS credentials

### Frontend
- `VITE_INIT_SERVICE_URL` - Init service endpoint
- `VITE_ORCHESTRATOR_URL` - Orchestrator service endpoint

## Deployment

### Local Development
1. Install dependencies for frontend, init-service, and orchestrator
2. Build and push runner Docker image to Docker Hub
3. Update `orchestrator/service.yaml` with your Docker Hub image
4. Start frontend, init-service, and orchestrator services
5. For full testing, set up a local Kubernetes cluster

Follow the detailed steps in [QUICKSTART.md](./QUICKSTART.md).

### Production (Kubernetes)
1. Build runner Docker image: `docker build -t your-dockerhub-username/runner:latest ./runner`
2. Push to Docker Hub: `docker push your-dockerhub-username/runner:latest`
3. Configure AWS credentials as Kubernetes Secrets
4. Update `orchestrator/service.yaml` with:
   - Your Docker Hub image reference
   - Your S3 bucket name
   - Your domain for Ingress
5. Deploy init-service and orchestrator to your Kubernetes cluster
6. Host frontend on static hosting (Vercel, Netlify, S3+CloudFront)
7. Configure Ingress with your domain and TLS certificates

See [DEPLOYMENT_DIAGRAM.md](./DEPLOYMENT_DIAGRAM.md) for detailed deployment architecture.

## API Endpoints

### Init Service (Port 3001)
- `POST /project` - Create new project from template
  - Body: `{ replId: string, language: string }`

### Orchestrator (Port 3002)
- `POST /start` - Create Kubernetes resources for new environment
  - Body: `{ replId: string, language: string }`
- `POST /stop` - Delete Kubernetes resources
  - Body: `{ replId: string }`

### Runner (Ports 3000, 3001)
- `GET /files` - HTTP endpoint for file operations
- WebSocket events:
  - `fetchDir` - List directory contents
  - `fetchContent` - Read file content
  - `updateContent` - Write file content
  - `terminal:write` - Send terminal input
  - `terminal:data` - Receive terminal output

## Security Considerations

- **Secrets Management**: Use Kubernetes Secrets or external secret managers (AWS Secrets Manager, HashiCorp Vault) for sensitive credentials
- **Network Policies**: Implement Kubernetes Network Policies to restrict pod-to-pod communication
- **Resource Limits**: Configure CPU/memory limits in Kubernetes manifests to prevent resource exhaustion
- **Ingress Security**: Enable TLS/SSL and authentication at the Ingress level
- **IAM Roles**: Use IRSA (IAM Roles for Service Accounts) instead of hardcoded AWS credentials

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally using the quickstart guide
5. Submit a pull request

## License

MIT

## Support

For issues, questions, or contributions, please open an issue in the repository.
