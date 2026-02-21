# Syncode — Quick Start Guide

Set up and run all Syncode services locally for development.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (for building runner image)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for K8s operations)
- [Git](https://git-scm.com/)
- **Auth0 account** — [sign up free](https://auth0.com/)
- **MongoDB** — [Atlas](https://www.mongodb.com/atlas) (free tier) or local

## Step 1: Clone and Install

```powershell
git clone <repository-url>
cd Syncode
```

Install dependencies for each service:

```powershell
cd frontend && npm install && cd ..
cd init-service && npm install && cd ..
cd orchestrator && npm install && cd ..
```

---

## Step 2: Auth0 Setup

1. Create a **Single Page Application** in Auth0 Dashboard
2. Create an **API** with identifier (audience) like `https://syncode-api`
3. In the SPA settings:
   - **Allowed Callback URLs**: `http://localhost:5173`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`

Note down: **Domain**, **Client ID**, and **Audience**

---

## Step 3: MongoDB Setup

### Option A: MongoDB Atlas (Recommended)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Get connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/syncode`

### Option B: Local MongoDB
```powershell
# If using Docker
docker run -d -p 27017:27017 --name mongo mongo:7
# Connection string: mongodb://localhost:27017/syncode
```

---

## Step 4: Environment Variables

### Frontend — create `frontend/.env`

```env
VITE_AUTH0_DOMAIN=dev-xyz.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://syncode-api
VITE_API_URL=http://localhost:3002
```

### Orchestrator — create `orchestrator/.env`

```env
PORT=3002
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/syncode?retryWrites=true&w=majority"
AUTH0_AUDIENCE="https://syncode-api"
AUTH0_ISSUER_BASE_URL="https://dev-xyz.us.auth0.com/"
```

### Init Service — create `init-service/.env`

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET=syncode-db-bucket
PORT=3001
```

> Never commit `.env` files — they're in `.gitignore`.

---

## Step 5: Generate Prisma Client

```powershell
cd orchestrator
npx prisma generate
cd ..
```

This generates the Prisma client from `orchestrator/prisma/schema.prisma`.

---

## Step 6: Build and Push Runner Image

The runner runs as a Docker container inside K8s pods — not locally.

```powershell
cd runner
docker build -t <your-dockerhub-username>/runner:latest .
docker login
docker push <your-dockerhub-username>/runner:latest
cd ..
```

Update `orchestrator/service.yaml` with your Docker Hub image reference.

---

## Step 7: Start Services

Open **3 terminals**:

```powershell
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 — Orchestrator (http://localhost:3002)
cd orchestrator && npm run dev

# Terminal 3 — Init Service (http://localhost:3001)
cd init-service && npm run dev
```

---

## Step 8: Open the App

1. Navigate to `http://localhost:5173`
2. Click **Log In** → Auth0 handles authentication
3. Create a project from the dashboard

> **Note**: Full workflow (running code in pods) requires a Kubernetes cluster. See [INFRASTRUCTURE_SETUP.md](./INFRASTRUCTURE_SETUP.md). The frontend, orchestrator, and init-service work locally without K8s.

---

## Development Workflow

- **Frontend**: Vite auto-reloads on file changes
- **Backend**: nodemon watches `src/` and restarts on changes
- **Prisma**: Run `npx prisma generate` after changing `schema.prisma`

---

## Local Kubernetes Testing (Optional)

To test the full pod lifecycle locally:

```powershell
# Using Docker Desktop (enable Kubernetes in settings)
# OR minikube
minikube start

# Install ingress controller
kubectl apply -f k8s/ingress-controller.yaml

# Verify
kubectl get nodes
```

---

## Troubleshooting

### Port already in use
```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Auth0 configuration error on frontend
Ensure `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are set in `frontend/.env`.

### Prisma errors
```powershell
cd orchestrator
npx prisma generate
```

### AWS / S3 issues
```powershell
aws s3 ls  # Verify credentials work
```

---

## Next Steps

- [README.md](./README.md) — architecture overview
- [INFRASTRUCTURE_SETUP.md](./INFRASTRUCTURE_SETUP.md) — AWS + K8s cluster setup
- Service READMEs: [frontend](./frontend/README.md) · [orchestrator](./orchestrator/README.md) · [init-service](./init-service/README.md) · [runner](./runner/README.md)
