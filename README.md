# CollabBoard

Real-time collaborative whiteboard built with Next.js, React-Konva, Liveblocks, and Firebase.

## Stack

- **Frontend:** Next.js (App Router), React-Konva, Tailwind CSS
- **Real-time:** Liveblocks (CRDT)
- **Database & Auth:** Firebase (Firestore + Auth)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your keys:

   - **Firebase:** Create a project at [console.firebase.google.com](https://console.firebase.google.com)
     - Enable **Authentication** (Email/Password, Google)
     - Enable **Firestore** (for board metadata)
     - Enable **Realtime Database** (for real-time canvas + presence)
     - Get client config from Project Settings > General
     - Create a Service Account for server-side (Project Settings > Service Accounts) and add `FIREBASE_PRIVATE_KEY` to `.env.local`
   - **Liveblocks:** Create a project at [liveblocks.io](https://liveblocks.io)

3. Create Firestore index (Firebase Console > Firestore > Indexes): Collection `boards`, Fields `owner_id` (Ascending), `created_at` (Descending). Deploy RTDB rules: copy `database.rules.json` into Firebase Console > Realtime Database > Rules.

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/           # Next.js App Router
components/    # React components (canvas, ui, auth, providers)
lib/           # Liveblocks, Firebase, utils
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
