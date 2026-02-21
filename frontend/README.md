# Frontend

React SPA for the Syncode cloud IDE — code editing, real-time terminal, file management, and user dashboard.

## Tech Stack

React 18 · TypeScript · Vite 6 · Monaco Editor · xterm.js · Socket.io Client · Auth0 SPA SDK · React Router 6 · Axios · Emotion (CSS-in-JS)

## Project Structure

```
frontend/
├── src/
│   ├── auth/
│   │   ├── AuthProvider.tsx       # Auth0 provider + user sync on login
│   │   └── ProtectedRoute.tsx     # Route guard (redirects to login)
│   ├── components/
│   │   ├── Landing.tsx            # Landing page (public)
│   │   ├── CodingPage.tsx         # Main IDE interface
│   │   ├── Editor.tsx             # Monaco code editor
│   │   ├── Terminal.tsx           # xterm.js terminal
│   │   ├── MultiTerminal.tsx      # Multiple terminal tabs
│   │   ├── Output.tsx             # App preview iframe
│   │   ├── Navbar.tsx             # Navigation bar
│   │   ├── FileTabsBar.tsx        # Open file tabs
│   │   ├── FileOperations.tsx     # File create/rename/delete
│   │   ├── ContextMenu.tsx        # Right-click context menu
│   │   ├── SearchReplace.tsx      # Search & replace in editor
│   │   ├── SplitEditor.tsx        # Split editor view
│   │   ├── StatusBar.tsx          # Bottom status bar
│   │   ├── ConfirmDialog.tsx      # Confirmation modals
│   │   └── external/
│   │       └── editor/            # File tree sidebar components
│   ├── pages/
│   │   ├── Dashboard.tsx          # Project listing + create
│   │   ├── Profile.tsx            # User profile (own + others)
│   │   └── Search.tsx             # User search
│   ├── App.tsx                    # Router with protected routes
│   ├── main.tsx                   # Entry point
│   └── App.css                    # Global styles
├── .env.example                   # Environment template
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | Landing | No | Landing page with login CTA |
| `/dashboard` | Dashboard | Yes | Projects list, create new |
| `/coding` | CodingPage | Yes | IDE (query: `?replId=xxx`) |
| `/profile/:userId?` | Profile | Yes | User profile (own or other) |
| `/search` | Search | Yes | Search users |

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_AUTH0_DOMAIN=dev-xyz.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://syncode-api
VITE_API_URL=http://localhost:3002
```

## Development

```powershell
npm install
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # ESLint
```

## Auth Flow

1. User clicks Login → Auth0 redirect
2. Auth0 authenticates → returns JWT + redirects back
3. `AuthProvider.tsx` syncs user to backend via `POST /verify-user`
4. `ProtectedRoute` gates authenticated-only pages

## WebSocket Connection

The CodingPage connects to the runner pod via Socket.io:

- **Domain**: `{replId}.iluvcats.me` (production) or `localhost:3001` (local)
- **Events**: `fetchDir`, `fetchContent`, `updateContent`, `terminal:write`, `terminal:data`

App preview loads via iframe at `{replId}.catclub.tech` (port 3000).

## Deployment

Build `dist/` and deploy to any static hosting: Vercel, Netlify, AWS S3 + CloudFront, or Nginx.
