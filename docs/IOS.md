# Packaging Next Up for iPhone

The web app is already a **Progressive Web App** (manifest + service worker + Apple home-screen meta tags). You can install it to an iPhone home screen from Safari today.

For a native App Store / TestFlight shell, this repo includes **Capacitor** scaffolding.

## Option A — Home screen (PWA, no Mac required)

1. Serve the site over HTTPS (or `localhost` while developing).
2. Open it in Safari on iPhone.
3. Share → **Add to Home Screen**.
4. Launch from the icon — it runs fullscreen with local persistence.

## Option B — Native iOS app (Capacitor)

Requires a Mac with Xcode.

```bash
npm install
npm run sync:www          # copies static app into www/
npx cap add ios           # once — creates ios/ Xcode project
npm run cap:sync          # after web changes
npm run cap:open:ios      # opens Xcode
```

In Xcode:

1. Select a development team for signing.
2. Set a unique Bundle Identifier if needed (`club.nextup.app` is the default).
3. Run on a simulator or device.
4. Archive → distribute for TestFlight / App Store when ready.

Useful npm scripts:

| Script | Purpose |
|---|---|
| `npm run sync:www` | Refresh `www/` from the static web files |
| `npm run cap:sync` | Sync web assets into the iOS project |
| `npm run cap:open:ios` | Open the Xcode workspace |

`www/` and `ios/` are generated/native outputs — edit the root `index.html` / `css/` / `js/` sources, then sync.
