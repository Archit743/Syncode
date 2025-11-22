# Frontend Service

Web-based IDE interface for the Syncode platform, providing code editing, terminal access, and file management capabilities.

## Overview

The frontend is a React-based single-page application that provides:
- Monaco Editor for code editing with syntax highlighting
- Real-time terminal emulator using xterm.js
- File tree explorer with create/edit/delete operations
- Project creation and environment management
- WebSocket connection to runner pods for real-time interaction

## Technology Stack

- **Framework**: React 18.2
- **Language**: TypeScript
- **Build Tool**: Vite 6.3
- **Styling**: Emotion (CSS-in-JS)
- **Code Editor**: Monaco Editor 4.6
- **Terminal**: xterm.js 5.3 with fit addon
- **HTTP Client**: Axios
- **WebSocket**: Socket.io Client 4.7
- **Routing**: React Router 6.22

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Landing.tsx           # Landing page with project creation
│   │   ├── CodingPage.tsx        # Main IDE interface
│   │   ├── Editor.tsx            # Code editor component
│   │   ├── Terminal.tsx          # Terminal emulator
│   │   ├── Output.tsx            # App preview iframe
│   │   ├── FileTabsBar.tsx       # Open file tabs
│   │   ├── MultiTerminal.tsx     # Multiple terminal support
│   │   ├── ConfirmDialog.tsx     # Confirmation modals
│   │   └── external/
│   │       └── editor/           # File tree and sidebar components
│   ├── App.tsx                   # Main app component with routing
│   ├── main.tsx                  # Entry point
│   └── assets/                   # Static assets
├── public/                       # Public assets
├── index.html                    # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Install Dependencies
```powershell
npm install
```

### Run Development Server
```powershell
npm run dev
```
Starts Vite dev server at `http://localhost:5173` with hot module replacement.

### Build for Production
```powershell
npm run build
```
Outputs optimized production build to `dist/` directory.

### Preview Production Build
```powershell
npm run preview
```

### Lint Code
```powershell
npm run lint
```

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory (optional, for custom endpoints):

```env
VITE_INIT_SERVICE_URL=http://localhost:3001
VITE_ORCHESTRATOR_URL=http://localhost:3002
```

> If not specified, defaults to `http://localhost:3001` and `http://localhost:3002`

## API Integration

### Init Service (Port 3001)
**POST `/project`**
- Creates new project from template
- Request: `{ replId: string, language: string }`

### Orchestrator (Port 3002)
**POST `/start`** - Creates Kubernetes pod
**POST `/stop`** - Deletes Kubernetes pod

### Runner WebSocket
**Connection**: `wss://{replId}.iluvcats.me` or `ws://localhost:3001`

**Events**:
- `fetchDir` - List directory
- `fetchContent` - Read file
- `updateContent` - Write file
- `terminal:write` - Send terminal input

## Deployment

### Build Production Bundle
```powershell
npm run build
```

### Serve Static Files
Deploy the `dist/` directory to:
- Nginx, Apache, Vercel, Netlify, AWS S3 + CloudFront, or any static hosting service

For complete documentation, see the [main README](../README.md) and [QUICKSTART guide](../QUICKSTART.md).

## License

MIT
