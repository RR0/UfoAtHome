import { SummaryDescription } from "./SummaryDescription.js"
export const html = `
<div class="toolbar" id="toolbar" hidden>
  <span id="account" class="account">
    <span id="account-prefix">Account by</span>
    <span id="observer-text"></span><select id="observer" hidden></select>
  </span>
  <!-- What to replay the account with: the raw account, the observer's own reading of it, or an
       analyst's from the case (see InterpretationJson). Only there when there is a choice. -->
  <label id="interpretation-choice" class="interpretation-choice" hidden>
    <span id="interpretation-label">Interpretation</span> <select id="interpretation"></select>
  </label>
  <!-- The playback layer's own toggles, taken out of the picture and put here — see
       UfoElement.hostControls. -->
  <span id="scene-controls" class="scene-controls">
    <!-- Whether the account is shown beside the interpretation on show, as outlines, and
         measured against it — see SceneElement.compareAccount. Only while an interpretation is. -->
    <button id="compare-account" type="button" title="Compare with the account" aria-label="Compare with the account" aria-pressed="false" hidden>◌</button>
  </span>
  <!-- The way into this very observation in the online editor, where what the recording does not
       say shows as missing. Beside "?" rather than inside its panel, which is where it used to hide
       behind the version link. Hidden for a recording with no address (set by script, pasted),
       which the editor could not open. -->
  <a id="edit-link" class="edit-link" target="_blank" rel="noopener" title="Edit this observation" aria-label="Edit this observation" hidden><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8.5 8.5-3.4.9.9-3.4 8.6-8.4Zm-7 9.2-.5 1.7 1.7-.5 6.9-6.9-1.2-1.2-6.9 6.9Z" fill="currentColor"/></svg></a>
  <button id="info-button" class="info-btn" type="button" title="About" aria-label="About" aria-expanded="false"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="3.6" r="1.4" fill="currentColor"/><path d="M6 6.5h3v6h1.5V14h-4.5v-1.5H7.5V8H6Z" fill="currentColor"/></svg></button>
  <div id="info-panel" class="info-panel" hidden>
    <button id="info-close" class="info-close" type="button" aria-label="Close">×</button>
    <section>
      <h3 id="info-observation-heading">Observation</h3>
      <dl id="info-observation-list" class="info-dl"></dl>
    </section>
    <!-- Both fold-out blocks sit ABOVE the footer, never after it: the footer is sticky to the
         panel's bottom edge, so anything following it in the flow opens underneath it — which is
         exactly how clicking Credits came to reveal a list nobody could see. -->
    <ul id="info-credits-list" class="info-ul" hidden></ul>
    <div class="info-footer">
      <a id="info-app-link" href="https://ufoathome.org" target="_blank" rel="noopener"></a>
      <span class="info-footer-actions">
        <!-- Turns the parameter strip under the render on and off. It lives in the panel rather
             than on the toolbar because it is a preference about how much this player says, not
             an action on the observation — and because the panel is what it takes over from: with
             the strip showing, the rows above become a second, poorer copy of it. -->
        <button id="info-labels-toggle" class="info-credits-toggle" type="button" aria-pressed="false">Labels</button>
        <button id="info-credits-toggle" class="info-credits-toggle" type="button" aria-expanded="false">Credits</button>
      </span>
    </div>
  </div>
</div>
<dialog id="share-dialog" class="share-dialog" aria-labelledby="share-title">
  <div class="share-head">
    <h3 id="share-title" class="share-title">Share</h3>
    <button id="share-close" class="share-icon-button share-close" type="button" aria-label="Close">×</button>
  </div>
  <div id="share-main">
    <!-- What is given: the link to the replay, or the code that puts it on another page. -->
    <div class="share-options">
      <button id="share-link-option" class="share-option" type="button" aria-pressed="true">
        <span class="share-option-icon"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span id="share-link-label">Link</span>
      </button>
      <button id="share-embed-option" class="share-option" type="button" aria-pressed="false">
        <span class="share-option-icon"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span id="share-embed-label">Embed</span>
      </button>
    </div>
    <!-- What the link and the embed open: the replay, or the editor on the same recording. -->
    <div class="share-kind">
      <label><input type="radio" name="embed-kind" id="embed-kind-replay" value="replay" checked/> <span id="label-embed-replay">Player</span></label>
      <label><input type="radio" name="embed-kind" id="embed-kind-edit" value="edit"/> <span id="label-embed-edit">Editor</span></label>
    </div>
    <!-- How a shared replay opens; the editor takes none of them, which disables the group. -->
    <fieldset id="share-replay-options" class="share-flags">
      <span class="share-start">
        <label><input id="share-start-on" type="checkbox"/> <span id="share-start-label">Start at</span></label>
        <input id="share-start" class="share-start-input" type="number" min="0" step="1" value="0" aria-label="Start at"/>
        <span id="share-start-unit">s</span>
      </span>
      <label><input id="share-opt-labels" type="checkbox" checked/> <span id="share-opt-labels-label">Show summary chips</span></label>
      <label><input id="share-opt-map" type="checkbox"/> <span id="share-opt-map-label">Open map</span></label>
      <label><input id="share-opt-milestones" type="checkbox" checked/> <span id="share-opt-milestones-label">Show moments</span></label>
      <label><input id="share-opt-compare" type="checkbox"/> <span id="share-opt-compare-label">Compare account</span></label>
    </fieldset>
    <div class="share-link">
      <textarea id="share-link" class="share-link-input" rows="2" spellcheck="false" aria-label="Link"></textarea>
      <button id="share-copy" class="share-copy" type="button">Copy</button>
    </div>
    <!-- The markup to put this observation on another page, in an editor that wraps its lines (its code
       is fetched when this view is first shown); the textarea is what stands in until then. -->
    <div id="share-embed" class="share-embed" hidden>
      <div id="embed-code" class="embed-code"></div>
      <textarea id="embed-markup" class="embed-markup" rows="6" spellcheck="false"></textarea>
      <div class="embed-row">
        <button id="embed-copy" class="share-copy" type="button">Copy</button>
      </div>
    </div>
  </div>
</dialog>
<div id="ufo-slot"></div>
<!-- The interpretation's bodies against what the observer said, at the instant on show — see
     BodyConfrontation. Only while an interpretation is. -->
<div id="confrontation" class="confrontation" hidden>
  <span id="confrontation-heading" class="confrontation-heading">Against the account</span>
  <ul id="confrontation-list"></ul>
</div>
<!-- What this recording states, field by field, in the same words the editor uses for the same
     fields — the very same SightingSummary the editor shows under its own render. Off unless
     the page asks for it (show-labels) or the reader does (the info panel's own toggle): a player
     dropped into an article is there to be watched, and forty labels under it is a data sheet.
     Read-only here, unlike in the editor, where each one is a way back to its field. -->
<div id="param-summary" class="param-summary" hidden></div>
`

