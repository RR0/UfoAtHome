export const html = `
<div class="stage">
  <canvas id="canvas" width="640" height="360"></canvas>
  <div class="toolbar">
    <button id="play-pause" type="button" title="Play" aria-label="Play">▶</button>
    <span id="time-start" class="time-label">0:00</span>
    <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
    <span id="time-end" class="time-label">0:00</span>
    <button id="loop" type="button" title="Loop" aria-label="Loop" aria-pressed="true">↻</button>
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
.time-label {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  min-width: 3em;
  text-align: center;
}
`
