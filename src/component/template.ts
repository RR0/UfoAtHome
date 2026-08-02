export const html = `
<div class="toolbar">
  <button id="record" type="button">Record</button>
  <button id="play" type="button">Play</button>
  <button id="pause" type="button">Pause</button>
  <label>Sampling rate (ms) <input id="samplingRate" type="number" min="16" step="16" value="100"/></label>
  <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
</div>
<canvas id="canvas" width="640" height="360"></canvas>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
}
canvas {
  background: #050510;
  border: 1px solid #333;
  touch-action: none;
  cursor: crosshair;
}
input[type=range] {
  flex: 1;
}
`
