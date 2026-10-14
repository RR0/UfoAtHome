/**
 * The project's logo (a flying saucer holding a play button), 96 pixels, as a data URI: what the loader shows while the first frame waits for its sky must
 * not itself wait for a request, or be missing from a page that embeds the scene from another site. Seven hundred bytes.
 */
const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAAARVBMVEX9sST/uyTfoCjNlSikfCqRcCx8Yy21hipTSi4TITEMHTEuMzBqWC3/wSRUX207SFj8/PyaoakmNUd5gYxBPy90fIfMz9RsB4kZAAACEUlEQVRo3u2XyXbDIAxFLeapjts6/f9PrQA3JymT25Cd3iY5xtYVIB6wLCQSiUQikUgk0nzBoVdFZ1xIpaTQbJnPACaNdYeskWwuAhaZoltnUemfnNkL4N49KEI8n0YAEXMvEWISAWQZPw2Xk1MIoF1dSNAzCMy6JsGyCR0wrkMwT3cBeDt+FH8aEHoA68LbM8HRHXQ3f0RE3/jXOOFX+s4djrKpIbzS7K+MmLrxlWCNR8mczjMw92Ar4dZLDXG4kzXinAECcOUPL3jMdN2294/GQGVG4EMHxORNJXoCfG6oT1trvDGM7iIA9N6aTOuuEbB9ra6FyCYr2gjge+fjA4CIi2uujYRoOBSw0A5/D0hT0X4PW0xtuotNpQPYtkt/fdtyM0LP6ZvOI2DtvoxtJWHvx38AxIkevLwXQ2TOA66DziYfLwC4r5wbIlwJo1ys8+VOBMy7/sxdjwIap49lVC3UePZp1mmyit4SuGUf11pjoTHVRVzXUaXFVt87kuEBsWZ055Q+2sXA76LbZYsvKR1ubvJqbKd5swl+GPI31p6L/sNYuDTe3jo+GBdr1J+P9PGawbRUw9VhleD/3ffT9uZ7DhtX1JNHL2CmNRXxYZhwSwBd3aJTyU85/GKOwhxBf5RnVk+75OSiuu+Ax4PQ3Jsg1hTeMUMwJgQp+PKCe2a+JuefFwQnkUgkEolEIpFerW8TL0hlNl2QVAAAAABJRU5ErkJggg=="

export const html = `
<div class="stage" id="stage">
  <div class="frame" id="frame">
    <canvas id="scene-canvas"></canvas>
    <!-- What a reader waiting on a picture may take this for — a video, which it is not — and under it what
         it is: a simulation (see SceneNames.notAVideo and isASimulation). Their letters light up one
         after the other, left to right, while the picture waits (SceneElement.renderLoaderText). Where
         the picture is too small for a sentence, a spinner stands in. All of it lives and dies with the
         hold on the first frame. -->
    <div id="scene-loader" class="scene-loader" role="progressbar" hidden>
      <p id="scene-loader-not-video" class="scene-loader-note scene-loader-not-video"></p>
      <img class="scene-loader-logo" src="${LOGO}" width="64" height="64" alt="UFO@home">
      <p id="scene-loader-note" class="scene-loader-note scene-loader-is-simulation"></p>
      <div class="scene-loader-spinner"></div>
    </div>
  </div>
  <!-- Over the picture while the scenery of the place is being looked up (see SceneElement.setBusy): a spinner and what is being waited for,
       on a light veil, never in the way of the controls (pointer-events: none). -->
  <div id="scene-busy" class="scene-busy" role="progressbar" hidden>
    <div class="scene-loader-spinner scene-busy-spinner"></div>
    <p id="scene-busy-note" class="scene-loader-note"></p>
  </div>
  <div id="ufo-slot"></div>
  <div id="hover-tooltip" class="hover-tooltip" hidden></div>
  <button id="credits-button" class="credits-btn" type="button" popovertarget="credits-panel" aria-label="Credits" title="Credits">©</button>
  <div id="credits-panel" class="credits-panel" popover>
    <ul id="credits-list" class="credits-list"></ul>
  </div>
</div>
`

