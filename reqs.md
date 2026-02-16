# CollabBoard Architecture Checklist

Based on the Gold Standard stack: Canvas (React-Konva) + CRDTs (Liveblocks) + Postgres.

---

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile
- **Traffic pattern:** Unpredictable
- **Real-time requirements:** Live updates

### 2. Budget & Cost Ceiling
- **Pay-per-use:** Fixed costs
- **Where will you trade money for time?** Liveblocks to save dev time and handle conflict resolution. MVP will be free, but we want to be able to scale up to 100k users without a major re-architecture. We are willing to pay for a managed service that can handle this scale without needing to worry about infrastructure management. Can transition to in-house if costs add up.

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
- **Serverless vs. containers vs. edge vs. VPS?** Serverless (Vercel) for Next.js API routes and static assets. Supabase or Vercel Postgres for managed database. Liveblocks is fully managed—no self-hosting.
- **CI/CD requirements?** GitHub Actions for automated testing and deployment. Deploy previews on PR, auto-deploy to production on merge to main.
- **Scaling characteristics?** Vercel auto-scales serverless functions. Liveblocks handles real-time scaling. Postgres via Supabase/Vercel scales with connection pooling (e.g., PgBouncer). Target: handle 100k users with minimal config changes.

### 7. Authentication & Authorization
- **Auth approach:** Supabase Auth or NextAuth—support social login (Google, GitHub), magic links, and email/password for flexibility. SSO for enterprise (SOC 2) can be added post-MVP via Supabase Enterprise or Auth0.
- **RBAC needed?** MVP: owner vs. viewer (board-level). Later: roles (admin, editor, commenter) for enterprise.
- **Multi-tenancy considerations?** Boards are tenant-scoped by `owner_id`. Row-level security (RLS) in Postgres for board access. Liveblocks rooms keyed by `board_id`—access controlled at room-join level.

### 8. Database & Data Layer
- **Database type:** Relational (Supabase Postgres)
- **Real-time sync, full-text search, vector storage, caching needs?** Real-time sync via Liveblocks (CRDT), not Postgres. Postgres holds snapshots and metadata. Full-text search: optional—index `board_elements.data` (JSONB) for searchable sticky text. Vector storage: for AI features later. Caching: Vercel Edge Cache for static assets; consider Redis for session/rate limiting at scale.
- **Read/write ratio?** Read-heavy for board loads; write bursts during active collaboration. Liveblocks absorbs real-time writes; Postgres writes are debounced (every 30s or on session end).

### 9. Backend/API Architecture
- **Monolith or microservices?** Monolith for MVP (Next.js API routes). Can split into microservices later if needed (e.g., dedicated AI service).
- **REST vs. GraphQL vs. tRPC vs. gRPC?** REST for MVP (Next.js Route Handlers). tRPC is a good fit for TypeScript end-to-end types if team prefers; can adopt in iteration 2.
- **Background job and queue requirements?** Webhook handlers for Liveblocks → Postgres sync (room.storage.updated). Optional: Vercel Cron or Inngest for periodic snapshot backups, cleanup jobs. No heavy queue needed for MVP.

### 10. Frontend Framework & Rendering
- **SEO requirements (SSR/static)?** Low—whiteboard is app-like. SSR for initial board load (hydrate with Liveblocks state) and auth pages. Static for marketing/landing if any.
- **Offline support/PWA?** Not for MVP. Liveblocks requires network. Consider offline queue + sync later for enterprise.
- **SPA vs. SSR vs. static vs. hybrid?** Hybrid: Next.js App Router with SSR for first load, client-side React-Konva for canvas. Toolbar, menus, user list are client components.

### 11. Third-Party Integrations
- **External services needed:** Liveblocks (real-time), Supabase or Vercel (auth + Postgres), AI API (OpenAI/Anthropic for /api/ai), optional: analytics (PostHog, Vercel Analytics), error tracking (Sentry).
- **Pricing cliffs and rate limits?** Liveblocks: free tier → paid at scale. AI APIs: token-based; implement usage caps. Supabase: free tier, then usage-based. Monitor webhook volume for Liveblocks.
- **Vendor lock-in risk?** Liveblocks: CRDT state is portable; can migrate to Yjs or custom sync if needed. Supabase: Postgres is standard. Mitigate with abstraction layers (e.g., `getBoardState()` returns plain JSON) so core logic is framework-agnostic.

