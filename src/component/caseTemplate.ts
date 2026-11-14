/** What a case looks like when it is read, not edited — see CaseElement. */
export const caseHtml = `
<header class="case-head">
  <div class="case-bar">
    <p id="case-kind" class="case-kind"></p>
    <h2 id="case-title" class="case-title"></h2>
    <!-- The same pair the observation carries, for the case: the way into the editor, and what the case says of itself. -->
    <!-- The same three in the same order as an observation carries (see sightingTemplate): the way into the editor, this element's own
         toggle, and what it says of itself. A reader moving between a case and an observation finds the buttons where they were. -->
    <span class="case-actions">
      <button id="edit" type="button" class="icon-btn"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8.5 8.5-3.4.9.9-3.4 8.6-8.4Zm-7 9.2-.5 1.7 1.7-.5 6.9-6.9-1.2-1.2-6.9 6.9Z" fill="currentColor"/></svg></button>
      <button id="timeline-button" type="button" class="icon-btn" aria-pressed="true"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.4 1.6"/></svg></button>
      <button id="info" type="button" class="icon-btn" aria-expanded="false"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="3.6" r="1.4" fill="currentColor"/><path d="M6 6.5h3v6h1.5V14h-4.5v-1.5H7.5V8H6Z" fill="currentColor"/></svg></button>
    </span>
  </div>
  <p id="case-summary" class="case-summary" hidden></p>
</header>
<!-- The chronology, in the upper part: choosing an event opens it below, choosing it again shuts it. Several can be open at once. -->
<section class="case-timeline">
  <h3 class="events-heading"><span id="events-icon" class="events-icon" aria-hidden="true"></span><span id="events-heading"></span></h3>
  <ol id="case-events" class="case-events"></ol>
  <rr0-readings-comparison id="readings-comparison" class="readings-comparison"></rr0-readings-comparison>
</section>
<!-- What is open, in the order of time whatever the order they were opened in. -->
<div id="open-events" class="open-events"></div>
`

export const caseCss = `
:host { display: block; color: var(--rr0-ink, inherit); container-type: inline-size; }
.case-head { display: grid; gap: 6px; margin: 0 0 12px; }
.case-bar { display: flex; align-items: baseline; gap: 10px; }
.case-kind { margin: 0; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.case-title { margin: 0; font: 600 24px/1.25 var(--rr0-serif, Georgia, serif); }
.case-actions { display: flex; gap: 4px; margin-left: auto; }
/* The very square the observation's own row wears (see sightingTemplate's .edit-link and .info-btn): same size, same border, same
   background, so that the two rows are one set of buttons seen in two places. */
.icon-btn {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.8em; height: 1.8em; box-sizing: border-box;
  padding: 0; border: 1px solid #999; border-radius: 3px; background: #f0f0f0; color: #333; cursor: pointer;
}
.icon-btn:hover, .icon-btn:focus-visible { background: #e0e0e0; }
.icon-btn[aria-expanded="true"], .icon-btn[aria-pressed="false"] { background: #d8d8d8; }
.case-summary { margin: 0; font-size: 15px; line-height: 1.5; opacity: .85; }
.case-summary[hidden] { display: none; }
/* The chronology: everything on one rail, in the order of time, the kind of each said by an icon on the rail and by a word on its
   pill. What cannot be done while reading is absent, not greyed out. */
.case-timeline { margin: 0 0 14px; }
.case-timeline[hidden] { display: none; }
.readings-comparison { margin-top: 12px; }
.events-heading { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.events-icon { display: inline-flex; }
.events-icon svg { width: 14px; height: 14px; }
.case-events { --rail: 7px; --gap: 10px; display: grid; gap: var(--gap); margin: 0; padding: 0 0 0 24px; list-style: none; }
.event { --kind: var(--rr0-glow, #e8b84b); position: relative; border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 10px; }
.event[data-kind="interview"] { --kind: var(--rr0-sky, #7fd4ff); }
/* Solid enough to be read on the disc: a reading's mark was 45% of the ink and vanished. */
.event[data-kind="reading"] { --kind: color-mix(in srgb, currentColor 70%, transparent); }
/* Open, it is lit: the card and what it opened below are the same thing seen twice. */
.event[data-open] { border-color: var(--kind); background: color-mix(in srgb, var(--kind) 8%, transparent); }
.event::after { content: ""; position: absolute; left: calc(var(--rail) - 24px - 1px); top: calc(-1px - var(--gap) / 2);
  bottom: calc(-1px - var(--gap) / 2); width: 1px; transform: translateX(-50%); background: color-mix(in srgb, currentColor 18%, transparent); }
.event:first-child::after { top: 50%; }
.event:last-child::after { bottom: 50%; }
.event:only-child::after { display: none; }
/* The disc takes the page's own background, not a dark one: on a light page every mark used to be a dark coin, where a reading's dimmed
   grey icon simply did not show. The Canvas system colour is the page's own, so this follows light and dark by itself. */
.event-mark { position: absolute; z-index: 1; left: calc(var(--rail) - 24px - 1px); top: 50%; display: grid; place-items: center;
  width: 22px; height: 22px; transform: translate(-50%, -50%); border-radius: 50%; background: var(--rr0-ground, Canvas); color: var(--kind); }
.event-mark svg { width: 14px; height: 14px; }
/* Three columns, not two: the title and the date shared one and overlapped as soon as a title was long. */
.event-body { display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1fr) auto;
  grid-template-areas: "pill open meta" "links links links"; align-items: center; gap: 4px 12px; padding: 10px 14px; }
.kind-pill { grid-area: pill; justify-self: start; padding: 2px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--kind) 18%, transparent); font: 700 12px/1.5 var(--rr0-sans, system-ui, sans-serif); white-space: nowrap; }
.event-open { grid-area: open; justify-self: start; padding: 0; border: 0; background: none; color: inherit;
  font: 600 15px/1.35 var(--rr0-sans, system-ui, sans-serif); text-align: left; cursor: pointer; }
.event-open::after { content: ""; position: absolute; inset: 0; border-radius: 10px; }
.event:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
.event-meta { grid-area: meta; justify-self: end; font-size: 13px; opacity: .6; white-space: nowrap; }
.event-links { grid-area: links; font-size: 13px; opacity: .8; }
.event-links:empty { display: none; }
/* The card a reference is pointing at, while it is pointed at. */
.event.aimed { border-color: var(--rr0-sky, #7fd4ff); background: color-mix(in srgb, var(--rr0-sky, #7fd4ff) 10%, transparent); }
/* Above the hit area the title stretches over the card, as in the editor: otherwise the card swallows the click. */
.event-ref { position: relative; z-index: 1; padding: 0; border: 0; background: none; color: var(--rr0-sky, #7fd4ff); font: inherit;
  text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
/* What is open: one block per event, each saying which it is, in the order of time. */
.open-events { display: grid; gap: 14px; }
.open-event { display: grid; gap: 6px; }
.open-event > .open-title { margin: 0; font: 600 13px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.open-event rr0-interview { padding: 10px 12px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 10px;
  font-size: 14px; line-height: 1.5; max-height: 22em; overflow-y: auto; }
@container (max-width: 640px) {
  .event-body { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pill" "open" "meta" "links"; }
  .event-meta { justify-self: start; }
}
`
