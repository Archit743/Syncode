# Syncode — Deployment Diagram

Runtime topology and network relationships of the Syncode platform.

## Mermaid Diagram

```mermaid
flowchart TB
  subgraph External["External Services"]
    Auth0["Auth0\n(Identity Provider)"]
    MongoDB["MongoDB Atlas\n(User/Project DB)"]
    S3["AWS S3\n(Code Storage)"]
    DockerHub["Docker Hub\n(Runner Image)"]
  end

  subgraph Client["Developer Browser"]
    Frontend["Frontend\n(React + Vite)\nPort: 5173"]
  end

  subgraph K8s["Kubernetes Cluster (EKS)"]
    Ingress["NGINX Ingress Controller\n(TLS Termination)"]
    
    subgraph Services["Syncode Services"]
      Orchestrator["Orchestrator\n(Express + Prisma)\nPort: 3002"]
      InitService["Init Service\n(Express)\nPort: 3001"]
    end

    subgraph Pods["Dynamic Runner Pods"]
      InitContainer["initContainer\n(aws-cli → S3 copy)"]
      Runner["Runner Container\n(node-pty + Socket.io)\nWS: 3001 / App: 3000"]
    end
  end

  Frontend -->|"HTTPS / Auth0 JWT"| Orchestrator
  Frontend -->|"WSS via *.iluvcats.me"| Ingress
  Frontend -->|"HTTPS via *.catclub.tech"| Ingress
  Ingress -->|"Port 3001"| Runner
  Ingress -->|"Port 3000"| Runner

  Orchestrator -->|"Prisma ORM"| MongoDB
  Orchestrator -->|"JWT Validation"| Auth0
  Orchestrator -->|"K8s API"| Pods
  Orchestrator -->|"HTTP"| InitService

  InitService -->|"S3 Copy"| S3
  InitContainer -->|"S3 Copy"| S3
  DockerHub -->|"Image Pull"| Runner

  Frontend -->|"Auth0 SPA SDK"| Auth0

  classDef external fill:#2d2d2d,stroke:#666,color:#fff;
  classDef client fill:#1a1a2e,stroke:#4a9eff,color:#fff;
  classDef k8s fill:#0d1117,stroke:#3fb950,color:#fff;
  classDef service fill:#161b22,stroke:#58a6ff,color:#fff;

  class Auth0,MongoDB,S3,DockerHub external;
  class Frontend client;
```

## Component Mapping

| Diagram Element | Source Code | Key Files |
|-----------------|-------------|-----------|
| Frontend | `frontend/` | `src/App.tsx`, `src/auth/AuthProvider.tsx` |
| Orchestrator | `orchestrator/` | `src/index.ts`, `prisma/schema.prisma` |
| Init Service | `init-service/` | `src/index.ts`, `src/aws.ts` |
| Runner | `runner/` | `src/index.ts`, `src/ws.ts`, `src/pty.ts`, `Dockerfile` |
| Ingress | `k8s/` | `ingress-controller.yaml` |
| K8s Manifests | `orchestrator/` | `service.yaml`, `service.yaml.example` |
| K8s Secrets | `k8s/` | `runner-secrets.yaml` |

## Network Boundaries

### Public (via Ingress)
- `*.iluvcats.me` → Runner WebSocket (port 3001)
- `*.catclub.tech` → Runner user app (port 3000)
- Frontend (static hosting or dev server)

### Internal (ClusterIP)
- Orchestrator → K8s API server
- Init Service → S3
- InitContainer → S3

### External APIs
- Frontend → Auth0 (OAuth2 PKCE flow)
- Orchestrator → Auth0 (JWT validation)
- Orchestrator → MongoDB Atlas (Prisma)

## Ports & Protocols

| Connection | Protocol | Port |
|------------|----------|------|
| Frontend → Orchestrator | HTTPS / HTTP | 3002 |
| Frontend → Runner (terminal/files) | WSS / WS | 3001 |
| Frontend → Runner (app preview) | HTTPS / HTTP | 3000 |
| Orchestrator → MongoDB | MongoDB protocol | 27017 |
| Init Service → S3 | HTTPS | 443 |
| InitContainer → S3 | HTTPS | 443 |

## Security Notes

- **Auth0 JWT** protects all Orchestrator API routes
- **K8s Secrets** store AWS credentials for runner pods (not hardcoded)
- **IRSA** recommended in production (IAM Roles for Service Accounts)
- **TLS** should be terminated at the Ingress level
- **Network Policies** restrict pod-to-pod communication
- **Resource Limits** should be set on runner pods to prevent abuse