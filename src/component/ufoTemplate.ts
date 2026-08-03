export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="canvas" width="640" height="360"></canvas>
    <button id="fullscreen" class="fullscreen-btn" type="button" title="Fullscreen" aria-label="Fullscreen">⛶</button>
    <div class="toolbar" id="toolbar">
      <button id="play-pause" type="button" title="Play" aria-label="Play">▶</button>
      <span id="time-start" class="time-label" title="Current position">0:00</span>
      <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
      <span id="time-end" class="time-label" title="Duration">0:00</span>
      <button id="loop" type="button" title="Auto-replay" aria-label="Auto-replay" aria-pressed="true">↻</button>
    </div>
  </div>
</div>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
.stage {
  width: 100%;
}
/* The browser's own fullscreen UA styles force the fullscreened element (.stage) to fill the
   whole viewport (100vw/100vh) regardless of its content's aspect ratio. Without this override,
   .frame (and everything glued to its edges, like .toolbar) would stay at its normal small size
   while .stage stretches around it, leaving a visible gap between the canvas and the toolbar —
   centering .frame here (letterboxed, aspect-ratio-constrained) keeps them visually joined. */
.stage:fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #000;
}
.frame {
  position: relative;
  width: 100%;
}
.stage:fullscreen .frame {
  width: auto;
  height: 100%;
  max-width: 100%;
}
canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 640 / 360;
  background: var(--ufo-canvas-background, #050510);
  border: var(--ufo-canvas-border, 1px solid #333);
  box-sizing: border-box;
}
.stage:fullscreen canvas {
  width: auto;
  height: 100%;
}
.toolbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.4em 0.6em;
  background: rgba(0, 0, 0, 0.55);
  transition: opacity 0.15s ease;
}
/* While playing, the toolbar and fullscreen button auto-hide and only reappear on hover — kept
   always visible while paused/stopped, since that's when the user is most likely to want them.
   Deliberately hover-only, not :focus-within: a clicked button/range input keeps keyboard focus
   after the pointer moves away, which would otherwise keep them stuck visible indefinitely after
   any interaction. */
.auto-hide {
  opacity: 0;
  pointer-events: none;
}
.stage:hover .auto-hide {
  opacity: 1;
  pointer-events: auto;
}
.fullscreen-btn {
  position: absolute;
  top: 0.4em;
  right: 0.4em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  padding: 0;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  transition: opacity 0.15s ease;
}
input[type=range] {
  flex: 1;
}
.toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  padding: 0;
  border-radius: 3px;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
}
.toolbar button[aria-pressed="true"] {
  outline: 2px solid #39f;
}
.time-label {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  min-width: 3em;
  text-align: center;
}
`
