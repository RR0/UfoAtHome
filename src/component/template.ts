export const html = `
<details open>
  <summary id="label-observation-group">Observation</summary>
  <div class="toolbar">
    <label><span id="label-import-file">Load JSON file</span> <input id="import-file" type="file" accept="application/json,.json"/></label>
    <label><span id="label-import-url">Or load from URL</span> <input id="import-url" type="url" placeholder="https://…/sighting.json"/></label>
    <button id="import-url-button" type="button">Load</button>
    <!-- The case, not the witness: every witness's own recording of the same sighting carries the
         same caseId, which is exactly what lets a page group them (see Sighting.caseId). Putting it
         beside a witness's name suggested it was theirs. -->
    <label><span id="label-case-id">Case ID</span> <input id="caseId" type="text"/></label>
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
    <label><span id="label-instrument">Observed through</span> <select id="instrument"></select></label>
    <label><span id="label-camera-device">Camera/video device</span> <input id="cameraDevice" type="range" min="0" max="2" step="0.1" value="0"/></label>
    <button id="add-decor-witness" type="button">Add witness</button>
    <label><span id="label-decor-sighting-url">Witness's own recording URL</span> <input id="decorSightingUrl" type="url" placeholder="https://…/sighting.json"/></label>
  </div>
</details>
<details open>
  <summary id="label-location-group">Location</summary>
  <div class="toolbar">
    <!-- Testimony names a place, it doesn't give coordinates ("on the Valensole plateau", never
         43.8379 / 5.9840) — so the name is what this group asks for first, and the latitude and
         longitude below are what answering it produces. Searched only on Enter or the button, never
         per keystroke: see NominatimPlaceProvider's own doc comment on why that restraint matters. -->
    <div class="place-search-row">
      <label><span id="label-place-name">Place</span>
        <input id="placeName" type="text" placeholder="Valensole, France" autocomplete="off" class="place-name"/></label>
      <button id="search-place" type="button">Locate</button>
      <label id="place-match-row" hidden><span id="label-place-match">Matches</span> <select id="placeMatch"></select></label>
      <!-- "2 lieux trouvés selon [Nominatim]" — the picker sits where the count is reported, not in
           a settings drawer: who answered is part of the answer. See DataSource.ts. -->
      <output id="place-status" class="place-status" for="placeName"><span id="place-status-text"></span><span id="place-source-row" class="inline-source" hidden></span></output>
    </div>
    <label><span id="label-lat">Latitude</span> <input id="lat" type="number" min="-90" max="90" step="0.0001" placeholder="lat"/></label>
    <label><span id="label-lng">Longitude</span> <input id="lng" type="number" min="-180" max="180" step="0.0001" placeholder="lng"/></label>
    <label><span id="label-heading">Heading</span> <input id="heading" type="number" min="0" max="360" step="1" placeholder="unknown"/> &deg;</label>
    <label><span id="label-pitch">Tilt</span> <input id="pitch" type="number" min="-90" max="90" step="1" value="0"/> &deg;</label>
    <!-- Above SEA LEVEL, not above the ground: "0 m" is simply false for a witness in the Alps, and
         an editor that offers it invites a recording that says so. The ground's own height at the
         location becomes the field's floor and its default the moment the location is known — see
         UfoRecorderElement.applyGroundElevation. -->
    <label><span id="label-elevation">Altitude</span>
      <input id="elevation" type="number" step="1" value="0"/> m</label>
    <output id="ground-elevation" class="ground-elevation" for="lat lng"></output>
    <!-- Relief and imagery describe the ground at the location above, so they are chosen here
         rather than in a drawer of their own — same reasoning as the place picker's placement. -->
    <div id="terrain-source-rows" class="terrain-source-rows"></div>
    <fieldset class="decor-fieldset">
      <legend id="label-decor-fieldset">Decor</legend>
      <!-- This whole block (picker through Occupied floor) is hidden entirely — not just
           disabled — while there's no decor at all (see UfoRecorderElement.syncDecorVisibility):
           an empty recording shows nothing here but the Add controls below. Shown first, above
           the Add row, once at least one decor object exists — see that row's own comment for why
           it's forced onto its own line after this block instead of just flowing after it. -->
      <label><span id="label-decor">Decor</span> <select id="decor"></select></label>
      <button id="look-at-decor" type="button" class="icon-btn" title="Look at it" aria-label="Look at it">🎯</button>
      <button id="delete-decor" type="button" class="icon-btn" title="Delete decor" aria-label="Delete decor">🗑</button>
      <label><span id="label-decor-title">Name</span> <input id="decorTitle" type="text"/></label>
      <label><span id="label-decor-east">Distance east</span> <input id="decorEast" type="number" step="0.5" value="0"/> m</label>
      <label><span id="label-decor-north">Distance north</span> <input id="decorNorth" type="number" step="0.5" value="0"/> m</label>
      <label><span id="label-decor-altitude">Altitude</span> <input id="decorAltitude" type="number" step="1" value="0"/> m</label>
      <label><span id="label-decor-heading">Heading</span> <input id="decorHeading" type="number" min="0" max="360" step="1" value="0"/> &deg;</label>
      <label><span id="label-decor-lit">Lit</span> <input id="decorLit" type="checkbox"/></label>
      <label><span id="label-decor-lights">Lights</span> <select id="decorLightRig"></select></label>
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
          <option id="option-decor-aircraft" value="aircraft">Aircraft</option>
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
  <summary id="label-temporal-group">Date and time</summary>
  <div class="toolbar">
    <label><span id="label-observation-time">Observation start</span>
      <input id="obs-time" type="text" placeholder="YYYY-MM-DDThh:mm[?~%] or hh:mm" title="EDTF — e.g. 1965-07-01T05:00, 2025-06? (uncertain), 2025~ (approximate), or just 05:00 if the date isn't known"/></label>
    <label><span id="label-observation-end-time">Observation end</span>
      <input id="obs-end-time" type="text" placeholder="YYYY-MM-DDThh:mm[?~%] or hh:mm" title="EDTF — e.g. 1965-07-01T05:10, 2025-06? (uncertain), 2025~ (approximate), or just 05:10 if the date isn't known"/></label>
    <label><span id="label-duration">Duration</span> <input id="durationSeconds" type="number" min="0" step="0.1" placeholder="observation length" aria-required="true"/> s</label>
    <!-- The zone is the RULE, the number is what that rule produced for this sighting's own date —
         summer time included, and as it was then (see engine/time/TimeZones.ts). Pick a zone and
         the number is derived and read-only; leave it on the manual entry and type the number
         yourself, which is all a recording used to be able to say. -->
    <label><span id="label-utc-offset">Time zone</span> <select id="timeZone"></select>
      <input id="utcOffsetHours" type="number" min="-12" max="14" step="0.5" placeholder="from longitude" title="Hours ahead of UTC on the witness's own clock — legal time, which the longitude cannot know (France was on UTC+1 in 1965)"/> UTC&plusmn;h</label>
  </div>
</details>
<details open>
  <summary id="label-circumstances-group">Circumstances</summary>
  <div class="toolbar">
    <!-- Weather is the one thing in this editor that isn't testimony: it's a measurable fact about
         a place at an instant, and the Location and Temporal groups above already state both. So
         it's looked up from a real record by default (see UfoRecorderElement.inferWeather) and
         shown read-only on that basis — a reanalysis value is a measurement to report, not a dial
         to tune. Unchecking hands the fields back to the witness, whose account then outranks the
         record and is never overwritten by it (Sighting.weatherSource). -->
    <div class="weather-source-row">
      <label><input id="weatherInferred" type="checkbox" checked/> <span id="label-weather-inferred">From weather records</span></label>
      <output id="weather-source" class="weather-source" for="lat lng obs-time"><span id="weather-source-text"></span><span id="weather-source-row" class="inline-source" hidden></span><a id="weather-source-link" target="_blank" rel="noopener noreferrer" hidden></a></output>
    </div>
    <!-- Not testimony either, and not even a lookup: a meteor shower is a position in the Earth's
         own orbit, so the date alone decides it. Read-only on purpose — it states what else was in
         that patch of sky, and whether that explains anything is the reader's conclusion, never the
         file's claim. See MeteorShowers.ts. -->
    <output id="sky-candidates" class="weather-source" for="lat lng obs-time"></output>
    <button id="show-meteor" type="button" class="icon-btn" title="Show me one" aria-label="Show me one" hidden>☄</button>
    <span id="label-weather">Weather</span>
    <label><span id="label-cloud-cover">Cloud cover</span> <input id="cloudCover" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-cloud-darkness">Cloud darkness</span> <input id="cloudDarkness" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-cloud-base">Cloud base</span>
      <input id="cloudBase" class="weather-field" type="number" min="0" step="50" placeholder="1000" title="Height of the cloud layer's base above the ground — decides whether the witness is under the deck or above it"/> m</label>
    <label><span id="label-precipitation-type">Precipitation</span>
      <select id="precipitationType" class="weather-field">
        <option id="option-precipitation-none" value="none">None</option>
        <option id="option-precipitation-rain" value="rain">Rain</option>
        <option id="option-precipitation-snow" value="snow">Snow</option>
        <option id="option-precipitation-hail" value="hail">Hail</option>
      </select>
    </label>
    <label><span id="label-precipitation-intensity">Intensity</span> <input id="precipitationIntensity" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-wind-direction">Wind direction</span> <input id="windDirection" class="weather-field" type="number" min="0" max="360" step="1" value="0" title="The direction the wind blows TOWARD, clockwise from true north — the opposite of the meteorological convention a forecast uses (see Weather.windDirectionDeg)"/> &deg;</label>
    <label><span id="label-wind-speed">Wind speed</span> <input id="windSpeed" class="weather-field" type="number" min="0" max="30" step="0.5" value="0"/> m/s</label>
    <label><span id="label-storm">Storm</span> <input id="storm" class="weather-field" type="checkbox"/></label>
    <label><span id="label-lens-flare-brightness">Light intensity</span> <input id="lensFlareBrightness" type="range" min="0" max="3" step="0.1" value="1"/></label>
  </div>
</details>
<!-- Its own group rather than a row of the Shape group below: what the object sounded like is
     keyframed on the very same clock as its shape (a craft silent on the ground and heard only as
     it lifts off is two keyframes), but it belongs to the sighting, not to any one drawn part of
     it — see SoundTrack.ts. The kind dropdown is filled from SOUND_KINDS in script, so adding a
     timbre never means editing markup and element ids (same rule as the data-source pickers). -->
<details open>
  <summary id="label-sound-group">Sound</summary>
  <div class="toolbar">
    <label><span id="label-sound-kind">Sound</span> <select id="soundKind" class="sound-field"></select></label>
    <label><span id="label-sound-volume">Loudness</span> <input id="soundVolume" class="sound-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-sound-pitch">Pitch</span>
      <input id="soundPitch" class="sound-field" type="range" min="30" max="4000" step="10" value="100" title="How deep or how sharp the sound was — the tone itself for a hum or a whistle, how low the noise sits for a rumble or a crackle"/>
      <output id="sound-pitch-value" class="apparent-size" for="soundPitch"></output></label>
    <!-- The rare case where the sound was actually captured: it then plays instead of the
         synthesized description (see SightingSound.src), and the embed stops being self-contained,
         which is why nothing defaults to it. -->
    <label><span id="label-sound-src">Recording</span> <input id="soundSrc" class="sound-field" type="url" placeholder="URL of a real recording"/></label>
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
    <label><span id="label-object-size">Try a size</span>
      <input id="objectSize" type="number" min="0" step="0.1" placeholder="assumed width" title="A real width to try, so the shape's apparent size is computed rather than eyeballed. Not stored."/> m</label>
    <label><span id="label-object-distance">at a distance of</span>
      <input id="objectDistance" type="number" min="0" step="1" placeholder="assumed distance" title="The distance to try that width at. Not stored either — only the resulting angular size is."/> m</label>
    <output id="apparent-size" class="apparent-size" for="objectSize objectDistance"></output>
    <output id="real-size" class="apparent-size" for="objectSize objectDistance"></output>
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
   line happens to break, instead of the button drifting up next to whatever field precedes it.
   flex-basis: 100% then gives them that line outright, always — the pair is wider than whatever
   the appearance fields leave at the end of theirs, so it was going to wrap anyway; taking the
   whole line makes that a deliberate row rather than a break that moves with the window width. */
.record-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
}
/* Same "one control, its own line" treatment as .record-row above, and for a stronger reason: this
   row states whether everything below it in the group is the witness's word or a looked-up record,
   so it has to read as a heading for them rather than as one more field wrapped in among them. */
.weather-source-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
  flex-wrap: wrap;
}
/* A picker sitting inside a sentence ("2 places found according to [Nominatim]") rather than in a
   settings drawer: who answered is part of the answer, and a credit nobody can act on is just fine
   print. Sized down to the surrounding status text so it reads as part of it. */
.inline-source {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
}
.inline-source select {
  font: inherit;
  max-width: 14em;
}
/* The [hidden] attribute's own display:none (from the UA stylesheet) loses to the plain
   .inline-source rule above — a class selector outweighs an attribute selector at equal
   specificity-position — so an inline picker stayed on screen no matter what toggled it: third
   occurrence of this exact trap, after .icon-btn[hidden] and .context-menu[hidden] (see their own
   comments). Caught by looking at the rendered toolbar, not by the code: a weather picker still
   crediting ERA5 while nothing had been asked of it. Any new class that sets its own display and
   is toggled via [hidden] needs this line too. */
.inline-source[hidden] {
  display: none;
}
/* Relief and imagery have no sentence to sit in, so they get their own row under the coordinates
   they describe the ground of. */
.terrain-source-rows {
  display: flex;
  align-items: center;
  gap: 1em;
  flex-basis: 100%;
  flex-wrap: wrap;
  font-size: 0.85em;
  opacity: 0.8;
}
.terrain-source-rows label {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}
.source-credit {
  color: inherit;
  text-decoration: underline dotted;
}
/* Same "one control, its own line" treatment as .record-row/.weather-source-row — the name and
   what searching it resolved to belong together, above the coordinates they produce. */
.place-search-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
  flex-wrap: wrap;
}
/* Wide enough for a real place name with its region and country, which is what gets stored (see
   PlaceMatch.name) — a name short enough to fit a default input is exactly the ambiguous kind. */
.place-name {
  width: 18em;
  font: inherit;
}
/* How many places matched, and the credit the data requires — quieter than the field it explains,
   same role and styling as .weather-source/.apparent-size. */
.place-status,
.ground-elevation {
  font-size: 0.85em;
  opacity: 0.8;
  white-space: nowrap;
}
.place-status a {
  color: inherit;
  text-decoration: underline dotted;
}
/* Says which record the locked fields came from, and when for — quieter than the fields it
   explains, same role and styling as .apparent-size. The link goes to the exact request that
   produced them, so the claim stays checkable rather than just asserted. */
.weather-source {
  font-size: 0.85em;
  opacity: 0.8;
}
/* Takes the host page's own text color rather than its link color: this widget has no background
   of its own (see input.invalid's comment on the same constraint), and a host's link blue against
   a host's dark page was unreadable — the surrounding label color is legible wherever this is
   embedded, by construction. The underline is what still reads as a link. */
.weather-source a {
  color: inherit;
  text-decoration: underline dotted;
}
/* Locked because they were looked up, not because they're unavailable — so they stay exactly as
   legible as the fields around them, and only the affordance goes away. The UA's own disabled
   styling (grey text over a translucent grey fill, which on a dark host page turns into grey on
   near-black) is meant to say "unavailable"; forcing the system Field/FieldText pair back says
   "read-only" instead. -webkit-text-fill-color is needed alongside the color property: on Blink/WebKit it is
   what actually paints a disabled control's text. Scoped by .weather-field rather than by the
   group, since Circumstances also holds Light intensity, a view preference that is never locked. */
.weather-field:disabled {
  opacity: 1;
  cursor: not-allowed;
}
input.weather-field[type="number"]:disabled,
select.weather-field:disabled {
  background-color: Field;
  color: FieldText;
  -webkit-text-fill-color: FieldText;
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
