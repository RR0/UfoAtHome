export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
    <div id="scene-loader" class="scene-loader" role="progressbar" hidden></div>
  </div>
  <div id="ufo-slot"></div>
  <div id="hover-tooltip" class="hover-tooltip" hidden></div>
  <button id="credits-button" class="credits-btn" type="button" popovertarget="credits-panel" aria-label="Credits" title="Credits">©</button>
  <div id="credits-panel" class="credits-panel" popover>
    <ul id="credits-list" class="credits-list"></ul>
  </div>
</div>
`

export const css = `
:host {
  display: block;
}
/* What this scene owes for what it shows, behind a small button in its corner — the terrain's
   imagery, the map's, the models, the pictures of the place, a sound. Not printed over the picture:
   a licence in small type across the witness's map was in the way of what the map is for. Hidden
   when a composing element lists them in its own info panel (see ownCredits). */
.credits-btn {
  anchor-name: --credits-button;
  position: absolute;
  top: 0.5em;
  left: 0.5em;
  z-index: 3;
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 0.85em;
  line-height: 1;
  padding: 0;
}
.credits-btn[hidden] {
  display: none;
}
/* Only while the pointer is over the scene, as the playback controls are, or while it is in use:
   focused from the keyboard, or with its panel open. A touch screen has no hover to reveal it by,
   and keeps it shown. */
@media (hover: hover) {
  .credits-btn {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .stage:hover .credits-btn,
  .credits-btn:focus-visible,
  .stage:has(.credits-panel:popover-open) .credits-btn {
    opacity: 1;
  }
}
.credits-panel {
  padding: 0.5em 0.8em;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #222;
  max-width: 28em;
  max-height: 60vh;
  overflow-y: auto;
  font-size: 0.8em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@supports (position-area: bottom span-right) {
  .credits-panel:popover-open {
    position-anchor: --credits-button;
    inset: auto;
    position-area: bottom span-right;
    margin: 0.3em 0 0 0;
  }
}
.credits-list {
  margin: 0;
  padding-left: 1.2em;
}
/* The WIDGET's own box, which does not move when the instrument does. A camera's format changes
   the shape of the PICTURE, not the shape of the page: a square 126 frame or a phone held upright
   is letterboxed inside this box, leaving space to either side that is honest — it is sky the
   device never recorded. Without a definite height here the frame would size the widget instead,
   and choosing an Instamatic would double the height of the page. Ignored, as it should be,
   wherever a real height is imposed (fullscreen, or nested inside <rr0-scene>). */
.stage {
  position: relative;
  width: 100%;
  /* AUTO, with the aspect ratio deciding the height — never a percentage.
     A percentage height resolves against a parent whose own height this box is producing, and that
     cycle does not always settle the same way: in a page column 585 px wide it came out 851 px tall
     on rr0.org's case dossiers and 329 px in a bare page of the same width, from the same CSS. A
     portrait box for a 16:9 recording, with the overlay stretched two and a half times vertically
     over a 3D scene that had correctly reshaped itself to match. The ratio alone has no cycle to
     settle: the width is definite, so the height follows from it.
     The two places a real height IS imposed override this below — fullscreen, and (in
     ufoTemplate) an overlay stretched over an outer stage by inset:0. */
  height: auto;
  aspect-ratio: 640 / 360;
  /* What lets .frame measure the stage's height in its own width rule — see .frame. */
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The browser's own fullscreen UA styles force the fullscreened element (.stage) to fill the
   whole viewport (100vw/100vh) regardless of its content's aspect ratio — without this override
   .frame would stretch to match, distorting the 3D scene instead of just showing more/less of it.
   Centering .frame here (letterboxed, aspect-ratio-constrained) keeps its own 640:360 ratio. */
.stage:fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #000;
}
/* max-width/max-height are unconditional (not just a :fullscreen override) — see the identical
   comment in ufoTemplate.ts's own .frame rule; percentages are inert until .stage has a definite
   height (fullscreen here), so this is always safe. */
.frame {
  position: relative;
  /* Contained inside the stage's own box rather than sizing it: the HEIGHT is taken from the
     stage and the width follows the format, so a square or upright frame leaves space to either
     side instead of making the widget taller. Width first (100%) with a max-height cap would not
     do it — a max-height clamp does not shrink a definite width back, it just breaks the ratio. */
  /* A contain fit, in both orientations. The stage is a size container, so the frame's width is
     the smaller of the stage's width and the width the stage's HEIGHT allows at the frame's own
     ratio; the height follows from the ratio. Height-first with a max-width cap, as this was,
     kept the full height when the width capped it — a portrait phone in fullscreen had the frame
     390 × 664 for a 16:9 recording, the scene squeezed to a third of its width. A browser without
     container units (iOS before 16) keeps the plain width. */
  width: 100%;
  width: min(100%, calc(100cqh * var(--frame-aspect, 640 / 360)));
  height: auto;
  /* The instrument's own format — see Instruments.aspectOf. An eye and an unidentified camera
     have no frame of their own, and fall back to the shape this project draws its scene in. */
  aspect-ratio: var(--frame-aspect, 640 / 360);
  overflow: hidden;
}
/* Shown while the first frame waits for its sky (see SceneRenderer.onFirstFrameHold). Faded in after
   a moment, so a sky that is ready at once never flashes a spinner. */
.scene-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: scene-loader-spin 0.9s linear infinite, scene-loader-appear 0.2s ease-out 0.25s both;
  pointer-events: none;
  z-index: 1;
}
@keyframes scene-loader-spin {
  to { transform: rotate(360deg); }
}
@keyframes scene-loader-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}
#scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
/* A SIBLING of .frame (not nested inside it) — its containing block is .stage itself, so it
   always fills .stage's *current* box exactly: .frame's own letterboxed box in normal mode
   (where .stage's box equals .frame's, same as before), but the *full* fullscreen viewport when
   .stage is fullscreen. That's what lets the nested <rr0-ufo>'s own toolbar (anchored to *its*
   own .stage, which now spans this full box) reach the true screen edges too — its own
   :fullscreen CSS never actually applies here (only this outer #stage is ever the real
   browser-fullscreen element). Its .frame still needs to end up centered within that now
   oversized box, matching *this* outer .frame's own centered position exactly, or its canvas
   coordinates visibly misalign against this backdrop the instant .stage's height exceeds
   .frame's (every shape shifted by however far off-center .frame landed). aspect-ratio/max-*
   alone does NOT do that — they size .frame correctly but leave it at .stage's default
   top-left, block-flow position; ufoTemplate.ts's own .stage makes display:flex + centering
   unconditional (not gated on :fullscreen matching) specifically so this nested case gets the
   same centering this outer .stage only gets from :fullscreen. */
.ufo-overlay {
  position: absolute;
  inset: 0;
}
/* Positioned via left/top (set in JS, following the pointer) relative to .stage — an on-demand
   identification label (celestial body or decor object name — see SceneElement.
   handlePointerMove), not part of the rendered sky itself, so it sits above everything else and
   ignores pointer events (it must never itself be what a hover/click lands on). */
.hover-tooltip {
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
