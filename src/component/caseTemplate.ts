import { CaseTimeline } from "./CaseTimeline.js"
import { ColumnResize } from "./ColumnResize.js"

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
<!-- The chronology and what is open, one above the other; side by side when the case is given the width for both (see .case-layout). -->
<div class="case-layout">
<!-- The chronology, in the upper part: choosing an event opens it alone below; its mark on the rail shows it beside what is open, or puts
     it away. Several can be open at once that way. -->
<section class="case-timeline">
  <div class="events-bar">
    <h3 class="events-heading"><span id="events-icon" class="events-icon" aria-hidden="true"></span><span id="events-heading"></span></h3>
    <!-- Each reading under the observation it reads, or every event in the order of time: the reader's choice, remembered. -->
    <button id="group-readings" type="button" class="icon-btn" aria-pressed="false"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="3.5" r="1.6"/><path d="M4 5.1v7.4M4 8.5h3.5M4 12.5h3.5"/><path d="M9.5 8.5h4M9.5 12.5h4"/></svg></button>
  </div>
  <ol id="case-events" class="event-list"></ol>
  <rr0-readings-comparison id="readings-comparison" class="readings-comparison"></rr0-readings-comparison>
</section>
<!-- The grip between the two, on the history's edge: its width, dragged. -->
<div id="column-resize" class="column-resize"></div>
<!-- What is open, in the order of time whatever the order they were opened in. -->
<div id="open-events" class="open-events"></div>
</div>
`

export const caseCss = `
:host { display: block; color: var(--rr0-ink, inherit); container-type: inline-size; }
/* The buttons' own colours, light and dark, the very ones an observation's popups are drawn with (see sightingTemplate's --pop-*): a page
   that gives its own (--rr0-button-bg, -fg, -border, -hover, -on, -ring, inherited from anywhere, :root included) has them win. */
