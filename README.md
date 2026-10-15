# Hackensack IMPACT (prototype)

A public crime-data dashboard prototype for the Hackensack Police Department, modeled on [Jersey City IMPACT](https://impact.jcnj.org). Static HTML/CSS/JS — no build step, no server required to run.

## Structure

- `index.html` — page layout (header, filters, stat cards, map, table)
- `styles.css` — styling
- `app.js` — data loading, filtering, map rendering, stat/table rendering
- `data/incidents.json` — **sample data only**. Replace this with a real feed from HPD.

## Running locally

```
python3 -m http.server 8000
```
Then open http://localhost:8000

## Swapping in real HPD data

Everything reads from `data/incidents.json`, shaped as:

```json
{
  "meta": { "source": "...", "generated": "YYYY-MM-DD" },
  "incidents": [
    {
      "id": 1,
      "date": "2026-01-15",
      "category": "Theft",
      "definition": "Unlawful taking of property without force or threat",
      "district": "North",
      "block_address": "300 block of Main St",
      "lat": 40.891,
      "lng": -74.031
    }
  ]
}
```

Ask HPD what format their records management system (RMS) can export in — most support CSV or a scheduled report. Once you know that:

1. If it's a one-time or manually-updated CSV: write a small script to convert it to this JSON shape and re-run it whenever new data arrives.
2. If they can offer a live feed/API: replace the `fetch("data/incidents.json")` call in `app.js` with a call to that endpoint, and move the conversion logic server-side.
3. **Never show exact addresses for sensitive categories** (domestic incidents, etc.) — use block-level addresses and jittered coordinates, same pattern used here and by JCNJ IMPACT.
4. Keep `meta.generated` accurate — a visible "last updated" timestamp is a credibility requirement for public accountability sites.

## Next steps for a production version

- Move data storage to a real database (Postgres + PostGIS) once incident volume grows past what a static JSON file can handle, and once updates need to happen on a schedule rather than by hand.
- Add a small backend/API layer if HPD wants non-technical staff to update data without editing files directly.
- Add the Spanish translation strings (the language toggle button is scaffolded but not yet wired to translated content).
- Confirm official crime category definitions with HPD (ideally sourced from NJ UCR/NIBRS classifications) rather than the placeholder definitions currently in the sample data.
- Get this in front of HPD's IT/records staff early — data governance and what's safe to publish (vs. omit or aggregate) needs their sign-off before going live.
