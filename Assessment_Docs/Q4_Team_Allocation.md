# Q4: Team task allocation and scheduling. (10 Marks)

**Proposed Model:** Agile/Scrum with 2-week Sprints.
**Team Size:** 4 Members (1 Lead, 1 Frontend, 1 Backend, 1 DevOps).

## Team Roles & Responsibilities

| Role | Count | Responsibilities |
| :--- | :---: | :--- |
| **Tech Lead / Full Stack** | 1 | Architecture decisions, Orchestrator service logic, Code Reviews, Unblocking team. |
| **Frontend Engineer** | 1 | Monaco Editor implementation, File Tree state management, UI/UX polish (React). |
| **Backend Engineer** | 1 | Runner service (FS/PTY), Socket.io logic, Init-service (S3). |
| **DevOps / Cloud Eng** | 1 | Kubernetes cluster setup, Ingress config, Docker optimization, CI/CD pipelines. |

## 6-Week Implementation Schedule (3 Sprints)

### Sprint 1: Foundation (Weeks 1-2)
*   **DevOps:** Setup K8s Cluster, Ingress Controller, and Base Runner Docker Image.
*   **Backend:** Implement `init-service` (S3 Copy) and basic `orchestrator` scaffolding.
*   **Frontend:** Initialize Vite repo, setup Layouts, routing, and mock UI.
*   **Deliverable:** A manual "Hello World" pod running in K8s, accessible via `kubectl`.

### Sprint 2: The Loop (Weeks 3-4)
*   **DevOps:** Automate Pod creation via Orchestrator API permissions.
*   **Backend:** detailed `runner` implementation (PTY + WS). Connect Orchestrator `start` API to K8s.
*   **Frontend:** Integrate Monaco Editor. Implement WebSocket client to stream terminal usage.
*   **Deliverable:** User can start a generic project and type in the terminal.

### Sprint 3: Persistence & Polish (Weeks 5-6)
*   **DevOps:** Resource limits, Auto-scaling policies, Domain SSL setup.
*   **Backend:** File saving logic (Debounced saves to disk). S3 backup logic (optional).
*   **Frontend:** File Tree navigation. Create "New Project" flow. Visual polish.
*   **Deliverable:** Functional MVP.

## Critical Dependencies
1.  **DevOps First:** The backend team cannot test the `orchestrator` effectively until the K8s cluster is reachable.
2.  **API Contract:** Frontend and Backend must agree on Socket event names (`terminal:data` vs `term:out`) by Day 3.
