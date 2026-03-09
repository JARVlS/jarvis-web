# Jarvis Frontend

## Environment

Copy `.env.example` to `.env` (or set environment variables in Docker):

- `VITE_API_BASE` defaults to:
- `/api` during local development
- `/jarvis/api` for production builds

Only variables prefixed with `VITE_` are exposed to the browser. Do not place secrets in frontend env files.

## Scripts

- `npm run dev` runs Vite development server
- `npm run build` builds production assets
- `npm run start` serves the production build on `0.0.0.0:4173`

## Nginx Notes

Set Vite base to `/jarvis/` (already configured in `vite.config.ts`) and ensure your reverse proxy serves:

- `/jarvis/` to frontend container
- `/jarvis/api/` to backend container

If you add Vue Router HTML5 history routes later, configure fallback to `index.html` for `/jarvis/*` so direct navigation to nested routes works.
