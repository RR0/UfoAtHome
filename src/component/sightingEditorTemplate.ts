import { SummaryDescription } from "./SummaryDescription.js"
import { InputFont } from "./InputFont.js"
import { MessageStyle } from "./MessageStyle.js"
import { ElementList } from "./ElementList.js"
export const html = `
<!-- The groups' own handles, gathered onto one wrapping strip instead of standing as seven stacked
     <summary> rows down the left edge. Seven collapsed rows cost 259px of pure chrome before a
     single field is shown, which is most of a phone's screen spent on nothing; the same seven
     handles side by side cost one line, sometimes two when the viewport is narrow. Only one panel
     opens at a time (see SightingEditorElement.toggleGroup) — with all of them open the form stood
     1210px tall and pushed the render, the whole point of editing here, off the bottom of the
     screen. What's set across ALL groups stays legible without opening any of them: see the
     parameter summary under the render. -->
<div id="group-tabs" class="group-tabs">
  <button class="group-tab" type="button" aria-controls="group-observation" aria-expanded="false"><span id="label-observation-group">Summary</span></button>
  <button class="group-tab" type="button" aria-controls="group-observer" aria-expanded="false"><span id="label-observer-group">Observer</span></button>
  <button class="group-tab" type="button" aria-controls="group-location" aria-expanded="false"><span id="label-location-group">Position</span></button>
  <button class="group-tab" type="button" aria-controls="group-decor" aria-expanded="false"><span id="label-decor-group">Environment</span></button>
  <button class="group-tab" type="button" aria-controls="group-temporal" aria-expanded="false"><span id="label-temporal-group">Time</span></button>
  <button class="group-tab" type="button" aria-controls="group-weather" aria-expanded="false"><span id="label-weather-group">Weather</span></button>
  <button class="group-tab" type="button" aria-controls="group-sound" aria-expanded="false"><span id="label-sound-group">Sound</span></button>
  <button class="group-tab" type="button" aria-controls="group-reference" aria-expanded="false"><span id="label-reference-group">Pictures</span></button>
  <button class="group-tab" type="button" aria-controls="group-shape" aria-expanded="false"><span id="label-shape-group">Phenomenon</span></button>
  <button class="group-tab" type="button" aria-controls="group-file" aria-expanded="false"><span id="label-file-group">File</span></button>
  <!-- Step back and forward through what was edited, whichever group it was edited in: the File group's text editor keeps the history (see SightingEditorElement.undo). -->
  <span class="history" role="group">
    <button id="undo" type="button" class="icon-btn" title="Undo" aria-label="Undo" disabled>↶</button>
    <button id="redo" type="button" class="icon-btn" title="Redo" aria-label="Redo" disabled>↷</button>
  </span>
  <!-- What an element that holds this editor puts after the last tab (see CaseEditorElement): a mark of its own, which takes its room whether it shows or not. -->
  <slot name="tab-status"></slot>
</div>
<section class="group-panel" id="group-observation" aria-labelledby="label-observation-group" hidden>
  <div class="toolbar">
    <!-- The observation's own id, not the observer's nor the case's: what a case and the
         interpretations filed in it name this account by (see Sighting.id). -->
    <label><span id="label-sighting-id">ID</span> <input id="sightingId" type="text" placeholder="1964-04-24-ZamoraLonnie"/></label>
    <label><span id="label-tags">Tags</span> <input id="tags" type="text" placeholder="comma-separated"/></label>
  </div>
  <!-- The account, and the button that reads it.
       One field, not two. The description IS the account: a paragraph in the observer's own words,
       which is what SightingEvent.description has always been documented to hold. What some
       recordings put there instead — how a size was calculated, which relief source was measured —
       belongs in the numbers those calculations produced, and saying it twice is how the two come
       to disagree. So there is nothing to draft FROM but this, and drafting rewrites the rest of the
       recording rather than this.
       Its own row, pulled out of the one-line fields above, because a paragraph among a row of
       one-line fields makes both harder to read. See SightingEditorElement.draftFromDescription. -->
  <div class="toolbar narrative">
    <label class="wide"><span id="label-description">Description</span>
      <textarea id="description" rows="4" placeholder="What the observer reported, in their own words"></textarea></label>
    <!-- Which provider drafts, and the settings it declares (a key, a model…), rendered from the
         provider itself: see NarrativeSetting, and SightingEditorElement.renderNarrativeSettings. -->
    <span class="narrative-source"><span id="label-narrative-source">Drafted by</span> <span id="narrative-source-row"></span></span>
    <span id="narrative-settings" class="narrative-settings"></span>
    <label class="checkbox"><input id="narrativeRemember" type="checkbox"/> <span id="label-narrative-remember">Remember on this device</span></label>
    <button id="narrative-draft" type="button">Generate reconstruction</button>
    <button id="narrative-stop" type="button" hidden>Stop</button>
    <output id="narrative-status" for="description"></output>
  </div>
  <!-- What the draft claims and what it could not: the part that makes the rest usable. Empty (and
       so invisible) until there has been a draft. -->
  <div id="narrative-report" class="narrative-report" hidden></div>
</section>
<section class="group-panel" id="group-observer" aria-labelledby="label-observer-group" hidden>
  <div class="toolbar">
    <!-- The observers, laid out as every list of the editor is (see ElementList): the one whose account this is first, then the
         other observers the scene places (decor of the kind "observer"); 🎯, 🗑 and "+" for those; under it, the frame of the one
         picked: this account's own observer fields, or the decor fields of another, moved here while they are edited from this tab
         (see SightingEditorElement.placeDecorItem). -->
    <div id="observer-list-header" class="decor-list-part"></div>
    <div id="observer-item">
    <div id="observer-principal">
    <label><span id="label-observer-id">ID</span> <input id="observerId" type="text"/></label>
    <label><span id="label-observer-title">Title</span> <input id="observerTitle" type="text"/></label>
    <label><span id="label-observer-last-name">Last name</span> <input id="observerLastName" type="text"/></label>
    <label><span id="label-observer-first-names">First names</span> <input id="observerFirstNames" type="text" placeholder="comma-separated"/></label>
    <!-- Who this observer is and how their account travelled — see Account. None of it is about
         the phenomenon, which is why it sits here and not with the shape, and why it had to exist:
         Poher's credibility criteria read these and a recording could state none of them. How MANY
         people saw the thing is not here on purpose: a recording is one person's account, and the
         count belongs to the case that gathers them. Blank means unknown. -->
    <p id="observer-identity-hint" class="file-note"></p>
    <label><span id="label-observer-age">Age then</span> <input id="observerAge" type="number" min="0" max="120" step="1" size="4" placeholder="years"/></label>
    <label><span id="label-observer-birth">Born</span> <rr0-date-input name="observer-birth" date-only></rr0-date-input></label>
    <rr0-provider-settings id="observerPerception"></rr0-provider-settings>
    <label><span id="label-observer-occupation">Occupation</span> <input id="observerOccupation" type="text" placeholder="baker, airline pilot…"/></label>
    <label><span id="label-account-source">Account obtained</span> <select id="accountSource">
      <option id="option-source-unknown" value="">unknown</option>
      <option id="option-source-on-site" value="on-site">on-site investigation</option>
      <option id="option-source-interview" value="interview">interview in person</option>
      <option id="option-source-telephone" value="telephone">by telephone</option>
      <option id="option-source-questionnaire" value="questionnaire">questionnaire</option>
      <option id="option-source-letter" value="letter">the observer wrote it</option>
      <option id="option-source-social-media" value="social-media">the observer posted it online</option>
      <option id="option-source-press" value="press">press or broadcast</option>
    </select></label>
    <label><span id="label-account-url">Source (URL)</span> <input id="accountUrl" type="url" placeholder="https://…"/></label>
    <!-- Three states and not a checkbox: a report that says nothing about follow-up is not a report
         that says none happened, and the methods reading this score the two differently. -->
    <label><span id="label-account-followed-up">Followed up</span> <select id="accountFollowedUp">
      <option id="option-followed-unknown" value="">unknown</option>
      <option id="option-followed-yes" value="yes">yes</option>
      <option id="option-followed-no" value="no">no</option>
    </select></label>
    <!-- Everything that is about WHAT THE OBSERVER LOOKED THROUGH, grouped with the picker that names it:
         the filter in front of it and the settings of the device (see below). Which of them show, and
         which are read-only, follows the instrument chosen. -->
    <fieldset id="instrument-group" class="instrument-group">
      <legend id="label-instrument">Observed through</legend>
      <rr0-popover-picker id="instrument" aria-labelledby="label-instrument"></rr0-popover-picker>
      <!-- What the device was SET to, when it could be set at all: the lens's focal length (shown as
           the field of view for an eye, which has no focal length), how far it was stopped down, and
           how long its shutter stayed open. Each falls back to the instrument's own value and each is
           disabled when the device fixes it — an Instamatic's owner had nothing to choose. See
           Instrument.ts and ObserverPose.fNumber/exposureSeconds. -->
      <label><span id="label-focal-length">Focal length</span> <input id="focalLength" type="number" min="1" max="2000" step="0.1"/> <span id="unit-focal-length">mm</span>
        <output id="focal-fov" class="apparent-size inline" for="focalLength"></output></label>
      <label><span id="label-f-number">Aperture</span> f/<input id="fNumber" type="number" min="0.7" max="64" step="0.1"/></label>
      <label><span id="label-exposure">Exposure</span> <input id="exposureSeconds" type="text" inputmode="decimal" size="7" placeholder="1/250"/> s</label>
      <label><span id="label-focus-distance">Focused at</span> <input id="focusDistance" type="number" min="0.1" max="30000" step="0.1" placeholder="&#8734;"/> m</label>
      <!-- With the instrument and not with the place: latitude and heading say where the observer
           stood and which way they faced, and this says nothing about either. It is how the device
           was HELD — a camera askew, a head leaned over — which is why it belongs beside the focal
           length and the aperture whose own spikes it turns. -->
      <label><span id="label-roll">Roll</span> <input id="roll" type="number" min="-180" max="180" step="1" value="0" title="How far the instrument was tilted about its own line of sight — positive clockwise, as the observer saw it"/> &deg;</label>
      <!-- How much the body holding it moves the view at rest — see Sighting.sway: 1 a person, 0 a
           tripod. Blank is the default (1, or 0 for a paralysed observer). -->
      <label><span id="label-sway">Sway</span> <input id="sway" type="number" min="0" max="3" step="0.1" placeholder="1"/></label>
      <!-- Last, and the instrument's own: a solar filter is for an eye or a telescope, a solar film for a
           camera, so which ones are offered follows the device (see Filter.usableWith). -->
      <label><span id="label-filter">In front of it</span> <select id="filter"></select></label>
    </fieldset>
    </div>
    <div id="observer-decor-host"></div>
    </div>
  </div>
</section>
<section class="group-panel" id="group-location" aria-labelledby="label-location-group" hidden>
  <div class="toolbar">
    <!-- An account names a place, it doesn't give coordinates ("on the Valensole plateau", never
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
    <label><span id="label-lat">Latitude</span> <input id="lat" type="number" min="-90" max="90" step="0.000001" placeholder="lat"/></label>
    <label><span id="label-lng">Longitude</span> <input id="lng" type="number" min="-180" max="180" step="0.000001" placeholder="lng"/></label>
    <label><span id="label-heading">Heading</span> <input id="heading" type="number" min="0" max="360" step="1" placeholder="unknown"/> <span id="heading-unit">&deg;</span></label>
    <label><span id="label-pitch">Tilt</span> <input id="pitch" type="number" min="-90" max="90" step="1" value="0"/> &deg;</label>
    <!-- Above SEA LEVEL, not above the ground: "0 m" is simply false for an observer in the Alps, and
         an editor that offers it invites a recording that says so. The ground's own height at the
         location becomes the field's floor and its default the moment the location is known — see
         SightingEditorElement.applyGroundElevation. -->
    <label><span id="label-elevation">Altitude</span>
      <input id="elevation" type="number" min="-500" max="9000" step="1" value="0"/> m</label>
    <output id="ground-elevation" class="ground-elevation" for="lat lng"></output>
    <!-- The night sky of the place, towns and all — see Sighting.lightPollution. Blank is a natural
         sky, which is what every recording that says nothing gets. -->
    <label><span id="label-light-pollution">Night sky</span> <input id="lightPollution" type="number" min="15" max="22" step="0.01" placeholder="22"/> mag/arcsec&sup2;</label>
    <!-- Where that figure came from: "18.79 according to [World Atlas 2015]" while the atlas owns it,
         nothing once the author has typed their own (see SightingEditorElement.lookUpLightPollution). -->
    <output id="light-pollution-status" class="place-status" for="lightPollution"><span id="light-pollution-status-text"></span><span id="light-pollution-source-row" class="inline-source" hidden></span></output>
    <!-- Relief and imagery describe the ground at the location above, so they are chosen here
         rather than in a drawer of their own — same reasoning as the place picker's placement. -->
    <div id="terrain-source-rows" class="terrain-source-rows"></div>
  </div>
</section>
<!-- Its own group, no longer a fieldset nested inside Location. What stands around the observer is
     the single largest thing this editor asks for — 34 controls against Location's own 8 — so
     folded in there it made Location the tallest panel by far (313px) and, with one panel open at
     a time, the one that alone still overflowed a phone. Split out, neither half does. The two
     stay adjacent because a decor object is placed RELATIVE to the location above it. -->
<section class="group-panel" id="group-decor" aria-labelledby="label-decor-group" hidden>
  <div class="toolbar">
    <!-- The list of the decor, laid out as every list of the editor is (see ElementList): the picker, 🎯, 🗑, then the kind to add and
         "+", on one line; under it, the frame of everything that is set on the picked object, gone while there is none. -->
    <div id="decor-list-header" class="decor-list-part"></div>
    <div id="decor-item">
      <!-- The base properties — name, place, heading, colour, measures — are drawn from what a decor object says it has (see
           DecorBaseParameterSets and ParameterForm). The model it is drawn as is the last of them: a window of pictures over the same choice. -->
      <div id="decor-base" class="decor-parameters"></div>
      <!-- The properties the kind of this object says it has beyond placement and size — floors, windows, a
           bridge's railing, a line's poles — drawn from what the kind publishes (see DecorParameterSets and
           ParameterForm), so that the editor knows no kind. -->
      <div id="decor-parameters" class="decor-parameters"></div>
      <!-- Lit, lamps, and where the observer sits: drawn the same way, after the properties of the kind. -->
      <div id="decor-state" class="decor-parameters"></div>
    </div>
    <!-- The scenery the editor takes, by itself, from a survey of the place (see SurroundingsPlanter): a choice of the survey it is taken from, or none (the first of the registry by default,
         and kept by the browser, since asking sends the place to a service), and what it says of what it took: how many trees, buildings, bridges
         and lines, or that the survey could not be reached. Empty where no survey covers the place, which is most of the world. It sits
         on a line of its own, below what the list of the decor draws, and is read out by whoever listens to the page. -->
    <div id="scenery" class="decor-scenery">
      <label><span id="label-scenery-source">Scenery survey</span> <select id="scenery-source"><option value="none" id="option-scenery-none">None (all by hand)</option></select></label>
      <label><span id="label-scenery-radius">Radius</span> <input type="number" id="scenery-radius" min="20" max="3000" step="10" value="100"/> m</label>
      <span id="scenery-status" role="status" aria-live="polite"></span>
      <span id="scenery-warning" class="scenery-warning" role="alert" hidden></span>
    </div>
  </div>
</section>
<section class="group-panel" id="group-temporal" aria-labelledby="label-temporal-group" hidden>
  <div class="toolbar">
    <!-- Two ways to say the same thing, and the native picker is the default because a
         reconstruction needs a full instant to compute a sky at all: of the nine recordings that
         exist, eight state one to the minute. The EDTF text field is what the ninth needs, and
         what the wider corpus needs far more often — of 241 case files on rr0.org, 43% state a
         bare year and only 17% a date with a time. So the text field is never removed, only
         folded away.

         The picker writes THROUGH the text field rather than into the model: it composes an EDTF
         string, puts it here, and goes down the same applyEdtfTimeInput path as a typed one. One
         write path, one parse, one validation — and the stored raw string therefore stays
         canonical whichever control produced it, which matters because formatEdtfTime returns it
         verbatim and would otherwise display a stale string over fresh numbers. -->
    <label><span id="label-observation-time">Observation start</span>
      <!-- A date is precise (a picker) or said in EDTF (a text: a year, a month, a time with no date, or a doubt: [?~%] at the
           end of the value, or before one of its parts, as @rr0/time reads it: see parseEdtfTime). See DateInputElement
           for the controls it makes (obs-time-native, obs-time) and the button that swaps them. -->
      <rr0-date-input name="obs-time"></rr0-date-input></label>
    <label><span id="label-observation-end-time">Observation end</span>
      <rr0-date-input name="obs-end-time"></rr0-date-input></label>
    <label><span id="label-duration">Duration</span> <rr0-duration-input name="durationSeconds"></rr0-duration-input></label>
    <!-- The zone is the RULE, the number is what that rule produced for this sighting's own date —
         summer time included, and as it was then (see engine/time/TimeZones.ts). Pick a zone and
         the number is derived and read-only; leave it on the manual entry and type the number
         yourself, which is all a recording used to be able to say. -->
    <label><span id="label-utc-offset">Time zone</span> <select id="timeZone"></select>
      <input id="utcOffsetHours" type="number" min="-12" max="14" step="0.5" placeholder="from longitude" title="Hours ahead of UTC on the observer's own clock — legal time, which the longitude cannot know (France was on UTC+1 in 1965)"/> UTC&plusmn;h</label>
    <!-- The named moments of the account (see Milestone) — in the Moment group, because they are
         instants: they name times of the account, not anything about a shape. Added at
         the playhead, which is the only instant a reader has in mind when they name one. -->
    <!-- Laid out as every list of the editor is (see ElementList): the picker, 🎯, 🗑, "+", then the frame of the picked moment.
         Titled, since this tab is not only its moments. -->
    <span id="label-milestones" class="element-list-title">Moments</span>
    <div class="element-list-row" id="milestone-row">
      <label class="element-list-picker"><select id="milestone" aria-labelledby="label-milestones"></select></label>
      <!-- A select says nothing when the moment already shown is picked again, which is the one to go
           back to after playing on past it: this goes there whatever the list shows. -->
      <button id="go-to-milestone" type="button" class="icon-btn" title="Go to this moment" aria-label="Go to this moment">🎯</button>
      <button id="delete-milestone" type="button" class="icon-btn" title="Delete moment" aria-label="Delete moment">🗑</button>
      <span id="milestone-empty" class="element-list-empty">No moment</span>
      <button id="add-milestone" type="button" class="icon-btn element-list-add" title="Add" aria-label="Add">+</button>
    </div>
    <div class="element-list-body" id="milestone-item">
      <label><span id="label-milestone-label">Label</span> <input id="milestoneLabel" type="text" size="4"/></label>
      <label><span id="label-milestone-note">What happens</span> <input id="milestoneNote" type="text"/></label>
    </div>
  </div>
</section>
<!-- The recording itself, as the file it will be saved as. Last on the strip because it is about the
     whole rather than about any one thing: it is where a recording comes in (a file, an address)
     and goes out (Export), and where it can be read and edited as the text it is, in both
     directions with the form (see SightingEditorElement.loadFileEditor). The editor is a chunk of
     its own, fetched the first time this group is opened — CodeMirror is the heaviest thing the
     component could carry and most authors never need it. -->
<section class="group-panel" id="group-file" aria-labelledby="label-file-group" hidden>
  <div class="toolbar">
    <label><span id="label-import-file">Load JSON file</span> <input id="import-file" type="file" accept="application/json,.json"/></label>
    <label><span id="label-import-url">Or load from URL</span> <input id="import-url" type="url" placeholder="https://…/sighting.json"/></label>
    <button id="import-url-button" type="button">Load</button>
    <button id="export" type="button">Save</button>
  </div>
  <p id="file-note" class="file-note" hidden role="status"></p>
  <!-- A question about what an edit of the text just touched: data the editor reads dynamically (see SightingEditorElement.askAboutWeather). Modal: the author has to say what they mean before anything else is done, and the edit stands meanwhile. Escape is the safe answer, which puts back what was read. -->
  <dialog id="file-ask" class="file-ask" aria-labelledby="file-ask-text">
    <p id="file-ask-text"></p>
    <div class="file-ask-buttons">
      <button id="file-ask-stop" type="button"></button>
      <button id="file-ask-keep" type="button"></button>
    </div>
  </dialog>
  <!-- Asked at Save, the one way a recording leaves the editor, when it names or locates a person (see IdentityGuard). -->
  <dialog id="identity-ask" class="file-ask" aria-labelledby="identity-ask-text">
    <p id="identity-ask-text"></p>
    <ul id="identity-ask-found"></ul>
    <div class="file-ask-buttons">
      <button id="identity-ask-initials" type="button"></button>
      <button id="identity-ask-keep" type="button"></button>
      <button id="identity-ask-back" type="button"></button>
    </div>
  </dialog>
  <div id="file-editor" class="file-editor"></div>
</section>
<section class="group-panel" id="group-weather" aria-labelledby="label-weather-group" hidden>
  <div class="toolbar">
    <!-- Weather is the one thing in this editor that isn't account: it's a measurable fact about
         a place at an instant, and the Location and Temporal groups above already state both. So
         it's looked up from a real record by default (see SightingEditorElement.inferWeather) and
         shown read-only on that basis — a reanalysis value is a measurement to report, not a dial
         to tune. Unchecking hands the fields back to the observer, whose account then outranks the
         record and is never overwritten by it (Sighting.weatherSource). -->
    <div class="weather-source-row">
      <label><input id="weatherInferred" type="checkbox" checked/> <span id="label-weather-inferred">From weather records</span></label>
      <!-- Clamped to one line unless the reader asks for the rest (see #sky-details below). What
           these two lines say is worth saying — which record answered, and what else was up there
           that night — but they say it in prose, and the sky line runs to 575 characters on a night
           with cirrus in it. Left to flow, the two of them were most of this group's height: 550px
           of it on a phone, where the render then no longer fitted under the panel at all. -->
      <output id="weather-source" class="weather-source clamped" for="lat lng obs-time"><span id="weather-source-text"></span><span id="weather-source-row" class="inline-source" hidden></span><a id="weather-source-link" target="_blank" rel="noopener noreferrer" hidden></a></output>
    </div>
    <!-- Not account either, and not even a lookup: a meteor shower is a position in the Earth's
         own orbit and a comet's orbit is a solved problem, so the date and the place alone decide
         both. Read-only on purpose — it states what else was in that patch of sky, and whether that
         explains anything is the reader's conclusion, never the file's claim. See MeteorShowers.ts
         and Comets.ts. -->
    <output id="sky-candidates" class="weather-source clamped" for="lat lng obs-time"></output>
    <!-- One button for both lines rather than one each: they are the same kind of statement (what
         the records say about that sky) and they sit together, so two separate disclosures would
         be more chrome than the sentences they hide. Nothing is ever hidden outright — clamped,
         each line still shows its opening clause, which is the part that says whether there is
         anything to expand for. -->
    <button id="sky-details" type="button" class="icon-btn" aria-expanded="false">&#9662;</button>
    <!-- A shooting star for the meteor and a comet for the comet. The meteor button used to carry
         the comet glyph, which was only ever unambiguous while there was nothing else up there. -->
    <button id="show-meteor" type="button" class="icon-btn" title="Show me one" aria-label="Show me one" hidden>🌠</button>
    <button id="show-comet" type="button" class="icon-btn" title="Show me the comet" aria-label="Show me the comet" hidden>☄</button>
    <button id="show-nova" type="button" class="icon-btn" title="Show me the new star" aria-label="Show me the new star" hidden>🌟</button>
    <button id="show-satellite" type="button" class="icon-btn" title="Show me a satellite" aria-label="Show me a satellite" hidden>🛰</button>
    <button id="show-fireball" type="button" class="icon-btn" title="Show me the fireball" aria-label="Show me the fireball" hidden>✴</button>
  </div>
  <!-- The weather in three parts — what falls (first, and open on arrival: the user's own order), the
       clouds, and what blows — as a strip of handles
       inside the group, one part open at a time, the same way the eight groups themselves work:
       a dozen controls in one row read as one undifferentiated dial bank. The storm sits with what
       falls, not with the clouds it is made of: a thunderstorm is what a weather CODE reports
       (Open-Meteo's, where the provider reads it from; METAR's TS beside RA and GR), a discrete
       present-weather event like hail, where a cloud layer is a continuous thing with a height. -->
  <div class="group-tabs" id="weather-tabs">
    <button class="subgroup-tab" type="button" aria-controls="weather-precipitation" aria-expanded="true"><span id="label-precipitation-group">Precipitation</span></button>
    <button class="subgroup-tab" type="button" aria-controls="weather-clouds" aria-expanded="false"><span id="label-clouds-group">Clouds</span></button>
    <button class="subgroup-tab" type="button" aria-controls="weather-wind" aria-expanded="false"><span id="label-wind-group">Wind</span></button>
  </div>
  <section class="subgroup-panel" id="weather-precipitation" aria-labelledby="label-precipitation-group">
    <div class="toolbar">
      <label><span id="label-precipitation-type">Precipitation</span>
        <select id="precipitationType" class="weather-field">
          <option id="option-precipitation-none" value="none">None</option>
          <option id="option-precipitation-rain" value="rain">Rain</option>
          <option id="option-precipitation-snow" value="snow">Snow</option>
          <option id="option-precipitation-hail" value="hail">Hail</option>
        </select>
      </label>
      <label><span id="label-precipitation-intensity">Intensity</span> <input id="precipitationIntensity" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
      <label><span id="label-storm">Storm</span> <input id="storm" class="weather-field" type="checkbox"/></label>
    </div>
  </section>
  <section class="subgroup-panel" id="weather-clouds" aria-labelledby="label-clouds-group" hidden>
    <div class="toolbar">
      <style>#cloud-editor { flex-basis: 100%; min-width: 0; } #cloud-editor .cloud-panel { min-width: 0; } #cloud-editor .cloud-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; } #cloud-editor .cloud-list { grid-column: 1 / -1; min-width: 0; } #cloud-editor button:not(.icon-btn) { width: auto; min-height: 2em; padding: .25em .65em; } #cloud-editor label { display: flex; flex-direction: column; align-items: start; } #cloud-editor label[hidden] { display: none !important; } #cloud-editor input, #cloud-editor select { max-width: 100%; box-sizing: border-box; } #cloud-editor p { font-size: .85em; } #cloud-editor .cloud-parameters { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; } #cloud-editor .cloud-parameters .parameter-group { display: contents; border: 0; padding: 0; margin: 0; } #cloud-editor .cloud-parameters[hidden] { display: none; } #cloud-editor .cloud-parameters label { display: block; } #cloud-editor .cloud-parameters label > span { display: block; } #cloud-editor input.parameter-derived::placeholder { opacity: .65; }</style><div id="cloud-editor"></div>
      <label hidden><span id="label-cloud-cover">Cloud cover</span> <input id="cloudCover" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
      <!-- The HIGH deck, kept apart from the total: it is not about how much sky was hidden but about
           whether there were ICE CRYSTALS in it, which is what halos and sundogs need. See
           IceHalos.ts. -->
      <label hidden><span id="label-high-cloud">Ice cloud (cirrus)</span> <input id="highCloudCover" class="weather-field" type="range" min="0" max="1" step="0.05" value="0" title="How much of the sky the high, icy deck covered — what refracts a halo or a pair of sundogs into being"/></label>
      <!-- The one weather control that stays live even when a record owns every other one, because no
           record holds it: what the crystals were doing up there was never measured. See
           Weather.iceCrystalAlignment. -->
      <label hidden><span id="label-ice-alignment">Crystal alignment</span> <input id="iceCrystalAlignment" class="weather-field" type="range" min="0" max="1" step="0.05" value="0.65"/></label>
      <!-- Stated like the alignment, and for the same reason: nobody counted the crystals. See
           Weather.rareIceCrystals. -->
      <label hidden><span id="label-rare-ice">Rare crystals</span> <input id="rareIceCrystals" class="weather-field" type="range" min="0" max="1" step="0.05" value="0.05"/></label>
      <label hidden><span id="label-cloud-darkness">Cloud darkness</span> <input id="cloudDarkness" class="weather-field" type="range" min="0" max="1" step="0.05" value="0"/></label>
      <label hidden><span id="label-cloud-base">Cloud base</span>
        <input id="cloudBase" class="weather-field" type="number" min="0" max="20000" step="50" placeholder="1000" title="Height of the cloud layer's base above the ground — decides whether the observer is under the deck or above it"/> m</label>
    </div>
  </section>
  <section class="subgroup-panel" id="weather-wind" aria-labelledby="label-wind-group" hidden>
    <div class="toolbar">
      <label><span id="label-wind-direction">Wind direction</span> <input id="windDirection" class="weather-field" type="number" min="0" max="360" step="1" value="0" title="The direction the wind blows TOWARD, clockwise from true north — the opposite of the meteorological convention a forecast uses (see Weather.windDirectionDeg)"/> &deg;</label>
      <label><span id="label-wind-speed">Wind speed</span> <input id="windSpeed" class="weather-field" type="number" min="0" max="30" step="0.5" value="0"/> m/s</label>
    </div>
  </section>
</section>
<!-- Its own group rather than a row of the Shape group below: what the object sounded like is
     keyframed on the very same clock as its shape (a craft silent on the ground and heard only as
     it lifts off is two keyframes), but it belongs to the sighting, not to any one drawn part of
     it — see SoundTrack.ts. The kind dropdown is filled from SOUND_KINDS in script, so adding a
     timbre never means editing markup and element ids (same rule as the data-source pickers). -->
<section class="group-panel" id="group-sound" aria-labelledby="label-sound-group" hidden>
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
</section>
<!-- Pictures of the place laid over the reconstruction (see SceneReference): one dropdown of them,
     the fields of the selected one, and two ways to add one — an address, or a file from the
     author's own disk, which is embedded in the recording. The registration is typed here for now
     (heading, pitch, roll, field), with the observer's own pose one click away since a picture from
     the observer's spot most often looks where they looked; lining a picture up on the rendered
     relief by dragging it is the next step, not this one. -->
<section class="group-panel" id="group-reference" aria-labelledby="label-reference-group" hidden>
  <div class="toolbar">
    <!-- Laid out as every list of the editor is (see ElementList): the picker, 🗑, then where the picture to add comes from (an
         address, a file from the author's own disk, embedded in the recording, or street-level pictures near the spot) and "+";
         under it, the frame of the picked picture. -->
    <div class="element-list-row" id="reference-row">
      <label class="element-list-picker"><select id="reference" aria-label="Picture"></select></label>
      <button id="delete-reference" type="button" class="icon-btn" title="Delete picture" aria-label="Delete picture">🗑</button>
      <span id="reference-empty" class="element-list-empty">No picture</span>
      <select id="reference-add-kind" class="element-list-add-kind" aria-label="Add a picture">
        <option value="address" id="reference-add-address">From an address</option>
        <option value="file" id="reference-add-file-option">From a file</option>
        <option value="street" id="reference-add-street">Street-level pictures nearby</option>
      </select>
      <button id="add-reference" type="button" class="icon-btn element-list-add" title="Add a picture" aria-label="Add a picture">+</button>
      <input id="add-reference-file" class="element-list-add" type="file" accept="image/*" hidden/>
    </div>
    <!-- Street-level pictures somebody took near the observer's spot — see PanoramaxPictures. Each
         comes with where it was taken from and which way it looked, a registration already made. -->
    <div class="decor-add-row">
      <select id="reference-street" hidden></select>
      <button id="reference-street-add" type="button" hidden>Add</button>
    </div>
    <div class="element-list-body" id="reference-item">
    <label><span id="label-reference-title">Name</span> <input id="referenceTitle" class="reference-field" type="text"/></label>
    <label><span id="label-reference-src">Address</span> <input id="referenceSrc" class="reference-field" type="text" placeholder="https://…/photo.jpg"/></label>
    <label><span id="label-reference-kind">Kind</span>
      <select id="referenceKind" class="reference-field">
        <option value="photo" id="reference-kind-photo">Photo</option>
        <option value="panorama" id="reference-kind-panorama">Panorama (360°)</option>
      </select></label>
    <label><span id="label-reference-credit">Credit</span> <input id="referenceCredit" class="reference-field" type="text"/></label>
    <label><span id="label-reference-credit-url">Credit link</span> <input id="referenceCreditUrl" class="reference-field" type="url"/></label>
    <label><span id="label-reference-t">Taken at</span> <input id="referenceT" class="reference-field" type="number" min="0" max="86400" step="0.1" placeholder="—"/> s</label>
    <label><span id="label-reference-drawing">Drawn on</span> <input id="referenceDrawing" class="reference-field" type="checkbox"/></label>
    <label><span id="label-reference-opacity">Opacity</span> <input id="referenceOpacity" class="reference-field" type="range" min="0" max="1" step="0.05" value="0.5"/></label>
    <label><span id="label-reference-heading">Heading</span> <input id="referenceHeading" class="reference-field" type="number" min="0" max="360" step="0.1"/> &deg;</label>
    <label><span id="label-reference-pitch">Pitch</span> <input id="referencePitch" class="reference-field" type="number" min="-90" max="90" step="0.1"/> &deg;</label>
    <label><span id="label-reference-roll">Roll</span> <input id="referenceRoll" class="reference-field" type="number" min="-180" max="180" step="0.1"/> &deg;</label>
    <label><span id="label-reference-fov">Vertical field</span> <input id="referenceFov" class="reference-field" type="number" min="1" max="179" step="0.1"/> &deg;</label>
    <button id="reference-use-pose" type="button">Use the observer's pose</button>
    <!-- Lining the picture up on the rendered scene, by hand and by landmarks — see
         SightingEditorElement.canvasMode and PictureRegistration. While this group is open the
         canvas belongs to the selected picture: a drag turns it, the wheel changes its field, and
         a click names a landmark on it, then the same landmark in the render. -->
    <button id="reference-adopt-pose" type="button">Adopt as the observer's pose</button>
    <span id="reference-status" class="apparent-size"></span>
    <!-- The details the picture is lined up on (see PictureLandmark), a list of the picture laid out as every list is: one row
         each in the dropdown with how far it still is from fitting, the selected one bolder on the canvas, its name editable,
         and a "+" that arms the next two clicks to name a new one. -->
    <span id="label-reference-landmarks" class="element-list-title">Landmarks</span>
    <div class="element-list-row" id="reference-landmark-row">
      <label class="element-list-picker"><select id="reference-landmarks" aria-labelledby="label-reference-landmarks"></select></label>
      <button id="delete-reference-landmark" type="button" class="icon-btn" title="Delete landmark" aria-label="Delete landmark">🗑</button>
      <span id="reference-landmark-empty" class="element-list-empty">No landmark</span>
      <button id="add-reference-landmark" type="button" class="icon-btn element-list-add" title="Add a landmark" aria-label="Add a landmark">+</button>
    </div>
    <div class="element-list-body" id="reference-landmark-item">
      <label><span id="label-reference-landmark-label">Name</span> <input id="referenceLandmarkLabel" type="text" placeholder="Masking tree, fence…"/></label>
    </div>
    </div>
    <!-- What an investigator drew over the place, from their own file (see InvestigatorTrace): lines
         of sight, axes, markers. Drawn over the scene as theirs, not as part of the reconstruction. A list of its own, laid out
         as every list is; its "+" reads a KML or KMZ file. -->
    <span id="label-trace-import" class="element-list-title">Investigator's lines (KML, KMZ)</span>
    <div class="element-list-row" id="trace-row">
      <label class="element-list-picker"><select id="trace" aria-labelledby="label-trace-import"></select></label>
      <button id="delete-trace" type="button" class="icon-btn" title="Delete trace" aria-label="Delete trace">🗑</button>
      <span id="trace-empty" class="element-list-empty">No investigator's line</span>
      <button id="add-trace" type="button" class="icon-btn element-list-add" title="Investigator's lines (KML, KMZ)" aria-label="Investigator's lines (KML, KMZ)">+</button>
      <input id="add-trace-file" class="element-list-add" type="file" accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz" hidden/>
    </div>
    <span id="trace-status" class="apparent-size"></span>
    <div class="element-list-body" id="trace-item">
      <label><span id="label-trace-title">Name</span> <input id="traceTitle" class="trace-field" type="text"/></label>
      <label><span id="label-trace-source">Source</span> <input id="traceSource" class="trace-field" type="text"/></label>
    </div>
  </div>
</section>
<section class="group-panel" id="group-shape" aria-labelledby="label-shape-group" hidden>
  <!-- In two parts: the shapes the observer DREW (angles on their image, the account), and the
       bodies the observer said those shapes WERE (the 3D interpretation, see BodyEditor). The shapes
       come first and open on arrival: they are what the rest of this editor draws and records. -->
  <div class="group-tabs" id="shape-tabs">
    <button class="subgroup-tab" type="button" aria-controls="shape-shapes" aria-expanded="true"><span id="label-shapes-subgroup">Shapes</span></button>
    <button class="subgroup-tab" type="button" aria-controls="shape-bodies" aria-expanded="false"><span id="label-bodies-subgroup">Bodies</span></button>
    <button class="subgroup-tab" type="button" aria-controls="shape-launches" aria-expanded="false" hidden><span id="label-launches-subgroup">Launches</span></button>
  </div>
  <section class="subgroup-panel" id="shape-shapes" aria-labelledby="label-shapes-subgroup">
  <div class="toolbar">
    <!-- Laid out as every list of the editor is (see ElementList): the picker, 🗑, "+", then the frame of what is set on the
         picked shape, gone while there is none. -->
    <div class="element-list-row" id="shape-row">
      <label class="element-list-picker"><select id="source" aria-label="Shape"></select></label>
      <button id="delete-shape" type="button" class="icon-btn" title="Delete shape" aria-label="Delete shape">🗑</button>
      <span id="shape-empty" class="element-list-empty">No shape</span>
      <button id="add-shape" type="button" class="icon-btn element-list-add" title="Add shape" aria-label="Add shape">+</button>
    </div>
    <div class="element-list-body" id="shape-item">
    <div class="presets" id="presets-group" role="group" aria-label="UFO shape">
      <button class="preset" id="preset-oval" type="button" data-preset="oval">Oval</button>
      <button class="preset" id="preset-polygon" type="button" data-preset="polygon">Polygon</button>
    </div>
    <label><span id="label-color">Color</span> <input id="color" type="color" value="#39ff14"/></label>
    <label><span id="label-transparency">Transparency</span> <input id="transparency" type="range" min="0" max="1" step="0.05" value="0"/></label>
    <label><span id="label-halo">Halo</span> <input id="haloScale" type="range" min="0" max="3" step="0.1" value="1.5"/></label>
    <!-- Next to the halo, which it will be confused with, and named for the edge rather than for
         the light: a halo is a glow AROUND the shape, this is the outline itself losing its
         position. What it is worth as a distance, through the instrument the recording states, is
         printed beside the size estimate below. -->
    <!-- Not a bigger halo: a halo is a coloured fringe, and no fringe reads as painful. This is
         the light's own behaviour — a veil that washes out the field around it, the spikes its
         aperture throws, and a core clipped to white. See BaseShape.brightness. -->
    <label><span id="label-brightness">Brilliance</span> <input id="brightness" type="range" min="0" max="1" step="0.05" value="0" title="How dazzling the observer said it was — a light you cannot look at does three things a halo never does"/></label>
    <label><span id="label-blur">Blur</span> <input id="blur" type="range" min="0" max="1" step="0.05" value="0" title="How indistinct the observer said its edges were — not the lens's own depth of field, which never touches the object here"/></label>
    <label><span id="label-shape-title">Name</span> <input id="shapeTitle" type="text"/></label>
    <!-- Three readings of ONE relation, apparent width = f(real width, distance), kept in step.
         Only the apparent width is the recording's (BaseShape.angular); the real width is derived
         from it, and the distance is where the scene DRAWS the shape (see PhenomenonDepth), never a
         statement. Edit any one and one of the other two follows — the held one never moves, and
         with nothing held the real width is what a thing keeps: a distance edit changes how big it
         looks, and a width edit changes the other width at the distance it stands (the shape is
         resized on the canvas, which is what "try a size at a distance" always did). -->
    <label><span id="label-apparent-width">Apparent width</span>
      <input id="apparentWidth" type="number" min="0" max="180" step="0.1" title="How wide it looked, in degrees — the recording's own statement of size"/>°
      <output id="apparent-size" class="apparent-size inline" for="apparentWidth"></output></label>
    <label><span id="label-real-width">Real width</span>
      <input id="realWidth" type="number" min="0" max="30000" step="0.1" title="What that angle is in metres at the distance beside it. Derived, never stored"/> m</label>
    <label><span id="label-object-distance">Distance</span>
      <input id="objectDistance" type="number" min="0" max="30000" step="1" title="How far along its line of sight the shape is drawn — what decides what the decor hides of it. A hypothesis, never the observer's statement"/> m</label>
    <label><span id="label-size-lock">Hold</span>
      <select id="sizeLock" title="Which of the three stays put while another is edited">
        <option id="option-lock-none" value="none">nothing</option>
        <option id="option-lock-apparent" value="apparent">the apparent width</option>
        <option id="option-lock-real" value="real">the real width</option>
        <option id="option-lock-distance" value="distance">the distance</option>
      </select></label>
    <!-- Shown only while a distance of the reader's own is in force — whichever field put it there:
         the distance itself, or the real width with the apparent width held. -->
    <button id="clear-distance-hypothesis" type="button" title="Back to what the recording establishes">Withdraw the distance hypothesis</button>
    <output id="real-size" class="apparent-size" for="realWidth"></output>
    <output id="depth-basis" class="apparent-size" for="objectDistance"></output>
    <!-- The depth of field, read backwards. The scene blurs the WORLD from its distance and leaves
         the observer's object alone, because that distance is the unknown; a blur the observer
         STATED runs the geometry the other way and bounds it. See DepthOfField's own doc comment,
         which says so before anything existed to say it with. -->
    <output id="blur-bound" class="apparent-size" for="blur"></output>
    <div class="record-row">
      <button id="record" type="button" class="record-btn"></button>
      <label><span id="label-sampling-rate">Sampling rate</span> <input id="samplingRate" type="number" min="16" max="1000" step="16" value="100"/> ms</label>
    </div>
    </div>
  </div>
  </section>
  <section class="subgroup-panel" id="shape-bodies" aria-labelledby="label-bodies-subgroup" hidden>
    <div class="toolbar">
      <style>#body-editor { flex-basis: 100%; min-width: 0; } #body-editor .body-list, #body-editor .body-keys { flex-basis: 100%; min-width: 0; } #body-editor .body-editor, #body-editor .body-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } #body-editor .body-fields { flex-basis: 100%; min-width: 0; } #body-editor .body-fields[hidden], #body-editor [hidden] { display: none !important; } #body-editor select { min-width: 0; width: 100%; } #body-editor .body-intro { flex-basis: 100%; font-size: .85em; margin: 0; } #body-editor .body-explains { flex-basis: 100%; min-width: 0; box-sizing: border-box; margin: 0; } #body-editor #body-explains { display: flex; flex-wrap: wrap; gap: .3em 1em; } #body-editor #body-explains label { white-space: normal; } #body-editor .body-track { margin: 0; } #body-editor details { flex-basis: 100%; min-width: 0; } #body-editor details[open] { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } #body-editor details > summary { flex-basis: 100%; } #body-editor input, #body-editor select { max-width: 100%; box-sizing: border-box; } #body-editor input[type="color"] { width: 3em; padding: 0; } #body-editor #body-id, #body-editor #body-outline-node { width: 10em; } #body-editor #body-title, #body-editor #body-interpretation-title { width: 18em; } #body-editor label { min-width: 0; max-width: 100%; } #body-editor .body-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } #body-editor .body-parameters[hidden] { display: none !important; } #body-editor .parameter-group { display: contents; border: 0; padding: 0; margin: 0; } #body-editor .parameter-set { display: flex; flex-wrap: wrap; gap: .3em 1em; } #body-editor .parameter-row { flex-basis: 100%; } #body-editor input.invalid { outline: 2px solid #c33; } #body-editor input[data-key="title"] { width: 18em; } #body-editor input[data-key="id"], #body-editor input[data-key="outlineNode"] { width: 10em; } #body-editor input.parameter-derived::placeholder { opacity: .65; }</style><div id="body-editor"></div>
    </div>
  </section>
  <section class="subgroup-panel" id="shape-launches" aria-labelledby="label-launches-subgroup" hidden>
    <div class="toolbar">
      <style>#launch-editor { flex-basis: 100%; min-width: 0; } #launch-editor #launch-list, #launch-editor #launch-places { flex-basis: 100%; min-width: 0; } #launch-editor .launch-editor, #launch-editor .launch-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } #launch-editor .launch-fields { flex-basis: 100%; min-width: 0; } #launch-editor [hidden] { display: none !important; } #launch-editor select { min-width: 0; width: 100%; } #launch-editor .launch-intro { flex-basis: 100%; font-size: .85em; margin: 0; } #launch-editor .launch-track { flex-basis: 100%; margin: 0; } #launch-editor .launch-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } #launch-editor .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } #launch-editor input, #launch-editor select { max-width: 100%; box-sizing: border-box; } #launch-editor input[type="text"] { width: 12em; } #launch-editor #launch-title { width: 18em; } #launch-editor label { min-width: 0; max-width: 100%; } #launch-editor input.parameter-derived::placeholder { opacity: .65; } #launch-editor .launch-path { flex: 1 1 100%; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; }</style><div id="launch-editor"></div>
    </div>
  </section>
</section>

<!-- A case opened for editing: the recordings it lists (the accounts, and the readings of them, which
     are recordings of their own), one open at a time. Hidden for a single recording. Just above the render, as the player puts its own pickers: what
     is picked here is what the render shows. -->
<div class="render-line">
<!-- How the account is drawn, and which part of the Phenomenon group edits it: the angles the observer drew (2D, the shapes) or what
     they said those were, in 3D (the bodies). Follows the panels as they are opened, and opens them when chosen. -->
<label id="account-view-row" class="account-view"><span id="label-account-view">Account</span>
  <select id="account-view"><option value="shapes">2D · shapes</option><option value="bodies">3D · bodies</option></select></label>
<!-- The playback layer's own toggles, taken out of the picture — see UfoElement.hostControls. -->
<div id="scene-controls" class="scene-controls"></div>
</div>
<div id="ufo-slot"></div>
<div class="toolbar playback-row">
  <button id="play-pause" type="button" class="icon-btn" title="Play" aria-label="Play">▶</button>
  <span id="time-start" class="time-label">0:00</span>
  <button id="previous-mark" type="button" class="icon-btn" title="Previous keyframe" aria-label="Previous keyframe">◂◆</button>
  <!-- The keyframes of what the open group edits, and the named moments — see TimelineMarks. -->
  <div class="seek-track">
    <input id="seek" type="range" min="0" max="0" value="0" step="1"/>
    <div id="timeline-marks" class="timeline-marks"></div>
  </div>
  <button id="next-mark" type="button" class="icon-btn" title="Next keyframe" aria-label="Next keyframe">◆▸</button>
  <span id="time-end" class="time-label">0:00</span>
</div>
<!-- Everything this reconstruction actually asserts, on one wrapping strip: only fields that are
     SET appear (37 of 75 on a real case), so it reads as a statement rather than as a second copy
     of the form. It has to sit BELOW the render, not between the groups and it: 200px of chips
     above the canvas would push it back off the screen and undo what the tab strip just bought.
     Nothing is lost by the move — a summary is read while you are not editing, the render is
     watched while you are, never both at once. Each chip carries its group and its field, so
     clicking one opens the right panel and puts the caret in the right input (see
     SightingEditorElement.refreshParamSummary); a value a data source supplied rather than the
     author is marked, which is the one thing the form itself never showed at a glance. -->
<div id="param-summary" class="param-summary"></div>
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
  <button id="context-view-account" type="button" role="menuitem">View account</button>
  <div class="submenu-trigger">
    <span id="label-context-masks" class="submenu-label" role="menuitem" aria-haspopup="true">Masks &#9656;</span>
    <div id="context-masks-submenu" class="submenu" role="menu"></div>
  </div>
</div>
`

