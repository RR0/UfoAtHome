export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="canvas" width="640" height="360"></canvas>
  </div>
  <div id="tooltip" class="tooltip" hidden></div>
  <button id="fullscreen" class="fullscreen-btn" type="button" title="Fullscreen" aria-label="Fullscreen">⛶</button>
  <div class="toolbar" id="toolbar">
    <button id="play-pause" type="button" title="Play" aria-label="Play">▶</button>
    <span id="time-start" class="time-label" title="Current position">0:00</span>
    <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
    <span id="time-end" class="time-label" title="Duration">0:00</span>
    <button id="loop" type="button" title="Auto-replay" aria-label="Auto-replay" aria-pressed="true">↻</button>
  </div>
</div>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
/* height:100% is a no-op fallback (resolves to auto) whenever .stage's own parent/host has no
   definite height of its own (the normal, standalone case — .stage's height stays driven by
   .frame's content, unchanged) — but it matters when this element is embedded with a definite
   host size from outside (e.g. <rr0-scene>'s .ufo-overlay sizing this element to fill its own
   #stage while THAT is fullscreen): it lets .toolbar/.fullscreen-btn, anchored to .stage below,
   actually reach that outer element's true edges instead of only .frame's letterboxed ones.
   display:flex + centering is unconditional (not just under :fullscreen below) for the same
   nested-embedding case: this .stage is never itself the real fullscreen element when nested
   inside <rr0-scene>'s .ufo-overlay (only the *outer* stage is, so :fullscreen never matches
   here even while genuinely full-viewport-sized) — without this, .frame just sat at .stage's
   top-left in that oversized box instead of centered, misaligning every shape's canvas
   coordinates against the outer 3D scene's own (correctly centered) letterboxed content the
   instant .stage's height actually exceeds .frame's. Harmless in the normal standalone case:
   .stage's height already matches .frame's exactly there (see above), so there's no extra
   space to center within regardless. */
/* The WIDGET's own box, which does not move when the instrument does. A camera's format changes
   the shape of the PICTURE, not the shape of the page: a square 126 frame or a phone held upright
   is letterboxed inside this box, leaving space to either side that is honest — it is sky the
   device never recorded. Without a definite height here the frame would size the widget instead,
   and choosing an Instamatic would double the height of the page. Ignored, as it should be,
   wherever a real height is imposed (fullscreen, or nested inside <rr0-scene>). */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 640 / 360;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The browser's own fullscreen UA styles force the fullscreened element (.stage) to fill the
   whole viewport (100vw/100vh) regardless of its content's aspect ratio. .toolbar/.fullscreen-btn
   are anchored to .stage itself (not .frame) specifically so they stay pinned to the true screen
   edges, full width, like a normal video player's controls — not stuck to the letterboxed
   content's own (possibly smaller, centered) box above/around them. */
.stage:fullscreen {
  width: 100vw;
  height: 100vh;
  background: #000;
}
/* max-width/max-height are unconditional (not just a :fullscreen override): percentages resolve
   against .stage's height, which is only definite when .stage itself has one (fullscreen, or the
   nested-in-<rr0-scene> case above) — otherwise they're inert, so this is always safe. When
   definite, the browser's aspect-ratio/min-max interplay algorithm correctly derives whichever
   of width/height is the tighter constraint from the other — a real "contain, centered" fit,
   not just a single-axis cap that can let the other axis overflow and crop instead of shrink. */
