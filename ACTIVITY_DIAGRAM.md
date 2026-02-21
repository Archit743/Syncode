# Syncode — Activity Diagram

## Swimlanes

1. **User** — person using the IDE
2. **Frontend** — React SPA with Auth0
3. **Auth0** — identity provider
4. **Orchestrator** — API server (Port 3002)
5. **Init Service** — S3 template copier (Port 3001)
6. **Runner Pod** — coding environment + WebSocket

---

## 1. Authentication

**User:**
- Visit landing page → Click "Log In"

**Frontend:**
- Redirect to Auth0 login page

**Auth0:**
- User authenticates (email/password or social)
- Return JWT access token + redirect to frontend

**Frontend:**
- Receive token → POST `/verify-user` to Orchestrator with `{ email, name, picture }`

**Orchestrator:**
- Find or create User in MongoDB
- Return user profile

**Frontend:**
- Navigate to Dashboard

---

## 2. Project Creation

**User:**
- On Dashboard → Enter project name, select language → Click "Create"

**Frontend:**
- POST `/projects` to Orchestrator `{ replId, language, name }`

**Orchestrator:**
- Validate JWT auth
- Create Project record in MongoDB (linked to User)
- Call Init Service to copy S3 template
- Create K8s Deployment, Service, Ingress
- Wait for pod to be ready
- Return project data

**Init Service:**
- Copy S3 template `base/{language}` → `code/{replId}`

**Runner Pod:**
- initContainer copies files from S3 → `/workspace`
- Main container starts WebSocket server (port 3001)

**Frontend:**
- Navigate to `/coding?replId={replId}`

---

## 3. Coding Session

**Frontend:**
- Connect WebSocket to `{replId}.iluvcats.me`
- Emit `requestTerminal`

**Runner Pod:**
- Create PTY terminal (bash/sh)
- Load file tree from `/workspace`
- Send file structure to Frontend

**Frontend:**
- Render IDE: file tree + editor + terminal + preview

**Active Coding Loop (parallel operations):**
- **File Edit:** User edits → Frontend sends `updateContent` → Runner saves to disk
- **Terminal:** User types → `terminal:write` → Runner executes → `terminal:data` streams back
- **Preview:** Frontend loads app preview iframe via `{replId}.catclub.tech`

---

## 4. Collaboration (Optional)

**User:**
- Open project settings → Enter collaborator email

**Frontend:**
- POST `/projects/:replId/collaborators` `{ email }`

**Orchestrator:**
- Look up user by email in MongoDB
- Create ProjectCollaborator record
- Return updated project

---

## 5. Fork Project (Optional)

**User:**
- View a public project → Click "Fork"

**Frontend:**
- POST `/projects/:replId/fork`

**Orchestrator:**
- Copy S3 folder `code/{sourceReplId}` → `code/{newReplId}`
- Create new Project record with `forkedFromReplId`
- Return forked project

---

## 6. Stop Environment

**User:**
- Click "Stop" button → Confirm

**Frontend:**
- POST `/stop` `{ replId }`

**Orchestrator:**
- Delete K8s Deployment, Service, Ingress
- Return cleanup results

**Frontend:**
- Navigate to Dashboard

---

## Simplified Flow

```
[Auth0 Login] → Verify User → Dashboard
       ↓
  Create Project → Copy Template (S3) → Boot K8s Pod (FORK)
       ↓
  Connect WebSocket → Load Files → Active Coding (LOOP)
       ↓
  Stop → Delete K8s Resources → Dashboard
```

## Decision Points

1. **User authenticated?** → Required for all actions after landing page
2. **Has project access?** → Owner or collaborator check
3. **User confirms stop?** → Confirmation dialog before deletion
