# CollabBoard Architecture Checklist

Based on: Canvas (React-Konva) + Firestore (persistence + real-time sync).

---

## Real-Time Sync Architecture (Firestore-only)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Real-time sync** | Firestore | Objects, presence, cursors—live updates via `onSnapshot` |
| **Persistence** | Firestore | Board metadata, profiles, **periodic snapshots** of canvas state |
| **Auth** | Firebase Auth | Email/password + Google |

**Firestore structure:**
- `boards/{boardId}` — board doc: `title`, `owner_id`, `created_at`, `last_snapshot`
- `boards/{boardId}/objects/{objectId}` — canvas objects (sticky notes, shapes, lines)
- `boards/{boardId}/presence/{userId}` — cursor position, displayName, lastSeen

**Index:** `owner_id` (Asc) + `created_at` (Desc) on `boards`. Requires Admin SDK (FIREBASE_PRIVATE_KEY) for server-side.

**Periodic snapshot:** Client-side job runs every 30s when changes are detected. Reads Firestore `objects` subcollection, POSTs to `/api/boards/[id]/sync`, which writes to `boards/{boardId}.last_snapshot`. On board load: hydrate from Firestore snapshot first, then attach Firestore listeners for live updates.

**Conflict handling:** Last-write-wins per object. Document in README.

---

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile
- **Traffic pattern:** Unpredictable
- **Real-time requirements:** Live updates

### 2. Budget & Cost Ceiling
- **Pay-per-use:** Fixed costs
- **Where will you trade money for time?** Firebase (RTDB + Firestore) for real-time sync and persistence. MVP will be free tier. Can scale to 100k users; Firebase handles infrastructure. Can transition to self-hosted (e.g., Y.js + custom backend) if costs add up.

### 3. Time to Ship
- **MVP timeline?** 24 hours
- **Speed-to-market vs. long-term maintainability priority?** Speed-to-market
- **Iteration cadence after launch?** 2 weeks

### 4. Compliance & Regulatory Needs
- **EU users (GDPR)?** Yes
- **Enterprise clients (SOC 2)?** Yes
- **Data residency requirements?** No

### 5. Team & Skill Constraints
- **Team will maintain, not solo**
- **Languages/frameworks you know well?** TypeScript
- **Learning appetite vs. shipping speed preference?** Shipping speed

---

## Phase 2: Architecture Discovery

### 6. Hosting & Deployment
- **Serverless vs. containers vs. edge vs. VPS?** Serverless (Vercel) for Next.js API routes and static assets. Firebase (Firestore) fully managed—no self-hosting.
- **CI/CD requirements?** GitHub Actions for automated testing and deployment. Deploy previews on PR, auto-deploy to production on merge to main.
- **Scaling characteristics?** Vercel auto-scales serverless functions. Firestore scales automatically. Target: handle 100k users with minimal config changes.

### 7. Authentication & Authorization
- **Auth approach:** Firebase Auth—support social login (Google), magic links, and email/password. SSO for enterprise (SOC 2) can be added post-MVP via Firebase Enterprise or Auth0.
- **RBAC needed?** MVP: owner vs. viewer (board-level). Later: roles (admin, editor, commenter) for enterprise.
- **Multi-tenancy considerations?** Boards are tenant-scoped by `owner_id`. Firestore security rules for board access. Firestore paths keyed by `board_id`—access controlled via rules.

### 8. Database & Data Layer
- **Database type:** Firestore for real-time sync, board metadata, and snapshots (requires Admin SDK with `FIREBASE_PRIVATE_KEY`).
- **Real-time sync, full-text search, vector storage, caching needs?** Real-time sync via Firestore `onSnapshot` on `objects` and `presence` subcollections. Firestore holds board metadata, profiles, and **periodic snapshots** of canvas state. Full-text search: optional—index sticky text in Firestore. Vector storage: for AI features later. Caching: Vercel Edge Cache for static assets.
- **Read/write ratio?** Read-heavy for board loads; write bursts during active collaboration. Firestore absorbs real-time writes; periodic snapshots (e.g., every 30–60s when changes detected) update `last_snapshot`.

### 9. Backend/API Architecture
- **Monolith or microservices?** Monolith for MVP (Next.js API routes). Can split into microservices later if needed (e.g., dedicated AI service).
- **REST vs. GraphQL vs. tRPC vs. gRPC?** REST for MVP (Next.js Route Handlers). tRPC is a good fit for TypeScript end-to-end types if team prefers; can adopt in iteration 2.
- **Background job and queue requirements?** **Periodic snapshot:** Client-side or server-side job writes Firestore `objects` subcollection state → `last_snapshot` every 30–60s when changes detected. Optional: Vercel Cron for backup snapshots. No heavy queue needed for MVP.

### 10. Frontend Framework & Rendering
- **SEO requirements (SSR/static)?** Low—whiteboard is app-like. SSR for initial board load (hydrate from Firestore snapshot, then attach Firestore listeners) and auth pages. Static for marketing/landing if any.
- **Offline support/PWA?** Not for MVP. Firestore requires network. Firestore has built-in offline persistence; consider enabling later for resilience.
- **SPA vs. SSR vs. static vs. hybrid?** Hybrid: Next.js App Router with SSR for first load, client-side React-Konva for canvas. Toolbar, menus, user list are client components.

