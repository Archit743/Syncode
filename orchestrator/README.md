# Orchestrator

API server and Kubernetes orchestrator — handles authentication, project/user management, and dynamic pod lifecycle.

## Tech Stack

Node.js · Express 4 · TypeScript · Prisma (MongoDB) · Auth0 JWT (`express-oauth2-jwt-bearer`) · @kubernetes/client-node · AWS SDK · YAML parser · nodemon

## Project Structure

```
orchestrator/
├── src/
│   ├── index.ts             # Express server + all API routes
│   └── aws.ts               # AWS S3 configuration
├── prisma/
│   └── schema.prisma        # User, Project, ProjectCollaborator models
├── service.yaml             # K8s manifest template (not in git)
├── service.yaml.example     # Example manifest with placeholders
├── .env.example             # Environment template
├── tsconfig.json
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=3002
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/syncode?retryWrites=true&w=majority"
AUTH0_AUDIENCE="https://syncode-api"
AUTH0_ISSUER_BASE_URL="https://dev-xyz.us.auth0.com/"
```

## Development

```powershell
npm install
npx prisma generate    # Generate Prisma client (required after schema changes)
npm run dev            # Dev server on port 3002 with nodemon
npm run build          # Compile TypeScript to dist/
npm run start          # Run compiled JS
```

## Database Schema

```
User
├── id, auth0Id, email, name, username, bio, website, avatarUrl
├── projects[]              → owned projects
└── sharedProjects[]        → ProjectCollaborator entries

Project
├── id, name, replId, language, visibility, forkedFromReplId
├── userId                  → owner
└── collaborators[]         → ProjectCollaborator entries

ProjectCollaborator
├── projectId, userId
└── unique constraint on [projectId, userId]
```

## API Reference

All routes (except `/stop`) require Auth0 JWT in `Authorization: Bearer <token>` header.

### Authentication

#### `POST /verify-user`
Sync Auth0 profile to MongoDB. Called automatically by frontend after login.

**Body:** `{ email, name, picture }`
**Returns:** User object (created or existing)

---

### Projects

#### `GET /projects`
List all projects the authenticated user owns or collaborates on.

**Returns:** Array of projects with `accessRole: "owner" | "collaborator"`, sorted by creation date.

#### `POST /projects`
Create a new project. Triggers Init Service S3 copy and K8s pod creation.

**Body:** `{ replId, language, name }`
**Returns:** `{ message, project }` — `200` if pod is ready, `503` if pod created but not yet ready.

#### `DELETE /projects/:replId`
Delete a project. Removes from MongoDB, deletes S3 folder, deletes K8s resources. Owner-only.

#### `POST /projects/:replId/fork`
Fork a project. Copies S3 code to new replId and creates a new Project record.

**Body:** `{ newReplId? }` (optional, auto-generated if omitted)
**Returns:** Forked project object.

#### `GET /projects/:replId/access`
Check if the current user has access to a project (owner or collaborator).

**Returns:** Project with relations, or `403`.

#### `PATCH /projects/:replId/visibility`
Toggle project visibility. Owner-only.

**Body:** `{ visibility: "public" | "private" }`

---

### Collaboration

#### `POST /projects/:replId/collaborators`
Add a collaborator by email. Owner-only.

**Body:** `{ email }`
**Returns:** Updated project with collaborator list.

#### `DELETE /projects/:replId/collaborators/:userId`
Remove a collaborator. Owner-only.

**Returns:** Updated project.

---

### Kubernetes Lifecycle

#### `POST /start`
Start a K8s pod for a project. Creates Deployment, Service, and Ingress from `service.yaml` template.

**Body:** `{ replId }`
**Returns:** `{ message, podReady: boolean }`

#### `POST /stop`
Stop and delete K8s resources (Deployment, Service, Ingress). Does **not** require auth.

**Body:** `{ replId }`
**Returns:** `{ message, results: { deployment, service, ingress } }`

---

### Users

#### `GET /users/search?q=<query>`
Search users by name, email, or username. Returns up to 20 results.

#### `GET /users/:id`
Get a user's public profile (id, name, username, bio, website, avatarUrl).

#### `GET /users/:id/projects`
Get a user's public projects. If the requester is the same user, returns all projects.

---

### Profile

#### `GET /me/profile`
Get the authenticated user's own profile.

#### `PATCH /me/profile`
Update own profile fields.

**Body:** `{ name?, username?, bio?, website? }`
**Returns:** Updated user. Username uniqueness is enforced.

---

## Kubernetes Manifest

Copy `service.yaml.example` to `service.yaml` and configure:

- Replace `YOUR-BUCKET` with your S3 bucket name
- Replace `your-dockerhub-username/runner:latest` with your runner image
- Replace domain references with your domains
- Use Kubernetes Secrets for AWS credentials in production

The orchestrator replaces all `service_name` occurrences with the actual `replId` at runtime.

## How It Works

### Start Flow
1. Frontend sends `POST /projects` or `POST /start`
2. Orchestrator reads `service.yaml`, replaces `service_name` with `replId`
3. Creates Deployment (initContainer copies S3 code + runner container), Service (ports 3000/3001), Ingress
4. Waits for pod readiness (polls for up to ~60s)

### Stop Flow
1. Frontend sends `POST /stop`
2. Orchestrator deletes Deployment, Service, Ingress via K8s API
3. Returns deletion results (tolerates 404s for already-deleted resources)
