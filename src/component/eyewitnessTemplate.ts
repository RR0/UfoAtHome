export const html = `
<div class="toolbar" id="toolbar" hidden>
  <label id="witness-picker"><span id="label-witness">Witness</span> <select id="witness"></select></label>
  <button id="info-button" class="info-btn" type="button" title="About" aria-label="About" aria-expanded="false">?</button>
</div>
<div id="info-panel" class="info-panel" hidden>
  <button id="info-close" class="info-close" type="button" aria-label="Close">×</button>
  <p class="info-app"><a id="info-app-link" href="https://ufoathome.org" target="_blank" rel="noopener"></a></p>
  <section>
    <h3 id="info-observation-heading">Observation</h3>
    <dl id="info-observation-list" class="info-dl"></dl>
  </section>
  <section>
    <h3 id="info-credits-heading">Credits</h3>
    <ul id="info-credits-list" class="info-ul"></ul>
  </section>
</div>
<div id="ufo-slot"></div>
`

export const css = `
:host {
  display: block;
  font-family: sans-serif;
}
/* Normal document flow, above the canvas — unlike the video player's own toolbar (ufoTemplate.ts),
   this one never overlays the scene, so it needs none of that toolbar's hover/auto-hide dance:
   once there's something to show, it just stays visible like any other page content. */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  margin-bottom: 0.5em;
}
.info-btn {
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
.info-panel {
  position: relative;
  margin-bottom: 0.5em;
  padding: 0.6em 0.8em;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #222;
  max-width: 28em;
  font-size: 0.9em;
}
.info-close {
  position: absolute;
  top: 0.3em;
  right: 0.3em;
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
.info-app {
  margin: 0 1.6em 0.5em 0;
  font-weight: bold;
}
.info-panel h3 {
  margin: 0.6em 0 0.2em;
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
.info-ul {
  margin: 0;
  padding-left: 1.2em;
}
`