:host { --btn-bg: #f2f2f2; --btn-fg: #222; --btn-border: #ccc; --btn-hover: #e4e4e4; --btn-on: #dbe6f7; --btn-ring: #9bb6e0; }
@media (prefers-color-scheme: dark) {
  :host { --btn-bg: #2c2e33; --btn-fg: #e6e6e6; --btn-border: #4a4c52; --btn-hover: #3a3d43; --btn-on: #274066; --btn-ring: #4f7bc4; }
}
.case-head { display: grid; gap: 6px; margin: 0 0 12px; }
.case-bar { display: flex; align-items: baseline; gap: 10px; }
.case-kind { margin: 0; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.case-title { margin: 0; font: 600 24px/1.25 var(--rr0-serif, Georgia, serif); }
.case-actions { display: flex; gap: 4px; margin-left: auto; }
/* The very square the observation's own row wears (see sightingTemplate's .edit-link and .info-btn): same size, same border, same
   background, so that the two rows are one set of buttons seen in two places. */
.icon-btn {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.8em; height: 1.8em; box-sizing: border-box;
  padding: 0; border: 1px solid var(--rr0-button-border, var(--btn-border)); border-radius: 3px; background: var(--rr0-button-bg, var(--btn-bg));
  color: var(--rr0-button-fg, var(--btn-fg)); cursor: pointer;
}
.icon-btn:hover, .icon-btn:focus-visible { background: var(--rr0-button-hover, var(--btn-hover)); }
/* The report's export wears the same square, its button being its own (see CaseExportElement). */
.case-export { display: inline-flex; }
.case-export::part(button) {
  display: inline-flex; align-items: center; justify-content: center; width: 1.8em; height: 1.8em; box-sizing: border-box;
  padding: 0; border: 1px solid var(--rr0-button-border, var(--btn-border)); border-radius: 3px; background: var(--rr0-button-bg, var(--btn-bg));
  color: var(--rr0-button-fg, var(--btn-fg));
}
.case-export::part(button):hover { background: var(--rr0-button-hover, var(--btn-hover)); }
.icon-btn[aria-expanded="true"], .icon-btn[aria-pressed="false"] { background: var(--rr0-button-on, var(--btn-on)); }
.case-summary { margin: 0; font-size: 15px; line-height: 1.5; opacity: .85; }
.case-summary[hidden] { display: none; }
/* The chronology itself is common to the editor (see CaseTimeline): what cannot be done while reading is absent, not greyed out. */
.case-timeline { margin: 0 0 14px; }
.case-timeline[hidden] { display: none; }
.readings-comparison { margin-top: 12px; }
.events-bar { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; }
.events-bar .icon-btn { margin-left: auto; }
/* Lit when grouping, as a switch is: not the history's own button, which is lit when the history is put away. */
#group-readings[aria-pressed="false"] { background: var(--rr0-button-bg, var(--btn-bg)); }
#group-readings:is(:hover, :focus-visible) { background: var(--rr0-button-hover, var(--btn-hover)); }
#group-readings[aria-pressed="true"] { background: var(--rr0-button-on, var(--btn-on)); }
#group-readings[hidden], #share[hidden] { display: none; }
.events-heading { display: flex; align-items: center; gap: 6px; margin: 0; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.events-icon { display: inline-flex; }
.events-icon svg { width: 14px; height: 14px; }
/* What is open: one block per event, each saying which it is, in the order of time. */
/* One column as wide as the case, never as wide as what is in it: an implicit "auto" column grew to the player's own widest content,
   McMinnville's longest reading in its choice (228 letters), and the stage, 16:9 of that, put the photograph beyond the case's edge. */
.open-events { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
/* Given the width (the app on a computer), the chronology in a column of its own beside what is open, kept in view as that scrolls; the
   whole width to what is open when the chronology is put away. The width the case is given, never the window's. */
@container (min-width: 760px) {
  .case-layout { display: grid; grid-template-columns: var(${ColumnResize.PROPERTY}, minmax(16rem, 1fr)) minmax(0, 2.6fr); gap: 20px; align-items: start; }
  .case-layout > .case-timeline { grid-column: 1; grid-row: 1; }
  .case-layout > .open-events { grid-column: 2; grid-row: 1; }
  .case-layout > .column-resize { display: block; grid-column: 1; grid-row: 1; margin-right: -16px; }
  .case-layout:has(> .case-timeline[hidden]) { grid-template-columns: minmax(0, 1fr); }
  .case-layout:has(> .case-timeline[hidden]) > :is(.open-events, .column-resize) { grid-column: 1; }
  .case-layout:has(> .case-timeline[hidden]) > .column-resize { display: none; }
  /* Narrower than its cards, the history is its events' marks alone (see CaseTimeline.CSS). */
  .case-layout > .case-timeline { container: case-history / inline-size; }
  .case-layout > .case-timeline { position: sticky; top: 0; max-height: 100dvh; overflow-y: auto; margin: 0; }
  /* A dialogue open alone beside the chronology has the height the chronology has (dicté : « toute la hauteur »), not the 22 lines kept
     under a player when they are one above the other; kept in view as the page scrolls, as the chronology is. */
  .case-layout > .open-events:has(> .open-event:only-child rr0-interview) { position: sticky; top: 0; }
  .open-event:only-child rr0-interview { max-height: calc(var(--rr0-editor-height, 100dvh) - 3rem); }
}
.open-event { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.open-event > .open-title { margin: 0; font: 600 13px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.open-event rr0-interview { padding: 10px 12px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 10px;
  font-size: 14px; line-height: 1.5; max-height: 22em; overflow-y: auto; }
${CaseTimeline.CSS}
${ColumnResize.CSS}
/* The history in a column of its own scrolls, and a column that scrolls clips what passes its edge: the marks on the rail stand half outside
   the list, so the list is set in by as much as they and their ring stick out (as in the case editor). Asked of the column itself, the one
   container it is in: a query on the case's width, which is not its container, was never true for it. */
@container case-history (min-width: 0) {
  .case-timeline > .event-list { padding-left: 30px; }
}
@container case-history (max-width: 6rem) {
  .case-timeline > :not(.event-list) { display: none !important; }
  .case-timeline > .event-list { padding-left: 30px; }
}
`
