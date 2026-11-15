import { CaseTimeline } from "./CaseTimeline.js"

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
      <!-- Sharing the case: its address and the element that shows it whole (an observation of it is shared from its own player). -->
      <button id="share" type="button" class="icon-btn" aria-haspopup="dialog"></button>
      <rr0-case-export id="export" class="case-export"></rr0-case-export>
      <button id="edit" type="button" class="icon-btn"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8.5 8.5-3.4.9.9-3.4 8.6-8.4Zm-7 9.2-.5 1.7 1.7-.5 6.9-6.9-1.2-1.2-6.9 6.9Z" fill="currentColor"/></svg></button>
      <button id="timeline-button" type="button" class="icon-btn" aria-pressed="true"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.4 1.6"/></svg></button>
      <button id="info" type="button" class="icon-btn" aria-expanded="false"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="3.6" r="1.4" fill="currentColor"/><path d="M6 6.5h3v6h1.5V14h-4.5v-1.5H7.5V8H6Z" fill="currentColor"/></svg></button>
    </span>
  </div>
  <p id="case-summary" class="case-summary" hidden></p>
  <rr0-share-dialog id="share-dialog"></rr0-share-dialog>
</header>
<!-- The chronology, in the upper part: choosing an event opens it below, choosing it again shuts it. Several can be open at once. -->
<section class="case-timeline">
  <h3 class="events-heading"><span id="events-icon" class="events-icon" aria-hidden="true"></span><span id="events-heading"></span></h3>
  <ol id="case-events" class="event-list"></ol>
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
/* The report's export wears the same square, its button being its own (see CaseExportElement). */
.case-export { display: inline-flex; }
.case-export::part(button) {
  display: inline-flex; align-items: center; justify-content: center; width: 1.8em; height: 1.8em; box-sizing: border-box;
  padding: 0; border: 1px solid #999; border-radius: 3px; background: #f0f0f0; color: #333;
}
.case-export::part(button):hover { background: #e0e0e0; }
.icon-btn[aria-expanded="true"], .icon-btn[aria-pressed="false"] { background: #d8d8d8; }
.case-summary { margin: 0; font-size: 15px; line-height: 1.5; opacity: .85; }
.case-summary[hidden] { display: none; }
/* The chronology itself is common to the editor (see CaseTimeline): what cannot be done while reading is absent, not greyed out. */
.case-timeline { margin: 0 0 14px; }
.case-timeline[hidden] { display: none; }
.readings-comparison { margin-top: 12px; }
.events-heading { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.events-icon { display: inline-flex; }
.events-icon svg { width: 14px; height: 14px; }
/* What is open: one block per event, each saying which it is, in the order of time. */
/* One column as wide as the case, never as wide as what is in it: an implicit "auto" column grew to the player's own widest content,
   McMinnville's longest reading in its choice (228 letters), and the stage, 16:9 of that, put the photograph beyond the case's edge. */
.open-events { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.open-event { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.open-event > .open-title { margin: 0; font: 600 13px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.open-event rr0-interview { padding: 10px 12px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 10px;
  font-size: 14px; line-height: 1.5; max-height: 22em; overflow-y: auto; }
${CaseTimeline.CSS}
`
