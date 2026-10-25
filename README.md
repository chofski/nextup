# Next Up

Mobile-first badminton doubles scheduler for club sessions.

Open `index.html` in a browser (or serve the folder statically). Session data is saved in the browser with `localStorage`, so each device/user keeps their own players, courts, and mix history.

## How it works

1. Set courts and typical game length in **Session** (gear icon). Optionally prefer mixed doubles when both genders are waiting.
2. Add people as they arrive, marking each as **M** or **F**. Tap a player’s M/F badge later to correct it.
3. Tap **Start next doubles** when a valid lineup is possible:
   - **Mixed** — 2 male + 2 female (each side is one M + one F)
   - **Men's** — 4 male
   - **Women's** — 4 female
4. Pick the match type (or leave on Auto), confirm the lineup, and use **Reshuffle** for an alternate fair mix.
5. When a game finishes, tap **Court free — end match**. Those four return to waiting with updated game counts.

## Local development

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
