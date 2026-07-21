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

## How it works

Screenshot extraction is done server-side by sending the image to the
Anthropic API (Claude) with a prompt asking it to read out the dash time,
active time, earnings, and start/end times as structured JSON. You always
get a chance to review and correct the extracted numbers (and add mileage)
before saving.

All dash history is stored in your browser's `localStorage` — there is no
database or account system. Use the "Export backup" / "Import backup"
buttons on the page to save or restore your history as a JSON file.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Then open http://localhost:3000.

`ANTHROPIC_API_KEY` is required for the "upload a screenshot" extraction
feature (get one at https://console.anthropic.com/). `ANTHROPIC_MODEL` is
optional and defaults to `claude-sonnet-5`.

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
