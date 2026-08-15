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
    <button id="add-decor-witness" type="button">Add witness</button>
    <label><span id="label-decor-sighting-url">Witness's own recording URL</span> <input id="decorSightingUrl" type="url" placeholder="https://…/sighting.json"/></label>
  </div>
</details>
<details open>
  <summary id="label-location-group">Location</summary>
  <div class="toolbar">
    <label><span id="label-lat">Latitude</span> <input id="lat" type="number" min="-90" max="90" step="0.0001" placeholder="lat"/></label>
    <label><span id="label-lng">Longitude</span> <input id="lng" type="number" min="-180" max="180" step="0.0001" placeholder="lng"/></label>
    <label><span id="label-heading">Heading</span> <input id="heading" type="number" min="0" max="360" step="1" placeholder="unknown"/> &deg;</label>
    <label><span id="label-pitch">Tilt</span> <input id="pitch" type="number" min="-90" max="90" step="1" value="0"/> &deg;</label>
    <fieldset class="decor-fieldset">
      <legend id="label-decor-fieldset">Decor</legend>
      <!-- This whole block (picker through Occupied floor) is hidden entirely — not just
           disabled — while there's no decor at all (see UfoRecorderElement.syncDecorVisibility):
           an empty recording shows nothing here but the Add controls below. Shown first, above
           the Add row, once at least one decor object exists — see that row's own comment for why
           it's forced onto its own line after this block instead of just flowing after it. -->
      <label><span id="label-decor">Decor</span> <select id="decor"></select></label>
      <button id="delete-decor" type="button" class="icon-btn" title="Delete decor" aria-label="Delete decor">🗑</button>
      <label><span id="label-decor-title">Name</span> <input id="decorTitle" type="text"/></label>
      <label><span id="label-decor-east">Distance east</span> <input id="decorEast" type="number" step="0.5" value="0"/> m</label>
      <label><span id="label-decor-north">Distance north</span> <input id="decorNorth" type="number" step="0.5" value="0"/> m</label>
      <label><span id="label-decor-heading">Heading</span> <input id="decorHeading" type="number" min="0" max="360" step="1" value="0"/> &deg;</label>
      <label><span id="label-decor-lit">Lit</span> <input id="decorLit" type="checkbox"/></label>
      <label><span id="label-decor-floors">Floors</span> <input id="decorFloors" type="number" min="0" max="20" step="1" value="2"/></label>
      <span id="label-decor-windows">Windows</span>
      <!-- autocomplete="off" on all 4: without it, browsers reliably re-suggest/autofill whatever
           value was last typed into a field with this exact id from earlier in the same session
           (e.g. "50", typed while testing a completely different decor object) — since
           syncDecorFields already leaves an empty field for "no window recorded" (see its own doc
           comment), an autofilled value here isn't a leftover the app itself wrote, but the field
           visually shows one anyway, misleadingly reading as "windows default to 50%". -->
      <label><span id="label-decor-window-front">Front</span> <input id="decorWindowFront" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-behind">Behind</span> <input id="decorWindowBehind" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-left">Left</span> <input id="decorWindowLeft" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-right">Right</span> <input id="decorWindowRight" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <!-- Vehicle only (see DecorSide's own doc comment: a car's left/right side has 2 windows
           each, front-door and rear-door, not 1) — shown instead of the plain Left/Right rows
           above for that kind, hidden otherwise (see UfoRecorderElement.syncDecorVisibility). -->
      <label><span id="label-decor-window-front-left">Front-left</span> <input id="decorWindowFrontLeft" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-front-right">Front-right</span> <input id="decorWindowFrontRight" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-behind-left">Behind-left</span> <input id="decorWindowBehindLeft" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-window-behind-right">Behind-right</span> <input id="decorWindowBehindRight" type="number" min="0" max="100" step="5" placeholder="none" autocomplete="off"/> %</label>
      <label><span id="label-decor-witness-side">Witness location</span>
        <select id="decorWitnessSide">
          <option id="option-witness-side-none" value="">Not present</option>
          <option id="option-witness-side-front" value="front">Front</option>
          <option id="option-witness-side-behind" value="behind">Behind</option>
          <option id="option-witness-side-left" value="left">Left</option>
          <option id="option-witness-side-right" value="right">Right</option>
          <!-- Vehicle only — the 4 seat/door positions replace front/behind/left/right above for
               that kind (see witnessSidesFor's own doc comment: you sit AT a door, never "at the
               windshield"). Hidden by default, same technique as decorKind's own hidden "witness"
               option — toggled per kind in syncDecorVisibility. -->
          <option id="option-witness-side-front-left" value="front-left" hidden>Front-left</option>
          <option id="option-witness-side-front-right" value="front-right" hidden>Front-right</option>
          <option id="option-witness-side-behind-left" value="behind-left" hidden>Behind-left</option>
          <option id="option-witness-side-behind-right" value="behind-right" hidden>Behind-right</option>
        </select>
      </label>
      <label><span id="label-decor-occupied-floor">Occupied floor</span> <input id="decorOccupiedFloor" type="number" min="0" step="1" value="0"/></label>
      <!-- flex-basis:100% (see the CSS rule below) forces this row onto its own line, after
           whatever decor properties are showing above — the only thing shown at all when there's
           no decor yet (see the block above's own comment). -->
      <div class="decor-add-row">
        <button id="add-decor-building" type="button" class="icon-btn" title="Add" aria-label="Add">+</button>
        <select id="decorKind">
          <option id="option-decor-building" value="building">Building</option>
          <option id="option-decor-tree" value="tree">Tree</option>
          <option id="option-decor-streetlight" value="streetlight">Streetlight</option>
          <option id="option-decor-vehicle" value="vehicle">Vehicle</option>
          <!-- Other witness is added from its own dedicated button instead (Witness group's own
               "Add witness" — nothing else to configure beforehand) — hidden (not removed) so
               decorLabel() can still look up its translated kind name by id for the fallback
               "{kind} {n}" label, see UfoRecorderElement.decorLabel. -->
          <option id="option-decor-witness" value="witness" hidden>Other witness</option>
        </select>
      </div>
    </fieldset>
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
    <label><span id="label-utc-offset">Time zone</span>
      <input id="utcOffsetHours" type="number" min="-12" max="14" step="0.5" placeholder="from longitude" title="Hours ahead of UTC on the witness's own clock — legal time, which the longitude cannot know (France was on UTC+1 in 1965)"/> UTC&plusmn;h</label>
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
    <div class="presets" id="presets-group" role="group" aria-label="UFO shape">
      <button class="preset" id="preset-oval" type="button" data-preset="oval">Oval</button>
      <button class="preset" id="preset-polygon" type="button" data-preset="polygon">Polygon</button>
    </div>
    <label><span id="label-color">Color</span> <input id="color" type="color" value="#39ff14"/></label>
    <label><span id="label-transparency">Transparency</span> <input id="transparency" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-halo">Halo</span> <input id="haloScale" type="range" min="0" max="3" step="0.1" value="1.5"/></label>
    <label><span id="label-shape">Shape</span> <select id="source"></select></label>
    <button id="add-shape" type="button" class="icon-btn" title="Add shape" aria-label="Add shape">+</button>
    <button id="delete-shape" type="button" class="icon-btn" title="Delete shape" aria-label="Delete shape">🗑</button>
    <label><span id="label-shape-title">Name</span> <input id="shapeTitle" type="text"/></label>
    <label><span id="label-object-size">Real size</span>
      <input id="objectSize" type="number" min="0" step="0.1" placeholder="reported width" title="The object's real width as reported by the witness"/> m</label>
    <label><span id="label-object-distance">Distance</span>
      <input id="objectDistance" type="number" min="0" step="1" placeholder="reported distance" title="How far the object was from the witness"/> m</label>
    <output id="apparent-size" class="apparent-size" for="objectSize objectDistance"></output>
    <div class="record-row">
      <button id="record" type="button" class="record-btn"></button>
      <label><span id="label-sampling-rate">Sampling rate</span> <input id="samplingRate" type="number" min="16" step="16" value="100"/> ms</label>
    </div>
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
  <button id="context-add-vertex" type="button" role="menuitem">Add vertex</button>
  <button id="context-delete-vertex" type="button" role="menuitem">Delete vertex</button>
  <hr/>
  <button id="context-delete" type="button" role="menuitem" class="context-delete">Delete</button>
</div>
<div id="decor-context-menu" class="context-menu" hidden role="menu">
  <button id="context-view-testimony" type="button" role="menuitem">View testimony</button>
  <div class="submenu-trigger">
    <span id="label-context-masks" class="submenu-label" role="menuitem" aria-haspopup="true">Masks &#9656;</span>
    <div id="context-masks-submenu" class="submenu" role="menu"></div>
  </div>
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
#lat, #lng, #heading, #pitch, #windDirection, #windSpeed, #decorEast, #decorNorth, #decorHeading, #decorFloors, #decorOccupiedFloor, #decorWindowFront, #decorWindowBehind, #decorWindowLeft, #decorWindowRight, #decorWindowFrontLeft, #decorWindowFrontRight, #decorWindowBehindLeft, #decorWindowBehindRight {
  width: 6em;
}
#obs-time, #obs-end-time {
  width: 12em;
}
#witnessId, #witnessDirName, #witnessTitle, #witnessLastName, #witnessFirstNames, #caseId, #tags, #shapeTitle, #decorTitle {
  width: 10em;
}
#decorSightingUrl {
  width: 16em;
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
/* Reads back what the Real size / Distance pair actually produces on screen — an apparent size in
   degrees, and in full Moons, the only unit of apparent size most testimonies come with. Purely
   informative (an output, never an input), so it stays visually quieter than the fields it
   comments on. */
