# Syncode

A cloud-based code execution platform that provides isolated development environments with real-time terminal access, collaborative editing, and file management — powered by Kubernetes, Auth0, and MongoDB.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Orchestrator  │────▶│  Kubernetes Pod  │
│  React/Vite  │     │  Express + Auth0 │     │   (Runner)       │
│  Auth0 SPA   │     │  Prisma/MongoDB  │     │  PTY + WebSocket │
└──────┬───────┘     └───────┬──────────┘     └──────────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │ Init Service│
       │              │   S3 Copy   │
       │              └─────────────┘
       │
  ┌────┴────┐    ┌──────────┐    ┌──────────┐
  │  Auth0  │    │ MongoDB  │    │  AWS S3  │
  │  IdP    │    │ (Atlas)  │    │ Templates│
  └─────────┘    └──────────┘    └──────────┘
```

### Services

| Service | Directory | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | `frontend/` | 5173 | React SPA with Monaco editor, xterm.js terminal, Auth0 login |
| **Orchestrator** | `orchestrator/` | 3002 | API server — Auth0 JWT auth, Prisma/MongoDB, K8s lifecycle |
| **Init Service** | `init-service/` | 3001 | Copies language templates from S3 on project creation |
| **Runner** | `runner/` | 3001 (WS) / 3000 (app) | Runs inside K8s pods — PTY shell, WebSocket, file ops |

### External Dependencies

| Service | Purpose |
|---------|---------|
| **Auth0** | Identity provider — user login, JWT tokens |
| **MongoDB** (Atlas) | Stores users, projects, collaborators via Prisma ORM |
| **AWS S3** | Stores base language templates + user project code |
| **AWS EKS** | Kubernetes cluster hosting runner pods |
| **Docker Hub** | Container registry for runner image |

## Tech Stack

### Frontend
React 18 · TypeScript · Vite · Monaco Editor · xterm.js · Socket.io Client · Auth0 SPA SDK · React Router · Axios

### Backend (Orchestrator + Init Service)
Node.js · Express · TypeScript · Prisma (MongoDB) · Auth0 JWT (`express-oauth2-jwt-bearer`) · @kubernetes/client-node · AWS SDK · YAML parser

### Runner (Docker Container)
Node.js · Express · Socket.io · node-pty · TypeScript

### Infrastructure
Kubernetes (EKS) · Docker · AWS S3 · NGINX Ingress Controller · MongoDB Atlas · Auth0

## Project Structure

```
Syncode/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── auth/             # Auth0 provider, protected routes
│   │   ├── components/       # CodingPage, Editor, Terminal, Landing, Navbar, etc.
│   │   ├── pages/            # Dashboard, Profile, Search
│   │   └── App.tsx           # Router with protected routes
│   └── .env.example
├── orchestrator/             # API + K8s orchestration
│   ├── src/
│   │   ├── index.ts          # Express server, all API routes
│   │   └── aws.ts            # AWS config
│   ├── prisma/
│   │   └── schema.prisma     # User, Project, ProjectCollaborator models
│   ├── service.yaml.example  # K8s manifest template
│   └── .env.example
├── init-service/             # S3 template copier
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   └── aws.ts            # S3 copy operations
│   └── .env
├── runner/                   # Containerized execution env
│   ├── src/
│   │   ├── index.ts          # Express + HTTP server
│   │   ├── ws.ts             # WebSocket event handlers
│   │   ├── pty.ts            # PTY terminal management
│   │   └── fs.ts             # File system operations
│   └── Dockerfile
├── k8s/                      # Cluster config
│   ├── ingress-controller.yaml
│   └── runner-secrets.yaml
├── S3BaseCodes/              # Base templates (node, python)
├── QUICKSTART.md             # Local dev setup
├── INFRASTRUCTURE_SETUP.md   # AWS + K8s cluster setup
├── ACTIVITY_DIAGRAM.md       # Workflow documentation
└── DEPLOYMENT_DIAGRAM.md     # Architecture diagram
```

## Workflow

1. **User visits landing page** → clicks Login → Auth0 handles authentication
2. **Auth0 callback** → frontend syncs user profile via `POST /verify-user`
3. **Dashboard** → user sees their projects and shared projects
4. **Create project** → `POST /projects` → Init Service copies S3 template → Orchestrator creates K8s pod
5. **Pod starts** → initContainer copies code from S3 → runner container boots WebSocket server
6. **Frontend connects** → WebSocket to `{replId}.iluvcats.me` for terminal + file ops
7. **User codes** → edits files, runs terminal commands, previews app at `{replId}.catclub.tech`
8. **Stop environment** → `POST /stop` → Orchestrator deletes K8s Deployment/Service/Ingress

### Domains

| Domain | Purpose |
|--------|---------|
| `*.iluvcats.me` | WebSocket connections to runner pods (port 3001) |
| `*.catclub.tech` | User application preview (port 3000) |

Both require wildcard DNS records pointing to the EKS ingress load balancer.

## Environment Variables

See `.env.example` files in each service for the latest reference.

### Frontend (`frontend/.env.example`)
| Variable | Description |
|----------|-------------|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `VITE_API_URL` | Orchestrator URL (default: `http://localhost:3002`) |

### Orchestrator (`orchestrator/.env.example`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3002) |
| `DATABASE_URL` | MongoDB connection string (Atlas or local) |
| `AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `AUTH0_ISSUER_BASE_URL` | Auth0 issuer URL |

### Init Service (`init-service/.env`)
| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 |
| `AWS_REGION` | AWS region (e.g., `ap-south-1`) |
| `S3_BUCKET` | S3 bucket name |
| `PORT` | Server port (default: 3001) |

## API Overview

The orchestrator exposes all API endpoints, protected by Auth0 JWT:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/verify-user` | Sync Auth0 profile to MongoDB |
| `GET` | `/projects` | List user's owned + shared projects |
| `POST` | `/projects` | Create project + start K8s pod |
| `DELETE` | `/projects/:replId` | Delete project and K8s resources |
| `POST` | `/projects/:replId/fork` | Fork a project |
| `GET` | `/projects/:replId/access` | Check project access |
| `PATCH` | `/projects/:replId/visibility` | Toggle public/private |
| `POST` | `/projects/:replId/collaborators` | Add collaborator by email |
| `DELETE` | `/projects/:replId/collaborators/:userId` | Remove collaborator |
| `POST` | `/start` | Start K8s pod for a project |
| `POST` | `/stop` | Stop and delete K8s resources |
| `GET` | `/users/search` | Search users by name/email |
| `GET` | `/users/:id` | Get user profile |
| `GET` | `/users/:id/projects` | Get user's public projects |
| `GET` | `/me/profile` | Get own profile |
| `PATCH` | `/me/profile` | Update name, username, bio, website |

See [orchestrator/README.md](./orchestrator/README.md) for full request/response details.

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for local development setup.

## Infrastructure

See [INFRASTRUCTURE_SETUP.md](./INFRASTRUCTURE_SETUP.md) for AWS + Kubernetes cluster setup.

## License

MIT
