# Supabase Schema

## Overview

CollabBoard uses Supabase for auth, boards, board_objects, and profiles.

**Auth:** Supabase Auth  
**Boards & objects:** Supabase PostgreSQL  
**Presence:** Firebase RTDB only (no presence table in Supabase)

| Firebase | Supabase |
|----------|----------|
| Firestore `boards` | `boards` table |
| Firestore `boards/{id}/objects` | `board_objects` table |
| Firestore `profiles` | `profiles` table |
| RTDB `boards/{id}/presence/{userId}` | **Stays in Firebase RTDB** |

## Tables

### `profiles`
User display info. Keyed by Supabase auth user ID.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK, FK → auth.users) | Supabase user ID |
| display_name | TEXT | Display name |
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
Live cursor positions stay in Firebase RTDB at `boards/{boardId}/presence/{userId}`. No Supabase table.

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

// Presence: keep using Firebase RTDB (lib/firebase/presence.ts)
// onPresenceChange(boardId, callback)
```

## Auth (Supabase)

Supabase Auth handles sign-in. RLS policies use `auth.uid()` and `auth.jwt() ->> 'email'` for access control (avoid querying `auth.users`; the `authenticated` role lacks SELECT on it). Client can use Supabase directly with the user session.

## Data Migration Notes

- **board_objects**: Firebase stored objects with client-generated IDs. Supabase uses UUIDs; map old IDs during migration or accept new IDs.
- **shared_with**: Stays as JSONB `{email: role}` to match current structure.
- **last_snapshot**: JSONB stores the same structure as Firestore.
- **Presence**: No migration needed; stays in Firebase RTDB. Update presence code to use Supabase user ID when writing to RTDB.
