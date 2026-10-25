# Next Up

Mobile-first badminton doubles scheduler for club sessions.

Open `index.html` in a browser (or serve the folder statically). Session data is saved in the browser with `localStorage`, so each device/user keeps their own players, courts, and mix history.

## How it works

1. Set courts and typical game length in **Session** (gear icon). Optionally prefer mixed doubles when both genders are waiting.
2. Add people as they arrive, choosing **Male** or **Female**. Tap a player’s M/F badge later to correct it.
3. Tap **Start next doubles** when a valid lineup is possible:
   - **Mixed** — 2 male + 2 female (each side is one M + one F)
   - **Men's** — 4 male
   - **Women's** — 4 female
4. Choose **Suggested** (auto fair mix) or **Pick players** (manual selection of any valid 4).
5. Confirm the lineup — use **Reshuffle** / **Swap sides** for an alternate pairing.
6. When a game finishes, tap **Court free — end match**.

## Local development

```bash
python3 -m http.server 8080
# or
npm start
```

Then open `http://localhost:8080`.

```bash
npm test
```

## iPhone / installable app

- **PWA:** Safari → Share → Add to Home Screen (works with the included manifest + service worker).
- **Native shell:** Capacitor scaffolding is included — see [docs/IOS.md](docs/IOS.md).
