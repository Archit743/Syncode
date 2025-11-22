# Orchestrator Service

Microservice responsible for managing Kubernetes resources (Deployments, Services, Ingress) to dynamically create and destroy isolated execution environments (runner pods) for each user project.

## Overview

The Orchestrator acts as the bridge between the frontend and Kubernetes cluster. It:
1. Receives requests to start/stop environments
2. Generates Kubernetes manifests dynamically
3. Creates/deletes Deployments, Services, and Ingress resources
4. Manages the lifecycle of runner pods

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express 4.18
- **Language**: TypeScript 5.3
- **Kubernetes Client**: @kubernetes/client-node 0.20
- **AWS SDK**: aws-sdk 2.1556 (for S3 operations)
- **YAML Parser**: yaml 2.3
- **Development**: nodemon + ts-node

## Project Structure

```
orchestrator/
├── src/
│   ├── index.ts           # Express server and orchestration logic
│   └── aws.ts             # AWS configuration utilities
├── service.yaml           # Kubernetes manifest template (not in git)
├── service.yaml.example   # Example manifest with placeholders
├── dist/                  # Compiled JavaScript (generated)
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables (not in git)
```

## API Endpoints

### POST `/start`

Creates Kubernetes resources for a new environment.

**Request Body:**
```json
{
  "replId": "unique-project-id",
  "language": "nodejs"
}
```

**Response:**
```json
{
  "success": true,
  "podCreated": true
}
```

**What It Does:**
1. Reads `service.yaml` template
2. Replaces `service_name` with actual `replId`
3. Applies Deployment, Service, and Ingress to Kubernetes
4. Runner pod starts with initContainer that copies code from S3

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters)
- `500` - Server error (Kubernetes API failed)

---

### POST `/stop`

Deletes Kubernetes resources for an environment.

**Request Body:**
```json
{
  "replId": "unique-project-id"
}
```

**Response:**
```json
{
  "success": true
}
```

**What It Does:**
1. Deletes Deployment (and associated pods)
2. Deletes Service
3. Deletes Ingress
4. Resources are removed from cluster

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing replId)
- `500` - Server error (Kubernetes API failed)

## Configuration

### Environment Variables

Create a `.env` file in the `orchestrator/` directory:

```env
# AWS Configuration (if needed for S3 operations)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# S3 Configuration
S3_BUCKET=your-bucket-name

# Server Configuration
PORT=3002

# Kubernetes Configuration (optional for local dev)
KUBECONFIG=~/.kube/config
```

### Kubernetes Manifest Template

Copy `service.yaml.example` to `service.yaml` and configure:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service_name  # Will be replaced with replId
  labels:
    app: service_name
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service_name
  template:
    metadata:
      labels:
        app: service_name
    spec:
      volumes:
        - name: workspace-volume
          emptyDir: {}
      initContainers:
        - name: copy-s3-resources
          image: amazon/aws-cli
          command: ["/bin/sh", "-c"]
          args:
            - >
              aws s3 cp s3://YOUR-BUCKET/code/service_name/ /workspace/ --recursive &&
              echo "Resources copied from S3";
          env:
            - name: AWS_ACCESS_KEY_ID
              value: "YOUR_KEY"  # Use Kubernetes Secret in production
            - name: AWS_SECRET_ACCESS_KEY
              value: "YOUR_SECRET"  # Use Kubernetes Secret in production
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
      containers:
        - name: runner
          image: your-dockerhub-username/runner:latest  # Replace with your Docker Hub image
          ports:
            - containerPort: 3001
            - containerPort: 3000
          volumeMounts:
            - name: workspace-volume
              mountPath: /workspace
---
apiVersion: v1
kind: Service
metadata:
  name: service_name
spec:
  selector:
    app: service_name
  ports:
    - protocol: TCP
      name: ws
      port: 3001
      targetPort: 3001
    - protocol: TCP
      name: user
      port: 3000
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: service_name
spec:
  ingressClassName: nginx
  rules:
  - host: service_name.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: service_name
            port:
              number: 3001
```

**Important**: Replace placeholders:
- `YOUR-BUCKET` → Your S3 bucket name
- `your-dockerhub-username/runner:latest` → Your Docker Hub username and runner image (must be pushed to Docker Hub first)
- `yourdomain.com` → Your domain
- `YOUR_KEY` and `YOUR_SECRET` → Use Kubernetes Secrets in production, not hardcoded values

## Development

### Install Dependencies
```powershell
npm install
```

### Build TypeScript
```powershell
npm run build
```

### Run Development Server
```powershell
npm run dev
```
Starts on port 3002 with nodemon for auto-reload.

### Run Production Build
```powershell
npm run start
```

## Kubernetes Setup

### Prerequisites

1. **Kubernetes Cluster**: Local (Docker Desktop, minikube) or cloud (EKS, GKE, AKS)
2. **kubectl**: Installed and configured
3. **kubeconfig**: Accessible at `~/.kube/config` or custom path in `.env`
4. **Ingress Controller**: NGINX Ingress Controller installed

### Verify Connection
```powershell
kubectl cluster-info
kubectl get nodes
```

### Install NGINX Ingress Controller
```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

Or use the local manifest:
```powershell
kubectl apply -f ../k8s/ingress-controller.yaml
```

### Configure RBAC (if needed)

