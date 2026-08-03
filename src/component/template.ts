export const html = `
<div class="appearance">
  <div class="presets" role="group" aria-label="UFO shape">
    <button class="preset" id="preset-oval" type="button" data-preset="oval">Oval</button>
    <button class="preset" id="preset-saucer" type="button" data-preset="saucer">Saucer</button>
    <button class="preset" id="preset-triangle" type="button" data-preset="triangle">Triangle</button>
  </div>
  <label><span id="label-color">Color</span> <input id="color" type="color" value="#39ff14"/></label>
  <label><span id="label-transparency">Transparency</span> <input id="transparency" type="range" min="0" max="1" step="0.05" value="0"/></label>
  <label><span id="label-halo">Halo</span> <input id="haloScale" type="range" min="0" max="3" step="0.1" value="1.5"/></label>
</div>
<div class="toolbar">
  <button id="record" type="button" class="record-btn"></button>
  <label><span id="label-shape">Shape</span> <select id="source"></select></label>
  <button id="add-shape" type="button">Add shape</button>
  <label><span id="label-sampling-rate">Sampling rate (ms)</span> <input id="samplingRate" type="number" min="16" step="16" value="100"/></label>
  <label><span id="label-duration">Duration (s)</span> <input id="durationSeconds" type="number" min="0" step="0.1" placeholder="recording length"/></label>
  <button id="export" type="button">Export JSON</button>
</div>
<div id="ufo-slot"></div>
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
.record-btn {
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
  color: #e33;
}
`
