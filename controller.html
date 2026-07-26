# FreeFlow

A lightweight, browser-based church presentation engine — the successor to
ScriptureFlow + LyricFlow, combined into one platform. No backend server, no
Node/Python server, no OBS plugin: just static files (GitHub Pages) + Firebase
(Firestore for sync, optional Storage for images).

## File structure

```
index.html          landing page (links to controller/output)
controller.html      operator UI — everything happens here
output.html           what you point OBS's Browser Source at
firestore.rules       paste into Firebase Console → Firestore → Rules
storage.rules          paste into Firebase Console → Storage → Rules (only needed if you use image upload)
js/config.js            <-- EDIT THIS with your Firebase project
js/slide-model.js       unified slide schema (scripture/lyrics/text/image/announcement/lowerThird)
js/bible-engine.js      loads + indexes the Bible JSON, reference parsing/search
js/firestore-sync.js    Firebase init, auth, resilient onSnapshot sync
js/render-engine.js     paints a slide (background + positioned elements) — used by BOTH output.html and the controller preview
js/editor.js            drag/resize handles for the interactive preview canvas
js/controller.js         the operator app logic
css/stage.css            canvas + transition styling shared by controller/output
data/english.json        KJV, flat {book,chapter,verse,text}
data/telugu-complete.json Telugu Bible, same schema
```

## One-time setup

1. **Create a Firebase project** (console.firebase.google.com).
2. **Enable Authentication → Sign-in method → Anonymous.**
3. **Create a Firestore database** (production mode is fine — rules below lock it down).
4. Paste `firestore.rules` into **Firestore → Rules** and publish.
5. If you want image uploads (not just URLs): enable **Storage**, paste `storage.rules`, publish.
6. Copy your Firebase web app config into `js/config.js` (the `firebaseConfig` object + `APP_ID`). **Both `controller.html` and `output.html` import this same file**, so you only edit it once.
7. Push everything to a GitHub repo, enable **GitHub Pages** (serve from the repo root or `/docs`).

## Using it

- Open `controller.html` — that's your operator dashboard.
- Point an OBS **Browser Source** at your hosted `output.html` (transparent background, matches your canvas resolution — e.g. 1920×1080). Add `?debug=1` to the URL to show a connection status badge in-corner while testing.
- **Bible tab**: pick a translation, search a reference (`John 3:16`, `John 3:16-18`, or just `John 3` for the whole chapter), click a verse card to add it to the playlist as its own slide.
- **Songs tab**: "+ New Song" to write/paste lyrics (one line = one slide). "Add" loads all its lines into the playlist.
- **Text / Images / Msgs tabs**: quick ad-hoc slides — text, full-screen images (URL or upload), announcements, and lower-thirds (transparent overlay slides meant to sit over a live camera/video scene).
- **Playlist** (center-left): your service order. Click a slide to take it live; double-click to edit it without going live; drag to reorder.
- **Preview canvas**: WYSIWYG — drag boxes to move them, drag the green corner/edge handles to resize. Every element's font, size, color, alignment, opacity, glow/outline/shadow, and position is editable from the right-hand inspector.
- **Background inspector**: per-slide — transparent, solid color, gradient, or image.
- **Transitions**: fade / crossfade / slide / zoom / cut, set per-slide from the top toolbar.
- **Next / Prev / Blackout**: top toolbar, or arrow keys / space / `B` on your keyboard (while not focused in a text field).

## Notes on architecture

- Firestore `onSnapshot` is the **only** sync channel between controller and output — this matches the original ScriptureFlow/LyricFlow design, because OBS's Browser Source runs a separate embedded Chromium (CEF) process that `localStorage`/`BroadcastChannel` never reach.
- The entire live playlist + current index + blackout state lives in one Firestore document (`artifacts/freeflow-live/public/data/freeflow_state/current`). Songs are persisted separately in a `songs` collection so your library survives across services.
- All slide positioning is percentage-based (0–100 of a virtual 1920×1080 canvas), so the same numbers render identically in the small controller preview and the full-size OBS output.