export const css = `
:host {
  color-scheme: light dark;
  display: block;
}
/* What this scene owes for what it shows, behind a small button in its corner — the terrain's
   imagery, the map's, the models, the pictures of the place, a sound. Not printed over the picture:
   a licence in small type across the observer's map was in the way of what the map is for. Hidden
   when a composing element lists them in its own info panel (see ownCredits). */
.credits-btn {
  anchor-name: --credits-button;
  position: absolute;
  /* Under the title the player shows top left (see UfoElement.syncPlayerTitle), which a button at the very corner hid. */
  top: 2.9em;
  left: 0.5em;
  z-index: 3;
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 0.85em;
  line-height: 1;
  padding: 0;
}
.credits-btn[hidden] {
  display: none;
}
/* Only while the pointer is over the scene, as the playback controls are, or while it is in use:
   focused from the keyboard, or with its panel open. A touch screen has no hover to reveal it by,
   and keeps it shown. */
@media (hover: hover) {
  .credits-btn {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .stage:hover .credits-btn,
  .credits-btn:focus-visible,
  .stage:has(.credits-panel:popover-open) .credits-btn {
    opacity: 1;
  }
}
.credits-panel {
  padding: 0.5em 0.8em;
  border: 1px solid light-dark(#ccc, #4a4c52);
  border-radius: 4px;
  background: light-dark(#fff, #1e1f22);
  color: light-dark(#222, #e6e6e6);
  max-width: 28em;
  max-height: 60vh;
  overflow-y: auto;
  font-size: 0.8em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@supports (position-area: bottom span-right) {
  .credits-panel:popover-open {
    position-anchor: --credits-button;
    inset: auto;
    position-area: bottom span-right;
    margin: 0.3em 0 0 0;
  }
}
.credits-list {
  margin: 0;
  padding-left: 1.2em;
}
/* The WIDGET's own box, which does not move when the instrument does. A camera's format changes
   the shape of the PICTURE, not the shape of the page: a square 126 frame or a phone held upright
   is letterboxed inside this box, leaving space to either side that is honest — it is sky the
   device never recorded. Without a definite height here the frame would size the widget instead,
   and choosing an Instamatic would double the height of the page. Ignored, as it should be,
   wherever a real height is imposed (fullscreen, or nested inside <rr0-scene>). */
.stage {
  position: relative;
  width: 100%;
  /* AUTO, with the aspect ratio deciding the height — never a percentage.
     A percentage height resolves against a parent whose own height this box is producing, and that
     cycle does not always settle the same way: in a page column 585 px wide it came out 851 px tall
     on rr0.org's case dossiers and 329 px in a bare page of the same width, from the same CSS. A
     portrait box for a 16:9 recording, with the overlay stretched two and a half times vertically
     over a 3D scene that had correctly reshaped itself to match. The ratio alone has no cycle to
     settle: the width is definite, so the height follows from it.
     The two places a real height IS imposed override this below — fullscreen, and (in
     ufoTemplate) an overlay stretched over an outer stage by inset:0. */
  height: auto;
  aspect-ratio: 640 / 360;
  /* What lets .frame measure the stage's height in its own width rule — see .frame. */
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The browser's own fullscreen UA styles force the fullscreened element (.stage) to fill the
   whole viewport (100vw/100vh) regardless of its content's aspect ratio — without this override
   .frame would stretch to match, distorting the 3D scene instead of just showing more/less of it.
   Centering .frame here (letterboxed, aspect-ratio-constrained) keeps its own 640:360 ratio. */
.stage:fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #000;
}
/* max-width/max-height are unconditional (not just a :fullscreen override) — see the identical
   comment in ufoTemplate.ts's own .frame rule; percentages are inert until .stage has a definite
   height (fullscreen here), so this is always safe. */
.frame {
  position: relative;
  /* Contained inside the stage's own box rather than sizing it: the HEIGHT is taken from the
     stage and the width follows the format, so a square or upright frame leaves space to either
     side instead of making the widget taller. Width first (100%) with a max-height cap would not
     do it — a max-height clamp does not shrink a definite width back, it just breaks the ratio. */
  /* A contain fit, in both orientations. The stage is a size container, so the frame's width is
     the smaller of the stage's width and the width the stage's HEIGHT allows at the frame's own
     ratio; the height follows from the ratio. Height-first with a max-width cap, as this was,
     kept the full height when the width capped it — a portrait phone in fullscreen had the frame
     390 × 664 for a 16:9 recording, the scene squeezed to a third of its width. A browser without
     container units (iOS before 16) keeps the plain width. */
  width: 100%;
  width: min(100%, calc(100cqh * var(--frame-aspect, 640 / 360)));
  height: auto;
  /* The instrument's own format — see Instruments.aspectOf. An eye and an unidentified camera
     have no frame of their own, and fall back to the shape this project draws its scene in. */
  aspect-ratio: var(--frame-aspect, 640 / 360);
  overflow: hidden;
}
/* Shown while the first frame waits for its sky (see SceneRenderer.onFirstFrameHold). Faded in after
   a moment, so a sky that is ready at once never flashes a spinner. */
.scene-loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  /* Black, whole: what waits is not the scene half drawn behind a veil, but the logo and what it is. */
  background: #000;
  animation: scene-loader-appear 0.2s ease-out 0.25s both;
  pointer-events: none;
  z-index: 1;
}
.scene-loader-logo {
  display: block;
  width: 64px;
  height: 64px;
  margin: 0.6em 0;
  border-radius: 14px;
}
.scene-loader[hidden] {
  display: none;
}
/* The scenery being looked up: the same spinner as the first frame's, on a veil, whatever the picture's size (the loader's notes
   give way to a spinner on a small one; this one always has both). The scene is still there under it, and can be looked at. */
.scene-busy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  background: rgba(0, 0, 0, 0.35);
  animation: scene-loader-appear 0.2s ease-out 0.15s both;
  pointer-events: none;
  z-index: 2;
}
.scene-busy[hidden] {
  display: none;
}
.scene-busy .scene-busy-spinner {
  display: block;
}
.scene-busy .scene-loader-note {
  display: block;
}
/* What the waiting picture is NOT (a video), and under it what it IS (a simulation). Said only while it
   waits, and only where there is room for a sentence: a catalogue card's picture is too small for one
   and gets a spinner instead. */
.scene-loader-note {
  max-width: 24em;
  margin: 0;
  padding: 0 1.5em;
  color: #fff;
  font: 0.9em/1.4 sans-serif;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}
.scene-loader-not-video {
  font-weight: bold;
  font-variant: small-caps;
  letter-spacing: 0.04em;
}
/* Each letter is dim, lights up when its turn comes (--i, in letters from the start of the first
   sentence) and stays lit for the rest of the sweep, then all go dim again. */
.scene-loader-word {
  display: inline-block;
}
.scene-loader-letter {
  opacity: 0.25;
  animation: scene-loader-light 4.5s ease-in-out infinite;
  animation-delay: calc(var(--i) * 45ms);
}
@media (prefers-reduced-motion: reduce) {
  .scene-loader-letter {
    animation: none;
    opacity: 1;
  }
}
.scene-loader-spinner {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: scene-loader-spin 0.9s linear infinite;
}
@container (max-width: 360px) {
  .scene-loader-logo {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    margin-bottom: 0.4em;
  }
  .scene-loader-note {
    display: none;
  }
  .scene-loader-spinner {
    display: block;
  }
}
@keyframes scene-loader-light {
  0% { opacity: 0.25; }
  6% { opacity: 1; }
  78% { opacity: 1; }
  100% { opacity: 0.25; }
}
@keyframes scene-loader-spin {
  to { transform: rotate(360deg); }
}
@keyframes scene-loader-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}
#scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
/* A SIBLING of .frame (not nested inside it) — its containing block is .stage itself, so it
   always fills .stage's *current* box exactly: .frame's own letterboxed box in normal mode
   (where .stage's box equals .frame's, same as before), but the *full* fullscreen viewport when
   .stage is fullscreen. That's what lets the nested <rr0-ufo>'s own toolbar (anchored to *its*
   own .stage, which now spans this full box) reach the true screen edges too — its own
   :fullscreen CSS never actually applies here (only this outer #stage is ever the real
   browser-fullscreen element). Its .frame still needs to end up centered within that now
   oversized box, matching *this* outer .frame's own centered position exactly, or its canvas
   coordinates visibly misalign against this backdrop the instant .stage's height exceeds
   .frame's (every shape shifted by however far off-center .frame landed). aspect-ratio/max-*
   alone does NOT do that — they size .frame correctly but leave it at .stage's default
   top-left, block-flow position; ufoTemplate.ts's own .stage makes display:flex + centering
   unconditional (not gated on :fullscreen matching) specifically so this nested case gets the
   same centering this outer .stage only gets from :fullscreen. */
.ufo-overlay {
  position: absolute;
  inset: 0;
}
/* Positioned via left/top (set in JS, following the pointer) relative to .stage — an on-demand
   identification label (celestial body or decor object name — see SceneElement.
   handlePointerMove), not part of the rendered sky itself, so it sits above everything else and
   ignores pointer events (it must never itself be what a hover/click lands on). */
.hover-tooltip {
  position: absolute;
  z-index: 1;
  padding: 0.2em 0.5em;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-family: sans-serif;
  font-size: 0.85em;
  border-radius: 3px;
  pointer-events: none;
  /* Kept on the lines it is given, and not wrapped: the label of an aircraft has several. */
  white-space: pre;
}
`
