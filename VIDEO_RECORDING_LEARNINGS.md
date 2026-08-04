# Video recording — learnings & the state of the camera/screen feature

This documents what we learned building the in-app video recorder
(`apps/cv-generator/src/components/VideoStudioModal.jsx`): what works, what the
browser platform will and won't let us do, the dead ends we hit (so nobody
re-walks them), and what still needs figuring out. Most of the pain was
**Safari-specific** — it was the primary test browser.

> TL;DR: **CV walkthrough** (composite the CV + webcam onto a canvas, record that)
> is the reliable, no-surprises mode. **Screen sharing** works but is deliberately
> kept dumb-simple — screen + voice, no floating webcam, stop via the browser's own
> control — because everything "clever" (floating webcam, cross-tab controls,
> dynamic favicons) fights Safari and loses. The feature has **only been tested on
> macOS Safari**; a real cross-browser + mobile pass is still owed (see the last
> section).

---

## The three record modes

| Mode | How it records | Reliability | Notes |
|------|----------------|-------------|-------|
| **CV walkthrough** (`'cv'`) | Draws CV PDF pages + webcam bubble onto a `<canvas>`, records it via `canvas.captureStream(30)` + mic | **High** | No PiP, no tab-switching, face always in frame. The one to recommend. Near-fullscreen for scroll room. |
| **Screen** (`'screen'`) | Records the `getDisplayMedia` display track **directly** + mic | **High for capture**, awkward for control | Whole-screen/window/tab. No webcam (cut on purpose). Stop = browser's native control. |
| **Just me** (`'me'`) | Records the raw `getUserMedia` camera+mic stream | **Medium** (Safari camera-track quirk, see below) | Simple talking-head. |

---

## What works

- **`getDisplayMedia` recorded directly.** Recording the shared display track
  (not a canvas copy of it) never freezes when you switch tabs and captures the
  real cursor (`cursor: 'always'`). Recording a *canvas* that mirrors the screen
  froze the moment the tab backgrounded (rAF pauses) — abandoned.
- **CV-page + webcam canvas composite.** Rendering the CV to a PDF (`renderPdfBlob`),
  rasterizing pages with pdf.js, and compositing them + the webcam onto a canvas
  is robust and gives us full control (scroll, highlighted cursor). This is the
  strongest part of the feature.
- **Screen + voice.** `getDisplayMedia({audio})` for tab/system audio mixed with
  `getUserMedia({audio})` mic via a WebAudio `MediaStreamDestination`.
- **Native "Stop sharing" ends the take.** `displayTrack.addEventListener('ended', …)`
  reliably fires when the user stops sharing via the browser/OS, and we finish the
  recording + show review. This is the one cross-window stop that always works.
- **MediaRecorder MP4-preferred.** `pickMime()` prefers `video/mp4;h264,aac` so the
  raw-served file plays everywhere incl. Safari; falls back to webm.
- **Tab title flag while recording.** Setting `document.title = '🔴 Recording…'`
  works and is visible on the active tab and in Safari's tab-overview (⌘⇧\).
- **Portaling fixed-position UI to `document.body`.** The recording pill was
  z-index 300 but trapped in the sidebar's stacking context (below the footer's
  z-index 100). `createPortal(pill, document.body)` fixes it cleanly. **Lesson:
  a high z-index means nothing if an ancestor creates a stacking context.**

---

## What doesn't work / hard platform limits

These are **browser limitations**, not bugs we can code around:

1. **You cannot float clickable controls over other tabs/windows on Safari.**
   The only web API that can is **Document Picture-in-Picture — Chromium-only**.
   So any in-app Pause/Stop/operator bar is visible **only on the recorder tab**.
   The moment the user presents on another tab/app, our controls are gone. The
   *only* control that survives across windows is the browser's own screen-share
   stop.

2. **Native video Picture-in-Picture (the "floating webcam bubble") is unreliable
   on Safari.** We tried hard and **removed it from screen mode**:
   - The bubble **froze/blacked** when the recorder tab was backgrounded — Safari
     throttles background tabs and pauses their `<video>` elements, and the PiP
     source is one of those elements.
   - The **⧉ "return to tab"** button behaved inconsistently (sometimes minimized
     the PiP instead of switching back to the tab; a backgrounded page can't
     force-focus itself).
   - Trying to repurpose the bubble's **pause** control as "go back" **misfired**
     on throttle-induced auto-pauses (couldn't distinguish user-pause from
     Safari auto-pause), which is what made the bubble vanish.
   - Net: a floating face in a *whole-screen* recording is only truly reliable via
     the **canvas composite** (i.e. CV-walkthrough mode), not PiP.

3. **Dynamic favicons are unreliable on Safari.** We tried SVG data-URI → PNG
   data-URI → object URL + replacing the `<link>` node. Chrome/Firefox update
   fine; **Safari frequently ignores it**, especially on `http://localhost`.
   Libraries built for this (favico.js, tinycon) list Safari as unsupported. The
   title flag is the dependable fallback.

4. **`getUserMedia` camera tracks can go black on Safari** if no `<video>` element
   is actively *rendering* the track — `MediaRecorder` consuming it alone isn't
   always enough. Fix that worked: keep the camera `<video>` on-screen and force
   `onLoadedMetadata → play()` (the CV composite already did this via its hidden-
   but-rendered `studio-camunder` element; "just me" needed the same treatment).

5. **Finding the recorder tab among many is genuinely hard.** With ~15+ tabs, an
   inactive tab shows only its favicon (title hidden). Title 🔴 helps only when
   active/wide or in the tab-overview; the favicon 🔴 would help everywhere but is
   the unreliable-on-Safari item above.

