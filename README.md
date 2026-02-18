# CollabBoard

Real-time collaborative whiteboard built with Next.js, React-Konva, Firebase Auth, and Supabase.

## Stack

- **Frontend:** Next.js (App Router), React-Konva, Tailwind CSS
- **Auth:** Firebase Authentication (Email/Password, Google)
- **Database:** Supabase Postgres (boards, board_objects, profiles)
- **Real-time board sync:** Supabase Realtime (postgres_changes)
- **Cursor sync:** Firebase Realtime Database (low-latency presence)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your keys:

   - **Firebase:** Create a project at [console.firebase.google.com](https://console.firebase.google.com)
     - Enable **Authentication** (Email/Password, Google)
     - Enable **Realtime Database**
     - Get client config from Project Settings > General
   - **Supabase:** Create a project at [supabase.com](https://supabase.com)
     - Get URL and anon key from Settings > API
     - Add Firebase as a third-party auth provider (Authentication > Third-party Auth)
     - Run the schema migration: `supabase/migrations/001_initial_schema.sql` then `003_firebase_uid.sql`

3. Deploy RTDB rules: `firebase deploy --only database`

5. Start the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Testing

### Unit tests (Vitest)

```bash
npm run test        # watch mode
npm run test:run    # single run
```

### E2E tests (Playwright)

**Basic tests** (no auth required):

```bash
npm run dev         # in one terminal
npm run test:e2e    # in another
```

**Auth-required tests** (sync-latency, concurrent-grab, etc.) need test credentials in `.env.local`:

```
E2E_TEST_EMAIL=your-test-account@example.com
E2E_TEST_PASSWORD=your-test-password
```

**Performance 500 test**:

```bash
npx playwright test tests/e2e/performance-500.spec.ts --project=chromium --workers=1
```

Install Playwright browsers if needed: `npx playwright install`

## Project Structure

```
app/           # Next.js App Router
components/    # React components (canvas, ui, auth, providers)
lib/           # Firebase, utils
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
