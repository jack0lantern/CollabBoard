# Supabase Schema

## Overview

CollabBoard uses a hybrid architecture: Firebase Auth + Firebase RTDB for cursors, Supabase for board state and profiles.

**Auth:** Firebase Authentication  
**Boards & objects:** Supabase PostgreSQL  
**Presence / Cursors:** Firebase Realtime Database

| Layer | Technology |
|-------|------------|
| Auth | Firebase Auth (email/password, Google) |
| Boards, board_objects, profiles | Supabase PostgreSQL |
| Real-time board sync | Supabase Realtime (postgres_changes) |
| Cursor/presence sync | Firebase RTDB (`boards/{boardId}/presence/{userId}`) |

## Tables

### `profiles`
User display info. Keyed by Supabase auth user ID.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK, FK → auth.users) | Supabase user ID |
| display_name | TEXT | Display name (legacy / computed) |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| avatar_url | TEXT | Avatar URL |
| created_at | TIMESTAMPTZ | Created |
| updated_at | TIMESTAMPTZ | Updated |

### `boards`
Board metadata and sharing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Board ID |
| title | TEXT | Board title |
| owner_id | UUID (FK → auth.users) | Owner |
| created_at | TIMESTAMPTZ | Created |
| last_snapshot | JSONB | Periodic canvas snapshot |
| is_public | BOOLEAN | Public access |
| shared_with | JSONB | `{"email@example.com": "editor" \| "viewer"}` |

### `board_objects`
Canvas objects (sticky notes, shapes, lines).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Object ID |
| board_id | UUID (FK → boards) | Parent board |
| type | TEXT | `sticky`, `rect`, `circle`, `line` |
| x, y | DOUBLE PRECISION | Position |
| z_index | INTEGER | Z-order |
| width, height, radius, etc. | DOUBLE PRECISION | Shape dimensions |
| color, text, rotation | Various | Shape props |
| meta | JSONB | Extra data |
| updated_at | TIMESTAMPTZ | Last update |

### Presence (Firebase RTDB)
Live cursor positions use Firebase Realtime Database at `boards/{boardId}/presence/{userId}`. No Supabase table.

## Applying the Migration

### Option 1: Supabase Dashboard
1. Open your Supabase project → SQL Editor
2. Paste contents of `supabase/migrations/001_initial_schema.sql`
3. Run

### Option 2: Supabase CLI
```bash
supabase db push
```

### Option 3: Direct psql
```bash
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```

## Realtime Subscriptions

Supabase Realtime replaces Firestore `onSnapshot` for boards and board objects. Both tables are in the `supabase_realtime` publication. With Supabase Auth, the client session works out of the box.

```typescript
// Board objects (like onBoardObjectsChange)
supabase
  .channel('board-objects')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'board_objects',
    filter: `board_id=eq.${boardId}`,
  }, (payload) => { /* handle change */ })
  .subscribe();

// Presence: Supabase Realtime Presence (lib/supabase/presence.ts)
// onPresenceChange(boardId, { userId, initialPresence }, callback)
```

## Auth (Firebase)

Firebase Authentication handles sign-in (email/password, Google). The Supabase client is configured with `accessToken` to pass the Firebase ID token. Supabase validates the Firebase JWT (registered as a third-party auth provider) and `auth.uid()` returns the Firebase UID. RLS policies use `auth.uid()` and `auth.jwt() ->> 'email'` for access control.

## Data Migration Notes

- **board_objects**: Firebase stored objects with client-generated IDs. Supabase uses UUIDs; map old IDs during migration or accept new IDs.
- **shared_with**: Stays as JSONB `{email: role}` to match current structure.
- **last_snapshot**: JSONB stores the same structure as Firestore.
- **Presence**: Uses Firebase RTDB for low-latency cursor sync.
