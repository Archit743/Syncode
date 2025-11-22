# Syncode - Quick Start Guide

This guide will help you set up and run all Syncode services locally for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **AWS CLI** (optional, for S3 operations) ([Install Guide](https://aws.amazon.com/cli/))
- **Docker** (for building runner image) ([Download](https://www.docker.com/))
- **kubectl** (optional, for Kubernetes testing) ([Install Guide](https://kubernetes.io/docs/tasks/tools/))
- **Git** for cloning the repository

## Step 1: Clone the Repository

```powershell
git clone <repository-url>
cd Syncode
```

## Step 2: AWS Configuration

You'll need AWS credentials for S3 operations. Create a `.env` file in each service directory that needs it.

### Create `.env` files:

**`init-service/.env`**
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
PORT=3001
```

**`orchestrator/.env`**
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
PORT=3002
```

**`runner/.env`**
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
PORT=3001
USER_PORT=3000
```

> **Note**: Never commit `.env` files to version control. They are already included in `.gitignore`.

## Step 3: Install Dependencies

Install dependencies for each service:

### Frontend
```powershell
cd frontend
npm install
cd ..
```

### Init Service
```powershell
cd init-service
npm install
cd ..
```

### Orchestrator
```powershell
cd orchestrator
npm install
cd ..
```

## Step 4: Build Backend Services

TypeScript services need to be compiled before running:

### Init Service
```powershell
cd init-service
npm run build
cd ..
```

### Orchestrator
```powershell
cd orchestrator
npm run build
cd ..
```

## Step 5: Build and Push Runner Docker Image

The runner service runs as a Docker container in Kubernetes pods. You need to build the image and push it to your Docker Hub repository.

### Build the Runner Image
```powershell
cd runner
docker build -t your-dockerhub-username/runner:latest .
cd ..
```

### Login to Docker Hub
```powershell
docker login
# Enter your Docker Hub username and password
```

### Push the Image
```powershell
docker push your-dockerhub-username/runner:latest
```

### Update service.yaml
Edit `orchestrator/service.yaml` and replace the image reference:
```yaml
containers:
  - name: runner
    image: your-dockerhub-username/runner:latest  # Replace with your image
```

> **Note**: The runner service is NOT started manually. It runs only inside Kubernetes pods created by the orchestrator.

## Step 6: Start Services

Open **3 separate terminal windows** and start each service:

### Terminal 1: Frontend
```powershell
cd frontend
npm run dev
```
- Frontend will start at: `http://localhost:5173`
- Leave this terminal running

### Terminal 2: Init Service
```powershell
cd init-service
npm run dev
```
- Init Service will start at: `http://localhost:3001`
- Leave this terminal running

### Terminal 3: Orchestrator
```powershell
cd orchestrator
npm run dev
```
- Orchestrator will start at: `http://localhost:3002`
- Leave this terminal running

## Step 7: Access the Application

1. Open your browser and navigate to: `http://localhost:5173`
2. You should see the Syncode landing page
3. Create a new project by selecting a language and clicking "Create Project"

> **Important**: To test the full workflow with runner pods, you need a Kubernetes cluster (see "Local Kubernetes Testing" section below). The frontend and init-service will work, but environment creation requires Kubernetes.

## Development Workflow

### Hot Reloading

All services support hot reloading during development:
- **Frontend**: Vite automatically reloads on file changes
- **Backend Services**: Nodemon watches for changes and restarts the server

### Making Changes

1. **Frontend Changes**: Edit files in `frontend/src/` - changes will appear immediately
2. **Backend Changes**: Edit files in `<service>/src/` - nodemon will auto-restart the service
3. **Type Checking**: Run `npm run build` to check for TypeScript errors

## Testing the Full Stack

### Test Project Creation
1. Navigate to `http://localhost:5173`
2. Enter a project name (replId)
3. Select a language
4. Click "Create Project"
5. Init Service should copy template from S3

### Test Runner Connection (Local Simulation)
For full testing with Kubernetes pods, you'll need:
1. A local Kubernetes cluster (minikube, kind, or Docker Desktop)
2. Runner Docker image built and loaded
3. kubectl configured

### Manual API Testing

Test individual endpoints using curl or Postman:

**Init Service - Create Project**
```powershell
curl -X POST http://localhost:3001/project `
  -H "Content-Type: application/json" `
  -d '{\"replId\":\"test-123\",\"language\":\"nodejs\"}'
```

**Orchestrator - Start Environment**
```powershell
curl -X POST http://localhost:3002/start `
  -H "Content-Type: application/json" `
  -d '{\"replId\":\"test-123\",\"language\":\"nodejs\"}'
```

**Runner - List Files**
```powershell
curl http://localhost:3001/files?path=/workspace
```

## Troubleshooting

### Port Already in Use
If you see "Port already in use" errors:
```powershell
# Find process using the port (example for port 3001)
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Dependencies Not Installing
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### TypeScript Build Errors
```powershell
# Clean build and rebuild
npm run build
```

### AWS Credentials Issues
- Verify credentials in `.env` files
- Test AWS CLI: `aws s3 ls` (should list your buckets)
- Ensure S3 bucket exists and you have permissions

### WebSocket Connection Failed
- Ensure Runner service is running on port 3001
- Check browser console for connection errors
- Verify CORS settings in runner service

## Local Kubernetes Testing (Optional)

To test the full orchestration flow locally with actual runner pods:

### 1. Set up local Kubernetes
```powershell
# Using Docker Desktop (enable Kubernetes in settings)
# OR install minikube
minikube start
```

### 2. Use Your Docker Hub Image
If you've already pushed to Docker Hub (Step 5), the orchestrator will pull from there.

OR for local testing without Docker Hub:

```powershell
# Build with local tag
cd runner
docker build -t runner:local .

# Load into minikube
minikube image load runner:local

# OR for kind
kind load docker-image runner:local

# Update orchestrator/service.yaml to use runner:local
```

### 3. Configure kubectl
```powershell
# Verify connection
kubectl get nodes
```

### 4. Install NGINX Ingress Controller
```powershell
kubectl apply -f k8s/ingress-controller.yaml
# OR use the official manifest
```

### 5. Test Full Flow
Now when you create an environment from the frontend, the Orchestrator will create actual Kubernetes pods with your runner image.

## Stopping Services

Press `Ctrl+C` in each terminal window to stop the respective service.

## Next Steps

- Read the [main README](./README.md) for architecture overview
- See [DEPLOYMENT_DIAGRAM.md](./DEPLOYMENT_DIAGRAM.md) for production deployment
- Check individual service READMEs for detailed API documentation:
  - [Frontend README](./frontend/README.md)
  - [Init Service README](./init-service/README.md)
  - [Orchestrator README](./orchestrator/README.md)
  - [Runner README](./runner/README.md)

## Development Tips

1. **Use nodemon for faster development**: Already configured in all backend services
2. **Check logs**: Each service outputs logs to the console - watch for errors
3. **Browser DevTools**: Use Network tab to inspect API calls and WebSocket messages
4. **VS Code Extensions**: Install ESLint and Prettier for better code quality
5. **Git Branches**: Work on feature branches and keep main stable

## Common Development Tasks

### Adding a New Dependency
```powershell
cd <service-directory>
npm install <package-name>
```

### Running Linter (Frontend)
```powershell
cd frontend
npm run lint
```

### Building for Production
```powershell
# Frontend
cd frontend
npm run build

# Backend services
cd init-service
npm run build
```

### Previewing Production Build (Frontend)
```powershell
cd frontend
npm run preview
```

## Getting Help

- Check service logs in the terminal windows
- Review error messages in browser console
- Ensure all prerequisites are installed
- Verify environment variables in `.env` files
- Check that all services are running on their designated ports

For persistent issues, check the main README or open an issue in the repository.
