export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="canvas" width="640" height="360"></canvas>
  </div>
  <div id="tooltip" class="tooltip" hidden></div>
  <!-- The corner's own row, rather than one absolutely-positioned button per corner: a second
       button placed by its own right offset would have to hardcode the first one's width, and
       every language names them differently the moment either grows a label. -->
  <div class="corner-buttons" id="corner-buttons">
    <button id="witness-map" type="button" title="Witness's position" aria-label="Witness's position" aria-pressed="false" hidden>🗺</button>
    <button id="fullscreen" type="button" title="Fullscreen" aria-label="Fullscreen">⛶</button>
  </div>
  <!-- Where the witness stood and which way they faced, on real ground — see WitnessMapRenderer.
       Under the buttons that toggle it, and inert to the pointer: the canvas beneath it is the
       recording, and clicking it plays. -->
  <div id="witness-map-panel" class="witness-map-panel" hidden>
    <canvas id="witness-map-canvas" width="240" height="240"></canvas>
  </div>
  <!-- What the account calls the moment now on screen (see Milestone) — above the controls rather
       than inside them, because it is a sentence and the toolbar is a row of buttons. Empty and
       hidden for the recordings that name no moment, which is most of them. -->
  <div id="milestone-caption" class="milestone-caption" hidden></div>
  <div class="toolbar" id="toolbar">
    <button id="play-pause" type="button" title="Play" aria-label="Play">▶</button>
    <span id="time-start" class="time-label" title="Current position">0:00</span>
    <!-- The bar and the marks over it share one box so a mark can be placed by percentage of the
         track. The input keeps its own full width inside it; the marks sit on top and only the
         marks themselves take a click. -->
    <div id="seek-track" class="seek-track">
      <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
      <div id="milestone-marks" class="milestone-marks"></div>
    </div>
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
   #stage while THAT is fullscreen): it lets .toolbar/.corner-buttons, anchored to .stage below,
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
   whole viewport (100vw/100vh) regardless of its content's aspect ratio. .toolbar/.corner-buttons
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
/* Hover feedback for the editor (<rr0-sighting-editor>): what the pointer is over is drawn INSIDE
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
   element (see SightingEditorElement) that drives its own external playback controls instead, since
   this overlay's flex:1 seek bar would otherwise intercept nearly the full width of the canvas's
   bottom edge, blocking shape drag/resize there. */
.toolbar.hidden {
  display: none;
}
/* Takes the width the bare <input id="seek"> used to take, so nothing else in the row moves. */
.seek-track {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.seek-track #seek {
  flex: 1;
  min-width: 0;
}
/* Over the bar, and transparent to the pointer except on a mark itself — dragging the bar between
   two moments has to keep working. */
.milestone-marks {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
}
.milestone-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  padding: 0;
  transform: translateX(-50%);
  border: none;
  background: none;
  cursor: pointer;
  pointer-events: auto;
  color: inherit;
  font: inherit;
  line-height: 0;
}
/* The mark itself is the thin line inside that hit area: a 2 px tick is impossible to hit with a
   finger, and a 10 px tick would hide the bar under it. */
.milestone-mark::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 15%;
  bottom: 15%;
  width: 2px;
  transform: translateX(-50%);
  background: #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}
.milestone-mark:hover::before, .milestone-mark:focus-visible::before {
  width: 4px;
}
.milestone-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.6em;
  padding: 0 0.8em;
  color: #fff;
  font-size: 0.85em;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}
/* Same trap as .toolbar.hidden above and .context-menu[hidden] in the editor: a class that sets
   its own display outranks the UA sheet's [hidden]. */
.milestone-caption[hidden] {
  display: none;
}
.milestone-caption b {
  font-weight: 700;
}
.stage:hover .auto-hide {
  opacity: 1;
  pointer-events: auto;
}
.corner-buttons {
  position: absolute;
  top: 0.4em;
  right: 0.4em;
  display: flex;
  gap: 0.3em;
}
/* Same trap as .toolbar.hidden and .milestone-caption[hidden]: a class or rule that sets its own
   display outranks the UA sheet's [hidden], and the map button is hidden for every recording that
   states no coordinates — which is most of them. */
.corner-buttons button[hidden] {
  display: none;
}
.corner-buttons button {
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
.corner-buttons button[aria-pressed="true"] {
  outline: 2px solid #39f;
}
/* Below the buttons that open it, same right edge. A share of the stage rather than a fixed pixel
   size, so it stays the same fraction of the picture in a 320 px embed and in fullscreen — but
   floored, since a map too small to tell a road from a wash is not worth the tiles it costs. */
.witness-map-panel {
  position: absolute;
  top: 2.7em;
  right: 0.4em;
  width: clamp(140px, 30%, 280px);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.55);
  /* The recording underneath stays clickable through it: this is something to look at, not
     something to operate. */
  pointer-events: none;
}
.witness-map-panel[hidden] {
  display: none;
}
.witness-map-panel canvas {
  display: block;
  width: 100%;
  height: 100%;
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
