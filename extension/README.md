# Vocodex browser extension

Reads any web page aloud with your Vocodex server, highlighting the sentence
and the word being said, like the reader of the app. One codebase builds for
Chromium (Chrome, Edge, Brave…) and Firefox, with [WXT](https://wxt.dev).

It stands on its own: nothing outside of this folder is needed to build it,
not even the `frontend/` of the app.

## How it works

- The extension is **off on every web page by default**. It is switched on
  or off for the page from the extension window (the popup of the toolbar
  button).
- Once on, the extension window holds the controls: **voice**, **speed**,
  **play / pause**, **forward**, **backward** and **auto scroll**. Voice and
  speed are picked with the same selects as the app.
- Hovering the text of the page highlights the sentence under the mouse, and
  **clicking it skips to that text**, like clicking a sentence in the app.
- The sentence being read and the word being said are highlighted as the
  voice goes. With auto scroll on (the default, like the app), the page
  scrolls to follow them.

## Build

```bash
cd extension
npm install      # once
npm run build    # builds both browsers
```

That gives `.output/chrome-mv3` (Chrome, Edge, Brave…) and
`.output/firefox-mv2` (Firefox). `npm run build:chrome` and
`npm run build:firefox` build only one.

## Setup

The extension talks to the backend of your Vocodex server (the same address
as `VITE_API_URL`, `http://localhost:8000` by default). Change it in the
**Server** field of the extension window.

### Try it in Chromium

```bash
npm run dev      # opens a Chromium with the extension loaded, reloading on changes
```

To load a build: `chrome://extensions` → enable *Developer mode* → *Load
unpacked* → pick `extension/.output/chrome-mv3`.

### Try it in Firefox

```bash
npm run dev:firefox   # opens a separate Firefox with the extension loaded
```

To load a build: `about:debugging#/runtime/this-firefox` → *Load Temporary
Add-on…* → pick `extension/.output/firefox-mv2/manifest.json`.

### Package for the stores

```bash
npm run zip   # one zip for the Chrome Web Store, one for addons.mozilla.org
              # (plus the sources zip AMO asks for)
```

## Tests

```bash
cd extension
npx vitest --run
npm run typecheck
```

## Inside

| Part | File | What it does |
| --- | --- | --- |
| Popup | `entrypoints/popup/` | The extension window: on/off switch and the controls |
| Reader | `entrypoints/reader.content.ts` | Added to the page when switched on (`activeTab`, so no access to any site until then) |
| Background | `entrypoints/background.ts` | Calls the server and routes the audio |
| Offscreen | `entrypoints/offscreen/` | Chrome only: plays the audio, which a service worker cannot. Firefox plays it from its background page |

- `utils/pageText.ts` reads the text of the page (the article when there is
  one) into a single string, keeping where each text node starts, so an
  offset of the text gives back a `Range` of the page.
- The page is chunked and the voice's word timings are matched to the text
  like an entry of the app. `utils/splitIntoChunks.ts`, `utils/wordTiming.ts`,
  `utils/speed.ts`, `utils/playAudio.ts` and `utils/chunks.ts` are copies of
  the app's `frontend/src/utils`, with their tests.
- Voice and speed are picked with copies of the app's `VoiceSelect` and
  speed select (`components/`), with HeroUI and the app's colors (`hero.ts`),
  so they work like in the app.
- These copies are kept on purpose, so the extension builds on its own. When
  one changes in the app, change it here too. `tests/standalone.test.ts`
  fails if a file of the extension reaches outside of its folder.
- Highlights use the
  [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API):
  the page itself is never changed, so the scripts of the site do not break.
- The audio plays from a page of the extension, so the CSP of the site
  cannot block it. One tab plays at a time: playing in a tab stops the
  other.

## Known limits

- Pages that change their text while being read (infinite scroll, live
  apps) are read as they were when switched on.
- Text inside iframes and shadow DOM is not read.
- The PDF viewer of the browser cannot be read: open the PDF in Vocodex.
- Browser pages (`chrome://`, the extension stores) cannot be read.
