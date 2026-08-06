export const html = `
<details open>
  <summary id="label-observation-group">Observation</summary>
  <div class="toolbar">
    <label><span id="label-import-file">Load JSON file</span> <input id="import-file" type="file" accept="application/json,.json"/></label>
    <label><span id="label-import-url">Or load from URL</span> <input id="import-url" type="url" placeholder="https://…/sighting.json"/></label>
    <button id="import-url-button" type="button">Load</button>
    <label><span id="label-description">Description</span> <textarea id="description" rows="2"></textarea></label>
    <label><span id="label-tags">Tags</span> <input id="tags" type="text" placeholder="comma-separated"/></label>
  </div>
</details>
<details open>
  <summary id="label-witness-group">Witness</summary>
  <div class="toolbar">
    <label><span id="label-witness-id">Witness ID</span> <input id="witnessId" type="text"/></label>
    <label><span id="label-witness-dir-name">Witness dir name</span> <input id="witnessDirName" type="text"/></label>
    <label><span id="label-witness-title">Witness title</span> <input id="witnessTitle" type="text"/></label>
    <label><span id="label-witness-last-name">Witness last name</span> <input id="witnessLastName" type="text"/></label>
    <label><span id="label-witness-first-names">Witness first names</span> <input id="witnessFirstNames" type="text" placeholder="comma-separated"/></label>
    <label><span id="label-case-id">Case ID</span> <input id="caseId" type="text"/></label>
    <label><span id="label-camera-device">Camera/video device</span> <input id="cameraDevice" type="range" min="0" max="2" step="0.1" value="0"/></label>
  </div>
</details>
<details open>
  <summary id="label-location-group">Location</summary>
  <div class="toolbar">
    <label><span id="label-lat">Latitude</span> <input id="lat" type="number" min="-90" max="90" step="0.0001" placeholder="lat"/></label>
    <label><span id="label-lng">Longitude</span> <input id="lng" type="number" min="-180" max="180" step="0.0001" placeholder="lng"/></label>
    <label><span id="label-heading">Heading</span> <input id="heading" type="number" min="0" max="360" step="1" placeholder="unknown"/> &deg;</label>
    <label><span id="label-pitch">Tilt</span> <input id="pitch" type="number" min="-90" max="90" step="1" value="0"/> &deg;</label>
  </div>
</details>
<details open>
  <summary id="label-temporal-group">Temporal</summary>
  <div class="toolbar">
    <label><span id="label-observation-time">Observation start</span>
      <input id="obs-time" type="text" placeholder="YYYY-MM-DDThh:mm[?~%] or hh:mm" title="EDTF — e.g. 1965-07-01T05:00, 2025-06? (uncertain), 2025~ (approximate), or just 05:00 if the date isn't known"/></label>
    <label><span id="label-observation-end-time">Observation end</span>
      <input id="obs-end-time" type="text" placeholder="YYYY-MM-DDThh:mm[?~%] or hh:mm" title="EDTF — e.g. 1965-07-01T05:10, 2025-06? (uncertain), 2025~ (approximate), or just 05:10 if the date isn't known"/></label>
    <label><span id="label-duration">Duration</span> <input id="durationSeconds" type="number" min="0" step="0.1" placeholder="observation length" aria-required="true"/> s</label>
  </div>
</details>
<details open>
  <summary id="label-circumstances-group">Circumstances</summary>
  <div class="toolbar">
    <span id="label-weather">Weather</span>
    <label><span id="label-cloud-cover">Cloud cover</span> <input id="cloudCover" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-cloud-darkness">Cloud darkness</span> <input id="cloudDarkness" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-precipitation-type">Precipitation</span>
      <select id="precipitationType">
        <option id="option-precipitation-none" value="none">None</option>
        <option id="option-precipitation-rain" value="rain">Rain</option>
        <option id="option-precipitation-snow" value="snow">Snow</option>
        <option id="option-precipitation-hail" value="hail">Hail</option>
      </select>
    </label>
    <label><span id="label-precipitation-intensity">Intensity</span> <input id="precipitationIntensity" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-wind-direction">Wind direction</span> <input id="windDirection" type="number" min="0" max="360" step="1" value="0"/> &deg;</label>
    <label><span id="label-wind-speed">Wind speed</span> <input id="windSpeed" type="number" min="0" max="30" step="0.5" value="0"/> m/s</label>
    <label><span id="label-storm">Storm</span> <input id="storm" type="checkbox"/></label>
    <label><span id="label-lens-flare-brightness">Light intensity</span> <input id="lensFlareBrightness" type="range" min="0" max="3" step="0.1" value="1"/></label>
  </div>
</details>
<details open>
  <summary id="label-shape-group">Shape</summary>
  <div class="toolbar">
    <div class="presets" role="group" aria-label="UFO shape">
      <button class="preset" id="preset-oval" type="button" data-preset="oval">Oval</button>
      <button class="preset" id="preset-saucer" type="button" data-preset="saucer">Saucer</button>
      <button class="preset" id="preset-triangle" type="button" data-preset="triangle">Triangle</button>
    </div>
    <label><span id="label-color">Color</span> <input id="color" type="color" value="#39ff14"/></label>
    <label><span id="label-transparency">Transparency</span> <input id="transparency" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-halo">Halo</span> <input id="haloScale" type="range" min="0" max="3" step="0.1" value="1.5"/></label>
    <label><span id="label-shape">Shape</span> <select id="source"></select></label>
    <button id="add-shape" type="button" class="icon-btn" title="Add shape" aria-label="Add shape">+</button>
    <button id="delete-shape" type="button" class="icon-btn" title="Delete shape" aria-label="Delete shape">🗑</button>
    <label><span id="label-shape-title">Name</span> <input id="shapeTitle" type="text"/></label>
    <button id="record" type="button" class="record-btn"></button>
    <label><span id="label-sampling-rate">Sampling rate</span> <input id="samplingRate" type="number" min="16" step="16" value="100"/> ms</label>
  </div>
</details>
<div id="ufo-slot"></div>
<div class="toolbar playback-row">
  <button id="play-pause" type="button" class="icon-btn" title="Play" aria-label="Play">▶</button>
  <span id="time-start" class="time-label">0:00</span>
  <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
  <span id="time-end" class="time-label">0:00</span>
  <button id="loop" type="button" class="icon-btn" title="Auto-replay" aria-label="Auto-replay" aria-pressed="true">↻</button>
</div>
<div class="export-row">
  <button id="export" type="button">Export JSON</button>
</div>
<div id="context-menu" class="context-menu" hidden role="menu">
  <button id="context-group" type="button" role="menuitem">Group</button>
  <button id="context-ungroup" type="button" role="menuitem">Ungroup</button>
  <hr/>
  <button id="context-bring-to-front" type="button" role="menuitem">Bring to front</button>
  <button id="context-send-to-back" type="button" role="menuitem">Send to back</button>
  <hr/>
  <button id="context-delete" type="button" role="menuitem" class="context-delete">Delete</button>
</div>
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
#lat, #lng, #heading, #pitch, #windDirection, #windSpeed {
  width: 6em;
}
#obs-time, #obs-end-time {
  width: 12em;
}
#witnessId, #witnessDirName, #witnessTitle, #witnessLastName, #witnessFirstNames, #caseId, #tags, #shapeTitle {
  width: 10em;
}
/* Shared by Duration (no sane default — real playback pacing needs some notion of the
   observation's length, so an empty value is flagged rather than just left blank) and the two
   EDTF date fields (rejected text that doesn't parse as EDTF — see UfoRecorderElement.
   applyEdtfTimeInput). Cleared automatically once the field holds a valid/derivable value.
   Light-mode colors by default (this widget has no fixed background of its own — every other
   input just inherits the host page's own light/dark styling — so a hardcoded dark fill here
   read as a stray dark box on a light host page); the dark-mode pair below is what was actually
   tuned for legibility earlier (white text on dark red), unchanged, just now gated correctly
   instead of always-on. Mirrors rr0.org's own site-wide theming convention — a light-mode
   default overridden inside a prefers-color-scheme:dark media query, not a manual toggle (see
   e.g. rr0.org's own link.css/rr0.css). */
input.invalid {
  border-color: #c33;
  background: #fde8e8;
  color: #611;
}
@media (prefers-color-scheme: dark) {
  input.invalid {
    background: #3a1414;
    color: #fff;
  }
}
#description {
  width: 16em;
  font: inherit;
}
details {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.5em 0.75em;
  margin: 0 0 0.5em;
}
details[open] {
  padding-bottom: 0.75em;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
details[open] summary {
  margin-bottom: 0.5em;
}
details > .toolbar {
  margin-bottom: 0;
}
#import-url {
  flex: 1 1 16em;
}
.export-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5em;
}
/* Below the rendered scene, not overlaid on it (unlike <rr0-ufo>'s own internal toolbar, hidden
   here via showToolbar — see UfoRecorderElement's constructor) — its seek bar needs the whole
   width for scrubbing, which would otherwise intercept shape drags near the bottom of the canvas. */
#seek {
  flex: 1;
}
.time-label {
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  min-width: 3em;
  text-align: center;
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
.icon-btn {
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
.icon-btn:disabled {
  cursor: default;
  opacity: 0.4;
}
/* position:fixed (viewport-relative), left/top set from the triggering pointer event's own
   clientX/clientY in JS — works the same regardless of which shadow tree this menu lives in or
   how the page has scrolled, unlike an absolutely-positioned element nested under this host. */
.context-menu {
  position: fixed;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 9em;
  padding: 0.3em 0;
  background: #fff;
  color: #222;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  font-size: 0.9em;
}
/* The [hidden] attribute's own display:none (from the browser's UA stylesheet) loses to the
   plain .context-menu rule above — a class selector outweighs an attribute selector at equal
   specificity-position, so display:flex won every time regardless of the hidden attribute,
   and the menu could never actually disappear no matter what toggled it (Escape, outside
   click, ...). This higher-specificity override is what actually lets [hidden] win. */
.context-menu[hidden] {
  display: none;
}
.context-menu button {
  display: block;
  width: 100%;
  padding: 0.4em 0.8em;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.context-menu button:hover {
  background: #eef;
}
.context-menu button:disabled {
  cursor: default;
  opacity: 0.4;
}
.context-menu button:disabled:hover {
  background: none;
}
.context-menu hr {
  width: 100%;
  margin: 0.3em 0;
  border: none;
  border-top: 1px solid #eee;
}
.context-delete {
  color: #c33;
}
`
