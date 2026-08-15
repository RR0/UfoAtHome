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
    <section>
      <h3 id="info-embed-heading">Embed</h3>
      <div class="embed-row">
        <label><input type="radio" name="embed-kind" id="embed-kind-replay" value="replay" checked/> <span id="label-embed-replay">Replay</span></label>
        <label><input type="radio" name="embed-kind" id="embed-kind-edit" value="edit"/> <span id="label-embed-edit">Editor</span></label>
        <button id="embed-copy" class="embed-copy" type="button">Copy</button>
      </div>
      <textarea id="embed-markup" class="embed-markup" rows="3" readonly spellcheck="false"></textarea>
    </section>
    <div class="info-footer">
      <a id="info-app-link" href="https://ufoathome.org" target="_blank" rel="noopener"></a>
      <button id="info-credits-toggle" class="info-credits-toggle" type="button" aria-expanded="false">Credits</button>
    </div>
    <ul id="info-credits-list" class="info-ul" hidden></ul>
  </div>
</div>
<div id="ufo-slot"></div>
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
/* The panel grows with whatever the observation has to say — a real case description runs to a
   paragraph or more — so it caps its height and scrolls instead of running off the bottom of the
   screen, which used to put its footer (and with it the link to this observation's editor)
   somewhere unreachable. The close button and that footer are pinned to the panel's own edges
   rather than scrolling away with the content: they are how you leave it and what you came for. */
.info-panel {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 2;
  margin-top: 0.3em;
  padding: 0.6em 0.8em;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #222;
  max-width: 28em;
  max-height: 70vh;
  overflow-y: auto;
  /* A popover's own scrolling shouldn't carry on into the page behind it once it hits its end. */
  overscroll-behavior: contain;
  font-size: 0.9em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
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
   this very observation, either as a replay or as the full editor. Read-only: it is generated,
   never typed into, and selecting it wholesale is the only interaction it needs. */
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