---

## Phase 3: Post-Stack Refinement

### 12. Security Vulnerabilities
- **Known pitfalls for your stack:**
  - **Konva:** Client-side only; ensure sensitive data isn’t in shape props if logged. XSS via user-generated text in stickies—sanitize/escape.
  - **Liveblocks:** Validate room IDs; don’t allow arbitrary room creation. Use `liveblocks.config.ts` to enforce storage schema and presence shape.
  - **Postgres:** SQL injection—use parameterized queries (Supabase client handles this). RLS must be correctly configured.
  - **Next.js API routes:** Rate limit `/api/ai` and webhook endpoints. Validate webhook signatures (Liveblocks signs payloads).
- **Common misconfigurations:** Exposing Liveblocks secret key client-side; missing CORS on API routes; RLS policies too permissive.
- **Dependency risks:** Audit `react-konva`, `konva`, `liveblocks` regularly. Pin versions for reproducibility.

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
    /liveblocks   # liveblocks.config.ts, hooks
    /db           # Supabase client, queries
    /utils        # coordinate transforms, etc.
  /types
  ```
- **Monorepo vs. polyrepo?** Polyrepo for MVP. Monorepo (Turborepo) if adding mobile app or shared packages later.
- **Feature/module organization?** Feature-first within `/components` (canvas vs. ui). Co-locate board-specific logic with board route.

### 14. Naming Conventions & Code Style
- **Naming patterns:** camelCase for variables/functions, PascalCase for components. Files: `kebab-case` or `PascalCase` for components. Use `use` prefix for hooks.
- **Linter and formatter configs:** ESLint (Next.js config), Prettier (2 spaces, single quotes). `@typescript-eslint` strict mode. Husky + lint-staged for pre-commit.

### 15. Testing Strategy
- **Unit, integration, e2e tools?** Vitest for unit (utils, coordinate transforms). React Testing Library for component tests. Playwright for e2e (create board, add shape, see it sync). Mock Liveblocks in unit tests.
- **Coverage target for MVP?** 60% for critical paths (auth, board CRUD, coordinate logic). Don’t block ship on coverage.
- **Mocking patterns?** Mock `useStorage`, `useMutation` with in-memory state. Use Liveblocks’ test utilities if available. Mock Supabase client for API route tests.

### 16. Recommended Tooling & DX
- **VS Code extensions:** ESLint, Prettier, Tailwind CSS IntelliSense, Prisma or Supabase extension (if using), Liveblocks (if available).
- **CLI tools:** `create-next-app`, `npx supabase` or Vercel CLI for local dev. Liveblocks dashboard for room inspection.
- **Debugging setup:** React DevTools, Konva DevTools (if exists). Log `stage.getPointerPosition()` and inverse transform during coordinate debugging. Use `console.log` in webhook handler to verify Postgres sync.

---

## Implementation Checklist (24h MVP Path)

| Phase | Task | Est. |
|-------|------|------|
| Auth | Set up NextAuth or Supabase Auth | 2 hrs |
| Liveblocks | Define Presence and Storage types in `liveblocks.config.ts` | 1 hr |
| Canvas | Map Liveblocks storage → `<Rect>`, `<Circle>`, `<Text>` in Konva Stage | 6 hrs |
| Canvas | Implement infinite pan/zoom (Stage scale + x/y offsets) | — |
| Multiplayer | Use `useOthers()` for avatars and cursor components | 2 hrs |
| AI | Create `/api/ai` route; pass board state to LLM; LLM tool calls update Liveblocks | 4 hrs |
| Postgres Sync | Debounced update to Postgres every 30s when changes detected | 2 hrs |

---

## Potential Pitfalls (from Presearch)

- **Z-Index:** Render selection box and cursors last in `<Layer>` so they appear on top.
- **Coordinate Systems:** Cursor x,y is window-relative; shapes are Stage-relative. Use `stage.getPointerPosition()` and inverse transform for board coordinates.
- **Database Bloat:** Don’t store every shape move in Postgres. Sync only on Save or auto-save intervals.