---

## Dead ends we walked (don't redo these)

- **Recording a canvas mirror of the shared screen** → froze on tab switch (rAF
  throttling). Record the display track directly instead.
- **Native PiP face bubble for screen sharing** → froze/black + ⧉ + pause-return
  misfires. Cut it; use CV-walkthrough for a face-in-frame.
- **"Pause the bubble = return to recorder" heuristic** → fired on Safari's
  background throttle auto-pause; killed the bubble.
- **Opening the clean CV in preview tabs (share link + PDF) to present** → added
  focus-stealing, popup-blocking, and tab-juggling complexity; removed for
  simplicity. (The share-link creation code still exists via `/api/cv/share`.)
- **In-app cross-tab Stop** → impossible on Safari; lean on the native stop.
- **Recording the same MediaStream that's live in a preview `<video>`** → Safari
  (and some Chromium builds) silently drop the audio track, so "just me" clips
  came out silent. Always hand `MediaRecorder` a **freshly built** stream
  (`new MediaStream([...getVideoTracks(), ...getAudioTracks()])`) — never the raw
  getUserMedia object that an element is also playing. Screen/CV modes did this
  already; "just me" was the one passing the raw stream. (Fixed `5a96a45`.)

---

## Design decisions that stuck

- **Simplicity over cleverness for screen mode.** Screen + voice, native picker,
  native stop. A small bottom-left operator pill is a *convenience* for when you're
  on the recorder tab — not the primary control.
- **CV walkthrough is the "just works" path** and should be presented as such.
- **Lean on native browser affordances** (the screen-share picker, the native
  Stop control) rather than reimplementing them in-page.

---

## What still needs figuring out (future work)

1. **Cross-browser + mobile testing** — see the matrix below. This is the biggest
   gap: everything above was validated (or found broken) on **macOS Safari only**.
2. **Chromium-only upgrade path:** on Chrome/Edge, **Document Picture-in-Picture**
   could give a genuine always-on-top control bar (Pause/Stop that follows you
   across tabs). Worth adding *behind feature detection* while keeping the simple
   native path for Safari/Firefox. This is the single biggest UX win available and
   was deferred purely for cross-browser simplicity.
3. **Reliable "return to / find the recorder tab":** re-test the favicon swap on
   **https production Safari** (localhost/http may be the culprit). If still flaky,
   consider a periodic title tick or accept the tab-overview as the answer.
4. **Video hosting:** currently uploads to R2/Cloudflare via `/api/cv/video/upload-url`
   with a graceful fallback to a **local session blob** (lost on refresh). The real
   hosting path needs config + end-to-end testing. See `VIDEO_HOSTING.md`.
5. **Codec compatibility:** Firefox records **webm only**, which some Safari viewers
   can't play. We warn, but a server-side transcode-to-MP4 would remove the
   caveat.
6. **Permissions recovery UX:** a mistaken "Never allow camera" is recoverable only
   deep in Safari's per-site settings. Consider detecting `NotAllowedError` and
   showing inline, browser-specific recovery steps.
7. **Duration metadata:** MediaRecorder blobs report `duration: Infinity`; we hack
   around it by seeking to the end. Keep an eye on it across browsers.

---

## Cross-browser testing — what to check (and why it matters)

**Test matrix:** macOS Safari, Chrome, Edge, Firefox (desktop) + iOS Safari,
Android Chrome (mobile). The feature's behavior genuinely diverges per engine:

| Capability | Safari | Chrome/Edge | Firefox | iOS Safari |
|-----------|--------|-------------|---------|-----------|
| `getDisplayMedia` (screen share) | Yes (stop UI subtle) | Yes (prominent "Stop sharing" bar) | Yes | **No — unsupported** |
| Native video PiP | Yes, but throttles in bg | Yes | Non-scriptable | Limited |
| **Document PiP** (floating controls) | **No** | **Yes** | No | No |
| MediaRecorder MP4 | Yes | Yes | **webm only** | varies |
| Dynamic favicon | **Flaky** | Reliable | Reliable | Flaky |
| Camera track needs rendered `<video>` | Yes (quirk) | Tolerant | Tolerant | Yes |

**Key takeaways for testing:**
- **iOS has no `getDisplayMedia`** — screen mode must degrade gracefully (offer
  CV walkthrough / just-me only, or a clear "not supported on this device").
  Feature-detect `navigator.mediaDevices.getDisplayMedia` and gate the UI.
- **Chrome/Edge get a much better native stop bar** than Safari — the "how do I
  stop" problem is largely Safari-only. Consider browser-specific copy.
- **Firefox webm** — verify recorded clips play back for the intended viewers, or
  transcode.
- **Verify the recorder pill (portaled) sits above the footer** and other overlays
  in each browser — stacking contexts differ.
- **Test the throttling story** in each browser: start a whole-screen recording,
  switch to another tab/app for 30s+, come back — confirm the recording didn't
  freeze and the take is intact (the direct-display-track approach should hold).
- **Permissions:** test first-time grant, deny, and "never allow" recovery per
  browser.

**My recommendation:** feature-detect each capability and degrade gracefully
rather than assuming Safari's constraints everywhere. Publish a short "supported
browsers / known limits" note for the feature, and prioritize the **Chromium
Document-PiP** control bar next — it removes the single most persistent piece of
friction (controlling/finding the recording once you've navigated away) for the
majority of users, without touching the Safari path.
