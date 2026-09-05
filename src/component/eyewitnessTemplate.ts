export const html = `
<div class="toolbar" id="toolbar" hidden>
  <span id="testimony" class="testimony">
    <span id="testimony-prefix">Testimony by</span>
    <span id="witness-text"></span><select id="witness" hidden></select>
  </span>
  <button id="info-button" class="info-btn" type="button" title="About" aria-label="About" aria-expanded="false">?</button>
  <div id="info-panel" class="info-panel" hidden>
    <button id="info-close" class="info-close" type="button" aria-label="Close">×</button>
    <section>
      <h3 id="info-observation-heading">Observation</h3>
      <dl id="info-observation-list" class="info-dl"></dl>
    </section>
    <!-- Both fold-out blocks sit ABOVE the footer, never after it: the footer is sticky to the
         panel's bottom edge, so anything following it in the flow opens underneath it — which is
         exactly how clicking Credits came to reveal a list nobody could see. -->
    <div id="info-embed" class="info-embed" hidden>
      <div class="embed-row">
        <label><input type="radio" name="embed-kind" id="embed-kind-replay" value="replay" checked/> <span id="label-embed-replay">Replay</span></label>
        <label><input type="radio" name="embed-kind" id="embed-kind-edit" value="edit"/> <span id="label-embed-edit">Editor</span></label>
        <button id="embed-copy" class="embed-copy" type="button">Copy</button>
      </div>
      <textarea id="embed-markup" class="embed-markup" rows="3" readonly spellcheck="false"></textarea>
    </div>
    <ul id="info-credits-list" class="info-ul" hidden></ul>
    <div class="info-footer">
      <a id="info-app-link" href="https://ufoathome.org" target="_blank" rel="noopener"></a>
      <span class="info-footer-actions">
        <!-- Turns the parameter strip under the render on and off. It lives in the panel rather
             than on the toolbar because it is a preference about how much this player says, not
             an action on the observation — and because the panel is what it takes over from: with
             the strip showing, the rows above become a second, poorer copy of it. -->
        <button id="info-labels-toggle" class="info-credits-toggle" type="button" aria-pressed="false">Labels</button>
        <button id="info-embed-toggle" class="info-credits-toggle" type="button" aria-expanded="false">Embed</button>
        <button id="info-credits-toggle" class="info-credits-toggle" type="button" aria-expanded="false">Credits</button>
      </span>
    </div>
  </div>
</div>
<div id="ufo-slot"></div>
<!-- What this recording states, field by field, in the same words the editor uses for the same
     fields — the very same SightingSummary the recorder shows under its own render. Off unless
     the page asks for it (show-labels) or the reader does (the info panel's own toggle): a player
     dropped into an article is there to be watched, and forty labels under it is a data sheet.
     Read-only here, unlike in the editor, where each one is a way back to its field. -->
<div id="param-summary" class="param-summary" hidden></div>
`

export const css = `
:host {
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
}
.testimony {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.testimony select {
  max-width: 12em;
}
.info-btn {
  /* Named so the info panel can anchor itself to this button from the top layer — see
     .info-panel:popover-open below. */
  anchor-name: --info-button;
  margin-left: auto;
  flex-shrink: 0;
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
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
  gap: 0.3em;
  margin-top: 0.5em;
  font-size: 0.85em;
}
.param-summary[hidden] {
  display: none;
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
/* A value no witness gave: read from a record (ERA5's weather, a terrain provider's ground) — the
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
.info-panel {
  padding: 0.6em 0.8em;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #222;
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
  color: #666;
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
  color: #666;
}
.info-dl dd {
  margin: 0;
}
/* The smaller, secondary row below the observation details — app identity on the left, the
   credits reveal on the right, matching the reduced visual weight of "fine print" rather than
   competing with the sighting's own metadata for attention. */
/* Self-contained markup a reader can paste into their own page — the two lines it takes to embed
   this very observation, either as a replay or as the full editor. Folded away behind a footer
   toggle like the credits are: what the panel is FOR is the observation's own metadata, and a
   block of markup sitting open above it competes with that for no one's benefit. Read-only: it is
   generated, never typed into, and selecting it wholesale is the only interaction it needs. */
.info-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.8em;
}
.info-embed {
  margin-top: 0.4em;
}
.embed-row {
  display: flex;
  align-items: center;
  gap: 0.75em;
  flex-wrap: wrap;
  margin-bottom: 0.4em;
}
.embed-markup {
  width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75em;
  line-height: 1.4;
  resize: vertical;
  white-space: pre;
}
.embed-copy {
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
  border-top: 1px solid #eee;
  font-size: 0.8em;
}
#info-app-link {
  color: #555;
}
.info-credits-toggle {
  border: none;
  background: none;
  padding: 0;
  color: #06c;
  cursor: pointer;
  font-size: 1em;
  text-decoration: underline;
}
.info-ul {
  margin: 0.4em 0 0;
  padding-left: 1.2em;
}
`