.frame {
  /* Contained inside the stage's own box rather than sizing it: the HEIGHT is taken from the
     stage and the width follows the format, so a square or upright frame leaves space to either
     side instead of making the widget taller. Width first (100%) with a max-height cap would not
     do it — a max-height clamp does not shrink a definite width back, it just breaks the ratio. */
  height: 100%;
  width: auto;
  max-width: 100%;
  /* The instrument's own format — see Instruments.aspectOf. An eye and an unidentified camera
     have no frame of their own, and fall back to the shape this project draws its scene in. */
  aspect-ratio: var(--frame-aspect, 640 / 360);
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--ufo-canvas-background, #050510);
  border: var(--ufo-canvas-border, 1px solid #333);
  box-sizing: border-box;
}
/* Hover feedback for the editor (<rr0-ufo-recorder>): what the pointer is over is drawn INSIDE
   the canvas, so only script can hit-test it — but the appearance stays here, in CSS. The
   component only ever states what is under the pointer (data-cursor="move", "resize-ns", ...);
   which actual cursor that means is this stylesheet's business alone. Plain <rr0-ufo> playback
   never sets the attribute, so it keeps the default arrow throughout.
   Directions are SCREEN axes, already accounting for the shape's own rotation (see
   ShapeHandles.resizeAxisFor) — a 45-degree-rotated shape's top-left handle really does resize
   along the screen's north-east/south-west diagonal, so that is the cursor it gets. */
canvas[data-cursor="record"] {
  cursor: crosshair;
}
canvas[data-cursor="select"] {
  cursor: pointer;
}
canvas[data-cursor="move"] {
  cursor: move;
}
canvas[data-cursor="vertex"] {
  cursor: cell;
}
canvas[data-cursor="pan"] {
  cursor: grab;
}
canvas[data-cursor="panning"] {
  cursor: grabbing;
}
canvas[data-cursor="resize-ew"] {
  cursor: ew-resize;
}
canvas[data-cursor="resize-ns"] {
  cursor: ns-resize;
}
canvas[data-cursor="resize-nwse"] {
  cursor: nwse-resize;
}
canvas[data-cursor="resize-nesw"] {
  cursor: nesw-resize;
}
/* No native CSS cursor means "rotate", so this one is drawn here: a circular arrow, white with a
   black outline so it stays readable over both a bright daytime sky and a night one. 12 12 is its
   hotspot (the 24x24 image's own center, i.e. the middle of the circle it draws). The grab
   fallback applies if the data URI cursor is ever rejected. */
canvas[data-cursor="rotate"] {
  cursor: url("data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2224%22%20height=%2224%22%3E%3Cpath%20d=%22M12%205A7%207%200%201%201%206.1%208.5%22%20fill=%22none%22%20stroke=%22%23000%22%20stroke-width=%224%22%20stroke-linecap=%22round%22/%3E%3Cpath%20d=%22M12%201.5%2012%208.5%2017%205Z%22%20fill=%22%23000%22%20stroke=%22%23000%22%20stroke-width=%223%22%20stroke-linejoin=%22round%22/%3E%3Cpath%20d=%22M12%205A7%207%200%201%201%206.1%208.5%22%20fill=%22none%22%20stroke=%22%23fff%22%20stroke-width=%221.6%22%20stroke-linecap=%22round%22/%3E%3Cpath%20d=%22M12%201.5%2012%208.5%2017%205Z%22%20fill=%22%23fff%22/%3E%3C/svg%3E") 12 12, grab;
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
/* A compound class selector (0,2,0) so this reliably beats the plain .toolbar rule above (0,1,0)
   regardless of declaration order — set via UfoElement's showToolbar setter by a composing
   element (see UfoRecorderElement) that drives its own external playback controls instead, since
   this overlay's flex:1 seek bar would otherwise intercept nearly the full width of the canvas's
   bottom edge, blocking shape drag/resize there. */
.toolbar.hidden {
  display: none;
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
.toolbar button:disabled {
  cursor: default;
  opacity: 0.4;
}
.time-label.switchable {
  cursor: pointer;
}
.time-label.switchable:hover,
.time-label.switchable:focus-visible {
  text-decoration: underline;
}
.time-label {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  min-width: 3em;
  text-align: center;
}
.tooltip {
  position: absolute;
  z-index: 1;
  padding: 0.2em 0.5em;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-family: sans-serif;
  font-size: 0.85em;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
}
`
