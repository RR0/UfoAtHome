export const html = `
<div class="appearance record-only">
  <div class="presets" role="group" aria-label="UFO shape">
    <button class="preset" id="preset-oval" type="button" data-preset="oval">Oval</button>
    <button class="preset" id="preset-saucer" type="button" data-preset="saucer">Saucer</button>
    <button class="preset" id="preset-triangle" type="button" data-preset="triangle">Triangle</button>
  </div>
  <label>Color <input id="color" type="color" value="#39ff14"/></label>
  <label>Transparency <input id="transparency" type="range" min="0" max="1" step="0.05" value="0"/></label>
  <label>Halo <input id="haloScale" type="range" min="0" max="3" step="0.1" value="1.5"/></label>
</div>
<div class="toolbar">
  <button id="record" class="record-only" type="button">Record</button>
  <button id="play" type="button">Play</button>
  <button id="pause" type="button">Pause</button>
  <label class="record-only">Sampling rate (ms) <input id="samplingRate" type="number" min="16" step="16" value="100"/></label>
  <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
</div>
<canvas id="canvas" width="640" height="360"></canvas>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
.appearance, .toolbar {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
  flex-wrap: wrap;
}
.presets {
  display: flex;
  gap: 0.25em;
}
button.preset {
  cursor: pointer;
}
button.preset[aria-pressed="true"] {
  outline: 2px solid #39f;
  font-weight: bold;
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
/* mode="viewer" is a read-only embed for site pages: shape/appearance editing and
   recording controls are hidden, only playback (Play/Pause/seek) remains. */
:host([mode="viewer"]) .record-only {
  display: none;
}
`
