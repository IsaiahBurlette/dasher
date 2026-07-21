# Dasher

Upload a screenshot of a completed DoorDash "dash" summary and get:

- Extracted dash time, active time, earnings, and the start/end time frame
- Two hourly rates: earnings ÷ active time, and earnings ÷ total dash time
- A place to log the miles you drove that dash
- Charts: hourly rate over time, earnings per dash, and average $/hr broken
  down by day of week and by start hour
- A "best times to dash" panel that ranks your days/hours by average
  active $/hr (once you've logged a couple of dashes in the same bucket)
- Manual entry (no screenshot needed) and one-tap delete on any logged dash
- History organized by week, then by day
- Optional free cloud sync via "Sign in with Google" — your dashes follow
  you across every device you sign into, instead of living in one browser

## How it works

Screenshot reading happens entirely on-device: [tesseract.js](https://github.com/naptha/tesseract.js)
runs OCR in the browser (WebAssembly), and a small parser looks for the
labels DoorDash uses ("Time on Dash", "Active Time", "Total Pay", etc.) to
pull out the numbers. The screenshot is never uploaded anywhere, there's no
API key, and there's no per-image cost.

OCR + layout differences across app versions mean fields can occasionally
be missed or misread, so you always get a chance to review and correct the
extracted numbers (and add mileage) before saving — treat the auto-fill as
a head start, not gospel.

By default, dash history is stored in your browser's `localStorage` — no
account needed, nothing leaves your device. Use the "Export backup" /
"Import backup" buttons on the page to save or restore your history as a
JSON file at any time.

If you'd rather have your history follow you across devices, you can sign
in with Google (see "Cloud sync setup" below). Once signed in, your dashes
are stored in Firestore instead, and update live on every device you're
signed into. If you already had dashes saved locally before signing in,
you'll get a one-time prompt to copy them into your account.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000. No environment variables or API keys are
needed for the core app — cloud sync (below) is the only optional piece
that requires setup.

The first time you read a screenshot, your browser downloads tesseract.js's
open-source OCR engine and English language data (a few MB) from its public
CDN; it's cached after that, so it only happens once.

## Cloud sync setup (optional)

This uses [Firebase](https://firebase.google.com) — Google's free tier
(Spark plan) covers this app's usage with plenty of room to spare, no
credit card required, and never expires. Skip this section entirely if
you're fine with the default local-only storage.

1. Go to the [Firebase console](https://console.firebase.google.com/),
   click "Add project," and follow the prompts (you can decline Google
   Analytics — it's not needed here).
2. In your new project: **Build → Authentication → Get started → Sign-in
   method → Google → Enable → Save.**
3. **Build → Firestore Database → Create database** (production mode is
   fine, pick whatever region is closest to you).
4. In **Firestore Database → Rules**, replace the contents with what's in
   [`firestore.rules`](./firestore.rules) in this repo, then **Publish**.
   This restricts each signed-in user to only reading/writing their own
   data.
5. Back in **Project settings** (gear icon) → scroll to "Your apps" → click
   the `</>` (web) icon → register an app (any nickname) → it'll show you a
   `firebaseConfig` object. Copy those values into a `.env.local` file
   (copy `.env.example` to `.env.local` first) — `apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, and `appId` map
   directly to the `NEXT_PUBLIC_FIREBASE_*` variables.
6. **Authentication → Settings → Authorized domains** — add the domain
   you're deploying to (e.g. `your-app.vercel.app`). Without this step,
   Google sign-in will fail on your live site (localhost is authorized by
   default, so local dev works out of the box).
7. If deploying (e.g. on Vercel), add the same `NEXT_PUBLIC_FIREBASE_*`
   variables in your hosting provider's environment variable settings, then
   redeploy.

Once configured, a "Sign in with Google" button appears in the header
automatically — no code changes needed.

## Notes

- Local-only storage is per-browser and per-device — no login, nothing
  synced. Clearing site data, reinstalling the browser, or switching
  devices will lose it unless you've exported a backup or signed in with
  Google first. On iOS Safari in particular, sites not saved to the home
  screen can have their storage cleared after a week of not being opened —
  export a backup periodically if you rely on this, or add the page to your
  home screen (Share → Add to Home Screen) to avoid that.
- "Best times to dash" needs at least 2 logged dashes in the same
  day-of-week or start-hour bucket before it will rank that bucket.
- On-device OCR is free but less reliable than a cloud vision model,
  especially on blurry or oddly-cropped screenshots — double-check the
  review screen before saving.
