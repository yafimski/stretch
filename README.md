# Stretch

A minimal mobile-first stretch timer: 3×3 exercise grid, countdown modal, optional rest between exercises.

## Local development

```bash
npm install
npm run dev
```

## Assets (`public/`)

Add these files before running exercises:

| File | Purpose |
| --- | --- |
| `1.png` … `9.png` | Exercise images (grid + modal) |
| `1.mp3` … `9.mp3` | Start sound per exercise (played first) |
| `chime.mp3` | Chime after start sound and at end of each exercise |

Paths are served from the site root, e.g. `/3.png`, `/3.mp3`, `/chime.mp3`.

## Deploy to Vercel

1. Import the repo (or subfolder `stretch` as the project root).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Install Command: `npm install` (or `npm ci`)

No extra rewrites needed for this single-page app.

## Behavior

- **Begin** runs exercises 1→9 in order.
- Tap a grid card to run that exercise only (interrupts any active run).
- Settings: duration (15 / 30 / 60 sec) and **Auto Pause** (10 sec rest between exercises).
- Start of each exercise: `{n}.mp3` then `chime.mp3`, then countdown.
- End of each exercise: `chime.mp3`, then optional pause or next exercise.
