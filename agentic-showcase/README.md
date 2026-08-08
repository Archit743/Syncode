# Syncode Agentic IDE Showcase

This is an isolated local prototype for testing Syncode's agentic IDE workflow. It serves as a testbed for the core agentic capabilities—multi-agent orchestration, code patching, terminal execution, and a premium React UI—without the overhead of AWS, Auth0, Kubernetes, S3, or wildcard domains.

## Architecture Overview

The showcase is split into two main components:

### 1. Frontend (`/frontend`)
A premium React + Vite application featuring:
* **Tailwind v4** for styling with a custom dark theme (`--bg`, `--panel`, `--accent`).
* **Monaco Editor** for syntax highlighting, multi-tab support, and inline diff viewing.
* **xterm.js** for a fully functional WebSocket-driven terminal.
* **react-resizable-panels** for adjustable layout panes (File Tree, Editor, Agent Panel, Terminal).
* **SSE Parser** (`eventsource-parser`) to consume real-time streaming updates from the backend agent swarm.

### 2. Backend (`/backend`)
A FastAPI + LangGraph service orchestrating the agent swarm:
* **FastAPI** for standard REST routes (files, sessions, actions) and WebSocket routes (terminal).
* **LangGraph** for stateful multi-agent orchestration. The swarm consists of:
  * **Planner**: Analyzes the request and decides the next step.
  * **Context**: Gathers information from the codebase.
  * **Coder**: Generates code patches.
  * **Reviewer**: Reviews proposed changes before user approval.
* **SQLModel (SQLite)** for persisting agent sessions, chat history, and pending actions (`agent_sessions.db`).
* **Server-Sent Events (SSE)** for streaming execution steps, status updates, and tokens directly to the frontend.

## Getting Started

### One-command Startup

From the repository root, run the included PowerShell script which starts both the backend and frontend servers automatically:

```powershell
.\start-dev.ps1
```

Once started, open `http://localhost:5173` in your browser.

### Manual Startup

If you prefer to start them separately:

**Terminal 1 (Backend):**
```powershell
cd backend
pip install -e .
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm install
npm run dev
```

## LLM Providers and Configuration

The backend is configured via `backend/.env`.

By default, the `LLM_PROVIDER` is set to `mock`, which allows you to test the UI flow and architecture without any API keys. The mock provider simulates realistic agent delays, streaming tokens, and file patches.

To use real models, update `backend/.env`:

```env
LLM_PROVIDER=groq
# Supports comma-separated keys for round-robin rotation (useful for rate limits)
GROQ_API_KEYS=gsk_xxx,gsk_yyy

GROQ_MODEL_PLANNER=llama-3.1-8b-instant
GROQ_MODEL_CODER=llama-3.3-70b-versatile
```

Supported providers: `mock`, `groq`, `openai`, `ollama`.

## Testing the Workflow

1. Select a workspace from the top-right dropdown (e.g., `Node.js`).
2. Select a file in the file tree on the left.
3. Chat with the agent in the right panel: _"Explain this file"_.
4. Ask for a code change: _"Add a small agent status function"_.
5. Observe the agent swarm timeline as the **Planner**, **Context**, and **Coder** nodes execute.
6. When the agent proposes a patch, an **Action Card** will appear. Click `View Diff` to open the Monaco Diff Editor.
7. Click `Reject` to cancel the change, or `Approve` to apply it to the file.
8. Open the Terminal panel (using the toggle button in the top bar) and run your code (e.g., `node index.js`).
9. Use the `Reset` button in the top bar to revert the workspace to its original state.

## Safety Boundaries

* File access is strictly restricted to the `workspace/` directory.
* Terminal commands are executed in a subprocess that is sandboxed to the active project's workspace directory.

## Integration Path

Once verified locally, this implementation can be ported to the main Syncode repository by:
1. Moving the React components into the main Next.js/React frontend behind a feature flag (`VITE_AGENT_ENABLED`).
2. Moving the FastAPI routes into the main Orchestrator service behind Auth0 authentication.
3. Replacing local filesystem operations with the remote runner/S3/snapshot-aware tools used in production.
