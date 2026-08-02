export const html = `
<div class="stage">
  <canvas id="scene-canvas"></canvas>
  <div id="player-slot"></div>
</div>
`

export const css = `
:host {
  display: block;
}
.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 640 / 360;
  overflow: hidden;
}
#scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.player-overlay {
  position: absolute;
  inset: 0;
}
`
