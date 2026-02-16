# CollabBoard

Real-time collaborative whiteboard built with Next.js, React-Konva, Liveblocks, and Supabase.

## Stack

- **Frontend:** Next.js 15 (App Router), React-Konva, Tailwind CSS
- **Real-time:** Liveblocks (CRDT)
- **Database:** Supabase (Postgres + Auth)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your keys:

   - Supabase: Create a project at [supabase.com](https://supabase.com)
   - Liveblocks: Create a project at [liveblocks.io](https://liveblocks.io)

3. Run the database migrations (see `supabase/migrations/` when added).

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/           # Next.js App Router
components/    # React components (canvas, ui, providers)
lib/           # Liveblocks, Supabase, utils
hooks/         # Custom hooks
types/         # TypeScript types
```

## Board URL

Navigate to `/board/[id]` to open a board. Create a board via the API or add a "New board" flow on the home page.

## Pre-commit: detect-secrets

Blocks commits if new secrets (API keys, passwords, etc.) are detected.

**Setup:**
```bash
pip install -r requirements-dev.txt
npm run precommit:install
```

The husky pre-commit hook runs `detect-secrets-hook` before each commit. To allowlist a false positive, add `# pragma: allowlist secret` on that line, or update `.secrets.baseline`.
