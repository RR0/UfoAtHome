export const html = `
<div class="stage">
  <canvas id="canvas" width="640" height="360"></canvas>
  <div class="toolbar">
    <button id="play" type="button">Play</button>
    <button id="pause" type="button">Pause</button>
    <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
  </div>
</div>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
.stage {
  position: relative;
  width: 100%;
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
}
input[type=range] {
  flex: 1;
}
`
