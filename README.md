# Next Up

Mobile-first badminton doubles scheduler for club sessions.

Open `index.html` in a browser (or serve the folder statically). Session data is saved in the browser with `localStorage`, so each device/user keeps their own players, courts, and mix history.

## How it works

1. Set courts and typical game length in **Session** (gear icon).
2. Add people as they arrive.
3. Tap **Start next doubles** (or a free court) when four or more players are waiting.
4. Confirm the suggested lineup — the mixer prefers people with fewer games and fewer recent partnerships. Use **Reshuffle** for an alternate fair lineup.
5. When a game finishes, tap **Court free — end match**. Those four return to waiting with their game counts updated, and the next mix stays balanced across the session.

## Local development

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
