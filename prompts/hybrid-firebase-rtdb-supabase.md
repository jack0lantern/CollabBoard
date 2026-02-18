# Prompt: Hybrid Architecture — Firebase Auth + RTDB Cursors + Supabase Board State

Use this prompt to implement the hybrid architecture: **Firebase Auth** for sign-in, **Firebase RTDB** for low-latency cursor tracking, and **Supabase** for board state and user management (profiles).

---

## Context

CollabBoard currently uses:
- **Supabase Auth** — sign-in, sessions
- **Supabase Postgres** — boards, board_objects, profiles
- **Supabase Realtime Presence** — cursor tracking

**Proposal:** Switch to Firebase Auth + Firebase RTDB for cursors, keep Supabase for board state and profiles. This gives:
- Lower cursor latency (RTDB is WebSocket-native, optimized for high-frequency updates)
- Firebase Auth (familiar, broad OAuth support)
- Supabase Postgres (SQL, RLS, real-time subscriptions for board objects)

Supabase [officially supports Firebase Auth](https://supabase.com/docs/guides/auth/third-party/firebase-auth) as a third-party provider. The Supabase client can pass Firebase JWTs via `accessToken`; RLS policies then use `auth.uid()` (Firebase UID from JWT `sub`).

---

## Reference: Code in `firebase` Branch

The `firebase` branch has a full Firebase-only implementation. Reuse these pieces:

| File | Use |
|------|-----|
| `lib/firebase/presence.ts` | RTDB presence: `setPresence`, `updatePresenceCursor`, `removePresence`, `onPresenceChange`, `setupOnDisconnectCleanup` |
| `lib/firebase/client.ts` | Firebase app init, `getFirebaseAuth()`, `getRealtimeDb()` — add Auth + RTDB; current branch may only have RTDB |
| `hooks/usePresence.ts` | Uses Firebase presence with 50ms debounce, `setupOnDisconnectCleanup` |
| `components/auth/LoginForm.tsx` | Firebase Auth: `signInWithEmailAndPassword`, `signInWithPopup` (Google) |
| `components/auth/SignupForm.tsx` | Firebase Auth: `createUserWithEmailAndPassword` |
| `hooks/useCurrentUser.ts` | `onAuthStateChanged`, `currentUser` |
| `database.rules.json` | RTDB security rules for `boards/{boardId}/presence/{userId}` |

**To pull from firebase branch:**
```bash
git show firebase:lib/firebase/presence.ts
git show firebase:lib/firebase/client.ts
git show firebase:hooks/usePresence.ts
git show firebase:database.rules.json
# etc.
```

---

## Architecture Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Auth** | Firebase Auth | Email/password, Google OAuth, sessions |
| **Cursors / Presence** | Firebase RTDB | Low-latency cursor sync via `boards/{boardId}/presence/{userId}` |
| **Board state** | Supabase Postgres | boards, board_objects, profiles |
| **Board real-time** | Supabase Realtime | Postgres changes on board_objects |

---

## Implementation Requirements

### 1. Firebase Setup

- Enable **Firebase Authentication** (Email/Password, Google) in Firebase Console
- Enable **Realtime Database** in Firebase Console
- Add env vars: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (in addition to existing RTDB vars)
- Deploy RTDB rules (from `firebase` branch `database.rules.json`):

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

### 2. Supabase Firebase Auth Integration

- In Supabase Dashboard → Authentication → Third-party Auth, add Firebase integration with your Firebase Project ID
- Assign `role: 'authenticated'` custom claim to all Firebase users (required for Supabase RLS). Options:
  - **Blocking function** (if using Identity Platform): `beforeUserCreated` / `beforeUserSignedIn` return `customClaims: { role: 'authenticated' }`
  - **onCreate Cloud Function**: Set custom claims via Admin SDK
  - **One-time script**: Use Admin SDK to set `role: 'authenticated'` for existing users

### 3. Supabase Client with Firebase JWT

Configure the Supabase client to pass the Firebase ID token. Supabase validates Firebase JWTs when Firebase is registered as a third-party auth provider.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";  // or createClient from @supabase/supabase-js
import { getFirebaseAuth } from "@/lib/firebase/client";

export function createSupabaseClient() {
  return createBrowserClient(url, anonKey, {
    accessToken: async () => {
      const auth = getFirebaseAuth();
      const user = auth?.currentUser;
      return (await user?.getIdToken(false)) ?? null;
    },
  });
}
```

See [Supabase Firebase Auth docs](https://supabase.com/docs/guides/auth/third-party/firebase-auth) for details.

### 4. Schema Migration: Firebase UID

Supabase RLS uses `auth.uid()`, which for Firebase JWTs returns the Firebase UID (string like `"abc123xyz"`), not a Supabase UUID. Current schema uses `UUID REFERENCES auth.users(id)`.

**Migration steps:**
- `profiles.id`: Change from `UUID REFERENCES auth.users(id)` to `TEXT PRIMARY KEY` (Firebase UID)
- `boards.owner_id`: Change from `UUID REFERENCES auth.users(id)` to `TEXT` (Firebase UID)
- Update `has_board_access` and RLS policies to use `auth.uid()` (no change needed; it will now be Firebase UID)
- Remove any `auth.users` foreign keys

### 5. Profile Creation on First Sign-In

With Firebase Auth, profiles are not auto-created. Add a flow to create/upsert a profile when a user first signs in:

- **Option A:** API route `/api/auth/sync-profile` called after Firebase sign-in; creates/updates `profiles` row with Firebase UID
- **Option B:** Firebase `onAuthStateChanged` + server action or API call to ensure profile exists before rendering dashboard

### 6. Switch usePresence to Firebase RTDB

- Change `hooks/usePresence.ts` to import from `@/lib/firebase/presence` instead of `@/lib/supabase/presence`
- Add `setupOnDisconnectCleanup(boardId, userId)` in the effect (see `firebase` branch `usePresence.ts`)
- Ensure `RealtimeBoardProvider` receives `userId` from Firebase Auth (`currentUser.uid`)

### 7. Auth Flow Updates

- `LoginForm`, `SignupForm`: Use Firebase Auth (see `firebase` branch)
- `useCurrentUser`: Use `onAuthStateChanged` from Firebase Auth
- Middleware: Validate Firebase session (e.g. check for Firebase ID token in cookies, or rely on client-side redirect)
- Remove Supabase Auth callback route if no longer needed; add Firebase persistence (e.g. `browserLocalPersistence`)

### 8. Board Access and userId

- `RealtimeBoardProvider` and `BoardClientWrapper` receive `userId` from the authenticated user
- When using Firebase Auth, `userId` = `currentUser.uid` (Firebase UID)
- Ensure board page loads profile for `userId` and passes `displayName`, `avatarUrl` to presence

---

## File Checklist

| Action | File |
|--------|------|
| Update | `lib/firebase/client.ts` — add `getFirebaseAuth()`, full Firebase config |
| Copy/merge | `lib/firebase/presence.ts` — ensure `setupOnDisconnectCleanup` exists |
| Update | `lib/supabase/client.ts` — add `accessToken` with Firebase JWT |
| Update | `hooks/usePresence.ts` — use Firebase presence, add `setupOnDisconnectCleanup` |
| Update | `hooks/useCurrentUser.ts` — use Firebase `onAuthStateChanged` |
| Update | `components/auth/LoginForm.tsx` — Firebase Auth |
| Update | `components/auth/SignupForm.tsx` — Firebase Auth |
| Update | `middleware.ts` — Firebase session handling |
| Create | `supabase/migrations/00X_firebase_uid_schema.sql` — profiles/boards UID migration |
| Create | API route or logic for profile sync on first Firebase sign-in |
| Add | `database.rules.json` and deploy to Firebase RTDB |

---

## Testing

- Unit tests: Update mocks for Firebase Auth and RTDB presence
- E2E: Use Firebase test credentials; ensure `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` work with Firebase Auth
- Verify: Sign in → create board → open in two tabs → cursors sync via RTDB, objects sync via Supabase

---

## Expected Outcome

- Users sign in with Firebase Auth
- Cursor updates propagate via Firebase RTDB (~50–150ms typical)
- Board objects and metadata live in Supabase; real-time via Supabase Realtime
- RLS enforces access using Firebase UID from JWT
