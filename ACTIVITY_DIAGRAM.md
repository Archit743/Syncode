# SYNCODE - CLOUD IDE PLATFORM - ACTIVITY DIAGRAM (SIMPLIFIED)

## TEXTUAL DESCRIPTION FOR DIAGRAM CREATION

---

## SWIMLANES (Actors/Systems):
1. **User** - The person using the IDE
2. **Frontend** - React application
3. **Init-Service** - Project setup (Port 3001)
4. **Orchestrator** - K8s manager (Port 3002)
5. **Runner Pod** - Coding environment + WebSocket

---

## MAIN WORKFLOW:

**Start:** User on Landing Page

### 1. PROJECT CREATION

**User Swimlane:**
- Action: Enter Project ID and select Language
- Action: Click "Create Project"

**Frontend Swimlane:**
- Action: POST to Init-Service `/project` { replId, language }

**Init-Service Swimlane:**
- Decision: "replId valid?"
  - NO → Error 400
  - YES → Copy S3 template `base/{language}` → `code/{replId}`
- Action: Return "Project created"

**Frontend Swimlane:**
- Action: Navigate to `/coding?replId={replId}`

---

### 2. ENVIRONMENT SETUP

**Frontend Swimlane:**
- Action: POST to Orchestrator `/start` { replId }

**Orchestrator Swimlane:**
- Action: Read and parse service.yaml
- **Fork:** Create K8s resources in parallel
  - Create Deployment (with init container for S3 copy)
  - Create Service (ports 3000, 3001)
  - Create Ingress (routes to domains)
- **Join:** All resources created
- Action: Return success

**Runner Pod:**
- Action: Init container copies files from S3 → /workspace
- Action: Main container starts WebSocket server (port 3001)

---

### 3. CONNECT & CODE

**Frontend Swimlane:**
- Action: Connect WebSocket to `{replId}.iluvcats.me`
- Action: Emit "requestTerminal"

**Runner Pod Swimlane:**
- Action: Create PTY terminal
- Action: Load file tree from /workspace
- Action: Send file structure to Frontend

**Frontend Swimlane:**
- Action: Render Editor with file tree and terminal

**[Active Coding Loop - Parallel Operations]:**
- **File Edit:** User edits → Frontend sends updates → Runner saves to disk → Backup to S3
- **Terminal:** User types commands → Runner executes → Output streams back
- **Preview:** Frontend loads app preview via iframe

---

### 4. STOP ENVIRONMENT

**User Swimlane:**
- Action: Click "Stop" button
- Decision: "Confirm stop?"
  - NO → Return to coding
  - YES → Continue

**Frontend Swimlane:**
- Action: POST to Orchestrator `/stop` { replId }

**Orchestrator Swimlane:**
- **Fork:** Delete K8s resources in parallel
  - Delete Deployment
  - Delete Service
  - Delete Ingress
- **Join:** All deleted
- Action: Return success

**Frontend Swimlane:**
- Action: Navigate to Landing Page

**End:** User back on Landing Page

---

## KEY DECISION POINTS:
1. **Is replId valid?** (Init-Service validation)
2. **Resource exists?** (Skip if already created)
3. **User confirms stop?** (Confirmation dialog)

---

## PARALLEL FLOWS:
1. **K8s Resource Creation:** Deployment + Service + Ingress created simultaneously
2. **Active Coding:** File operations, terminal commands, and preview happen concurrently
3. **Resource Deletion:** All K8s resources deleted in parallel

---

## DIAGRAM ELEMENTS:

**Shapes:**
- **Rounded Rectangle** = Action/Activity
- **Diamond** = Decision point
- **Thick Bar** = Fork/Join (parallel flows)
- **Circle** = Start/End node

**Arrows:**
- **Solid Arrow** = Normal flow
- **Dashed Arrow** = Async operation

**Layout:**
- 5 vertical swimlanes (User | Frontend | Init-Service | Orchestrator | Runner Pod)
- Top to bottom flow
- Color each phase differently

---

## SIMPLIFIED FLOW DIAGRAM:

```
[START] → Enter Project Details → Create Project → Copy Template (S3)
           ↓
       Navigate to Editor → Boot Environment → Create K8s Resources (FORK)
           ↓
       Connect WebSocket → Load Files → Active Coding (LOOP)
           ↓
       Stop Button → Confirm? → Delete Resources (FORK) → [END]
```

This simplified version focuses on the essential workflow without overwhelming detail!
