# Vidgit Frontend

## Tech Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- State: zustand
- Graph: reactflow + dagre
- Timeline: @xzdarcy/react-timeline-editor
- HTTP: axios

## Local Dev
- Install: `npm i`
- Dev: `npm run dev`
- Lint: `npm run lint`

## Environment Variables
- `NEXT_PUBLIC_API_URL`
  - Default: `http://localhost:8000/api/v1`
  - Used as axios `baseURL` in [api.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api.ts#L1-L8)

## API Layer Overview
### axios instance
- File: [api.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api.ts)
- Token injection: reads `localStorage.getItem("token")` (browser only) and sets `Authorization: Bearer <token>` via request interceptor.

### Typed API wrappers
- `projectApi` (defined in [api.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api.ts#L19-L28))
  - `POST /projects/` → `projectApi.create`
  - `GET /projects/` → `projectApi.getAll`
  - `GET /projects/:id` → `projectApi.get`
  - `GET /projects/:id/graph` → `projectApi.getGraph`
  - `GET /projects/feed` → `projectApi.getFeed`
  - `POST /projects/:id/like` → `projectApi.toggleLike`
  - `POST /projects/:id/fork` → `projectApi.fork` (optional `{ commit_hash }`)
  - `GET /users/:userId/projects` → `projectApi.getUserProjects`
- `userApi` (defined in [api.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/lib/api.ts#L30-L32))
  - `GET /users/:id` → `userApi.get`

### Direct API calls (currently not wrapped)
- `POST /generate/clip` (editor generation trigger)
  - Called in [editor/[id]/page.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/editor/%5Bid%5D/page.tsx#L28-L49)
- `PUT /projects/:id` (persist editor workspace data)
  - Called in [timelineStore.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/store/timelineStore.ts#L77-L88)

## Where APIs Are Used
- Feed + Like + Fork
  - Feed page: [discover/page.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/discover/page.tsx)
  - Like/Fork actions: [ProjectCard.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/components/ProjectCard.tsx)
  - Fork from commit node: [GitGraph.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/components/GitGraph.tsx#L110-L122)
- User profile + projects
  - Profile page: [profile/[id]/page.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/profile/%5Bid%5D/page.tsx)
- Project list + import/fork
  - Projects page: [projects/page.tsx](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/projects/page.tsx)
- Timeline workspace (load/save)
  - Store: [timelineStore.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/store/timelineStore.ts)

## Notes (Current Known Issues / Refactor Targets)
- Route mismatch: UI links to `/editor/new`, but there is no `/editor/new` page; `/editor/[id]` currently calls `parseInt(params.id)` and will produce `NaN` for `"new"`.
  - References: [Home page](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/page.tsx#L32-L45), [Projects page](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/projects/page.tsx#L74-L80), [Editor page](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/frontend/src/app/editor/%5Bid%5D/page.tsx#L21-L26)
- API usage is split between `projectApi/userApi` and direct `api.get/post/put`. The frontend refactor plan aims to unify this.

