# CatelFeed Frontend

Vite + React 19 + TypeScript app configured for production use.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development (port **5174**) |
| `npm run build` | Typecheck + production bundle → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | Oxlint |

## Environment

Copy `.env.example` and adjust:

- `VITE_API_URL` — public API origin for production builds (no trailing slash)
- `VITE_API_PROXY_TARGET` — local API for the Vite `/api` proxy in development
- `VITE_APP_NAME` — product name shown in the UI

Never commit real secrets. Only `VITE_*` values are exposed to the browser.

## Project layout

```
src/
  config/env.ts     # typed env helpers + apiUrl()
  pages/            # route screens
  styles/           # global CSS
  App.tsx           # router shell
  main.tsx          # bootstrap
```

## Path alias

Import with `@/` → `src/`:

```ts
import { env } from "@/config/env";
```