export const css = `
:host {
  color-scheme: light dark;
  display: block;
  font-family: sans-serif;
}
/* Normal document flow, above the canvas — unlike the video player's own toolbar (ufoTemplate.ts),
   this row itself never overlays the scene, so it needs none of that toolbar's hover/auto-hide
   dance: once there's something to show, it just stays visible like any other page content. Its
   own info panel (below) is the one thing that overlays — anchored to this row via
   position:relative — so opening it never shifts the canvas or the rest of the page. */
.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
  /* Room for what a button draws OUTSIDE itself — the 2px outline of a pressed toggle, a focus
     ring. Flush against its host, that ring was cut off by any page that clips this element:
     ufoathome.org's own player wraps it in overflow:hidden, and so can any page it is embedded in. */
  padding: 3px 3px 0;
}
.account {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account select {
  max-width: 12em;
}
/* The interpretation's name is long ("A straight, level flight 100 m up, in the plane fitted to…"), and
   the row has room: the choice takes what the account's own name and the buttons leave, instead of a
   cap that cut it after a dozen letters. */
.interpretation-choice {
  flex: 1 1 0;
  min-width: 12em;
  display: flex;
  align-items: center;
  gap: 0.4em;
  white-space: nowrap;
}
.interpretation-choice select {
  flex: 1 1 0;
  min-width: 0;
  text-overflow: ellipsis;
}
.confrontation {
  margin-top: 0.4em;
  font-size: 0.85em;
}
.confrontation ul {
  display: inline;
  margin: 0;
  padding: 0;
  list-style: none;
}
.confrontation li {
  display: inline;
  margin-left: 0.8em;
  font-variant-numeric: tabular-nums;
}
/* What the interpretation fails to reproduce. Red, and not struck through: a strike is kept for a
   observer's word the facts contradict, and here it is the interpretation that is at fault. */
.confrontation .disagrees {
  color: #d33;
}
/* The toggles the playback layer lends this toolbar (see UfoElement.hostControls): the look they
   have in the picture's corner, at the toolbar's own scale. */
.scene-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  margin-left: auto;
}
.scene-controls [hidden] {
  display: none;
}
.scene-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  padding: 0;
  border: 1px solid #999;
  border-radius: 3px;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
  background: #f0f0f0;
  color: #333;
}
.scene-controls button[aria-pressed="true"],
.info-btn[aria-expanded="true"] {
  outline: 2px solid #39f;
}
.scene-controls input[type="range"] {
  width: 5.5em;
  margin: 0;
  accent-color: #39f;
}
/* The pen and the "i" wear the same square as the toggles the playback layer lends this row (see
   .scene-controls button), so the row reads as one set of buttons. */
.edit-link {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid #999;
  background: #f0f0f0;
  color: #333;
}
.edit-link:hover, .edit-link:focus-visible,
.info-btn:hover, .info-btn:focus-visible,
.scene-controls button:hover, .scene-controls button:focus-visible {
  background: #e0e0e0;
}
/* Same trap as elsewhere: a rule setting display outranks the UA sheet's [hidden]. */
.edit-link[hidden] {
  display: none;
}
.info-btn {
  /* Named so the info panel can anchor itself to this button from the top layer — see
     .info-panel:popover-open below. */
  anchor-name: --info-button;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid #999;
  background: #f0f0f0;
  color: #333;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
  padding: 0;
}
/* The panel's own look, independent of where it is placed. It caps its height and scrolls: a real
   case description runs to a paragraph or more, and its footer holds the link to this
   observation's editor — the close button and that footer are pinned to its edges rather than
   scrolling away with the content, since they are how you leave it and what you came for. */
/* Deliberately quieter than the render it sits under, and wrapping rather than scrolling: this is
   meant to be scanned in one pass, and a strip that hides half of itself off the right edge would
   be worse than not showing it. */
.param-summary {
  display: flex;
  flex-wrap: wrap;
  /* Each chip at its own height, centred on the line: stretched to the height of a boxed group
     beside it (see .param-nest), a chip kept its text at the top of a taller pill. */
  align-items: center;
  gap: 0.3em;
  margin-top: 0.5em;
  font-size: 0.85em;
}
.param-summary[hidden] {
  display: none;
}
/* A chip holding chips: everything said about ONE sub-element — the observer, a decor object —
   boxed under its name, so a Heading inside a box saying Environment needs no prefix to say which
   heading it is. Drawn as a frame rather than as a filled pill: the members already carry an
   outline each, and a second solid shape around them would read as a button they sit on. */
.param-nest {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3em;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  border-radius: 12px;
  padding: 0.25em 0.5em;
  max-width: 100%;
}
${SummaryDescription.CSS}
.param-nest-label {
  font-weight: 600;
  color: color-mix(in srgb, currentColor 62%, transparent);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.85em;
}
.param-label {
  /* Mixed from the host page's own text colour rather than fixed — see the same rule in
     template.ts for why. Only the introducing word steps back: the value keeps the host's ink,
     which a child cannot recover once the whole chip has been faded. */
  border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
  border-radius: 999px;
  padding: 0.1em 0.6em;
  white-space: nowrap;
}
.param-label-label {
  color: color-mix(in srgb, currentColor 78%, transparent);
}
.param-label .param-label-value {
  font-weight: 600;
}
/* A value no observer gave: read from a record (ERA5's weather, a terrain provider's ground) — the
   distinction this whole project turns on, and the one thing a plain list of numbers loses. */
.param-label.from-source .param-label-value {
  color: color-mix(in srgb, #3a9fd8 72%, currentColor);
  font-weight: normal;
  font-style: italic;
}
.param-label .param-label-swatch {
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  border: 1px solid #666;
  border-radius: 2px;
  vertical-align: -1px;
}
/* What the popups (the info panel, the share dialog) are drawn with: light by default, and the
   dark set when the system asks for it, as the editor does. The form controls follow through
   color-scheme. */
:host {
  --pop-bg: #fff;
  --pop-fg: #222;
  --pop-border: #ccc;
  --pop-soft: #eee;
  --pop-faint: #666;
  --pop-fill: #f2f2f2;
  --pop-fill-hover: #e4e4e4;
  --pop-on: #dbe6f7;
  --pop-on-border: #9bb6e0;
  --pop-link: #06c;
  --pop-derived: #2a6fb0;
  --pop-assumed: #b06a00;
  --pop-tag: #1a5fb4;
  --pop-attr: #8a4b00;
  --pop-string: #1a7f37;
}
@media (prefers-color-scheme: dark) {
  :host {
    --pop-bg: #1e1f22;
    --pop-fg: #e6e6e6;
    --pop-border: #4a4c52;
    --pop-soft: #34363b;
    --pop-faint: #a0a3aa;
    --pop-fill: #2c2e33;
    --pop-fill-hover: #3a3d43;
    --pop-on: #274066;
    --pop-on-border: #4f7bc4;
    --pop-link: #7fb2ff;
    --pop-derived: #7fb2ff;
    --pop-assumed: #e0a040;
    --pop-tag: #8cb8ff;
    --pop-attr: #e0a860;
    --pop-string: #7fd08a;
  }
}
.info-panel {
  padding: 0.6em 0.8em;
  border: 1px solid var(--pop-border);
  border-radius: 4px;
  background: var(--pop-bg);
  color: var(--pop-fg);
  max-width: 28em;
  overflow-y: auto;
  /* Its own scrolling shouldn't carry on into the page behind it once it reaches an end. */
  overscroll-behavior: contain;
  font-size: 0.9em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
/* Placement wherever the browser has the popover API: the top layer, which is the only way out of
   an ancestor's clipping. Anchored under the "?" button, this panel was being CUT OFF by a host
   page's own wrapper in overflow:hidden (rr0.org's layout) — not merely pushed off-screen, so no
   scrolling could bring it back and its footer was plainly unreachable. A top-layer popover is
   clipped by nothing at all; the UA's own [popover] rules centre it in the viewport, leaving it
   needing only a height cap. */
.info-panel:popover-open {
  display: block;
  max-height: 80vh;
}
/* Back under the "?" button it belongs to, rather than centred in the viewport as the UA's own
   [popover] rules place it. Anchor positioning is what makes that possible from the top layer:
   the panel is no longer a descendant of anything, so there is nothing left to position it
   against but the button itself. Where the browser lacks it, the centred placement above stands —
   correct, just less connected to what opened it. */
@supports (position-area: bottom span-left) {
  .info-panel:popover-open {
    position-anchor: --info-button;
    /* The UA centres a popover with inset:0 + margin:auto; both have to go for the anchor to
       have any say. */
    inset: auto;
    /* The BASE position, not a fallback: fallbacks are only ever consulted when the base itself
       overflows, so leaving the base centred (as the UA has it) meant the anchored options were
       never even tried. */
    position-area: bottom span-left;
    margin: 0.3em 0 0 0;
    /* Fit the space this side actually offers, and scroll inside it. This is what keeps the panel
       anchored at all: the browser judges whether a position option overflows by the element's
       UNCONSTRAINED height, so a percentage or viewport cap still reads as "doesn't fit" and hands
       over to the next option — with a description long enough (Socorro's wants 515px against the
       465 a normal window leaves below the button) that meant every anchored option was rejected
       and the panel went back to the middle of the screen. A stretch cap has no such effect: the
       used height IS the available space, so the option genuinely fits. Declared twice for the
       browsers that only know the prefixed spelling; the later valid one wins. */
    max-height: -webkit-fill-available;
    max-height: stretch;
    /* Only reached if a browser understands neither stretch spelling above (so the panel keeps its
       full height and really does overflow): above the button, then the viewport centre.
       Deliberately no position-try-order — most-height ranks the centred option first, since the
       whole viewport is always taller than either side of the button, which is exactly how the
       panel ended up centred everywhere. */
    position-try-fallbacks: --info-panel-above, --info-panel-centred;
  }
  @position-try --info-panel-above {
    position-area: top span-left;
    margin: 0 0 0.3em 0;
    max-height: -webkit-fill-available;
    max-height: stretch;
  }
  @position-try --info-panel-centred {
    position-area: none;
    inset: 0;
    margin: auto;
    max-height: 80vh;
  }
}
/* Placement without the popover API (browsers older than 2024): the plain absolutely-positioned
   overlay this has always been, capped against the viewport. Still clippable by a host page — the
   very limitation the popover path above removes — but no worse than what those browsers had. */
.info-panel:not([popover]) {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 2;
  margin-top: 0.3em;
  max-height: 70vh;
}
/* Floated rather than absolutely positioned, so it stays pinned to the top of the panel's own
   scrolling content (position: absolute would anchor it to the panel's full height and scroll out
   of sight); the heading beside it simply wraps around it. */
.info-close {
  position: sticky;
  float: right;
  top: 0;
  margin-left: 0.4em;
  width: 1.6em;
  height: 1.6em;
  border: none;
  background: transparent;
  color: var(--pop-faint);
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0;
}
.info-panel h3 {
  margin: 0 0 0.2em;
  font-size: 0.95em;
}
.info-dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15em 0.6em;
}
.info-dl dt {
  color: var(--pop-faint);
}
.info-dl dd {
  margin: 0;
}
/* How a line is known (see SightingElement.basisOf): quiet when the observer said it, louder the
   further it is from what they said. */
.basis {
  display: inline-block;
  margin-left: 0.3em;
  padding: 0 0.35em;
  border-radius: 3px;
  border: 1px solid currentColor;
  font-size: 0.75em;
  line-height: 1.4;
  white-space: nowrap;
  cursor: help;
}
.basis-stated {
  color: var(--pop-faint);
  border-color: var(--pop-border);
}
.basis-derived {
  color: var(--pop-derived);
}
.basis-assumed {
  color: var(--pop-assumed);
}
/* The smaller, secondary row below the observation details — app identity on the left, the
   credits reveal on the right, matching the reduced visual weight of "fine print" rather than
   competing with the sighting's own metadata for attention. */
/* Self-contained markup a reader can paste into their own page — the two lines it takes to embed
   this very observation, either as a replay or as the full editor. Folded away behind a footer
   toggle like the credits are: what the panel is FOR is the observation's own metadata, and a
   block of markup sitting open above it competes with that for no one's benefit. Read-only: it is
   generated, never typed into, and selecting it wholesale is the only interaction it needs. */
/* The share dialog, as the video sites draw theirs: a white card centred over a dimmed page, its
   title and a close button on one line, the ways of sharing as round buttons, and the link to copy
   in a field with its button inside. Native <dialog>, so the page behind is inert and Escape closes. */
.share-dialog {
  color-scheme: light dark;
  width: min(28em, calc(100vw - 2em));
  padding: 1em 1.2em 1.2em;
  border: none;
  border-radius: 1.2em;
  background: var(--pop-bg);
  color: var(--pop-fg);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35);
  font-size: 0.95em;
}
.share-dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
}
.share-head {
  display: grid;
  grid-template-columns: 2em 1fr 2em;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.3em;
}
.share-title {
  grid-column: 2;
  margin: 0;
  font-size: 1.15em;
  font-weight: 500;
  text-align: center;
}
.share-close {
  grid-column: 3;
  grid-row: 1;
}
.share-icon-button {
  width: 2em;
  height: 2em;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  font-size: 1.5em;
  line-height: 1;
  cursor: pointer;
  color: inherit;
}
.share-icon-button[hidden] {
  display: none;
}
.share-icon-button:hover, .share-icon-button:focus-visible {
  background: var(--pop-soft);
}
.share-options {
  display: flex;
  justify-content: center;
  gap: 1em;
  margin-bottom: 0.5em;
}
.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em;
  border: none;
  border-radius: 0.6em;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.share-option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.2em;
  height: 3.2em;
  border: 1px solid var(--pop-border);
  border-radius: 50%;
  background: var(--pop-fill);
}
.share-option:hover .share-option-icon, .share-option:focus-visible .share-option-icon {
  background: var(--pop-fill-hover);
}
/* The one being given: its icon filled, as a pressed tab is. */
.share-option[aria-pressed="true"] .share-option-icon {
  background: var(--pop-on);
  border-color: var(--pop-on-border);
}
.share-kind {
  display: flex;
  justify-content: center;
  gap: 1.5em;
  margin-bottom: 0.7em;
}
.share-flags {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45em 1em;
  margin: 0 0 0.8em;
  padding: 0;
  border: none;
  font-size: 0.9em;
}
.share-flags:disabled {
  opacity: 0.45;
}
.share-link {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  padding: 0.5em 0.6em 0.5em 0.8em;
  border: 1px solid var(--pop-border);
  border-radius: 0.9em;
}
.share-start {
  display: flex;
  align-items: center;
  gap: 0.4em;
  grid-column: 1 / -1;
}
.share-start-input {
  width: 4.5em;
  font: inherit;
}
.share-link-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  resize: none;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
  line-height: 1.4;
  color: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.share-copy {
  flex: 0 0 auto;
  padding: 0.5em 1.1em;
  border: 1px solid var(--pop-border);
  border-radius: 1.2em;
  background: var(--pop-bg);
  color: inherit;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
.share-copy:hover, .share-copy:focus-visible {
  background: var(--pop-soft);
}
.share-embed[hidden], .share-link[hidden] {
  display: none;
}
.info-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.8em;
}
.embed-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5em;
}
/* The embed code is edited in CodeMirror once its chunk has loaded; the textarea is the stand-in
   until then, and the model the editor mirrors. */
.embed-code:empty, .embed-code[hidden], .embed-markup[hidden] {
  display: none;
}
.embed-markup {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
  line-height: 1.4;
  resize: vertical;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.embed-row .share-copy {
  margin-left: auto;
}
.info-footer {
  position: sticky;
  bottom: 0;
  /* Opaque, or the scrolling content would show through it — inherited rather than repeated, so
     it can never drift from the panel's own background. */
  background: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8em;
  margin-top: 0.6em;
  padding-top: 0.4em;
  padding-bottom: 0.2em;
  border-top: 1px solid var(--pop-soft);
  font-size: 0.8em;
}
#info-app-link {
  color: var(--pop-faint);
}
.info-credits-toggle {
  border: none;
  background: none;
  padding: 0;
  color: var(--pop-link);
  cursor: pointer;
  font-size: 1em;
  text-decoration: underline;
}
.info-ul {
  margin: 0.4em 0 0;
  padding-left: 1.2em;
}
`
