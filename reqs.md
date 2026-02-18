# CollabBoard Architecture Checklist

Based on: Canvas (React-Konva) + **Supabase** (auth, database, board sync) + **Firebase RTDB** (cursors only).

---

## Real-Time Sync Architecture (Supabase + Firebase Hybrid)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Auth** | Supabase Auth | Email/password, Google OAuth, sessions, profiles |
| **Database** | Supabase Postgres | boards, board_objects, profiles |
| **Board real-time** | Supabase Realtime | postgres_changes on board_objects — live canvas sync |
| **Cursors** | Firebase RTDB | Low-latency presence at `boards/{boardId}/presence/{firebaseUid}` |
| **RTDB auth** | Firebase Anonymous Auth | Satisfies `auth != null` in RTDB rules; no billing |

**Supabase structure:**
- `profiles` — id (UUID), display_name, first_name, last_name, avatar_url (FK to auth.users)
- `boards` — id, title, owner_id (UUID), last_snapshot (JSONB), is_public, shared_with
- `board_objects` — id, board_id, type, x, y, z_index, width, height, etc.

**Firebase RTDB structure:**
- `boards/{boardId}/presence/{firebaseUid}` — cursor, displayName, avatarUrl, lastSeen

**Why hybrid?** Supabase Realtime has higher latency for presence than Firebase RTDB. Cursors need sub-100ms updates; board objects can tolerate ~200–500ms. Firebase Anonymous Auth + RTDB are free-tier friendly.

---

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile
- **Traffic pattern:** Unpredictable
- **Real-time requirements:** Live updates for board objects; low-latency cursors

### 2. Budget & Cost Ceiling
- **Pay-per-use:** Fixed costs
- **Where will you trade money for time?** Supabase (auth + Postgres + Realtime) and Firebase RTDB (cursors only). Firebase Anonymous Auth and RTDB are free-tier friendly. Supabase free tier covers MVP. Can scale to 100k users; both handle infrastructure.

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
- **Serverless vs. containers vs. edge vs. VPS?** Serverless (Vercel) for Next.js. Supabase and Firebase fully managed—no self-hosting.
- **CI/CD requirements?** GitHub Actions for automated testing and deployment. Deploy previews on PR, auto-deploy to production on merge to main.
- **Scaling characteristics?** Vercel auto-scales. Supabase and Firebase scale automatically.

### 7. Authentication & Authorization
- **Auth approach:** Supabase Auth—email/password, Google OAuth. Sessions via cookies (createBrowserClient from @supabase/ssr).
- **RBAC needed?** MVP: owner vs. viewer (board-level). Later: roles (admin, editor, commenter) for enterprise.
- **Multi-tenancy:** Boards scoped by owner_id (UUID). Supabase RLS for board access. Firebase RTDB rules for presence (auth != null).

### 8. Database & Data Layer
- **Database type:** Supabase Postgres for boards, board_objects, profiles. Firebase RTDB for presence only.
- **Real-time sync:** Supabase Realtime postgres_changes on board_objects. Firebase RTDB for presence (lower latency).
- **Read/write ratio?** Read-heavy for board loads; write bursts during active collaboration. Supabase handles CRUD; RTDB handles high-frequency cursor updates.

### 9. Backend/API Architecture
- **Monolith or microservices?** Monolith for MVP (Next.js API routes).
- **REST vs. GraphQL vs. tRPC?** REST for MVP (Next.js Route Handlers).
- **Background jobs?** Client-side snapshot sync to Supabase when objects change. No heavy queue for MVP.

### 10. Frontend Framework & Rendering
- **SEO requirements?** Low—whiteboard is app-like. SSR for auth pages; client-side for board.
- **Offline support/PWA?** Not for MVP.
- **SPA vs. SSR vs. hybrid?** Hybrid: Next.js App Router, client-side React-Konva for canvas.

### 11. Third-Party Integrations
- **External services:** Supabase (auth, Postgres, Realtime), Firebase (RTDB + Anonymous Auth), AI API (OpenAI/Anthropic for /api/ai), optional: analytics, error tracking.
- **Pricing cliffs?** Supabase and Firebase free tiers. AI APIs: token-based; implement usage caps.
- **Vendor lock-in?** Supabase data is standard Postgres; RTDB is JSON. Abstraction layers keep core logic framework-agnostic.

---

## Phase 3: Post-Stack Refinement

### 12. Security Vulnerabilities
- **Known pitfalls:**
  - **Konva:** Client-side only; sanitize user-generated text in stickies (XSS).
  - **Supabase:** RLS policies enforce board access. Validate board IDs.
  - **Firebase RTDB:** Rules require `auth != null`; users can only write their own presence path.
  - **Next.js API routes:** Rate limit `/api/ai`. Supabase session for auth.
- **Common misconfigurations:** Exposing service role key; permissive RLS; missing Supabase redirect URLs for OAuth.
- **Dependency risks:** Audit react-konva, konva, supabase, firebase regularly.

### 13. File Structure & Project Organization
```
/app
  /api          # Route handlers (ai, auth callback)
  /auth         # OAuth callback
  /board/[id]   # Board page
/components
  /canvas       # Stage, Layer, shapes, cursors
  /ui           # Toolbar, menus, user list
/lib
  /firebase     # RTDB client, presence, anonymous-auth
  /supabase     # client, middleware, boards, profiles
/types
```

### 14. Naming Conventions & Code Style
- **Naming:** camelCase variables/functions, PascalCase components. `use` prefix for hooks.
- **Linter:** ESLint (Next.js), Prettier. `@typescript-eslint` strict mode. Husky + lint-staged.

### 15. Testing Strategy
- **Unit:** Vitest (utils, hooks). React Testing Library for components. Mock Supabase client for auth; mock `@/lib/firebase/presence` for usePresence.
- **E2E:** Playwright. Supabase test credentials for auth-required flows.
- **Coverage target:** 60% for critical paths.

### 16. Recommended Tooling & DX
- **VS Code:** ESLint, Prettier, Tailwind CSS IntelliSense.
- **CLI:** Firebase CLI (`firebase emulators`) for RTDB + Auth emulator. Supabase CLI for migrations.
- **Debugging:** React DevTools. Supabase Dashboard for Postgres; Firebase Console for RTDB.

---

## Implementation Checklist (24h MVP Path)

| Phase | Task | Est. |
|-------|------|------|
| Auth | Supabase Auth (email/password + Google); middleware for session refresh | 2 hrs |
| Supabase | Run migrations 001, 002; configure Site URL + Redirect URLs for OAuth | 1 hr |
| Firebase | Enable RTDB + Anonymous Auth only; deploy database.rules.json | 1 hr |
| Canvas | Map board_objects → Konva shapes; Supabase Realtime for sync | 6 hrs |
| Canvas | Infinite pan/zoom (Stage scale + x/y offsets) | — |
| Cursors | Firebase RTDB presence; ensureAnonymousAuth on board load; display names from Supabase | 2 hrs |
| AI | Create `/api/ai` route; pass board state to LLM; tool calls write to Supabase | 4 hrs |
| Snapshot | Client-side: seed from last_snapshot on load; sync changes to board_objects | 2 hrs |

---

## Potential Pitfalls

- **Z-Index:** Render selection box and cursors last in `<Layer>` so they appear on top.
- **Coordinate Systems:** Cursor x,y is window-relative; shapes are Stage-relative. Use inverse transform for board coordinates.
- **Anonymous Auth Timing:** Call `signInAnonymously` only when entering a board (presence needed), not on every page load.
- **OAuth Redirect:** Add production URL to Supabase Redirect URLs; set Site URL to production domain.