The service account running the orchestrator needs permissions:
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: orchestrator-role
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "delete", "get", "list"]
- apiGroups: [""]
  resources: ["services"]
  verbs: ["create", "delete", "get", "list"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["create", "delete", "get", "list"]
```

## How It Works

### Start Flow
1. Frontend sends POST `/start` with `replId` and `language`
2. Orchestrator reads `service.yaml` template
3. Replaces all `service_name` occurrences with actual `replId`
4. Parses YAML into Kubernetes resource objects
5. Applies each resource (Deployment, Service, Ingress) via Kubernetes API
6. Deployment creates pod with:
   - **initContainer**: Copies code from S3 to workspace volume
   - **runner container**: Starts with workspace mounted at `/workspace`
7. Service exposes ports 3000 and 3001
8. Ingress routes `{replId}.yourdomain.com` to the Service

### Stop Flow
1. Frontend sends POST `/stop` with `replId`
2. Orchestrator calls Kubernetes API to delete:
   - Deployment (and its pods)
   - Service
   - Ingress
3. Resources are gracefully terminated

## Integration with Other Services

### Frontend Integration
```typescript
// Start environment
await axios.post('http://localhost:3002/start', {
  replId: 'user-project-123',
  language: 'nodejs'
});

// Stop environment
await axios.post('http://localhost:3002/stop', {
  replId: 'user-project-123'
});
```

### Init Service Integration
Orchestrator assumes Init Service has already created project files in S3 at `s3://bucket/code/{replId}/`.

### Runner Integration
The Deployment's initContainer copies files from S3 to the workspace, then the runner container starts and serves on ports 3000/3001.

## Error Handling

- **Missing Parameters**: Returns 400
- **Kubernetes API Errors**: Returns 500 with error details
- **Manifest Template Missing**: Server fails to start (check `service.yaml` exists)
- **Invalid YAML**: Returns 500 during resource creation

## Logging

Logs include:
- Server startup
- Incoming start/stop requests
- Kubernetes API operations (create/delete)
- Success/failure status
- Error stack traces

Example:
```
Orchestrator running on port 3002
Start request: replId=test-123
Successfully created deployment for test-123
Successfully created service for test-123
Successfully created ingress for test-123
```

## Security Considerations

- **AWS Credentials in Manifest**: Use Kubernetes Secrets, not hardcoded values
- **IRSA (AWS)**: Use IAM Roles for Service Accounts instead of credentials
- **RBAC**: Grant minimal permissions to the orchestrator ServiceAccount
- **Network Policies**: Restrict pod-to-pod communication
- **Resource Limits**: Add CPU/memory limits to prevent resource exhaustion
- **Namespace Isolation**: Run user pods in separate namespaces

## Testing

### Manual Testing with curl

**Start Environment:**
```powershell
curl -X POST http://localhost:3002/start `
  -H "Content-Type: application/json" `
  -d '{\"replId\":\"test-123\",\"language\":\"nodejs\"}'
```

**Verify Resources Created:**
```powershell
kubectl get deployments
kubectl get services
kubectl get ingress
kubectl get pods
```

**Stop Environment:**
```powershell
curl -X POST http://localhost:3002/stop `
  -H "Content-Type: application/json" `
  -d '{\"replId\":\"test-123\"}'
```

**Verify Resources Deleted:**
```powershell
kubectl get deployments
kubectl get services
kubectl get ingress
```

## Troubleshooting

### Kubernetes Connection Failed
```powershell
# Check kubeconfig
kubectl config view

# Test connection
kubectl get nodes

# Set KUBECONFIG in .env if needed
```

### Pods Not Starting
```powershell
# Check pod status
kubectl get pods

# View pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>
```

### InitContainer Failing
- Check AWS credentials in manifest
- Verify S3 bucket exists and has files at `code/{replId}/`
- Check initContainer logs: `kubectl logs <pod-name> -c copy-s3-resources`

### Ingress Not Working
```powershell
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Verify ingress resource
kubectl describe ingress <replId>

# Check DNS/hosts file points domain to cluster IP
```

### Port Already in Use
```powershell
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

## Performance Considerations

- **Resource Limits**: Set CPU/memory limits in manifest to prevent noisy neighbors
- **Pod Startup Time**: initContainer S3 copy adds startup latency
- **API Rate Limits**: Kubernetes API has rate limits; batch operations if creating many pods
- **Cleanup**: Implement periodic cleanup of orphaned resources

## Deployment

### Production Kubernetes Deployment

1. **Build Docker Image** (optional, if you want to run orchestrator in-cluster):
```powershell
docker build -t your-registry/orchestrator:latest .
docker push your-registry/orchestrator:latest
```

2. **Deploy to Cluster**:
```powershell
kubectl apply -f orchestrator-deployment.yaml
```

3. **Create ServiceAccount and RBAC**:
```powershell
kubectl apply -f rbac.yaml
```

4. **Store Secrets**:
```powershell
kubectl create secret generic aws-credentials \
  --from-literal=access-key=$AWS_ACCESS_KEY_ID \
  --from-literal=secret-key=$AWS_SECRET_ACCESS_KEY
```

## Monitoring

Recommended:
- **Health Check**: Add `GET /health` endpoint
- **Metrics**: Track pod creation/deletion count, API latency, error rate
- **Alerts**: Alert on high error rates or pod creation failures
- **Logging**: Integrate with centralized logging (CloudWatch, ELK)

## Future Enhancements

- [ ] Add health check endpoint
- [ ] Implement namespace isolation per user
- [ ] Add resource quotas and limits
- [ ] Support pod templates from database
- [ ] Add metrics and instrumentation
- [ ] Implement cleanup job for orphaned resources
- [ ] Add authentication/authorization
- [ ] Support custom domains per project
- [ ] Add horizontal pod autoscaling
- [ ] Implement graceful shutdown handling

## License

MIT
