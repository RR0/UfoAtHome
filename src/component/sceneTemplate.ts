export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
  </div>
  <div id="ufo-slot"></div>
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
   own .stage, which now spans this full box) reach the true screen edges too — its :fullscreen
   CSS never actually applies here (only this outer #stage is ever the real browser-fullscreen
   element), but it doesn't need to: its .stage{height:100%} plus .frame's own aspect-ratio/max-*
   constraints do the same "contain, centered" fit unconditionally, driven purely by this host's
   now-definite size, not by :fullscreen matching inside its own shadow root. */
.ufo-overlay {
  position: absolute;
  inset: 0;
}
`
