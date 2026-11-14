/** What a case looks like when it is read, not edited — see CaseElement. */
export const caseHtml = `
<header class="case-head">
  <p id="case-kind" class="case-kind"></p>
  <h2 id="case-title" class="case-title"></h2>
  <p id="case-summary" class="case-summary" hidden></p>
  <!-- The one way out of reading and into writing, on the event being read (see CaseElement.editorUrl). -->
  <button id="edit" type="button" class="edit-case"></button>
</header>
<div id="stage-box" class="stage-box"></div>
<!-- The dialogue of the interview being read, under the scene: what a passage tells of takes the player there. -->
<div id="interview-box" class="interview-box" hidden><div id="interview-host"></div></div>
<section class="case-timeline">
  <h3 id="events-heading" class="events-heading"></h3>
  <ol id="case-events" class="case-events"></ol>
</section>
`

export const caseCss = `
:host { display: block; color: var(--rr0-ink, inherit); }
.case-head { display: grid; gap: 4px; margin: 0 0 12px; }
.case-kind { margin: 0; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.case-title { margin: 0; font: 600 24px/1.25 var(--rr0-serif, Georgia, serif); }
.case-summary { margin: 2px 0 0; font-size: 15px; line-height: 1.5; opacity: .85; }
.edit-case {
  justify-self: start; margin-top: 4px; padding: 3px 12px; border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 999px; background: none; color: inherit; font: inherit; font-size: 13px; cursor: pointer;
}
.edit-case:hover { border-color: currentColor; }
.stage-box { display: block; }
.interview-box { margin: 8px 0 0; padding: 10px 12px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 10px; font-size: 14px; line-height: 1.5; max-height: 22em; overflow-y: auto; }
.interview-box[hidden] { display: none; }
/* The chronology, drawn as the editor draws it: everything on one rail, in the order of time, the kind of each said by an icon
   on the rail and by a word on its pill. What cannot be done while reading is absent, not greyed out. */
.case-timeline { margin: 14px 0 0; }
.events-heading { margin: 0 0 8px; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.case-events { --rail: 7px; --gap: 10px; display: grid; gap: var(--gap); margin: 0; padding: 0 0 0 24px; list-style: none; }
.event { --kind: var(--rr0-glow, #e8b84b); position: relative; border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 10px; }
.event[data-kind="interview"] { --kind: var(--rr0-sky, #7fd4ff); }
.event[data-kind="reading"] { --kind: color-mix(in srgb, currentColor 45%, transparent); }
.event[data-reading] { border-color: var(--kind); }
.event::after { content: ""; position: absolute; left: calc(var(--rail) - 24px - 1px); top: calc(-1px - var(--gap) / 2);
  bottom: calc(-1px - var(--gap) / 2); width: 1px; transform: translateX(-50%); background: color-mix(in srgb, currentColor 18%, transparent); }
.event:first-child::after { top: 50%; }
.event:last-child::after { bottom: 50%; }
.event:only-child::after { display: none; }
.event-mark { position: absolute; z-index: 1; left: calc(var(--rail) - 24px - 1px); top: 50%; display: grid; place-items: center;
  width: 22px; height: 22px; transform: translate(-50%, -50%); border-radius: 50%; background: var(--rr0-ground, #0b1020); color: var(--kind); }
.event-mark svg { width: 14px; height: 14px; }
.event-body { display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
  grid-template-areas: "pill open" "links links"; align-items: center; gap: 4px 12px; padding: 10px 14px; }
.kind-pill { grid-area: pill; justify-self: start; padding: 2px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--kind) 18%, transparent); font: 700 12px/1.5 var(--rr0-sans, system-ui, sans-serif); white-space: nowrap; }
.event-open { grid-area: open; justify-self: start; padding: 0; border: 0; background: none; color: inherit;
  font: 600 15px/1.35 var(--rr0-sans, system-ui, sans-serif); text-align: left; cursor: pointer; }
.event-open::after { content: ""; position: absolute; inset: 0; border-radius: 10px; }
.event:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
.event-meta { grid-area: open; justify-self: end; font-size: 13px; opacity: .6; }
.event-links { grid-area: links; font-size: 13px; opacity: .8; }
.event-links:empty { display: none; }
/* Above the hit area the title stretches over the card, as in the editor: otherwise the card swallows the click. */
.event-ref { position: relative; z-index: 1; padding: 0; border: 0; background: none; color: var(--rr0-sky, #7fd4ff); font: inherit;
  text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
@container (max-width: 640px) {
  .event-body { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pill" "open" "links"; }
  .event-meta { grid-area: open; justify-self: start; }
}
`
