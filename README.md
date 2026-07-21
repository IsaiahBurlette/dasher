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

All dash history is stored in your browser's `localStorage` — there is no
database or account system. Use the "Export backup" / "Import backup"
buttons on the page to save or restore your history as a JSON file.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000. No environment variables or API keys are
needed.

The first time you read a screenshot, your browser downloads tesseract.js's
open-source OCR engine and English language data (a few MB) from its public
CDN; it's cached after that, so it only happens once.

## Notes

- Because history lives in `localStorage`, it's per-browser and per-device —
  no login, nothing synced to a server. Clearing site data, reinstalling the
  browser, or switching browsers/devices will lose it unless you've exported
  a backup first. On iOS Safari in particular, sites not saved to the home
  screen can have their storage cleared after a week of not being opened —
  export a backup periodically if you rely on this, or add the page to your
  home screen (Share → Add to Home Screen) to avoid that.
- "Best times to dash" needs at least 2 logged dashes in the same
  day-of-week or start-hour bucket before it will rank that bucket.
- On-device OCR is free but less reliable than a cloud vision model,
  especially on blurry or oddly-cropped screenshots — double-check the
  review screen before saving.