export const css = `${InputFont.CSS}${ElementList.CSS}
:host {
  color-scheme: light dark;
  display: block;
  font-family: sans-serif;
}
.decor-list-part {
  display: contents;
}
/* The fields of the observer of this account keep the toolbar's flow inside the frame; another observer's are on a line of their own. */
#observer-principal {
  display: contents;
}
#observer-principal[hidden] {
  display: none;
}
#observer-decor-host {
  flex-basis: 100%;
  min-width: 0;
}
#observer-decor-host:empty {
  display: none;
}
/* Already in the frame of the observer picked: not a second one. */
#observer-decor-host > .element-list-body {
  border: 0;
  padding: 0;
  margin: 0;
}
/* What a list is, above it, where its tab holds more than the list (the moments of the Time tab). */
.element-list-title {
  flex-basis: 100%;
  font-weight: 600;
  margin-top: .3em;
}
/* What the scenery taken from a survey says of itself: quiet, on a line of its own below the decor. */
.decor-scenery {
  flex-basis: 100%;
}
.decor-scenery {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5em;
}
/* A warning, as every message is drawn (see MessageStyle at the end). */
.scenery-warning {
  flex-basis: 100%;
}
.scenery-warning[hidden] {
  display: none;
}

#shape-shapes .toolbar > [hidden] { display: none !important; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
  flex-wrap: wrap;
}
/* A field as wide as what it holds, from its own min/max/step — see NumberFields, which sets each
   one's width. What stands here is only what a field with no bounds of its own falls back to, and
   the colour swatches, which hold no text at all. */
/* The instrument and what is set on it, as one box: the picker names the device, and the filter, focal length,
   aperture, exposure, focus, roll and sway are that device's. */
.instrument-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5em;
  flex: 1 1 100%;
  margin: 0.2em 0;
  padding: 0.3em 0.6em 0.5em;
  border: 1px solid light-dark(#ccc, #4a4c52);
  border-radius: 4px;
}
.instrument-group > legend {
  padding: 0 0.4em;
  font-weight: 600;
}
.instrument-group [hidden] { display: none !important; }
.toolbar input[type="number"] {
  width: 7em;
}
.toolbar input[type="color"] {
  width: 3em;
  padding: 0;
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
/* Every number field short enough that the browser's own ~14em default was mostly empty space —
   a sampling rate of 100 in a field wide enough for a paragraph. Six em holds a longitude to six
   decimals, which is the widest thing in the list. Deliberately NOT here: #durationSeconds and
   #utcOffsetHours, whose placeholders are sentences ("observation length", "from longitude") that
   6em would cut off, and #objectSize/#objectDistance for the same reason. */
#lat, #lng, #heading, #pitch, #roll, #elevation, #focalLength, #fNumber, #focusDistance, #samplingRate, #cloudBase, #windDirection, #windSpeed, #decorEast, #decorNorth, #decorHeading, #decorAltitude, #decorWidth, #decorLength, #decorHeight, #decorFloors, #decorOccupiedFloor, #decorWindowFront, #decorWindowBehind, #decorWindowLeft, #decorWindowRight, #decorWindowFrontLeft, #decorWindowFrontRight, #decorWindowBehindLeft, #decorWindowBehindRight {
  width: 6em;
}
.time-qualifier {
  font-size: 0.9em;
}
/* Stated, not left to the UA sheet: this component has been bitten three times by a class that
   sets its own display outranking the [hidden] attribute, and these two swap on every mode
   change. */
.time-qualifier[hidden], input[hidden] {
  display: none;
}
#obs-time, #obs-end-time {
  width: 12em;
}
#milestoneNote {
  min-width: 22em;
}
#observerId, #observerTitle, #observerLastName, #observerFirstNames, #sightingId, #tags, #shapeTitle, #decorTitle {
  width: 10em;
}
/* The whole disclosure sits on its own line: five stacked rows inside a row of inline labels
   would otherwise be laid out beside the field before it. */
/* Shared by Duration (no sane default — real playback pacing needs some notion of the
   observation's length, so an empty value is flagged rather than just left blank) and the two
   EDTF date fields (rejected text that doesn't parse as EDTF — see SightingEditorElement.
   applyEdtfTimeInput). Cleared automatically once the field holds a valid/derivable value.
   Light-mode colors by default (this widget has no fixed background of its own — every other
   input just inherits the host page's own light/dark styling — so a hardcoded dark fill here
   read as a stray dark box on a light host page); the dark-mode pair below is what was actually
   tuned for legibility earlier (white text on dark red), unchanged, just now gated correctly
   instead of always-on. Mirrors rr0.org's own site-wide theming convention — a light-mode
   default overridden inside a prefers-color-scheme:dark media query, not a manual toggle (see
   e.g. rr0.org's own link.css/rr0.css). */
:host {
  /* The colours of the File group's editor: a key, a string, and a number or a word. Said here and
     not in the editor, so that dark mode redefines three values rather than a theme. */
  --file-key: #1a5fb4;
  --file-string: #26662f;
  --file-literal: #a5321f;
  /* The one alert colour, said once. input.invalid's border was the only thing wearing it, and the
     two "something is missing" marks below now wear it too — so a reader learns one colour rather
     than three, and changing it changes all of them. */
  --rr0-alert: #c33;
}
input.invalid {
  border-color: var(--rr0-alert);
  background: #fde8e8;
  color: #611;
}
@media (prefers-color-scheme: dark) {
  :host {
    --file-key: #8cb8ff;
    --file-string: #8fd39a;
    --file-literal: #ffa08a;
  }
  input.invalid {
    background: #3a1414;
    color: #fff;
  }
}
/* Reads back what the Real size / Distance pair actually produces on screen — an apparent size in
   degrees, and in full Moons, the only unit of apparent size most accounts come with. Purely
   informative (an output, never an input), so it stays visually quieter than the fields it
   comments on. */
/* Never a backtick in here: this whole stylesheet is a template literal, and one would end it.
   nowrap was a fair rule while these outputs were short — "i.e. 2.2 deg, 4.2x the Moon" wants to
   stay on one line. Two of them are not short: the real-width estimate is a whole sentence and the
   blur bound another, and on a phone they ran straight out of the element's own box. They wrap;
   the short ones still have nothing to wrap. min-width:0 is what lets them, since a flex item
   otherwise refuses to shrink below its own content. */
.apparent-size {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
  /* A line of its own, always. These change on every pointer move of a resize ("i.e. 8 deg" becomes
     "i.e. 9 deg", the real-width sentence grows a word), and as ordinary flex items their new length
     re-wrapped the whole toolbar around them: every control below jumped, twice a frame, for as
     long as the drag lasted. Given the full line outright, a readout can only ever change its own
     text. Tabular figures keep even that from moving. */
  flex-basis: 100%;
  min-height: 1.3em;
  font-variant-numeric: tabular-nums;
}
#apparent-size {
  white-space: nowrap;
}
/* A readout inside a label, after its field, is not a flex item and takes no line of its own. */
.apparent-size.inline {
  display: inline;
  flex-basis: auto;
  min-height: 0;
  margin-left: 0.4em;
}

/* Record and the sampling rate it records at are one control, not two: grouping them makes them a
   single flex item of the wrapping toolbar, so they stay on the same line together wherever that
   line happens to break, instead of the button drifting up next to whatever field precedes it.
   flex-basis: 100% then gives them that line outright, always — the pair is wider than whatever
   the appearance fields leave at the end of theirs, so it was going to wrap anyway; taking the
   whole line makes that a deliberate row rather than a break that moves with the window width. */
.scene-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.3em;
  margin: 0.3em 0;
}
.scene-controls [hidden] {
  display: none;
}
.scene-controls button {
  width: 1.8em;
  height: 1.8em;
  padding: 0;
  font-size: 1em;
  line-height: 1;
}
.scene-controls button[aria-pressed="true"] {
  outline: 2px solid #39f;
}
.scene-controls input[type="range"] {
  width: 5.5em;
  margin: 0;
}
.record-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
}
/* Same "one control, its own line" treatment as .record-row above, and for a stronger reason: this
   row states whether everything below it in the group is the observer's word or a looked-up record,
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
  width: 24em;
}
/* How many places matched, and the credit the data requires — quieter than the field it explains,
   same role and styling as .weather-source/.apparent-size. */
.place-status,
.ground-elevation {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
}
/* Says which record the locked fields came from, and when for — quieter than the fields it
   explains, same role and styling as .apparent-size. The link goes to the exact request that
   produced them, so the claim stays checkable rather than just asserted. */
/* min-width:0 as well as the clamp itself: a flex item refuses to shrink below its own content by
   default, so an unbreakable 575-character line would simply widen the row and take the ellipsis
   off-screen with it instead of ever being cut. */
.weather-source.clamped {
  display: block;
  min-width: 0;
  flex: 1 1 12em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Every link this widget draws — the geocoder's attribution, the weather record's, the account
   reader's. Takes the host page's own text color rather than its link color: this widget has no
   background of its own (see input.invalid's comment on the same constraint), and a host's link
   blue against a host's dark page was unreadable — the surrounding label color is legible wherever
   this is embedded, by construction. The underline is what still reads as a link. */
.place-status a,
.weather-source a,
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
/* Wraps rather than scrolls sideways. A horizontally scrolling strip would keep the row to one
   line on a phone, but at the cost of putting half the groups off-screen with nothing to say they
   are there — the whole complaint being answered here is exactly that kind of invisibility. Two
   wrapped lines of 8 handles at 375px is still a twentieth of what the stacked groups cost. */
/* Real tabs: a strip sharing one baseline, the open tab raised and joined to the panel below it (same
   surface, no line between them), the others recessed and lighter. Mixed from CanvasText and Canvas,
   which this widget's own color-scheme (light dark) makes follow the host page's scheme: a tab that
   merges with its panel needs a SOLID surface, and a fixed colour read wrong on one of the two schemes. */
.group-tabs {
  --tab-line: color-mix(in srgb, CanvasText 35%, transparent);
  --tab-surface: color-mix(in srgb, CanvasText 5%, Canvas);
  --tab-recessed: color-mix(in srgb, CanvasText 11%, Canvas);
  --tab-accent: #4a9eff;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  /* No space between tabs, either way: they touch, sharing their borders (see .group-tab's margins). */
  gap: 0;
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--tab-line);
}
/* Undo and redo have a place of their own at the right end of the strip, reserved for them: the tabs wrap
   before it, never into it. As one more item of the wrapping row they dropped onto a line of their own when
   the tabs filled the width, and left a gap between the tabs and the panel. */
#group-tabs {
  position: relative;
  /* One button wide: the two are stacked, so the reserve is a column and not a row. */
  padding-inline-end: 2.4em;
  /* ...and as tall as the stack (two squares and the margin between them), so that a strip of a single
     row does not let it climb out of the strip. The tabs stay on the baseline. */
  min-height: 3.7em;
}
.history {
  position: absolute;
  inset-inline-end: 0.2em;
  top: 0.2em;
  display: inline-flex;
  flex-direction: column;
  gap: 0.3em;
}
/* A little wider than tall (the squares read as taller than wide on the author's screen), whatever a host page says of
   its buttons (a minimum height, a padding): one size on every side. */
.history .icon-btn {
  box-sizing: border-box;
  flex: none;
  width: 1.8em;
  height: 1.55em;
  min-width: 1.8em;
  min-height: 1.55em;
  max-width: 1.8em;
  max-height: 1.55em;
  padding: 0;
}
.history .icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.group-tab, .subgroup-tab {
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  color: color-mix(in srgb, CanvasText 70%, transparent);
  background: var(--tab-recessed);
  border: 1px solid var(--tab-line);
  border-radius: 8px 8px 0 0;
  padding: 0.4em 0.6em;
  /* Overlapping its neighbours by one border, and the strip's baseline by one, so that nothing separates
     two tabs, on a line or from one line to the next. */
  margin: 0 0 -1px -1px;
  position: relative;
}
.group-tab:hover, .subgroup-tab:hover {
  color: CanvasText;
  background: color-mix(in srgb, CanvasText 16%, Canvas);
}
/* The open tab is raised, joined to its panel (the panel has no top border, and this overlaps the baseline
   with the panel's own surface) and marked by an accent along its top. */
.group-tab[aria-expanded="true"], .subgroup-tab[aria-expanded="true"] {
  color: CanvasText;
  background: var(--tab-surface);
  border-bottom-color: var(--tab-surface);
  box-shadow: inset 0 2px 0 var(--tab-accent);
  z-index: 1;
}
.group-tab:focus-visible, .subgroup-tab:focus-visible {
  outline: 2px solid #4af;
  outline-offset: -2px;
}
.group-panel, .subgroup-panel {
  border: 1px solid var(--tab-line, color-mix(in srgb, CanvasText 35%, transparent));
  border-top: 0;
  border-radius: 0 0 4px 4px;
  background: color-mix(in srgb, CanvasText 5%, Canvas);
  /* The text goes with the surface it stands on: both from this widget's own color scheme. Left to inherit the
     host page's colour, labels came out pale on a light panel (and dark on a dark one) whenever the host's text
     and the system's scheme disagreed. */
  color: CanvasText;
  padding: 0.5em 0.75em;
  margin: 0 0 0.5em;
}
/* Stated rather than left to the UA sheet's own hidden rule. That rule works only for as long as
   .group-panel itself never sets a display — the day it becomes a grid or a flex container, that
   declaration outranks the UA one and every panel is permanently open, with the attribute set and
   nothing happening. This component has already been bitten by exactly that once (.icon-btn), so
   the guard is written down. */
.group-panel[hidden], .subgroup-panel[hidden] {
  display: none;
}
.group-panel > .toolbar, .subgroup-panel > .toolbar {
  margin-bottom: 0;
}
/* The rule above flattens every panel toolbar's own spacing, which is right when there is one of
   them and wrong the moment a panel has two: the Observation panel's account row would sit welded
   to the fields above it. */
.group-panel > .toolbar + .toolbar {
  margin-top: 0.5em;
}
/* A paragraph, not a field: it takes the whole line and its label sits above it rather than
   beside it, which is the only way a four-row textarea reads as one thing with its own name. */
.toolbar > label.wide {
  flex: 1 1 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25em;
}
.toolbar > label.checkbox {
  gap: 0.35em;
}
/* A strip of handles inside a panel — the weather's three parts. */
.group-panel > .group-tabs {
  margin-top: 0.5em;
}
#description {
  resize: vertical;
}
/* A provider's own settings sit in the row like any other field; a key is long, a workspace id
   shorter, a model a list. */
.narrative-settings {
  display: contents;
}
#narrative-key {
  width: 16em;
}
#narrative-workspace {
  width: 14em;
}
/* A failure has to be visible without opening a console. The status line carries three quite
   different things — working, written, refused — and only the last is a problem, so only the last
   is coloured. Same palette as an invalid field, and the same reason it is stated rather than left
   to a system colour: this widget has no background of its own. */
/* (Drawn as an error by MessageStyle, at the end of this sheet.) */
/* What the draft claims, and what the account never said. A table would be the obvious shape and
   the wrong one: the quotes are sentences of wildly differing length, and a column sized for the
   longest of them wastes the width every other row needed. */
.narrative-report {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  margin-top: 0.5em;
  max-height: 14em;
  overflow-y: auto;
  font-size: 0.9em;
}
/* Stated, and not left to the UA sheet: this element sets its own display, which outranks the
   built-in hidden rule and would leave an empty box standing open before the first draft. */
.narrative-report[hidden] {
  display: none;
}
.narrative-report .claim {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  align-items: baseline;
}
/* Dimmed from whatever the host page's own text colour is, never a fixed one: this widget has no
   background of its own and sits on light and dark pages alike (see the note above the palette). */
.narrative-report .claim code {
  color: color-mix(in srgb, currentColor 72%, transparent);
  font-size: 0.95em;
}
.narrative-report .claim q,
.narrative-report .claim span {
  color: color-mix(in srgb, currentColor 85%, transparent);
}
/* A guess reads as a guess without having to find its heading again: this group is what an author
   has to go and check, and it is the one thing in the report that is not evidence. */
.narrative-report .claim.assumed code {
  color: color-mix(in srgb, currentColor 90%, transparent);
  font-weight: 600;
}
.narrative-report .claim.assumed span {
  font-style: italic;
}
/* A field, or a tab, that would answer a question nothing in the recording does.
   Deliberately not input.invalid's red: a gap is not a mistake. Nobody typed anything wrong here —
   the observer said nothing, and the mark is an invitation rather than a complaint. A dashed
   underline in the host's own text colour says "something is missing here" without claiming
   anything is broken. */
/* Something is missing here. Two marks, one vocabulary: the SOLID one is a value the reconstruction
   cannot be computed without, the dashed one a question the account simply never answered. Both in
   the alert colour, because both are the same kind of statement about the record; neither touches
   the text's own colour or the field's background, because neither is a mistake — nobody typed
   anything wrong, and input.invalid's red box is reserved for when they did.

   Only the DURATION is solid. Nothing else in this format has to be there: a recording with no date
   still says what was seen, and a reader who fills it in later gains coverage rather than repairs a
   fault. But playback has no pacing without a length, so an empty duration is the one blank that
   stops the reconstruction being one.

   An OUTLINE and not a text-decoration, which is what the first attempt used and why nothing showed:
   an underline underlines TEXT, and a field that is missing a value is by definition empty, so there
   was nothing for it to draw under. An outline sits outside the border box and shifts no layout. */
.wanted {
  outline: 1px dashed var(--rr0-alert);
  outline-offset: 1px;
}
.missing-required {
  outline: 2px solid var(--rr0-alert);
  outline-offset: 1px;
}
/* How many of a panel's questions it still has no answer for, on its own tab — the only thing a
   reader sees while that panel is closed. A number rather than a mark, because "three" and "one"
   send somebody to different panels first and a mark says neither.

   Full strength when one of them is the required blank, faded when they are only what stands
   between this recording and complete coverage. Opacity rather than a second colour: the two are
   the same kind of statement at two strengths, and a reader should not have to learn a palette. */
.tab-badge {
  display: inline-block;
  margin-left: 0.45em;
  padding: 0 0.4em;
  border-radius: 999px;
  background: var(--rr0-alert);
  color: #fff;
  font-size: 0.8em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  vertical-align: 0.05em;
}
.tab-badge.optional {
  opacity: 0.45;
}
.tab-badge[hidden] {
  display: none;
}
/* An assessment about the recording as a whole has nowhere to send a click, so it does not offer
   the pointer every other chip does. One that names a group it is about keeps it, and leads there
   (see Assessor.about, and onParamSummaryClick, which ignores a panel of -1). */
.param-nest[data-group="assessment"] .param-chip[data-panel="-1"] {
  cursor: default;
}
.narrative-report .gaps {
  margin: 0.35em 0 0;
  padding-left: 1.2em;
}
.narrative-report h4 {
  margin: 0.25em 0 0;
  font-size: 1em;
  font-weight: 600;
}
/* flex-basis:100% on a flex-wrap:wrap container's own child forces it onto a fresh line — nothing
   else fits beside a 100%-wide item — which is what puts the Add controls below whatever decor
   properties are currently showing (see SightingEditorElement.syncDecorVisibility), rather than just
   trailing after them on whatever horizontal space happens to be left. */
/* The properties a kind publishes (see DecorParameterSets, ParameterForm): groups side by side, their fields
   wrapping inside, with room between a unit and the next field. */
.decor-parameters {
  flex-basis: 100%;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}
.decor-parameters[hidden], .decor-parameters .parameter-group[hidden] { display: none; }
.decor-parameters .parameter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
}
.decor-parameters input.parameter-derived::placeholder { opacity: 0.65; }
.decor-add-row {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5em;
}
.account-view { display: inline-flex; align-items: center; gap: .4em; flex: 1 1 auto; }
.account-view[hidden] { display: none; }
.render-line { display: flex; flex-wrap: wrap; align-items: center; gap: .25em .75em; }
.render-line > .scene-controls { margin: 0 0 0 auto; flex: 0 0 auto; }
/* A reading is titled with a sentence: the picker is as wide as the row lets it be and cuts the rest. */
#import-url {
  flex: 1 1 16em;
}
.file-note {
  margin: 0.5em 0;
}
#observer-identity-hint {
  flex-basis: 100%;
  margin: 0;
}
.file-ask {
  max-width: min(34em, calc(100vw - 2em));
  padding: 1em 1.2em;
  border: 1px solid color-mix(in srgb, CanvasText 35%, transparent);
  border-radius: 8px;
  background: Canvas;
  color: CanvasText;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}
.file-ask::backdrop {
  background: rgba(0, 0, 0, 0.45);
}
.file-ask p {
  margin: 0 0 1em;
  line-height: 1.4;
}
.file-ask ul {
  margin: 0 0 1em;
  padding-left: 1.2em;
}
.file-ask-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5em;
}
.param-summary {
  display: flex;
  flex-wrap: wrap;
  /* Each chip at its own height, centred on the line: stretched to the height of a boxed group
     beside it (see .param-nest), a chip kept its text at the top of a taller pill. */
  align-items: center;
  gap: 0.3em;
  margin-top: 0.5em;
}
.param-summary:empty {
  display: none;
}
/* A chip holding chips: everything said about ONE sub-element — the observer, a decor object —
   boxed under its name, so a Heading inside a box saying Environment needs no prefix to say which
   heading it is. Drawn as a frame rather than as a filled pill: the members already carry an
   outline each, and a second solid shape around them would read as a button they sit on. */
.param-nest {
  transition: border-color 0.12s, background-color 0.12s;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3em;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  border-radius: 12px;
  padding: 0.25em 0.5em;
  max-width: 100%;
  /* A flex item is never narrower than its content unless it says so: a nest holding a chip that
     stays on one line (a long place name) was as wide as that line, past the edge of a phone. */
  min-width: 0;
}
/* Hovering anywhere in the box, its name or a member's gap included, lights the whole frame and
   its name, so the group reads as one thing before one of its chips is picked. */
.param-nest:hover {
  border-color: color-mix(in srgb, currentColor 70%, transparent);
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.param-nest:hover ${SummaryDescription.CSS}
.param-nest-label {
  color: inherit;
}
.param-nest-label {
  font-weight: 600;
  color: color-mix(in srgb, currentColor 62%, transparent);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.85em;
}
/* Deliberately quieter than the fields it summarises: this is meant to be scanned, and 37 chips
   competing with the render above them would be worse than the scrolling it replaces. */
/* Every colour here is a mix of the HOST PAGE's own text colour, never a fixed grey. These chips
   were written when this element was only ever embedded in a dark page; on a light one, #bbb on
   white was barely there at all — and it was the only part of the element that went pale, since
   everything else already inherits. Deriving from currentColor follows whatever page the component
   is dropped into, which is more than a prefers-color-scheme query can do: that reads the system,
   and a page is free to disagree with it. */
.param-chip {
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
  /* Stated, and not left out: a <button> gets "color: buttontext" from the UA sheet, which is
     black whatever the page around it says — the very dark-on-dark this chip was rewritten to
     stop doing. */
  color: inherit;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
  border-radius: 999px;
  padding: 0.1em 0.6em;
  /* A chip stays on one line — half its value is the shape of it — but a long description on a
     narrow screen would otherwise push the whole strip past the element's own edge, so it gives
     up its tail rather than the layout. Clicking it opens the field that holds the whole thing. */
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.param-chip:hover {
  border-color: color-mix(in srgb, currentColor 70%, transparent);
}
.param-chip:hover .param-chip-label {
  color: inherit;
}
/* The chip keeps the host's own ink; only its LABEL steps back. Fading the whole chip, as this
   rule used to, made the value unrecoverable: a child asking for currentColor gets the faded
   colour its parent computed, so the number — the only part worth reading from across the room —
   came out exactly as pale as the word introducing it. */
.param-chip-label {
  color: color-mix(in srgb, currentColor 78%, transparent);
}
.param-chip:focus-visible {
  outline: 2px solid #4af;
  outline-offset: 1px;
}
.param-chip .param-chip-value {
  font-weight: 600;
}
/* A value nobody typed: read from a record (ERA5's weather, Nominatim's coordinates, the terrain
   provider's ground height) or computed from one. The form shows this by disabling the field,
   which is invisible the moment the field is — so the distinction that matters most to this
   project, what the observer said versus what the archives say, gets its own mark here. */
.param-chip.from-source .param-chip-value {
  /* Blended with the host's own text colour so the blue lightens on a dark page and darkens on a
     light one; the italic is what carries the distinction where the hue cannot. */
  color: color-mix(in srgb, #3a9fd8 72%, currentColor);
  font-weight: normal;
  font-style: italic;
}
.param-chip .param-chip-swatch {
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
  border-radius: 2px;
  vertical-align: -1px;
}
/* Below the rendered scene, not overlaid on it (unlike <rr0-ufo>'s own internal toolbar, hidden
   here via showToolbar — see SightingEditorElement's constructor) — its seek bar needs the whole
   width for scrubbing, which would otherwise intercept shape drags near the bottom of the canvas. */
.seek-track {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}
#seek {
  flex: 1;
  min-width: 0;
}
/* Over the bar and transparent to the pointer: the bar itself snaps a press to the nearest mark. */
.timeline-marks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.timeline-mark {
  position: absolute;
  width: 2px;
  transform: translateX(-50%);
  background: currentColor;
}
/* Under the thumb's track, so the thumb still reads as the playhead. */
.timeline-mark.keyframe {
  bottom: 0;
  height: 30%;
  opacity: 0.6;
}
.timeline-mark.milestone {
  top: 10%;
  bottom: 10%;
  /* The map's colour for a named moment, and not the bar's own blue, which it would vanish into. */
  background: #ffd27a;
}
.time-label.switchable {
  cursor: pointer;
}
.time-label.switchable:hover,
.time-label.switchable:focus-visible {
  text-decoration: underline;
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
   just disabled when there's no decor object to delete (see SightingEditorElement.
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
  background: light-dark(#fff, #1e1f22);
  color: light-dark(#222, #e6e6e6);
  border: 1px solid light-dark(#ccc, #4a4c52);
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
  background: light-dark(#eef, #3a3d46);
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
  border-top: 1px solid light-dark(#eee, #3a3c42);
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
  background: light-dark(#eef, #3a3d46);
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
  background: light-dark(#fff, #1e1f22);
  color: light-dark(#222, #e6e6e6);
  border: 1px solid light-dark(#ccc, #4a4c52);
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
.submenu-empty {
  display: block;
  padding: 0.3em 0.8em;
  color: #888;
  white-space: nowrap;
}
.submenu label:hover {
  background: light-dark(#eef, #3a3d46);
}
${MessageStyle.rules(
  ["#scenery-status", ".apparent-size", ".place-status", ".ground-elevation", ".weather-source", ".file-note", "#observer-identity-hint", "#narrative-status", "#cloud-status", "#body-key-note", "#body-editor .body-intro"],
  [".scenery-warning"],
  ["#narrative-status.error"]
)}
`
