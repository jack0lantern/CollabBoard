# CollabBoard Architecture

This document explains the key architectural choices for CollabBoard and the rationale behind them.

---

## Overview

CollabBoard is a real-time collaborative whiteboard. Users sign in, create boards, and collaborate with others who see live cursor positions and canvas updates. The architecture uses a **hybrid stack**: Supabase for auth and persistence, Firebase Realtime Database (RTDB) for low-latency cursor sync.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CollabBoard                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js (App Router)  │  React-Konva  │  Tailwind CSS           │
├─────────────────────────────────────────────────────────────────┤
│  Auth & Sessions      │  Supabase Auth (email/password, Google)  │
│  Board Data           │  Supabase Postgres (boards, objects)     │
│  Board Real-time      │  Supabase Realtime (postgres_changes)    │
│  Cursors              │  Firebase RTDB (presence)               │
│  RTDB Access          │  Firebase Anonymous Auth                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Choices

### 1. Supabase for Auth and Database

**Choice:** Use Supabase Auth and Supabase Postgres for user identity, profiles, boards, and board objects.

**Why:**
- **Single source of truth for identity.** User IDs are UUIDs from `auth.users`; profiles and boards reference them via foreign keys. RLS policies enforce access control at the database level.
- **Cookie-based sessions.** Supabase SSR client (`createBrowserClient`) manages sessions via cookies. No need to pass tokens manually; middleware refreshes sessions on each request.
- **Postgres for structured data.** Boards, board_objects, and profiles have clear schemas. Postgres supports JSONB for flexible fields (e.g., `last_snapshot`, `shared_with`) while keeping strong typing where it matters.
- **Built-in Realtime.** Supabase Realtime subscribes to `postgres_changes` on `board_objects`. When one user adds or edits a shape, others see it within a few hundred milliseconds. No custom WebSocket infrastructure.

**Alternatives considered:**
- **Firebase Auth + Firestore:** Would require syncing user data to Supabase or using Firebase as the primary auth provider. Adds complexity and potential billing for Firestore.
- **Auth0 / Clerk:** Additional cost and vendor. Supabase Auth covers email/password and Google OAuth for MVP.

---

### 2. Firebase RTDB for Cursors Only

**Choice:** Use Firebase Realtime Database exclusively for cursor/presence data. Do not use Firebase for auth, board data, or object sync.

**Why:**
- **Lower latency than Supabase Realtime Presence.** Cursor position updates fire many times per second (e.g., on mouse move). Supabase Realtime is optimized for Postgres change streams, not high-frequency ephemeral data. Firebase RTDB is WebSocket-native and tuned for real-time presence.
- **Free-tier friendly.** RTDB and Firebase Anonymous Auth are included in the free tier. No billing required for cursor sync.
- **Simple security model.** RTDB rules require `auth != null` and restrict writes to `auth.uid === $userId`. Anonymous Auth satisfies `auth != null` without requiring users to sign in to Firebase.
- **Separation of concerns.** Cursors are ephemeral; they don’t need to persist. Board objects do. Keeping them in different systems matches their lifecycle.

**Data flow:**
1. User signs in with **Supabase** → gets profile (display_name, avatar_url).
2. User opens a board → app calls `signInAnonymously()` on Firebase (if not already signed in).
3. Presence is written to `boards/{boardId}/presence/{firebaseUid}` with `{ displayName, avatarUrl, cursor, lastSeen }` — display info comes from Supabase, key is Firebase anonymous UID.
4. Other clients read presence and render cursors with correct names/avatars.

**Alternatives considered:**
- **Supabase Realtime Presence:** Higher latency; less suitable for cursor updates.
- **Custom WebSocket server:** More infrastructure to build and maintain.
- **Y.js / CRDT for presence:** Overkill for cursor position; RTDB is simpler.

---

### 3. Firebase Anonymous Auth for RTDB Access

**Choice:** Use Firebase Anonymous Auth only to satisfy RTDB security rules. Do not use Firebase for user sign-in (email/password or Google).

**Why:**
- **RTDB rules require `auth != null`.** Anonymous Auth provides a valid Firebase UID without requiring the user to create a Firebase account.
- **No billing.** Anonymous Auth is free. We don’t need Firebase’s email/password or Google providers.
- **Scoped to board usage.** We only call `signInAnonymously` when the user opens a board (when presence is needed). We don’t sign in anonymously on login or dashboard pages.
- **Display names from Supabase.** The presence payload includes `displayName` and `avatarUrl` from the Supabase session/profile. The Firebase UID is just the presence key; it doesn’t carry user identity.

---

### 4. Supabase Realtime for Board Objects

**Choice:** Use Supabase Realtime `postgres_changes` to sync board_objects (shapes, stickies, lines) across clients.

**Why:**
- **Single database.** Board objects live in Postgres; Realtime streams changes from the same source. No sync layer between databases.
- **Adequate latency.** Canvas object updates (add, move, resize) don’t need sub-50ms latency. A few hundred milliseconds is acceptable and matches user expectations.
- **Consistency with RLS.** Realtime respects RLS. Users only receive changes for boards they can access.
- **Simpler than custom sync.** No need to build conflict resolution for board objects at MVP. Last-write-wins per object is acceptable.

---

### 5. Next.js App Router + Client Components for Board

**Choice:** Use Next.js App Router. Board page and canvas are client components; auth pages can be server-rendered.

**Why:**
- **Canvas is inherently client-side.** React-Konva and pointer events require the browser. The board page loads, then hydrates the canvas and attaches real-time subscriptions.
- **Middleware for auth.** Supabase middleware refreshes the session on each request. Protected routes can redirect unauthenticated users before the page renders.
- **API routes for server logic.** AI and other server-side logic live in Route Handlers. No need for a separate backend.

---

## Data Model Summary

| Entity | Storage | Key Fields |
|--------|---------|------------|
| **profiles** | Supabase Postgres | id (UUID), display_name, first_name, last_name, avatar_url |
| **boards** | Supabase Postgres | id, title, owner_id, last_snapshot, is_public, shared_with |
| **board_objects** | Supabase Postgres | id, board_id, type, x, y, z_index, width, height, etc. |
| **presence** | Firebase RTDB | boards/{boardId}/presence/{firebaseUid} → cursor, displayName, avatarUrl, lastSeen |

---

## Security Model

- **Supabase RLS:** Users can read/update their own profile. Board access is enforced by `has_board_access()` (owner, public, or shared_by_email). Board objects follow board access.
- **Firebase RTDB rules:** Read/write allowed when `auth != null`. Users can only write to their own presence path (`auth.uid === $userId`).
- **No Firebase private key in client.** Only `NEXT_PUBLIC_*` env vars are exposed. Supabase anon key is safe for client use with RLS.

---

## Migration Notes

- **From Firestore:** The original design used Firestore for boards, objects, and presence. Migrations 001–002 set up Supabase. Migration 004 reverts any Firebase-UID schema (003) back to Supabase UUIDs if that was applied.
- **From Firebase Auth:** If the project previously used Firebase Auth, auth flows now use Supabase. The sync-profile API route was removed; Supabase `handle_new_user` trigger creates profiles on signup.

---

## References

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Firebase RTDB](https://firebase.google.com/docs/database)
- [Firebase Anonymous Auth](https://firebase.google.com/docs/auth/web/anonymous-auth)
