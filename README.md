# Farm Mate — Horse Job Logger

A tiny, tap-first web app to log horse-care jobs and total amounts owed by owner.

## Features
- Tap job buttons (no typing)
- Running totals by owner and horse
- **Undo last log**
- **Mark owner as paid** (moves their current jobs into Paid History and clears their running total)
- Copy weekly summary (WhatsApp-ready text)
- Export CSV
- Data saved locally in the browser (no account)

## Local dev
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Deploy on Vercel
1. Push this folder to a GitHub repo (e.g. `RapiDic3/farm-mate`).
2. In Vercel: Add New → Project → Import from GitHub → select repo → Deploy.
3. You’ll get a live URL like `https://farm-mate.vercel.app`.

## Notes
- Prices/jobs are defined in `src/App.jsx` in the `JOBS` array.
- Data lives in `localStorage`, so each device has its own running totals.
