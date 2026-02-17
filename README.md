# CollabBoard

Real-time collaborative whiteboard built with Next.js, React-Konva, Liveblocks, and Firebase.

## Stack

- **Frontend:** Next.js (App Router), React-Konva, Tailwind CSS
- **Real-time:** Firestore (objects + presence subcollections)
- **Database & Auth:** Firebase (Firestore + Auth)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your keys:

   - **Firebase:** Create a project at [console.firebase.google.com](https://console.firebase.google.com)
     - Enable **Authentication** (Email/Password, Google)
     - Enable **Firestore** (board metadata, objects, presence)
     - Get client config from Project Settings > General
     - Create a Service Account for server-side (Project Settings > Service Accounts) and add `FIREBASE_PRIVATE_KEY` to `.env.local`

3. Create Firestore index (Firebase Console > Firestore > Indexes): Collection `boards`, Fields `owner_id` (Ascending), `created_at` (Descending).

4. Deploy Firestore rules: `firebase deploy --only firestore`

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

**Performance 500 test** (uses Firebase Emulator, no quota limits):

```bash
# Terminal 1: start emulators
firebase emulators:start

# Terminal 2: dev server with emulator
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npm run dev

# Terminal 3: run the test
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npx playwright test tests/e2e/performance-500.spec.ts --project=chromium --workers=1
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
