# Mic Dancer — 3D avatar that dances to your music

A full-body 3D humanoid (Three.js) that listens to your microphone and dances
in real time. Bass drives the bounce/hips/knees, mids swing the arms, treble
bobs the head, and beat detection adds accents + a BPM estimate.

## Fully offline

Three.js is vendored in `vendor/` (`three.module.js` + `OrbitControls.js`), so
no internet connection is needed. The only runtime dependency is a browser with
WebGL and Web Audio (any modern browser).

## Run it

Microphone access requires a secure context, so serve over `http://localhost`
rather than opening the file directly:

```bash
cd dance-avatar
python3 -m http.server 8000
# open http://localhost:8000
```

(`localhost` counts as a secure context; opening via `file://` will block the mic.)

Then click **Start Listening**, allow microphone access, and play some music.

## Controls

- **Style** — cycle Groove / Bounce / Wave dance modes
- **Auto-Camera** — toggle the orbiting camera; when off, drag to orbit yourself
- HUD shows live bass / mid / treble levels, beat pulse, and estimated BPM

## Files

- `index.html` — the entire app (scene, avatar rig, audio analysis, animation)
- `vendor/three.module.js`, `vendor/OrbitControls.js` — bundled Three.js (MIT)
- `vendor/THREE.LICENSE` — Three.js license
