export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
  </div>
  <div id="ufo-slot"></div>
  <div id="body-tooltip" class="body-tooltip" hidden></div>
</div>
`

export const css = `
:host {
  display: block;
}
.stage {
  position: relative;
  width: 100%;
  height: 100%;
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
  width: 100%;
  max-width: 100%;
  aspect-ratio: 640 / 360;
  max-height: 100%;
  overflow: hidden;
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
   identification label, not part of the rendered sky itself, so it sits above everything else and
   ignores pointer events (it must never itself be what a hover/click lands on). */
.body-tooltip {
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
