export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
  </div>
  <div id="ufo-slot"></div>
  <div id="hover-tooltip" class="hover-tooltip" hidden></div>
</div>
`

export const css = `
:host {
  display: block;
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
  height: 100%;
  aspect-ratio: 640 / 360;
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
  height: 100%;
  width: auto;
  max-width: 100%;
  /* The instrument's own format — see Instruments.aspectOf. An eye and an unidentified camera
     have no frame of their own, and fall back to the shape this project draws its scene in. */
  aspect-ratio: var(--frame-aspect, 640 / 360);
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