### 11. Third-Party Integrations
- **External services needed:** Firebase (Firestore + Auth), AI API (OpenAI/Anthropic for /api/ai), optional: analytics (PostHog, Vercel Analytics), error tracking (Sentry).
- **Pricing cliffs and rate limits?** Firebase: free tier → usage-based. Firestore: 1GB storage, 50k reads/20k writes/day free. AI APIs: token-based; implement usage caps.
- **Vendor lock-in risk?** Firestore state is JSON; can migrate to custom sync if needed. Mitigate with abstraction layers (e.g., `getBoardState()` returns plain JSON) so core logic is framework-agnostic.

---

## Phase 3: Post-Stack Refinement

### 12. Security Vulnerabilities
- **Known pitfalls for your stack:**
  - **Konva:** Client-side only; ensure sensitive data isn’t in shape props if logged. XSS via user-generated text in stickies—sanitize/escape.
  - **Firestore:** Validate board IDs; use security rules to restrict read/write by `board_id` and `auth.uid`. Enforce presence shape (cursor, displayName) in `presence` subcollection.
  - **Firestore:** Board metadata and snapshots via Admin SDK (server-side only). Use security rules for `profiles`. Validate `owner_id` and board access.
  - **Next.js API routes:** Rate limit `/api/ai`. Validate Firebase ID tokens for `/api/boards` (GET/POST). Token verification uses Admin SDK when configured, else REST API with `NEXT_PUBLIC_FIREBASE_API_KEY`. Sync route (`/api/boards/[id]/sync`) uses Admin SDK—no auth required.
- **Common misconfigurations:** Exposing Firebase private key client-side; missing `FIREBASE_PRIVATE_KEY` (causes 503); Firestore rules too permissive.
- **Dependency risks:** Audit `react-konva`, `konva`, `firebase` regularly. Pin versions for reproducibility.

### 13. File Structure & Project Organization
- **Standard folder structure for Next.js App Router:**
  ```
  /app
    /api          # Route handlers (auth, ai, webhooks)
    /(auth)       # Login, signup
    /board/[id]   # Board page
    /layout.tsx
  /components
    /canvas       # Stage, Layer, shapes, cursors
    /ui           # Toolbar, menus, user list
  /lib
    /firebase     # Firestore client, admin, auth
    /db           # Firestore queries, boards, profiles
    /utils        # coordinate transforms, etc.
  /types
  ```
- **Monorepo vs. polyrepo?** Polyrepo for MVP. Monorepo (Turborepo) if adding mobile app or shared packages later.
- **Feature/module organization?** Feature-first within `/components` (canvas vs. ui). Co-locate board-specific logic with board route.

### 14. Naming Conventions & Code Style
- **Naming patterns:** camelCase for variables/functions, PascalCase for components. Files: `kebab-case` or `PascalCase` for components. Use `use` prefix for hooks.
- **Linter and formatter configs:** ESLint (Next.js config), Prettier (2 spaces, single quotes). `@typescript-eslint` strict mode. Husky + lint-staged for pre-commit.

### 15. Testing Strategy
- **Unit, integration, e2e tools?** Vitest for unit (utils, coordinate transforms). React Testing Library for component tests. Playwright for e2e (create board, add shape, see it sync). Mock RTDB/Firestore in unit tests.
- **Coverage target for MVP?** 60% for critical paths (auth, board CRUD, coordinate logic). Don’t block ship on coverage.
- **Mocking patterns?** Mock Firestore `onSnapshot`/`setDoc` with in-memory state. Mock Firebase Admin for API route tests.

### 16. Recommended Tooling & DX
- **VS Code extensions:** ESLint, Prettier, Tailwind CSS IntelliSense, Firebase extension.
- **CLI tools:** `create-next-app`, Firebase CLI (`firebase emulators`) or Vercel CLI for local dev. Firebase Console for Firestore inspection.
- **Debugging setup:** React DevTools, Konva DevTools (if exists). Log `stage.getPointerPosition()` and inverse transform during coordinate debugging. Use Firebase Console to verify Firestore sync and periodic snapshot.

---

## Implementation Checklist (24h MVP Path)

| Phase | Task | Est. |
|-------|------|------|
| Auth | Firebase Auth (email/password + Google) | 2 hrs |
| Firestore | Enable Firestore; create `boards` collection; add index `owner_id` + `created_at`; set `FIREBASE_PRIVATE_KEY` in .env | 1 hr |
| Firestore | Add `objects` and `presence` subcollections; deploy `firestore.rules` | 1 hr |
| Canvas | Map RTDB objects → `<Rect>`, `<Circle>`, `<Text>` in Konva Stage | 6 hrs |
| Canvas | Implement infinite pan/zoom (Stage scale + x/y offsets) | — |
| Multiplayer | Firestore presence listeners; cursor components with `onSnapshot` on `presence` | 2 hrs |
| AI | Create `/api/ai` route; pass board state to LLM; LLM tool calls write to RTDB | 4 hrs |
| Periodic Snapshot | Client-side: every 30s when dirty, POST Firestore objects state to `/api/boards/[id]/sync` → Firestore `last_snapshot` | 2 hrs |

---

## Potential Pitfalls (from Presearch)

- **Z-Index:** Render selection box and cursors last in `<Layer>` so they appear on top.
- **Coordinate Systems:** Cursor x,y is window-relative; shapes are Stage-relative. Use `stage.getPointerPosition()` and inverse transform for board coordinates.
- **Database Bloat:** Firestore `objects` subcollection holds live state; `last_snapshot` receives periodic snapshots only (every 30–60s). Do not write every shape move to `last_snapshot`.
