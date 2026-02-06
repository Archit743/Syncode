# Q2: Detailed and realistic breakdown of implementation tasks. (10 Marks)

This task breakdown structure (TBS) follows the implementation flow from Infrastructure -> Backend Services -> Frontend.

## Phase 1: Infrastructure & Core Setup (Week 1)
*   [ ] **Project Repository Setup**
    *   Initialize Monorepo structure (if not already strictly enforced).
    *   Set up linting (ESLint) and formatting (Prettier) across all packages.
*   [ ] **Docker Configuration**
    *   `runner`: detailed Dockerfile with Node.js, build tools, and `node-pty` prerequisites.
    *   Build and push a base `runner` image to Docker Hub for testing.
*   [ ] **Kubernetes Local Dev Environment**
    *   Set up Minikube or Docker Desktop K8s.
    *   Create base Helm charts or raw manifests for `ingress-nginx`.

## Phase 2: Backend Microservices (Weeks 2-3)

### 2.1 Init Service (Project Bootstrapping)
*   [ ] **S3 Integration**
    *   Implement AWS SDK client for S3.
    *   Create `copyS3Folder` utility function.
*   [ ] **API Implementation**
    *   `POST /project`: Validate `replId` and trigger S3 copy.
    *   Error handling for missing templates.

### 2.2 Orchestrator Service (The Control Plane)
*   [ ] **K8s Client Wrapper**
    *   Implement K8s API client (Deployment, Service, Ingress creation actions).
*   [ ] **Resource Management Logic**
    *   `createEnvironment(replId)`: Generate dynamic manifest YAMLs.
    *   `deleteEnvironment(replId)`: Cleanup logic.
*   [ ] **API Implementation**
    *   `POST /start` and `POST /stop` endpoints.

### 2.3 Runner Service (The Workhorse)
*   [ ] **WebSocket Server**
    *   Setup Socket.io specifically to listen on the internal container port.
*   [ ] **PTY Integration**
    *   Implement `node-pty` spawn logic (bash/sh).
    *   Pipe PTY data stream to WebSocket events `terminal:data`.
*   [ ] **File System API**
    *   Implement `fs` wrappers: `readFile`, `writeFile`, `readdir` (recursive).

## Phase 3: Frontend Development (Weeks 3-4)

### 3.1 Core UI Shell
*   [ ] **Editor Component**
    *   Integrate `@monaco-editor/react`.
    *   Configure language support based on file extensions.
*   [ ] **Terminal Component**
    *   Integrate `xterm.js`.
    *   Style to match the detailed "rich aesthetics" requirement.

### 3.2 Feature Integration
*   [ ] **File Explorer**
    *   Tree view component.
    *   Connect click events to `fetchContent` WebSocket calls.
*   [ ] **Socket Client Service**
    *   Abstract socket connection logic into a custom hook context.
    *   Handle reconnection and connection states (Bootsrapping -> Connected).

## Phase 4: Integration & Polish (Week 5)
*   [ ] **End-to-End Wiring**
    *   Verify "Create Project" -> "Start Env" -> "Code" flow.
*   [ ] **Security Hardening**
    *   Implement resource limits on Runner pods.
    *   Sanitize inputs on Orchestrator to prevent K8s injection.
*   [ ] **UI Polish**
    *   Add loading states (Spinners/Skeletons) while Pods are booting.
    *   Refine dark mode coding theme.
