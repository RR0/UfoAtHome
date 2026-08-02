export const html = `
<div class="appearance">
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
  <button id="record" type="button">Record</button>
  <label>Sampling rate (ms) <input id="samplingRate" type="number" min="16" step="16" value="100"/></label>
</div>
<div id="player-slot"></div>
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
`
