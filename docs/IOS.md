# Packaging Next Up for iPhone

The web app is already a **Progressive Web App** (manifest + service worker + Apple home-screen meta tags). You can install it to an iPhone home screen from Safari today.

For a native App Store / TestFlight shell, this repo includes **Capacitor** scaffolding.

## Option A — Home screen (PWA, no Mac required)

Offline Home Screen **requires a secure context**:
- ✅ `https://…` (GitHub Pages, etc.)
- ✅ `http://localhost` / `http://127.0.0.1` **on the same device**
- ❌ `http://192.168.…` from an iPhone to your Mac — Safari will **not** install a service worker, so killing the server always yields a blank/black app

### Recommended flow (GitHub Pages or any HTTPS URL)

1. Open the site in Safari on iPhone while online.
2. Wait for the page to reload once (the app does this after the service worker installs).
3. Share → **Add to Home Screen**.
4. Launch from the icon; you can now go offline / kill the server and reopen.

### Offline troubleshooting
- If you previously added the icon from an `http://192.168…` URL, delete that icon and re-add from HTTPS.
- After a redeploy, open once online so cache `nextup-v4` can install.
- iOS Settings → Safari → Advanced → Website Data can clear a stuck site copy.

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
