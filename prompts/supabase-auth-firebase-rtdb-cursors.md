# Prompt: Supabase Auth + DB, Firebase RTDB for Cursors Only

Use this prompt to implement the architecture: **Supabase** for auth and database, **Firebase RTDB** for low-latency cursor tracking only. Firebase Anonymous Auth satisfies RTDB rules; no billing required.

---

## Context

CollabBoard may currently use Firebase Auth + Supabase (hybrid) or Supabase-only. This prompt sets up:

- **Supabase Auth** — sign-in, sessions, profiles (email/password, Google)
- **Supabase Postgres** — boards, board_objects, profiles
- **Firebase RTDB** — cursor/presence sync only (low latency, WebSocket-native)
- **Firebase Anonymous Auth** — used only to satisfy RTDB `auth != null`; no billing

**Why this architecture:**
- No Firebase billing (Anonymous Auth and RTDB are free-tier friendly)
- Lower cursor latency than Supabase Realtime Presence
- Display names on cursors come from Supabase profile, passed into the presence payload — not from Firebase Auth

---

## Architecture Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Auth** | Supabase Auth | Email/password, Google OAuth, sessions |
| **Database** | Supabase Postgres | boards, board_objects, profiles |
| **Board real-time** | Supabase Realtime | postgres_changes on board_objects |
| **Cursors** | Firebase RTDB | `boards/{boardId}/presence/{firebaseUid}` |
| **RTDB auth** | Firebase Anonymous Auth | Satisfies `auth != null` in RTDB rules |

---

## Data Flow: Cursors with Names

1. User signs in with **Supabase** → profile has `display_name`, `avatar_url`
2. User opens a board → app signs in **anonymously** to Firebase (for RTDB access)
3. `setPresence(boardId, firebaseUid, { displayName, avatarUrl, cursor, lastSeen })` — display name comes from Supabase, stored in RTDB
4. Other clients read presence and render cursors with correct names/avatars

The Firebase anonymous UID is the presence key; the payload holds Supabase-sourced display info.

---

## Implementation Requirements

### 1. Firebase Setup (RTDB + Anonymous Auth only)

- Enable **Realtime Database** in Firebase Console
- Enable **Authentication** → **Anonymous** provider only (no Email/Password or Google needed for Firebase)
- Deploy RTDB rules: `firebase deploy --only database`

```json
{
  "rules": {
    "boards": {
      "$boardId": {
        "presence": {
          ".read": "auth != null",
          "$userId": {
            ".read": "auth != null",
            ".write": "auth != null && auth.uid === $userId"
          }
        }
      }
    }
  }
}
```

- Env vars: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (minimal; no auth domain needed for anonymous)

### 2. Supabase Setup

- Auth: Email/Password, Google (as usual)
- Schema: `001_initial_schema.sql`, `002_add_name_fields.sql`
- **If migration `003_firebase_uid.sql` was run:** Create `004_revert_to_supabase_uuid.sql` to change `profiles.id` and `boards.owner_id` back from TEXT to UUID, restore FKs to `auth.users`, and recreate RLS policies for Supabase Auth
- **If 003 was never run:** No schema changes needed

### 3. Firebase Client (`lib/firebase/client.ts`)

- Initialize app with `apiKey`, `projectId`, `databaseURL`
- Export `getFirebaseAuth()` and `getRealtimeDb()`
- No Email/Password or Google config needed

### 4. Anonymous Auth on Board Load

When the user opens a board (or when `RealtimeBoardProvider` / `BoardClientWrapper` mounts):

```typescript
// Sign in anonymously so RTDB rules allow read/write
const auth = getFirebaseAuth();
if (auth && !auth.currentUser) {
  await signInAnonymously(auth);
}
```

- Call this before `usePresence` runs (e.g. in `BoardClientWrapper` or a wrapper around it)
- `userId` for presence = `auth.currentUser.uid` (Firebase anonymous UID)
- `displayName` and `avatarUrl` = from Supabase session/profile

### 5. Supabase Client

- Use standard `createBrowserClient` from `@supabase/ssr` (no Firebase JWT `accessToken`)
- Session handled by Supabase cookies

### 6. Auth Flow (Supabase)

- `LoginForm`, `SignupForm`: Supabase `signInWithPassword`, `signUp`, `signInWithOAuth`
- `useCurrentUser`: Supabase `onAuthStateChange`, `getSession`
- `BoardClientWrapper`: Get user from Supabase session; pass `displayName`, `avatarUrl` to `RealtimeBoardProvider`; trigger Firebase anonymous sign-in before presence
- Dashboard, board page: Supabase auth checks

### 7. Presence Flow

- `hooks/usePresence`: Import from `@/lib/firebase/presence` (not Supabase)
- `RealtimeBoardProvider` receives: `userId` (Firebase UID after anonymous sign-in), `displayName`, `avatarUrl` (from Supabase)
- `setPresence`, `updatePresenceCursor`, `onPresenceChange`, `setupOnDisconnectCleanup` — same as current Firebase presence impl

### 8. Middleware

- Use Supabase `updateSession` to refresh Supabase auth cookies (restore `lib/supabase/middleware.ts` if removed)

### 9. Auth Callback

- Restore `app/auth/callback/route.ts` for Supabase OAuth redirect (`exchangeCodeForSession`)

---

## File Checklist

| Action | File |
|--------|------|
| Revert | `lib/supabase/client.ts` — remove `accessToken`, use `createBrowserClient` |
| Revert | `components/auth/LoginForm.tsx` — Supabase Auth |
| Revert | `components/auth/SignupForm.tsx` — Supabase Auth |
| Revert | `hooks/useCurrentUser.ts` — Supabase `onAuthStateChange` |
| Revert | `app/dashboard/page.tsx` — Supabase auth |
| Revert | `app/board/[id]/page.tsx` — Supabase auth |
| Update | `app/board/[id]/BoardClientWrapper.tsx` — Supabase user + Firebase anonymous sign-in before presence |
| Keep | `hooks/usePresence.ts` — Firebase RTDB presence |
| Keep | `lib/firebase/presence.ts` | 
| Update | `lib/firebase/client.ts` — ensure `getFirebaseAuth()` exists; no Email/Google config |
| Create | `lib/firebase/anonymous-auth.ts` or inline — `ensureAnonymousAuth()` called before presence |
| Restore | `lib/supabase/middleware.ts` |
| Restore | `app/auth/callback/route.ts` |
| Revert | `middleware.ts` — use Supabase `updateSession` |
| Optional | `supabase/migrations/004_revert_to_supabase_uuid.sql` — only if 003 was applied |
| Remove | Firebase Cloud Function `setRoleOnCreate` — not needed |

---

## Anonymous Auth Timing

Call `signInAnonymously` when:
- User is on a board page and needs presence, **or**
- User is authenticated with Supabase and about to enter a board

Do **not** sign in anonymously on every page load (e.g. login page) — only when presence is needed. This keeps anonymous users scoped to board usage.

---

## Testing

- Unit tests: Mock Supabase client for auth; mock `@/lib/firebase/presence` for usePresence
- E2E: Use Supabase test credentials; verify cursors show display names from Supabase profiles

---

## Expected Outcome

- Users sign in with Supabase
- Cursors sync via Firebase RTDB with low latency
- Cursor labels show display names from Supabase profiles
- No Firebase billing required
