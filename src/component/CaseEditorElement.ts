import { CaseFile } from "../engine/persistence/caseJson.js"
import { Icons } from "./Icons.js"
import { WindowClose } from "./WindowClose.js"
import { EditorTheme } from "./EditorTheme.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import type { InputFileElement, InputFilePick } from "./InputFileElement.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { formatEdtfTime, parseEdtfTime } from "../engine/model/Sighting.js"
import { CaseSession } from "./CaseSession.js"
import { ElementList } from "./ElementList.js"
import { EdtfDateField } from "./EdtfDateField.js"
import { register as registerDateInput } from "./DateInputElement.js"
import type { DateInputElement } from "./DateInputElement.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"
import type { CaseTrack } from "./CaseSession.js"
import { INTERVIEW_CHANGE_EVENT, INTERVIEW_SEEK_EVENT } from "./interviewEvents.js"
import type { InterviewJson, InterviewMedium, InterviewPassage } from "../engine/persistence/interviewJson.js"
import type { InterviewEditorElement, InterviewEvent } from "./InterviewEditorElement.js"
import type { SightingFileEditor } from "./SightingFileEditor.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { register as registerSightingEditor } from "./SightingEditorElement.js"
import type { SightingEditorElement } from "./SightingEditorElement.js"
import type { CaseEditorMessages } from "./messages/CaseEditorMessages.js"
import { caseEditorMessages_en } from "./messages/CaseEditorMessages_en.js"
import { loadCaseEditorMessages, loadSightingEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { InputFont } from "./InputFont.js"
import { MessageStyle } from "./MessageStyle.js"
import { PlayerIcons } from "./PlayerIcons.js"

export const CASE_EDITOR_ELEMENT_NAME = "rr0-case-editor"

const TEMPLATE = `
<style>
  :host { display: block; }
  ${WindowClose.CSS}
  /* The colours of the file's text editor (see SightingFileEditor): a key, a string, a number or a word, and a mistake. Dark mode redefines them. */
  :host { --file-key: #1a5fb4; --file-string: #26662f; --file-literal: #a5321f; --rr0-alert: #c33; }
  @media (prefers-color-scheme: dark) { :host { --file-key: #8cb8ff; --file-string: #8fd39a; --file-literal: #ffa08a; } }
  [hidden] { display: none !important; }
  /* The case, above: what it is, then its observations and what is done with them. */
  /* The case is the container the element stands in (the page's own frame, when there is one): it draws none of its own, so that
     there is one container for the case and one inside it for the observation. */
  .case-panel { margin-bottom: .6em; }
  .case-panel h2 { margin: 0 0 .4em; font-size: 1.05em; }
  .case-panel h3 { margin: .6em 0 .3em; font-size: .95em; }
  .row { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; margin-bottom: .5em; }
  .row label, .row .field { display: flex; align-items: center; gap: .4em; }
  rr0-date-input { display: inline-flex; align-items: center; gap: .3em; flex-wrap: wrap; }
  .row.recordings label { flex: 1 1 14em; min-width: 0; }
  .row.recordings select { flex: 1 1 auto; min-width: 0; max-width: 100%; text-overflow: ellipsis; }
  .row button { white-space: nowrap; }
  .make-case { margin: .5em 0 0; }
  button.link { border: 0; background: none; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; font: inherit; }
  .icon-btn { width: 1.8em; height: 1.8em; padding: 0; line-height: 1; cursor: pointer; }
  /* The observation being edited, inside: a frame of its own once there is a case around it. */
  .passages { margin: .5em 0 0; font-size: .9em; }
  .passages ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .2em; }
  .passages li { display: flex; gap: .5em; align-items: baseline; }
  .passages button { font: inherit; cursor: pointer; }
  .passages .at { font-variant-numeric: tabular-nums; padding: .1em .35em; text-align: left; white-space: nowrap; flex: none; display: inline-flex; align-items: center; gap: .15em; }
  .passages .at svg { width: 1.1em; height: 1.1em; }
  .passages .excerpt { border: 0; background: none; padding: 0; text-align: left; color: LinkText; text-decoration: underline; }
  /* The event picked, in the frame every list of the editor puts its picked element in (see ElementList): its id, then the observation
     or the interview. A recording alone, not in a case, has no list and no frame. */
  #event-item { display: block; }
  #event-item:not(.in-case) { border: 0; padding: 0; margin: 0; }
  .event-id-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: .5em; }
  .event-id-row > .history-slot { margin-left: auto; }
  .history-slot[hidden] { display: none; }
  .history-slot .history { display: inline-flex; gap: 8px; }
  .history-slot .history .icon-btn { box-sizing: border-box; width: 36px; height: 36px; min-width: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
  .history-slot .history .icon-btn:disabled { opacity: .35; cursor: default; }
  /* Tabs as the recording's editor has them (see sightingEditorTemplate): a strip on one baseline, the open tab raised and joined to its panel. */
  .group-tabs { --tab-line: color-mix(in srgb, CanvasText 35%, transparent); --tab-surface: color-mix(in srgb, CanvasText 5%, Canvas);
    --tab-recessed: color-mix(in srgb, CanvasText 11%, Canvas); --tab-accent: #4a9eff;
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0; margin: 0; padding: 0; border-bottom: 1px solid var(--tab-line); }
  .group-tab { font: inherit; font-weight: 600; cursor: pointer; color: color-mix(in srgb, CanvasText 70%, transparent); background: var(--tab-recessed);
    border: 1px solid var(--tab-line); border-radius: 8px 8px 0 0; padding: .4em .6em; margin: 0 0 -1px -1px; position: relative; }
  .group-tab:hover { color: CanvasText; background: color-mix(in srgb, CanvasText 16%, Canvas); }
  .group-tab[aria-expanded="true"] { color: CanvasText; background: var(--tab-surface); border-bottom-color: var(--tab-surface); box-shadow: inset 0 2px 0 var(--tab-accent); z-index: 1; }
  .group-tab:focus-visible { outline: 2px solid #4af; outline-offset: -2px; }
  .group-panel { border: 1px solid var(--tab-line, color-mix(in srgb, CanvasText 35%, transparent)); border-top: 0; border-radius: 0 0 4px 4px;
    background: color-mix(in srgb, CanvasText 5%, Canvas); padding: .5em .75em; margin: 0 0 .5em; }
  .group-panel[hidden] { display: none; }
  .group-panel > .row:last-child { margin-bottom: 0; }
  /* A recording alone is not in a case: the events panel is then no frame around it. In a case, the tabs touch the panel under them. */
  #case:not(.in-case) > #group-events { border: 0; padding: 0; margin: 0; background: none; }
  #case.in-case > .case-panel { margin-bottom: 0; }
  .file-note { margin: .3em 0; }
  .file-editor { min-height: 18em; margin-top: .5em; }
  ${InputFont.CSS}
  .toolbar input[type="url"] { width: 18em; max-width: 100%; }
  dialog { max-width: min(30em, 92vw); }
  dialog label { display: flex; align-items: center; gap: .5em; margin: .4em 0; }
  dialog label > span { flex: 0 0 9em; }
  dialog label.check > span { flex: 1 1 auto; }
  .row.header { justify-content: space-between; }
  /* A dot after what it speaks of — the case's title, the recording's last tab. It takes its room whether it shows or not, so that
     it comes and goes without moving anything. */
  .title { display: flex; align-items: center; gap: .35em; }
  .dirty { color: #b45309; line-height: 1; cursor: help; align-self: center; margin-left: .3em; }
  .dirty[hidden] { display: inline !important; visibility: hidden; }
  .row.header h2 { margin: 0; }
  dialog input[type="text"], dialog input[type="date"], dialog input[type="url"], dialog select { flex: 1 1 auto; min-width: 0; }
  dialog .actions { display: flex; gap: .5em; margin-top: .6em; }
  .recording-id-error { margin: .2em 0; }
  ${MessageStyle.rules([".file-note"], [], ["#dialog-error", ".recording-id-error"])}
  ${ElementList.CSS}
  /* ---- The design handoff's look (design_handoff_editeurs_ufoathome, §2 and §4) ---- */
  :host {
    ${EditorTheme.TOKENS}
    --rr0-field-radius: 8px;
    --rr0-input-font-size: 15px;
    container-type: inline-size;
    font: 400 15px/1.5 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  ${EditorTheme.HEAD}
  ${EditorTheme.fields(".case")}
  /* A case is a card, as the observation alone is: the observation it holds draws none of its own then (see SightingEditorElement.embedded). */
  .case.in-case { max-width: 68rem; margin: 0 auto; background: var(--ground-raised); color: var(--ink); border: 1px solid var(--line-strong); border-radius: 12px; overflow: clip; }
  .case-panel { margin: 0; }
  .editor-head .head-text.title { display: block; }
  .editor-head .check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ink-dim); }
  .editor-head .dirty { display: none !important; }
  /* Two tabs, underlined. */
  #case-tabs { display: flex; gap: 6px; padding: 0 18px; border-bottom: 1px solid var(--line); }
  #case-tabs .group-tab {
    display: inline-flex; align-items: center; gap: 8px; min-height: 0; margin: 0 0 -1px; padding: 12px 10px;
    border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: none; box-shadow: none; color: var(--ink-dim); font: 600 15px/1.2 var(--sans);
  }
  #case-tabs .group-tab:hover { background: none; color: var(--ink); }
  #case-tabs .group-tab[aria-expanded="true"] { color: var(--ink); border-bottom-color: var(--glow-solid); background: none; box-shadow: none; }
  .count { display: inline-block; min-width: 1.4em; padding: 1px 6px; border-radius: 999px; background: var(--neutral-bg); color: var(--ink-dim); font-size: 12px; text-align: center; }
  .count:empty { display: none; }
  .case.in-case > .group-panel { margin: 0; padding: 20px 18px 24px; border: 0; border-radius: 0; background: none; color: var(--ink); }
  .case.in-case #events-row { display: none !important; }
  #event-item.in-case { border: 0; padding: 0; margin: 0; }
  /* The case's own fields: its title the whole width, its date and its id under it. */
  .case-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px 16px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .case-fields > :is(label, .field) { display: flex; flex-direction: column; align-items: stretch; gap: 6px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
  .case-fields > .wide { grid-column: 1 / -1; }
  .case-fields input[type="text"] { box-sizing: border-box; width: 100%; height: 38px; font-weight: 400; }
  .events-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 12px; }
  .section-title { margin: 0; font: 600 12px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--glow-dim); }
  /* The events, on a line down their left: each a card, its kind's colour on the line. */
  .event-card, .kind-pill { --kind: var(--glow-solid); --kind-bg: var(--warn-bg); }
  :is(.event-card, .kind-pill)[data-kind="interview"] { --kind: var(--sky); --kind-bg: light-dark(rgba(18, 96, 143, .12), rgba(127, 212, 255, .14)); }
  :is(.event-card, .kind-pill)[data-kind="reading"] { --kind: var(--ink-faint); --kind-bg: var(--neutral-bg); }
  /* The line runs through the centre of every dot: each card draws its own stretch of it, from the card above to the card below,
     the first from its dot down and the last down to its dot. Both are placed from the card's outer edge, past its 1px border.
     The dot stands level with the kind's pill: the card's middle while the card is one row, the pill's line once it wraps. */
  .event-list { --rail: 7px; --gap: 10px; display: grid; gap: var(--gap); margin: 0; padding: 0 0 0 24px; list-style: none; }
  .event-card {
    --dot-y: 50%;
    position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 52px;
    border: 1px solid var(--line-strong); border-radius: 10px; background: var(--ground);
  }
  .event-card::before, .event-card::after { content: ""; position: absolute; left: calc(var(--rail) - 24px - 1px); }
  .event-card::before {
    z-index: 1; top: calc(var(--dot-y) - 1px); box-sizing: border-box; width: 13px; height: 13px; transform: translate(-50%, -50%);
    border: 2px solid var(--kind); border-radius: 50%; background: var(--ground-raised);
  }
  .event-card::after { top: calc(-1px - var(--gap) / 2); bottom: calc(-1px - var(--gap) / 2); width: 1px; transform: translateX(-50%); background: var(--line-strong); }
  .event-card:first-child::after { top: calc(var(--dot-y) - 1px); }
  .event-card:last-child::after { bottom: calc(100% - var(--dot-y) - 1px); }
  .event-card:only-child::after { display: none; }
  .event-body { display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1.2fr) minmax(0, 1fr); grid-template-areas: "pill main links";
    align-items: center; gap: 4px 12px; min-width: 0; padding: 12px 8px 12px 14px; }
  .kind-pill { grid-area: pill; justify-self: start; padding: 2px 10px; border-radius: 999px; background: var(--kind-bg); color: var(--ink); font: 700 12px/1.5 var(--sans); white-space: nowrap; }
  .event-main { grid-area: main; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  /* The title opens the event, and the whole card with it: its hit area is stretched over the card, the removal standing above it. */
  .event-open { min-height: 0; padding: 0; border: 0; background: none; color: var(--ink); font: 600 15px/1.35 var(--sans); text-align: left; cursor: pointer; }
  .event-open::after { content: ""; position: absolute; inset: 0; border-radius: 10px; }
  .event-open:hover:not(:disabled) { background: none; }
  .event-open:focus-visible { outline: none; }
  .event-card:has(.event-open:hover) { background: var(--ground-sunken); }
  .event-card:has(.event-open:focus-visible) { outline: 2px solid var(--sky); outline-offset: 2px; }
  .event-meta { font-size: 13px; color: var(--ink-faint); overflow-wrap: anywhere; }
  .event-links { grid-area: links; font-size: 13px; color: var(--ink-dim); }
  .event-links:empty { display: none; }
  .event-delete { position: relative; z-index: 1; display: grid; place-items: center; width: auto; height: auto; min-width: 0; min-height: 0; padding: 0;
    border: 0; border-left: 1px solid var(--line-strong); border-radius: 0 10px 10px 0; background: none; color: var(--ink-dim); }
  .event-delete:hover:not(:disabled) { color: var(--error); }
  /* The event open: the way back to the case, and the events before and after. */
  .crumbs { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 16px; padding: 0 0 16px; border-bottom: 1px solid var(--line); }
  .crumb-sep { color: var(--ink-faint); }
  .crumb-title { font: 600 20px/1.3 var(--serif); }
  .crumb-nav { display: flex; gap: 6px; margin-left: auto; }
  .cited { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; padding: 10px 14px;
    border: 1px solid var(--glow-dim); border-radius: 10px; background: var(--warn-bg); font-size: 14px; }
  .cited[hidden] { display: none; }
  @container (max-width: 640px) {
    /* Narrow, as the handoff's mobile view: the pill above the title, "Open" beside the title, or under what the event is linked to
       when it says something; the removal keeps its column. */
    .event-card { --dot-y: 24px; }
    .event-body { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pill" "main" "links"; gap: 6px 10px; }
    .editor-head { flex-wrap: wrap; }
    .editor-head .head-actions { flex: 0 1 auto; flex-wrap: wrap; min-width: 0; }
  }
</style>
<div id="case" class="case">
<!-- The case on top (see the design handoff, §4): what it is, with the one Save there is, on while there is something to save, which
     saves the observations too when asked; then its two tabs. -->
<section id="case-panel" class="case-panel" aria-labelledby="case-heading" hidden>
  <header class="editor-head header">
    <div class="head-text title">
      <span id="case-kicker" class="kicker">Case</span>
      <h1 id="case-heading" class="editor-title">Case</h1>
      <span id="dirty" class="dirty" role="status" title="Changes not saved" hidden></span>
    </div>
    <div class="head-actions">
      <label class="check"><input id="save-also" type="checkbox" checked/> <span id="label-save-also">Also save the observations</span></label>
      <button id="save-case" type="button" class="pill-btn primary" disabled><svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8"/><path d="m4.5 7 3.5 3.5L11.5 7"/><path d="M3 13.5h10"/></svg><span id="label-save-case">Save</span></button>
    </div>
  </header>
  <div id="case-tabs" class="group-tabs">
    <button class="group-tab" type="button" aria-controls="group-events" aria-expanded="true"><span id="label-events-group">Events</span> <span id="events-count" class="count"></span></button>
    <button class="group-tab" type="button" aria-controls="group-case-file" aria-expanded="false"><span id="label-case-file-group">File</span></button>
  </div>
</section>
  <section class="group-panel" id="group-events" aria-labelledby="label-events-group">
    <!-- The case itself while no event is open: its title, its date, its id, then its events in the order of time (see renderEvents). -->
    <div id="case-overview" class="case-overview" hidden>
      <div class="case-fields">
        <label class="wide"><span id="label-case-title">Title</span> <input id="case-title" type="text" size="24"/></label>
        <div class="field"><span id="label-case-time">When</span> <rr0-date-input id="case-date" name="case-time"></rr0-date-input></div>
        <label><span id="label-case-id">ID</span> <input id="case-id" type="text" size="18"/></label>
      </div>
      <div class="events-head">
        <h3 id="label-events-in-time" class="section-title">Events · in the order of time</h3>
        <button id="add" type="button" class="pill-btn"><svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M3 8h10"/></svg><span id="label-add">Add an event</span></button>
      </div>
      <ol id="event-list" class="event-list"></ol>
    </div>
    <p id="recording-id-error" class="recording-id-error" role="alert" hidden></p>
    <p id="case-problems" class="recording-id-error" role="status" hidden></p>
    <!-- Laid out as every list of the editor is (see ElementList): the picker, 🗑, "+", then the frame of the event picked. -->
    <div id="events-row" class="element-list-row">
      <label class="element-list-picker"><select id="track"></select></label>
      <button id="delete" type="button" class="icon-btn">${Icons.TRASH}</button>
    </div>
    <div id="event-item" class="element-list-body">
    <!-- The event open, in the case: the way back to it, what kind of event and which, and the events before and after. -->
    <nav id="event-crumbs" class="crumbs" hidden>
      <button id="back-to-case" type="button" class="pill-btn"><svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg><span id="label-back-to-case">Case</span></button>
      <span class="crumb-sep" aria-hidden="true">›</span>
      <span id="crumb-kind" class="kind-pill"></span>
      <span id="crumb-title" class="crumb-title"></span>
      <span class="crumb-nav">
        <button id="previous-event" type="button" class="icon-btn"><svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></button>
        <button id="next-event" type="button" class="icon-btn"><svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg></button>
      </span>
    </nav>
    <!-- Over the observation opened from an interview's link to one of its moments: where it was quoted, and the way back (§5). -->
    <div id="cited" class="cited" role="status" hidden>
      <span id="cited-text"></span>
      <button id="cited-back" type="button" class="pill-btn"><span id="label-back-to-interview">Back to the interview</span></button>
    </div>
    <!-- The event's id, and on its line the observation's Undo and Redo (see SightingEditorElement.historyControls). -->
    <div class="event-id-row">
      <label id="row-recording-id" class="row"><span id="label-recording-id">ID</span> <input id="recording-id" type="text" size="14" autocomplete="off" spellcheck="false"/></label>
      <span id="history-slot" class="history-slot"></span>
    </div>
    <section id="recording" class="recording">
      <rr0-sighting-editor id="editor"><span id="recording-dirty" slot="tab-status" class="dirty" role="status" title="Changes not saved" hidden>●</span></rr0-sighting-editor>
      <div id="passages" class="passages" hidden><ul id="passages-list"></ul></div>
    </section>
    <section id="interview-section" class="recording" hidden>
      <rr0-interview-editor id="interview"></rr0-interview-editor>
    </section>
    </div>
  </section>
  <section class="group-panel" id="group-case-file" aria-labelledby="label-case-file-group" hidden>
    <div class="row toolbar">
      <span class="input-file-row"><span id="label-import-file">Load case file</span> <rr0-input-file id="import" name="import" accept="application/json,.json" placeholder="https://…/case.json"></rr0-input-file></span>
      <button id="export" type="button">Save</button>
    </div>
    <p id="case-file-note" class="file-note" hidden role="status"></p>
    <div id="case-file-editor" class="file-editor"></div>
  </section>
<p id="make-case-row" class="make-case"><button id="make-case" type="button" class="link">Add to a case</button></p>
</div>
<dialog id="dialog">
  <form method="dialog" id="form">
    <h3 id="dialog-title"></h3>
    <p id="dialog-message" hidden></p>
    <p id="dialog-error" role="alert" hidden></p>
    <div id="fields-add">
      <label><span id="label-kind">Type</span> <select id="kind"><option value="observation"></option><option value="interview"></option></select></label>
      <label id="row-source"><span id="label-source">Source</span> <select id="source">
        <option value="blank"></option><option value="file"></option>
      </select></label>
      <label id="row-witness"><span id="label-witness">Witness</span> <select id="witness"></select></label>
      <label id="row-medium"><span id="label-medium">Medium</span> <select id="medium"></select></label>
      <label id="row-observer"><span id="label-observer">Observer</span> <input id="observer" type="text"/></label>
      <label id="row-title"><span id="label-title">Title</span> <input id="title" type="text"/></label>
      <label id="row-author"><span id="label-author">Author</span> <input id="author" type="text"/></label>
      <label id="row-date"><span id="label-date">Date</span> <input id="date" type="date"/></label>
      <div id="row-file" class="row-input-file"><span id="label-file">File</span> <rr0-input-file id="add-source" name="add-source" accept="application/json,.json" no-button keep-file></rr0-input-file></div>
      <label id="row-of"><span id="label-of">Interpretation of</span> <select id="of"></select></label>
    </div>
    <div id="fields-export">
      <label class="check"><input id="export-recordings" type="checkbox" checked/> <span id="label-export-recordings">Also export the observations</span></label>
    </div>
    <div class="actions">
      <button id="ok" type="submit" value="ok">OK</button>
      <button id="cancel" type="button">Cancel</button>
    </div>
  </form>
</dialog>
`

type DialogMode = "add" | "delete" | "export" | "discard"

/**
 * Edits a case: the recordings its `case.json` lists, the accounts of the observers and the readings
 * of them, one on show at a time in an `<rr0-sighting-editor>` that it holds and that knows nothing
 * of the case. It gives that editor one recording at a time and takes it back when another is
 * chosen, keeps what was changed (see CaseSession), and puts on the editor's own render line the
 * picker and what is done with a recording: interpret an account (a reading is another observation,
 * see InterpretationEventJson), add an account — blank, from a file or from an address — and
 * delete one, which it refuses while a reading still interprets it. Exporting the case and what
 * changed as a zip stands in the editor's file group.
 *
 * What the case lists is its EVENTS, and the picker lists them: an observer's account ("Account by Q. B."), a reading of one, an interview
 * ("Interview of Q. B."). An account or a reading is shown in the `<rr0-sighting-editor>`; an interview, which is no recording, is shown
 * in an `<rr0-interview-editor>` that takes its place and edits the event in place.
 *
 * `src` is passed to the editor, which fetches it: a `case.json` is handed back here (its
 * `caseloaded` event), a plain recording stays the editor's own and this element shows nothing more
 * than the editor. `track` names the recording a case opens on.
 */
export class CaseEditorElement extends HTMLElement {
  private readonly shadow = this.attachShadow({ mode: "open" })
  private readonly editor: SightingEditorElement
  private session?: CaseSession
  private current?: CaseTrack
  /** Whether the case's own fields and its list of events are on show, rather than one event (see the design handoff, §4). */
  private listShown = true
  /** The interview on show, when the picker is on one: then no track is. */
  private currentInterview?: InterviewEvent
  private readonly interviewElement: InterviewEditorElement
  /** The interview element, fetched and defined the first time an interview is shown: most cases have none (see ensureInterview). */
  private interviewReady?: Promise<void>
  /** The group on show: the events, or the file `case.json` as text. */
  private group: "events" | "file" = "events"
  /** The file's text editor, loaded the first time the File group is opened (CodeMirror is heavy and most authors never need it). */
  private fileEditor?: SightingFileEditor
  private fileEditorLoading?: Promise<SightingFileEditor>
  /** The text the case last gave the editor, or the editor gave the case: what tells an edit of the author's from one of ours. */
  private fileApplied = ""
  private editorMessages: SightingEditorMessages = sightingEditorMessages_en
  private messages: CaseEditorMessages = caseEditorMessages_en
  private said = new SaidTexts(["en"])
  private localeToken = 0
  private language: UfoLanguage = "en"
  private dialogMode: DialogMode = "add"
  /** What loading waits for, while the author is asked about changes that would be lost. */
  private pendingLoad?: () => void
  private dirtyTimer?: number
  private caseDate!: DateInputElement
  /** The case the date field last opened its way in for: a mode is the author's once it is shown. */
  private dateModeFor?: CaseSession

  constructor() {
    super()
    registerSightingEditor()
    registerDateInput()
    this.shadow.innerHTML = TEMPLATE
    customElements.upgrade(this.shadow)
    ;(this.shadow.getElementById("case-date") as DateInputElement).build()
    for (const input of this.shadow.querySelectorAll<InputFileElement>("rr0-input-file")) input.build()
    this.editor = this.shadow.getElementById("editor") as SightingEditorElement
    this.interviewElement = this.shadow.getElementById("interview") as InterviewEditorElement
    this.interviewElement.addEventListener(INTERVIEW_CHANGE_EVENT, event => this.interviewChanged((event as CustomEvent<{ field: string, text?: string }>).detail))
    this.interviewElement.addEventListener(INTERVIEW_SEEK_EVENT, event => void this.followToObservation((event as CustomEvent<{ sighting?: string, at: number }>).detail))
    this.editor.addEventListener("caseloaded", event => {
      event.preventDefault()
      const { json, url } = (event as CustomEvent<{ json: unknown, url?: string }>).detail
      void this.openCase(json as Parameters<typeof CaseFile.sightingUrls>[0], url ?? location.href)
    })
    // A recording loaded into the editor by its own fields is not the case's any more.
    this.editor.addEventListener("recordingloaded", () => this.closeCase())
    // The case keeps the watch over what would be lost by leaving, for the recordings it holds: the editor does not.
    this.editor.guardsLeaving = false
    this.editor.embedded = true
    // Its Undo and Redo on the line of the event's id, the editor's own header being the case's.
    this.byId("history-slot").append(this.editor.historyControls)
    // Loading a recording or a case into the editor replaces what is open: asked first when changes were not exported.
    this.editor.addEventListener("beforeload", event => {
      if (!this.dirty) return
      event.preventDefault()
      this.pendingLoad = (event as CustomEvent<{ proceed: () => void }>).detail.proceed
      this.openDialog("discard", this.messages.discardTitle, this.messages.discardQuestion)
    })
    for (const type of ["input", "change", "datechange", "click", "pointerup", "keyup"]) this.shadow.addEventListener(type, () => this.scheduleDirtyCheck(), true)
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"]] as const) {
      this.input(id).addEventListener("input", () => this.writeCaseField(field, this.input(id).value))
    }
    // A case dates itself as a recording does — see DateInputElement — and writes the date as RR0 does.
    this.caseDate = this.byId("case-date") as DateInputElement
    this.caseDate.addEventListener("datechange", event => {
      const { time } = (event as CustomEvent<{ time: SightingTime | undefined }>).detail
      this.writeCaseField("time", time ? CaseEditorElement.rr0TimeOf(formatEdtfTime(time)) : "")
    })
    this.byId("track").addEventListener("change", () => {
      // The list goes at once: the event takes its place while it loads. What was quoted is no longer what is on show.
      this.byId("cited").hidden = true
      this.listShown = false
      this.refreshOverview()
      const item = this.session ? this.items(this.session)[Number((this.byId("track") as HTMLSelectElement).value)] : undefined
      if (!item) return
      if (item.interview) void this.showInterview(item.interview)
      else void this.showTrack(item.track)
    })
    const recordingId = this.input("recording-id")
    recordingId.addEventListener("input", () => this.writeRecordingId())
    // What was refused is not kept in the field: it goes back to the id the event has.
    recordingId.addEventListener("blur", () => { this.showRecordingIdError(undefined); this.refreshRow() })
    for (const tab of this.shadow.querySelectorAll<HTMLButtonElement>("#case-tabs .group-tab")) {
      tab.addEventListener("click", () => this.openGroup(tab.getAttribute("aria-controls") === "group-case-file" ? "file" : "events"))
    }
    this.inputFile("import").addEventListener("filepick", event => {
      const pick = (event as CustomEvent<InputFilePick>).detail
      if (pick.file) void this.importFromFile(pick.file)
      else void this.importFromUrl(pick.url)
    })
    this.byId("add").addEventListener("click", () => this.askAdd())
    this.byId("cited-back").addEventListener("click", () => {
      const from = this.citedFrom
      if (!from || !this.session) return
      const index = (this.items(this.session) as { interview?: InterviewEvent }[]).findIndex(item => item.interview === from)
      if (index >= 0) this.openEvent(index)
    })
    this.byId("back-to-case").addEventListener("click", () => {
      this.listShown = true
      this.refreshRow()
    })
    this.byId("previous-event").addEventListener("click", () => this.stepEvent(-1))
    this.byId("next-event").addEventListener("click", () => this.stepEvent(1))
    this.byId("save-case").addEventListener("click", () => void this.exportCase(this.input("save-also").checked).then(() => this.refreshDirty()))
    this.byId("make-case").addEventListener("click", () => this.makeCase())
    this.byId("delete").addEventListener("click", () => this.askDelete())
    this.byId("export").addEventListener("click", () => this.askExport())
    this.byId("source").addEventListener("change", () => this.syncSourceFields())
    this.byId("kind").addEventListener("change", () => this.syncSourceFields())
    this.byId("of").addEventListener("change", () => this.syncSourceFields())
    this.byId("cancel").addEventListener("click", () => this.closeDialog())
    // Escape closes the dialog without going through the button.
    this.byId("dialog").addEventListener("close", () => { this.pendingLoad = undefined })
    this.byId("form").addEventListener("submit", event => {
      event.preventDefault()
      void this.submitDialog()
    })
  }

  static get observedAttributes(): string[] {
    return ["src"]
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === "src" && value) this.editor.setAttribute("src", value)
  }

  private readonly warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
    if (this.leaving || !this.dirty) return
    event.preventDefault()
    event.returnValue = ""
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.askBeforeFollowing, true)
    window.removeEventListener("beforeunload", this.warnBeforeLeaving)
    window.clearTimeout(this.dirtyTimer)
  }

  /**
   * Whether anything would be lost by leaving: in a case, the case or any recording of it changed and not exported; and for a
   * recording alone, the recording. What the editor holds is read first, since the case only sees it when asked.
   */
  get dirty(): boolean {
    if (!this.session) return this.editor.dirty
    this.commit()
    return this.session.dirty
  }

  /** Shows whether there is something to lose, a moment after the author stops: a recording is large, and this reads all of it. */
  private scheduleDirtyCheck(): void {
    window.clearTimeout(this.dirtyTimer)
    this.dirtyTimer = window.setTimeout(() => this.refreshDirty(), 600)
  }

  /**
   * Shows what there is to lose, at the two levels it is lost at: the case (anything of it, or of any recording, not
   * exported) and the recording on show (changed since it was loaded, in a case, or since it was loaded or exported, alone).
   */
  private refreshDirty(): void {
    const session = this.session
    if (session) this.commit()
    this.byId("dirty").hidden = !(session && session.dirty)
    this.refreshCaseState()
    const recording = session ? (this.current !== undefined && session.changed(this.current)) : this.editor.dirty
    this.byId("recording-dirty").hidden = !recording
  }

  /** Set once the author agreed to leave, so that the page going away is not asked about a second time. */
  private leaving = false

  /**
   * Leaving by one of the page's own links is asked here, in the page, since a browser asks for the page being left
   * only when it chooses to — and not at all of a page nobody typed in. A modified click, a new tab, a link to the
   * same page are left alone.
   */
  private readonly askBeforeFollowing = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
    if (!anchor || !anchor.href || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
    const target = new URL(anchor.href, location.href)
    if (target.href === location.href || (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search && target.hash !== "")) return
    if (!this.dirty) return
    event.preventDefault()
    event.stopPropagation()
    this.pendingLoad = () => {
      this.leaving = true
      location.assign(target.href)
    }
    this.openDialog("discard", this.messages.discardTitle, this.messages.leaveQuestion, this.messages.leaveOk)
  }

  connectedCallback(): void {
    document.addEventListener("click", this.askBeforeFollowing, true)
    window.addEventListener("beforeunload", this.warnBeforeLeaving)
    const src = this.getAttribute("src")
    if (src && this.editor.getAttribute("src") !== src) this.editor.setAttribute("src", src)
    void this.loadLocale()
  }

  /** The recording on show, whichever it is. */
  get sightingData(): SightingRecordingJson {
    return this.editor.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.closeCase()
    this.editor.sightingData = json
  }

  /** The editor that holds the recording on show, for whoever needs more of it than this element offers. */
  get sightingEditor(): SightingEditorElement {
    return this.editor
  }

  /** The case being edited, if one is open. */
  get caseSession(): CaseSession | undefined {
    return this.session
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }

  private async loadLocale(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const [messages, editorMessages] = language === "en"
      ? [caseEditorMessages_en, sightingEditorMessages_en]
      : await Promise.all([loadCaseEditorMessages(language), loadSightingEditorMessages(language)])
    if (token !== this.localeToken) return
    this.said = new SaidTexts(preferences)
    this.language = language
    this.messages = messages
    this.caseDate.messages = editorMessages
    this.editorMessages = editorMessages
    this.applyMessages()
    this.refreshRow()
  }

  private applyMessages(): void {
    // The dialog's ✕ and its click beside it, answering as Cancel and Escape do (see WindowClose).
    WindowClose.dialog(this.dialog, this.messages.cancel, () => this.closeDialog())
    const m = this.messages
    const text = (id: string, value: string): void => { this.byId(id).textContent = value }
    text("case-kicker", m.caseHeading)
    text("label-back-to-case", m.caseHeading)
    text("label-events-in-time", m.eventsInTime)
    text("label-back-to-interview", m.backToInterview)
    text("label-add", m.addTitle)
    text("label-save-also", m.exportAlso)
    text("label-save-case", m.exportButton)
    for (const [id, label] of [["previous-event", m.previousEvent], ["next-event", m.nextEvent]] as const) {
      this.byId(id).title = label
      this.byId(id).setAttribute("aria-label", label)
    }
    text("label-case-id", m.caseId)
    text("label-case-title", m.caseTitle)
    text("label-case-time", m.caseTime)
    text("label-events-group", m.eventsTab)
    text("label-case-file-group", m.fileTab)
    text("label-import-file", m.importFile)
    // The picker has no label: what it shows is the event, and what kind it is, in each option.
    this.byId("track").setAttribute("aria-label", m.event)
    text("label-kind", m.kindField)
    text("label-witness", m.witnessField)
    text("label-medium", m.mediumField)
    text("label-recording-id", m.recordingId)
    text("make-case", m.addToCase)
    for (const id of ["dirty", "recording-dirty"]) {
      this.byId(id).title = m.unsavedChanges
      this.byId(id).setAttribute("aria-label", m.unsavedChanges)
    }
    text("export", m.exportButton)
    text("label-export-recordings", m.exportAlso)
    text("label-title", m.titleField)
    text("label-author", m.authorField)
    text("label-date", m.caseTime)
    text("label-of", m.interpretationOf)
    text("label-source", m.sourceField)
    text("label-observer", m.observerField)
    text("label-file", m.fileField)
    for (const input of this.shadow.querySelectorAll<InputFileElement>("rr0-input-file")) input.messages = m
    text("ok", m.ok)
    text("cancel", m.cancel)
    const source = this.byId("source") as HTMLSelectElement
    ;[m.sourceBlank, m.sourceFile].forEach((label, index) => { source.options[index].textContent = label })
    const kind = this.byId("kind") as HTMLSelectElement
    ;[m.kindObservation, m.kindInterview].forEach((label, index) => { kind.options[index].textContent = label })
    this.byId("add").title = m.addHint
    this.byId("add").setAttribute("aria-label", m.addHint)
    this.byId("delete").title = m.deleteRecording
    this.byId("delete").setAttribute("aria-label", m.deleteRecording)
  }

  // -- The groups ----------------------------------------------------------------------------------

  /** Opens the events or the file: the strip's tabs are exclusive, as the recording's editor's. */
  private openGroup(group: "events" | "file"): void {
    this.group = group
    for (const tab of this.shadow.querySelectorAll<HTMLButtonElement>("#case-tabs .group-tab")) {
      tab.setAttribute("aria-expanded", String(tab.getAttribute("aria-controls") === (group === "file" ? "group-case-file" : "group-events")))
    }
    if (group === "file") {
      void this.loadFileEditor().then(() => this.syncFileEditor(), () => this.showFileNote(this.messages.loadFailed, "error"))
    } else {
      this.leaveFile()
    }
    this.refreshRow()
  }

  /** What is on show, from where things stand: the picker and the event, or the file; a recording alone has neither tab. */
  private applySections(): void {
    const session = this.session
    const events = session === undefined || this.group === "events"
    this.byId("events-row").hidden = session === undefined
    this.byId("group-events").hidden = !events
    this.byId("group-case-file").hidden = session === undefined || this.group !== "file"
    this.byId("recording").hidden = this.currentInterview !== undefined
    this.byId("interview-section").hidden = this.currentInterview === undefined
    this.byId("history-slot").hidden = this.currentInterview !== undefined
  }

  private showFileNote(message: string | undefined, kind: "info" | "error" = "info"): void {
    MessageStyle.show(this.byId("case-file-note"), message, kind)
  }

  /** The case as the text of its file. */
  private fileText(): string {
    return this.session ? JSON.stringify(this.session.json, null, 2) + "\n" : ""
  }

  /** The text editor, a chunk of its own fetched the first time the File group is opened. */
  private loadFileEditor(): Promise<SightingFileEditor> {
    this.fileEditorLoading ??= (async () => {
      this.showFileNote(this.messages.fileLoading)
      try {
        const [{ SightingFileEditor }, { default: schema }] = await Promise.all([import("./SightingFileEditor.js"), import("../generated/caseSchema.json")])
        const text = this.fileText()
        this.fileApplied = text
        this.fileEditor = new SightingFileEditor(this.byId("case-file-editor"), text, edited => this.onFileEdited(edited), this.editorMessages.fileEditorLabel,
          { baseline: text, phrases: this.editorMessages.fileSearchPhrases, schema: schema as never })
        return this.fileEditor
      } catch (error) {
        this.fileEditorLoading = undefined
        throw error
      } finally {
        this.showFileNote(undefined)
      }
    })()
    return this.fileEditorLoading
  }

  /** Puts the case in the text when the File group is opened, or after the case was changed from somewhere else (loaded, edited on the form). */
  private syncFileEditor(): void {
    if (!this.fileEditor || !this.session) return
    this.commit()
    const text = this.fileText()
    this.fileApplied = text
    this.fileEditor.replaceText(text, false)
    this.showFileNote(undefined)
  }

  /**
   * The author edited the text. What reads as a case is the case now: its events are those of the text, the recordings it still lists keep
   * what was loaded or edited of them. What does not read yet leaves the case as it was, and says so, until it does.
   */
  private onFileEdited(text: string): void {
    const session = this.session
    if (!session) return
    // Back to the text the case already has, from one it could not read: nothing to apply, and nothing wrong any more.
    if (text === this.fileApplied) {
      this.showFileNote(undefined)
      return
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      this.showFileNote(this.messages.fileInvalid, "error")
      return
    }
    if (!CaseFile.isCase(json)) {
      this.showFileNote(this.messages.fileInvalid, "error")
      return
    }
    this.fileApplied = text
    this.showFileNote(undefined)
    // Spaces, blank lines, a different order of lines: the same case, which is not a change of it.
    if (JSON.stringify(json) === JSON.stringify(session.json)) return
    session.replaceJson(json)
    // What was on show may be gone from the case: the picker then falls back on what is there when the events are shown again.
    if (this.current && !session.tracks.includes(this.current)) this.current = undefined
    if (this.currentInterview && !session.interviews.includes(this.currentInterview)) this.currentInterview = undefined
    this.refreshRow()
    this.scheduleDirtyCheck()
  }

  /** Back to the events: what the text did to the case may have taken away what was on show. */
  private leaveFile(): void {
    const session = this.session
    if (!session) return
    if (this.current === undefined && this.currentInterview === undefined) {
      const next = session.tracks.find(track => track.kind === "observer") ?? session.tracks[0]
      if (next) void this.showTrack(next)
    } else if (this.currentInterview) {
      this.interviewElement.event = this.currentInterview
    }
  }

  /** Runs what replaces the case, after asking when changes would be lost. */
  private guarded(action: () => void): void {
    if (!this.dirty) {
      action()
      return
    }
    this.pendingLoad = action
    this.openDialog("discard", this.messages.discardTitle, this.messages.discardQuestion)
  }

  private async importFromFile(file: File): Promise<void> {
    try {
      const json = JSON.parse(await file.text())
      this.guarded(() => void this.importCase(json, new URL("case.json", location.href).href))
    } catch {
      this.showFileNote(this.messages.loadFailed, "error")
    }
  }

  private async importFromUrl(url: string): Promise<void> {
    try {
      const absolute = new URL(url, location.href).href
      const json = await SightingFetch.json(absolute)
      this.guarded(() => void this.importCase(json, absolute))
    } catch {
      this.showFileNote(this.messages.loadFailed, "error")
    }
  }

  /** Opens a case read from a file or an address, in the place of the one open. */
  private async importCase(json: unknown, url: string): Promise<void> {
    if (!CaseFile.isCase(json)) {
      this.showFileNote(this.messages.fileNotACase)
      return
    }
    try {
      await this.openCase(json, url)
    } catch {
      this.showFileNote(this.messages.fileNotACase)
      return
    }
    this.syncFileEditor()
    this.showFileNote(undefined)
  }

  // -- The case ------------------------------------------------------------------------------------

  /**
   * Opens a case: the recordings it lists are the tracks, one on show at a time. Opens on the one the
   * `track` attribute names, else the first account.
   */
  private async openCase(json: Parameters<typeof CaseFile.sightingUrls>[0], url: string): Promise<void> {
    const session = new CaseSession(json, url)
    if (session.tracks.length === 0) throw new Error("A case with no recording has nothing to edit")
    this.session = session
    this.current = undefined
    const wanted = this.getAttribute("track")
    // Relative to the case, as a recording of it is.
    const absolute = wanted ? new URL(wanted, url).href : undefined
    const start = session.tracks.find(track => track.url === absolute) ?? session.tracks.find(track => track.kind === "observer") ?? session.tracks[0]
    // A case opens on itself, its events listed; on one of them only when it is asked for by name.
    this.listShown = absolute === undefined
    await this.showTrack(start)
  }

  private closeCase(): void {
    if (!this.session) return
    this.session = undefined
    this.current = undefined
    this.currentInterview = undefined
    this.editor.reading = false
    this.editor.accountShapeIds = undefined
    this.refreshRow()
  }

  /**
   * Keeps what the editor holds in the track on show, to be put back when it is shown again — once the author has done
   * something to it. A recording only looked at keeps what was loaded: the editor fills in what it can derive (a weather, a
   * zone) a moment after, and that is not a change anybody made, nor one worth warning about.
   */
  private commit(): void {
    if (this.session && this.current && this.editor.edited) this.session.keep(this.current, this.editor.sightingData)
  }

  private async loadTrack(track: CaseTrack): Promise<void> {
    if (track.recording) return
    track.recording = (await SightingFetch.recording(track.url)) as SightingRecordingJson
    // As it was fetched: what a recording is changed from. A recording shown has it taken again from the form (see showTrack).
    track.loaded = JSON.stringify(track.recording)
  }

  /** Shows a recording of the case in the editor, the one on show having been kept first. */
  private async showTrack(track: CaseTrack): Promise<void> {
    const session = this.session
    if (!session) return
    this.commit()
    this.currentInterview = undefined
    this.byId("passages").hidden = true
    try {
      const fresh = !track.recording
      await this.loadTrack(track)
      // A reading's `explains` are the shapes of the account it reads: that one is loaded too.
      const account = session.accountOf(track)
      if (account) await this.loadTrack(account)
      this.current = track
      this.editor.documentUrl = track.base ? track.base.url : track.url
      this.editor.reading = track.kind === "reading"
      this.editor.accountShapeIds = track.kind === "reading" && account?.recording ? CaseEditorElement.shapesOf(account.recording) : undefined
      // The readings of an account are candidates of its own (see CandidatesView): they are read for it.
      const readings = track.kind === "observer" ? session.readingsOf(track) : []
      for (const reading of readings) await this.loadTrack(reading).catch(() => undefined)
      this.editor.readings = readings.filter(reading => reading.recording?.interpretation?.bodies.length)
        .map(reading => ({ id: reading.event.id ?? session.proposedId(reading), label: this.labelOf(reading, session.tracks.indexOf(reading)), interpretation: reading.recording!.interpretation! }))
      this.editor.sightingData = structuredClone(track.recording!)
      // What the editor holds right after loading is what "changed" is measured from: it does not
      // write a recording back byte for byte, and a track only looked at is not one to write.
      if (fresh) session.keep(track, this.editor.sightingData, true)
      if (account && account.loaded === undefined) session.keep(account, account.recording!, true)
    } catch {
      this.showError(this.messages.loadFailed)
    }
    this.refreshRow()
    void this.showPassages(track)
  }

  private passagesToken = 0

  /** The transcript of an interview of the case as an object: what the author edited, else the file at its address (relative to the case). */
  private async transcriptOf(interview: InterviewEvent): Promise<InterviewJson | undefined> {
    const session = this.session
    if (!session) return undefined
    try {
      const text = session.transcriptText(interview)
      if (text !== undefined) return JSON.parse(text) as InterviewJson
      if (interview.url) return await SightingFetch.json(new URL(interview.url, session.url ?? location.href).href) as InterviewJson
    } catch {
      // an interview whose transcript cannot be read tells of nothing
    }
    return undefined
  }

  /**
   * Under an observation, the passages of the case's interviews that tell of its moments, each a link back to the passage and the time a link to the
   * moment itself: the other way round from an interview's passage that follows to the observation.
   */
  private async showPassages(track: CaseTrack): Promise<void> {
    const session = this.session
    const box = this.byId("passages")
    const token = ++this.passagesToken
    box.hidden = true
    // A case without interviews has no passages to look for, and none of the interview code to load.
    if (!session || track.kind !== "observer" || session.interviews.length === 0) return
    const { InterviewFile } = await import("../engine/persistence/interviewJson.js")
    if (token !== this.passagesToken) return
    const id = track.event.id ?? session.proposedId(track)
    const found: { interview: InterviewEvent, json: InterviewJson, passage: InterviewPassage }[] = []
    for (const interview of session.interviews) {
      const json = await this.transcriptOf(interview)
      if (!json || !Array.isArray(json.segments)) continue
      // An interview's file may not say whom it was held with: the case's event does.
      const held = { ...json, interviewOf: json.interviewOf ?? interview.interviewOf }
      for (const passage of InterviewFile.passagesAbout(held, id)) found.push({ interview, json, passage })
    }
    if (token !== this.passagesToken || this.current !== track || found.length === 0) return
    const list = this.byId("passages-list")
    list.replaceChildren(...found.sort((a, b) => a.passage.at - b.passage.at).map(({ interview, json, passage }) => {
      const item = document.createElement("li")
      const at = document.createElement("button")
      at.type = "button"
      at.className = "at"
      at.innerHTML = PlayerIcons.PLAY
      at.append(InterviewFile.clock(passage.at, true))
      at.addEventListener("click", () => this.editor.seekTo(passage.at))
      // The quotation is the link: to the passage, in the interview it is from, which the tooltip names ("Reported in Interview of Q. B.").
      const link = document.createElement("button")
      link.type = "button"
      link.className = "excerpt"
      const items = this.items(session) as { interview?: InterviewEvent }[]
      const index = items.findIndex(candidate => candidate.interview === interview)
      const where = `${this.messages.passagesHeading} ${this.optionLabel({ interview }, index)}`
      const said = passage.text === undefined ? "" : passage.range ? passage.text.slice(passage.range[0], passage.range[1]) : passage.text
      link.textContent = said === "" ? where : `${InterviewFile.speakerName(json, passage.speaker)} : « ${said.length > 120 ? `${said.slice(0, 117)}…` : said} »`
      link.title = where
      link.addEventListener("click", () => {
        void this.showInterview(interview).then(() => this.interviewElement.revealSegment(passage.index))
      })
      item.append(at, link)
      return item
    }))
    box.hidden = false
  }

  /** A passage of an interview was followed to the moment it tells of: the observation is shown at that time. */
  private async followToObservation(target: { sighting?: string, at: number, quote?: string }): Promise<void> {
    const session = this.session
    if (!session) return
    const track = session.tracks.find(candidate => candidate.kind === "observer" && (candidate.event.id ?? session.proposedId(candidate)) === target.sighting)
      ?? session.tracks.find(candidate => candidate.kind === "observer")
    if (!track) return
    const from = this.currentInterview
    this.listShown = false
    await this.showTrack(track)
    // On the Date section, where the moments are, with the playhead on the one quoted (§5).
    this.editor.openSection("group-temporal")
    this.editor.seekTo(target.at)
    this.showCited(from, track, target)
    // The link was followed from the interview's form, above the render: the render is what is wanted in view.
    this.editor.showRender()
  }

  private static shapesOf(recording: SightingRecordingJson): string[] {
    const ids = new Set<string>()
    for (const keyframe of recording.timeline?.keyframes ?? []) for (const entry of keyframe.shapes ?? []) ids.add(entry.sourceId)
    return [...ids]
  }

  /** What the picker offers, in order: the case's recordings, then its interviews. */
  private items(session: CaseSession): { track: CaseTrack, interview?: undefined }[] | { track?: undefined, interview: InterviewEvent }[] {
    return [...session.tracks.map(track => ({ track })), ...session.interviews.map(interview => ({ interview }))] as never
  }

  /** What an option says of an event: whose account it is, whom the interview was held with. A reading is called what its interpretation is. */
  private optionLabel(item: { track?: CaseTrack, interview?: InterviewEvent }, index: number): string {
    const session = this.session!
    if (item.interview) {
      const witnesses = session.intervieweesOf(item.interview)
      const name = witnesses.length > 0 ? witnesses.map(witness => this.labelOf(witness, session.tracks.indexOf(witness))).join(", ") : this.said.read(item.interview.title as never)
      return name ? `${this.messages.interviewOf} ${name}` : this.messages.untitledInterview.replace("{n}", String(session.interviews.indexOf(item.interview) + 1))
    }
    const track = item.track!
    const label = this.labelOf(track, index)
    return track.kind === "observer" ? `${this.messages.accountOf} ${label}` : label
  }

  /** Shows an interview of the case where the recording was: the picker is then on it, and no recording is. */
  private async showInterview(interview: InterviewEvent): Promise<void> {
    const session = this.session
    if (!session) return
    this.commit()
    this.current = undefined
    this.passagesToken++
    this.byId("passages").hidden = true
    this.currentInterview = interview
    this.refreshRow()
    await this.ensureInterview()
    // Another event may have been chosen while the element was fetched.
    if (this.currentInterview !== interview) return
    // The moments of the witnesses' observations, which a passage of theirs can be linked to: their recordings are read for them.
    for (const witness of session.intervieweesOf(interview)) await this.loadTrack(witness).catch(() => undefined)
    if (this.currentInterview !== interview) return
    this.interviewElement.witnesses = session.tracks.filter(track => track.kind === "observer")
      .map(track => ({ id: track.event.id ?? session.proposedId(track), label: this.labelOf(track, session.tracks.indexOf(track)), moments: this.momentsOf(track) }))
    // The transcript is the case's to keep between visits, and what its address is relative to is the case's.
    this.interviewElement.documentUrl = session.url
    this.interviewElement.transcriptText = session.transcriptText(interview)
    this.interviewElement.event = interview
  }

  /** Fetches and defines `<rr0-interview-editor>`, once: the editor of an interview is a chunk of its own that a case without interviews never loads. */
  private ensureInterview(): Promise<void> {
    this.interviewReady ??= import("./InterviewEditorElement.js").then(({ register }) => {
      register()
      customElements.upgrade(this.shadow)
    }, error => {
      this.interviewReady = undefined
      throw error
    })
    return this.interviewReady
  }

  /** An interview edited: the case is changed, and a witness chosen who has no id yet is given the one that was offered for them. */
  private interviewChanged(change: { field: string, text?: string }): void {
    const { field } = change
    const session = this.session
    const interview = this.currentInterview
    if (!session || !interview) return
    if (field === "transcript" && change.text !== undefined) session.keepTranscript(interview, change.text)
    // A witness named, by the select or by the file's text, who has no id yet is given the one that was offered for them.
    for (const reference of [interview.interviewOf].flat()) {
      const witness = session.tracks.find(track => track.kind === "observer" && (track.event.id ?? session.proposedId(track)) === reference)
      if (witness) session.ensureId(witness)
    }
    session.touch()
    this.refreshRow()
    this.scheduleDirtyCheck()
  }

  /** The events, in the order of time, with where each stands in `items` (which the picker lists them by). */
  private eventsInTime(session: CaseSession): { item: { track?: CaseTrack, interview?: InterviewEvent }, index: number }[] {
    const items = this.items(session) as { track?: CaseTrack, interview?: InterviewEvent }[]
    const timeOf = (item: { track?: CaseTrack, interview?: InterviewEvent }) => String((item.track?.event ?? item.interview)?.time ?? "")
    // Stable: events of the same time, or of none, stay in the order the case lists them.
    return items.map((item, index) => ({ item, index })).sort((a, b) => timeOf(a.item).localeCompare(timeOf(b.item)))
  }

  /** The named moments of an observation, as an interview links to them (see InterviewMoment). */
  private momentsOf(track: CaseTrack): { at: number, label: string, note?: string }[] {
    return (track.recording?.milestones ?? []).map(milestone => {
      const note = this.said.read(milestone.note as never)
      return { at: milestone.t / 1000, label: this.said.read(milestone.label as never) ?? "", ...(note ? { note } : {}) }
    })
  }

  /** The interview a moment of the observation on show was quoted from, if it was opened from it. */
  private citedFrom?: InterviewEvent

  /** Says over the observation that its moment was quoted in `from`, with what was said, and offers the way back there. */
  private showCited(from: InterviewEvent | undefined, track: CaseTrack, target: { at: number, quote?: string }): void {
    const banner = this.byId("cited")
    this.citedFrom = from
    if (!from || !this.session) {
      banner.hidden = true
      return
    }
    const moment = this.momentsOf(track).find(candidate => Math.abs(candidate.at - target.at) < 0.05)
    const quote = (target.quote ?? "").length > 120 ? `${target.quote!.slice(0, 117)}…` : target.quote ?? ""
    this.byId("cited-text").textContent = this.messages.citedMoment
      .replace("{k}", moment?.label ?? `${Math.round(target.at)} s`)
      .replace("{title}", this.optionLabel({ interview: from }, 0))
      .replace("{quote}", quote)
    banner.hidden = false
  }

  /** What kind an event is, for its pill and its colour. */
  private kindOf(item: { track?: CaseTrack, interview?: InterviewEvent }): "observation" | "interview" | "reading" {
    return item.interview ? "interview" : item.track!.kind === "reading" ? "reading" : "observation"
  }

  private kindLabel(kind: "observation" | "interview" | "reading"): string {
    return { observation: this.messages.kindObservation, interview: this.messages.kindInterview, reading: this.messages.kindReading }[kind]
  }

  /** Shows the case or the event open, as `listShown` says: the case's fields and its events, or the way back and the event. */
  private refreshOverview(): void {
    const session = this.session
    const overview = this.byId("case-overview")
    const crumbs = this.byId("event-crumbs")
    overview.hidden = !session || !this.listShown
    crumbs.hidden = !session || this.listShown
    this.byId("event-item").hidden = session !== undefined && this.listShown
    this.byId("events-count").textContent = session ? String(this.items(session).length) : ""
    this.byId("case-heading").textContent = (session && String((session.json as Record<string, unknown>).title ?? "")) || this.messages.caseHeading
    if (!session) return
    const events = this.eventsInTime(session)
    this.renderEvents(session, events)
    const open = events.findIndex(({ item }) => item.interview ? item.interview === this.currentInterview : item.track === this.current)
    const current = events[open]
    if (current) {
      const kind = this.kindOf(current.item)
      const pill = this.byId("crumb-kind")
      pill.textContent = this.kindLabel(kind)
      pill.dataset.kind = kind
      this.byId("crumb-title").textContent = this.optionLabel(current.item, current.index)
    }
    ;(this.byId("previous-event") as HTMLButtonElement).disabled = open <= 0
    ;(this.byId("next-event") as HTMLButtonElement).disabled = open < 0 || open >= events.length - 1
  }

  /** One card per event, in the order of time, on a line: its kind, what it is called, when and its id, what it is linked to, and its
   * removal. A click anywhere on it but the removal opens it. */
  private renderEvents(session: CaseSession, events: { item: { track?: CaseTrack, interview?: InterviewEvent }, index: number }[]): void {
    const m = this.messages
    const list = this.byId("event-list")
    list.replaceChildren(...events.map(({ item, index }) => {
      const kind = this.kindOf(item)
      const event = (item.track?.event ?? item.interview)!
      const card = document.createElement("li")
      card.className = "event-card"
      card.dataset.kind = kind
      const pill = document.createElement("span")
      pill.className = "kind-pill"
      pill.dataset.kind = kind
      pill.textContent = this.kindLabel(kind)
      const main = document.createElement("div")
      main.className = "event-main"
      // The title is what opens it: a button, so that the keyboard opens it as the pointer does (see .event-open).
      const title = document.createElement("button")
      title.type = "button"
      title.className = "event-open"
      title.textContent = this.optionLabel(item, index)
      title.title = m.openEvent
      title.addEventListener("click", () => this.openEvent(index))
      const meta = document.createElement("span")
      meta.className = "event-meta"
      meta.textContent = [event.time ? String(event.time).replace("T", " ") : "", event.id ?? ""].filter(Boolean).join(" · ")
      main.append(title, meta)
      const links = document.createElement("span")
      links.className = "event-links"
      const said: string[] = []
      if (item.track?.kind === "observer") {
        const told = session.interviews.filter(interview => session.intervieweesOf(interview).includes(item.track!))
          .map(interview => this.optionLabel({ interview }, 0))
        if (told.length > 0) said.push(`${m.passagesHeading} : ${told.join(", ")}`)
        const readings = session.readingsOf(item.track).length
        if (readings > 0) said.push(m.readingsCount.replace("{n}", String(readings)))
      } else if (item.track) {
        const account = session.accountOf(item.track)
        if (account) said.push(`${m.interpretationOf} : ${this.optionLabel({ track: account }, session.tracks.indexOf(account))}`)
      }
      links.textContent = said.join(" · ")
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "icon-btn event-delete"
      remove.innerHTML = Icons.TRASH
      remove.title = m.deleteRecording
      remove.setAttribute("aria-label", m.deleteRecording)
      remove.addEventListener("click", () => void this.deleteFromList(index))
      const body = document.createElement("div")
      body.className = "event-body"
      body.append(pill, main, links)
      card.append(body, remove)
      return card
    }))
  }

  /** Opens the event listed `index` in the picker: the list goes, and the event takes its place. */
  private openEvent(index: number): void {
    const select = this.byId("track") as HTMLSelectElement
    select.value = String(index)
    select.dispatchEvent(new Event("change"))
    requestAnimationFrame(() => this.bringEditorIntoView())
  }

  /**
   * An observation opened: the page is scrolled so that its editor, as tall as the screen, is all of it, the scene in view and its form
   * scrolling under it. Below the case's own header the editor's foot was off the screen, a section cut there with nothing to scroll.
   */
  private bringEditorIntoView(): void {
    const editor = this.editor as HTMLElement
    if (!editor.checkVisibility?.()) return
    const box = editor.getBoundingClientRect()
    if (Math.abs(box.top) > 1) editor.scrollIntoView?.({ block: "start", behavior: "smooth" })
  }

  /** Asks to delete an event from the list: it is made the one the deletion is about, without leaving the list. */
  private async deleteFromList(index: number): Promise<void> {
    const session = this.session
    const item = session ? (this.items(session) as { track?: CaseTrack, interview?: InterviewEvent }[])[index] : undefined
    if (!item) return
    ;(this.byId("track") as HTMLSelectElement).value = String(index)
    if (item.interview) await this.showInterview(item.interview)
    else await this.showTrack(item.track!)
    this.askDelete()
  }

  /** Opens the event before or after the one open, in the order of time. */
  private stepEvent(step: number): void {
    const session = this.session
    if (!session) return
    const events = this.eventsInTime(session)
    const open = events.findIndex(({ item }) => item.interview ? item.interview === this.currentInterview : item.track === this.current)
    const next = events[open + step]
    if (next) this.openEvent(next.index)
  }

  /** Whether there is anything to save: Save, on or off, is all the header says of it. */
  private refreshCaseState(): void {
    ;(this.byId("save-case") as HTMLButtonElement).disabled = !(this.session?.dirty ?? false)
  }

  private labelOf(track: CaseTrack, index: number): string {
    const said = this.said.read(track.event.title as never) ?? this.said.read(track.recording?.interpretation?.title as never)
    if (said) return said
    if (track.kind === "observer") return this.said.read(track.recording?.observer?.title as never) ?? track.event.url ?? ""
    const number = this.session!.tracks.filter(other => other.kind === "reading").indexOf(track) + 1
    return this.messages.untitledReading.replace("{n}", String(number || index + 1))
  }

  /**
   * Makes a case around the recording on show, which stays exactly where it is: the editor is not given it again, so what is
   * being edited is not lost, and the case appears above it. Nothing is written anywhere: the case is the one an export makes.
   */
  private makeCase(): void {
    if (this.session) return
    const recording = this.editor.sightingData
    const when = recording.time ? CaseEditorElement.rr0TimeOf(formatEdtfTime(recording.time)) : undefined
    const title = this.said.read(recording.observer?.title as never)
    const from = this.getAttribute("src") ? new URL(this.getAttribute("src")!, location.href).href : undefined
    this.session = CaseSession.around(recording, when, title, from, location.href)
    // What was being edited stays on show, in the case now around it.
    this.listShown = false
    this.current = this.session.tracks[0]
    this.session.keep(this.current, recording)
    this.dateModeFor = undefined
    this.refreshRow()
  }

  /** The case's own fields, written back as typed: a case holds them as plain text, and an empty one is not kept. */
  private writeCaseField(field: "id" | "title" | "time", value: string): void {
    const json = this.session?.json as Record<string, unknown> | undefined
    if (!json) return
    if (value.trim() === "") delete json[field]
    else json[field] = value
    this.session?.touch()
    this.scheduleDirtyCheck()
  }

  /** RR0 writes "1950-05-11 19:45" where EDTF writes "1950-05-11T19:45". */
  private static rr0TimeOf(edtf: string): string {
    return edtf.replace(/^(\d{4}-\d\d-\d\d)T/, "$1 ")
  }

  private static edtfOf(rr0: string): string {
    return rr0.replace(/^(\d{4}-\d\d-\d\d) (?=\d)/, "$1T")
  }

  /** Shows the case's date in the field: opens in the picker for a full instant, in the text for anything less (or anything it cannot read). */
  private showCaseTime(session: CaseSession): void {
    const raw = String((session.json as Record<string, unknown>).time ?? "")
    const time = raw === "" ? undefined : parseEdtfTime(CaseEditorElement.edtfOf(raw))
    this.caseDate.time = time
    if (raw !== "" && !time) {
      // A date this field cannot read is shown as it is written, in the text, and left alone until it is edited.
      const text = this.input("case-time")
      text.value = raw
    }
    if (this.dateModeFor !== session) {
      this.caseDate.setPrecise(!(raw !== "" && !time) && EdtfDateField.opensPrecise(time))
      this.dateModeFor = session
    }
  }

  /** The case on top, when there is one, and the picker of its recordings with what can be done with the one on show. */
  private refreshRow(): void {
    const session = this.session
    this.applySections()
    this.byId("case-panel").hidden = session === undefined
    this.refreshOverview()
    this.byId("make-case-row").hidden = session !== undefined
    this.byId("case").classList.toggle("in-case", session !== undefined)
    this.byId("event-item").classList.toggle("in-case", session !== undefined)
    if (!session) {
      this.refreshDirty()
      return
    }
    const active = this.shadow.activeElement
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"]] as const) {
      const input = this.input(id)
      if (input !== active) input.value = String((session.json as Record<string, unknown>)[field] ?? "")
    }
    if (!active?.closest?.("rr0-date-input")) this.showCaseTime(session)
    const select = this.byId("track") as HTMLSelectElement
    const items = this.items(session) as { track?: CaseTrack, interview?: InterviewEvent }[]
    select.replaceChildren(...items.map((item, index) => new Option(this.optionLabel(item, index), String(index))))
    const shown = this.currentInterview ? items.findIndex(item => item.interview === this.currentInterview) : this.current ? items.findIndex(item => item.track === this.current) : 0
    select.value = String(Math.max(0, shown))
    // Any recording can leave the case, while the case keeps one; an interview can always.
    ;(this.byId("delete") as HTMLButtonElement).disabled = this.currentInterview === undefined && session.tracks.length <= 1
    this.refreshRecordingId(session)
    this.refreshDirty()
  }

  /** The id of the recording on show: its event's, or, shown greyed, the one it would be given. A reading is not named, nothing reads it. */
  private refreshRecordingId(session: CaseSession): void {
    const track = this.current
    const named = track !== undefined && track.kind === "observer"
    this.byId("row-recording-id").hidden = !named
    if (named) {
      const input = this.input("recording-id")
      if (this.shadow.activeElement !== input) input.value = track.event.id ?? ""
      input.placeholder = session.proposedId(track)
    }
    const { duplicateIds, unresolved } = session.problems()
    const messages = [
      ...duplicateIds.map(id => this.messages.idDuplicated.replace("{id}", id)),
      ...unresolved.map(({ reference }) => this.messages.readingUnresolved.replace("{id}", reference))
    ]
    const note = this.byId("case-problems")
    note.hidden = messages.length === 0
    note.textContent = messages.join(" ")
  }

  private showRecordingIdError(message: string | undefined): void {
    const error = this.byId("recording-id-error")
    error.textContent = message ?? ""
    error.hidden = message === undefined
  }

  /** What is typed in the id field goes to the event when it is a good id, and what is wrong with it is said when it is not. */
  private writeRecordingId(): void {
    const session = this.session
    const track = this.current
    if (!session || !track) return
    const refused = session.setId(track, this.input("recording-id").value.trim())
    this.showRecordingIdError(refused === "ok" ? undefined : {
      empty: this.messages.idNeeded, invalid: this.messages.idInvalid, taken: this.messages.idTaken
    }[refused])
    this.scheduleDirtyCheck()
  }

  // -- The dialog ----------------------------------------------------------------------------------

  private get dialog(): HTMLDialogElement {
    return this.byId("dialog") as HTMLDialogElement
  }

  private openDialog(mode: DialogMode, heading: string, message?: string, okLabel?: string): void {
    this.dialogMode = mode
    this.byId("dialog-title").textContent = heading
    const note = this.byId("dialog-message")
    note.textContent = message ?? ""
    note.hidden = message === undefined
    this.showError(undefined)
    this.byId("fields-add").hidden = mode !== "add"
    this.byId("fields-export").hidden = mode !== "export"
    this.byId("ok").hidden = false
    this.byId("ok").textContent = okLabel ?? (mode === "discard" ? this.messages.discardOk : this.messages.ok)
    if (typeof this.dialog.showModal === "function") this.dialog.showModal()
    else this.dialog.setAttribute("open", "")
  }

  private closeDialog(): void {
    // Leaving the dialog, agreeing or not, ends what waited for it: agreeing took it first.
    this.pendingLoad = undefined
    if (typeof this.dialog.close === "function") this.dialog.close()
    else this.dialog.removeAttribute("open")
  }

  private showError(message: string | undefined): void {
    const error = this.byId("dialog-error")
    error.textContent = message ?? ""
    error.hidden = message === undefined
  }

  private input(id: string): HTMLInputElement {
    return this.byId(id) as HTMLInputElement
  }

  private inputFile(id: string): InputFileElement {
    return this.byId(id) as InputFileElement
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  /** Adds a recording: an observation, or, when an account is named, a reading of it (another observation, see InterpretationEventJson). */
  private askAdd(): void {
    const session = this.session
    if (!session) return
    this.openDialog("add", this.messages.addTitle)
    const of = this.byId("of") as HTMLSelectElement
    of.replaceChildren(new Option(this.messages.interpretationOfNone, ""),
      ...session.tracks.filter(track => track.kind === "observer")
        .map(track => new Option(this.labelOf(track, session.tracks.indexOf(track)), String(session.tracks.indexOf(track)))))
    of.value = ""
    ;(this.byId("kind") as HTMLSelectElement).value = "observation"
    const observers = session.tracks.filter(track => track.kind === "observer")
    ;(this.byId("witness") as HTMLSelectElement).replaceChildren(...observers.map(track => new Option(this.labelOf(track, session.tracks.indexOf(track)), String(session.tracks.indexOf(track)))))
    // What an interview is held through: one of the media, the first of which is where it starts.
    ;(this.byId("medium") as HTMLSelectElement).replaceChildren()
    ;(this.byId("source") as HTMLSelectElement).value = "blank"
    for (const id of ["observer", "title", "author"]) this.input(id).value = ""
    this.inputFile("add-source").clear()
    this.input("date").value = ""
    this.syncSourceFields()
  }

  /** What the dialog asks depends on what is added: an observer for an observation, a title and an author for a reading. */
  /** The media an interview may be held through, the first of which is where it starts: fetched when an interview is the kind added, not before. */
  private async fillMedia(): Promise<void> {
    const { InterviewMedia } = await import("./messages/InterviewMedia.js")
    const select = this.byId("medium") as HTMLSelectElement
    if (select.options.length > 0) return
    select.replaceChildren(...InterviewMedia.ALL.map(medium => new Option(InterviewMedia.label(medium, this.language), medium)))
  }

  private syncSourceFields(): void {
    const interview = (this.byId("kind") as HTMLSelectElement).value === "interview"
    const source = (this.byId("source") as HTMLSelectElement).value
    const reading = !interview && (this.byId("of") as HTMLSelectElement).value !== ""
    // An interview is described here, not loaded: no source, no interpretation; it asks whom it was held with, a title and who held it.
    this.byId("row-source").hidden = interview
    this.byId("row-of").hidden = interview
    this.byId("row-witness").hidden = !interview
    this.byId("row-medium").hidden = !interview
    if (interview) void this.fillMedia()
    this.byId("row-file").hidden = interview || source !== "file"
    this.byId("row-observer").hidden = interview || reading
    this.byId("row-title").hidden = !(interview || reading)
    this.byId("row-author").hidden = !(interview || reading)
    this.byId("label-title").textContent = interview ? this.messages.plainTitleField : this.messages.titleField
    this.byId("label-author").textContent = interview ? this.messages.interviewerField : this.messages.authorField
  }

  private askExport(): void {
    if (!this.session) return
    this.openDialog("export", this.messages.exportTitle)
    ;(this.input("export-recordings")).checked = true
  }

  private askDelete(): void {
    const session = this.session
    if (session && this.currentInterview) {
      this.openDialog("delete", this.messages.deleteRecording, this.messages.deleteInterviewQuestion)
      return
    }
    const track = this.current
    if (!session || !track) return
    if (track.kind === "observer") {
      const readings = session.readingsOf(track).length
      if (readings > 0) {
        this.openDialog("delete", this.messages.deleteRecording, this.messages.deleteRefused.replace("{n}", String(readings)))
        this.byId("ok").hidden = true
        return
      }
    }
    this.openDialog("delete", this.messages.deleteRecording, track.kind === "reading" ? this.messages.deleteReadingQuestion : this.messages.deleteObservationQuestion)
  }

  private async submitDialog(): Promise<void> {
    switch (this.dialogMode) {
      case "delete":
        this.closeDialog()
        this.deleteCurrent()
        return
      case "discard": {
        const proceed = this.pendingLoad
        this.closeDialog()
        proceed?.()
        return
      }
      case "export":
        if (await this.exportCase(this.input("export-recordings").checked)) this.closeDialog()
        else this.showError(this.messages.loadFailed)
        return
      case "add":
        if (await this.addRecording()) this.closeDialog()
    }
  }

  // -- What is done to the case --------------------------------------------------------------------

  /**
   * Adds what the dialog describes — blank, or read from a file or an address — as an observation, or
   * as a reading of the account it names. A blank reading shares the whole scene of that account; says
   * what went wrong in the dialog.
   */
  private async addRecording(): Promise<boolean> {
    const session = this.session
    if (!session) return false
    this.commit()
    if ((this.byId("kind") as HTMLSelectElement).value === "interview") {
      const witness = session.tracks[Number((this.byId("witness") as HTMLSelectElement).value)]
      const title = this.input("title").value.trim()
      const author = this.input("author").value.trim()
      const interview = session.addInterview(witness, this.input("date").value || this.today(),
        title !== "" ? title : undefined, author !== "" ? author.split(",").map(name => ({ people: name.trim() })).filter(agent => agent.people !== "") : undefined,
        (this.byId("medium") as HTMLSelectElement).value as InterviewMedium)
      await this.showInterview(interview)
      return true
    }
    const of = (this.byId("of") as HTMLSelectElement).value
    const account = of === "" ? undefined : session.tracks[Number(of)]
    const source = (this.byId("source") as HTMLSelectElement).value
    if (account && source === "blank") {
      if (account.kind !== "observer" || !account.recording) return false
      const title = this.input("title").value.trim()
      const author = this.input("author").value.trim()
      const reading = session.addReading(account, this.input("date").value || this.today(),
        title !== "" ? title : undefined, author !== "" ? [{ title: author }] : undefined)
      void this.showTrack(reading)
      return true
    }
    const observer = this.input("observer").value.trim()
    const when = this.input("date").value.trim()
    let recording: SightingRecordingJson
    try {
      if (source === "blank") {
        const stem = (observer || "observation").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "observation"
        recording = {
          version: 1,
          id: `${when ? `${when}-` : ""}${stem}`,
          ...(observer ? { observer: { title: observer } } : {}),
          ...(when ? { time: when } : {}),
          timeline: { keyframes: [], order: [], groups: [] }
        } as unknown as SightingRecordingJson
      } else {
        const loaded = await this.readFile()
        if (CaseFile.isCase(loaded)) {
          this.showError(this.messages.isACase)
          return false
        }
        recording = loaded as SightingRecordingJson
        if (observer && !recording.observer?.title) recording = { ...recording, observer: { ...recording.observer, title: observer } }
      }
    } catch {
      this.showError(this.messages.loadFailed)
      return false
    }
    const typedTitle = (account ? this.input("title").value : observer).trim()
    const title = typedTitle !== "" ? typedTitle : this.said.read(recording.observer?.title as never)
    const author = this.input("author").value.trim()
    const track = session.addObservation(recording, when !== "" ? when : undefined, title,
      account ? { account, by: author !== "" ? [{ title: author }] : undefined } : undefined)
    void this.showTrack(track)
    return true
  }

  /** The recording the dialog was given: a file of the author's, or the one at the address typed. */
  private async readFile(): Promise<unknown> {
    const given = this.inputFile("add-source").value
    if (!given) throw new Error("No file")
    if (given.url) return SightingFetch.recording(new URL(given.url, location.href).href)
    const file = given.file!
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
    return JSON.parse(text)
  }

  /** Deletes the recording on show — a reading, or an account no reading interprets — and shows another. */
  private deleteCurrent(): void {
    const session = this.session
    const interview = this.currentInterview
    if (session && interview) {
      if (!session.deleteInterview(interview)) return
      this.currentInterview = undefined
      const next = session.tracks.find(other => other.kind === "observer") ?? session.tracks[0]
      if (next) void this.showTrack(next)
      return
    }
    const track = this.current
    if (!session || !track) return
    const next = track.kind === "reading"
      ? session.accountOf(track) ?? session.tracks.find(other => other.kind === "observer")
      : session.tracks.find(other => other !== track)
    const removed = track.kind === "reading" ? session.deleteReading(track) : session.deleteObservation(track).deleted
    if (!removed) return
    this.current = undefined
    if (next) void this.showTrack(next)
  }

  /**
   * The case, and with `withRecordings` every recording it lists beside it — the ones not looked at yet are fetched for it —
   * as one zip laid out as the case is; the case alone as the plain file. Says whether it could be written.
   */
  private async exportCase(withRecordings = true): Promise<boolean> {
    const session = this.session
    if (!session) return true
    this.commit()
    if (withRecordings) {
      try {
        for (const track of session.tracks) await this.loadTrack(track)
      } catch {
        return false
      }
    }
    const files = session.files(withRecordings, true)
    session.markExported(withRecordings)
    this.fileEditor?.markSaved()
    this.refreshDirty()
    // The case alone is the one file it is: no archive around it.
    if (files.length === 1) {
      this.download(new Blob([files[0].content], { type: "application/json" }), files[0].path)
      return true
    }
    const { zipSync, strToU8 } = await import("fflate")
    const archive: Record<string, Uint8Array> = {}
    for (const file of files) archive[file.path] = strToU8(file.content)
    this.download(new Blob([zipSync(archive) as BlobPart], { type: "application/zip" }), `${session.json.id ?? "case"}.zip`)
    return true
  }

  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
}

export function register(): void {
  registerSightingEditor()
  if (!customElements.get(CASE_EDITOR_ELEMENT_NAME)) customElements.define(CASE_EDITOR_ELEMENT_NAME, CaseEditorElement)
}