.apparent-size {
  font-size: 0.85em;
  opacity: 0.8;
  white-space: nowrap;
}
/* Record and the sampling rate it records at are one control, not two: grouping them makes them a
   single flex item of the wrapping toolbar, so they stay on the same line together wherever that
   line happens to break, instead of the button drifting up next to whatever field precedes it. */
.record-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
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
/* Groups every decor-object field (Add through Occupied floor) apart from the Location group's
   own observer-pose fields (Latitude/Longitude/Heading/Tilt) above it — same flex-wrap layout as
   .toolbar itself (a plain block-level fieldset would otherwise stack its own children instead of
   flowing them inline like every other field in this toolbar) and matching border/radius as the
   surrounding <details> groups for visual consistency. */
fieldset.decor-fieldset {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5em;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.5em 0.75em;
  margin: 0;
}
fieldset.decor-fieldset legend {
  font-weight: 600;
  padding: 0 0.25em;
}
/* flex-basis:100% on a flex-wrap:wrap container's own child forces it onto a fresh line — nothing
   else fits beside a 100%-wide item — which is what puts the Add controls below whatever decor
   properties are currently showing (see UfoRecorderElement.syncDecorVisibility), rather than just
   trailing after them on whatever horizontal space happens to be left. */
.decor-add-row {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5em;
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
/* The [hidden] attribute's own display:none (from the browser's UA stylesheet) loses to the
   plain .icon-btn rule above — a class selector outweighs an attribute selector at equal
   specificity-position — same fix, same reason, as .context-menu[hidden] below (see its own
   comment): needed once delete-decor (an .icon-btn) started being hidden entirely rather than
   just disabled when there's no decor object to delete (see UfoRecorderElement.
   syncDecorVisibility). */
.icon-btn[hidden] {
  display: none;
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
/* "Masks ▸" — a CSS-only hover/focus flyout (no JS show/hide state machine needed) listing every
   shape/source currently in the recording as a checkbox, for DecorObject.occludesSourceIds (see
   its own doc comment: which shapes, if any, this decor object sits in front of — a per-shape
   choice since a recording can have more than one). :focus-within (not hover-only, unlike the
   playback toolbar's own deliberately hover-only auto-hide — see UfoElement's template) is exactly
   right here: keeping it open while a checkbox inside has keyboard focus is what makes toggling
   more than one checkbox by keyboard actually usable, and this menu doesn't auto-hide on any other
   trigger the way the toolbar does. */
.submenu-trigger {
  position: relative;
}
.submenu-trigger > .submenu-label {
  display: block;
  padding: 0.4em 0.8em;
  cursor: default;
}
.submenu-trigger:hover > .submenu-label,
.submenu-trigger:focus-within > .submenu-label {
  background: #eef;
}
.submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 9em;
  max-height: 16em;
  overflow-y: auto;
  padding: 0.3em 0;
  background: #fff;
  color: #222;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  font-size: 0.9em;
}
.submenu-trigger:hover > .submenu,
.submenu-trigger:focus-within > .submenu {
  display: block;
}
.submenu label {
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.3em 0.8em;
  cursor: pointer;
  white-space: nowrap;
}
.submenu label:hover {
  background: #eef;
}
`
