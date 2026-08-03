export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
    <div id="ufo-slot"></div>
  </div>
</div>
`

export const css = `
:host {
  display: block;
}
.stage {
  width: 100%;
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
.frame {
  position: relative;
  width: 100%;
  aspect-ratio: 640 / 360;
  overflow: hidden;
}
.stage:fullscreen .frame {
  width: auto;
  height: 100%;
  max-width: 100%;
}
#scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.ufo-overlay {
  position: absolute;
  inset: 0;
}
`
