# Vidgit Frontend

## Tech Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Server-state: @tanstack/react-query
- Client-state: zustand
- Graph: reactflow + dagre
- Timeline: @xzdarcy/react-timeline-editor
- HTTP: axios
- Unit tests: Vitest + Testing Library
- E2E: Playwright

## Local Dev
- Install: `npm i`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Quality gate: `npm run check`

Notes:
- The frontend expects the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- In dev, the Next.js server proxies `/api/v1/*` to `NEXT_PUBLIC_API_URL` (fallback: `http://localhost:8000/api/v1`).
- For a full local dev stack, start infra with `docker-compose up -d`, then run backend + worker, then run `npm run dev`.

## Environment Variables
- `NEXT_PUBLIC_API_URL`
  - Default: `http://localhost:8000/api/v1`
  - Used as axios `baseURL` in [client.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/client.ts#L6-L11)

## Project Structure
- Routes: `src/app/` (App Router)
  - Route groups: `(app)` (standard pages) and `(editor)` (fullscreen editor)
- UI components: `src/components/`
  - Reusable primitives: `src/components/ui/`
  - Editor modules: `src/components/editor/`
- API + types: `src/lib/api/`
- Query hooks (React Query): `src/lib/queries/`
- Local editor state: `src/store/`

## API Layer
- axios instance + interceptors: [client.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/client.ts)
  - Attaches `Authorization: Bearer <token>` from `localStorage`
  - Normalizes errors into `ApiError`
- Domain APIs: `src/lib/api/domains/*`
  - Auth: [auth.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/domains/auth.ts)
  - Projects: [project.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/domains/project.ts)
  - Users: [user.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/domains/user.ts)
  - Tasks (Celery polling): [tasks.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/domains/tasks.ts)
- Query keys: [queryKeys.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/queryKeys.ts)

## Auth & Route Guard
- Token storage: [auth.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api/auth.ts)
- Guard component: [AuthGuard.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/components/auth/AuthGuard.tsx)
  - Protects `/projects` and `/editor/*`
  - Redirects to `/login?next=...` and returns to `next` after login

## Scripts
- `npm run check`: lint + typecheck(build) + unit + e2e
- `npm run test:unit`: Vitest
- `npm run test:e2e`: Playwright
- `npm run format` / `npm run format:check`: Prettier

## Conventions
- Use Server Components by default; introduce Client Components only for real interaction/state.
- Use React Query for server-state (fetching/caching/invalidation) and zustand for local editor timeline state.
