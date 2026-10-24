import type { ShareCodeEditor } from "./ShareCodeEditor.js"
import { EmbedScript, type EmbeddedModule } from "./EmbedScript.js"
import { AppLocation } from "./AppLocation.js"
import type { ShareMessages } from "./messages/ShareMessages.js"
import { shareMessages_en } from "./messages/ShareMessages_en.js"
import { loadShareMessages, type UfoLanguage } from "./messages/index.js"

/** What a share dialog shares: told by the element it belongs to, which alone knows what it has on show. */
export interface ShareSubject {
  /** The module the embed code loads. */
  readonly module: EmbeddedModule
  /** The address that opens what is shared, for whoever is given it. */
  link(): string
  /** The element that puts it on another page, with its attributes and absolute addresses, without the script that defines it. */
  element(): string
}

const TEMPLATE = `
<style>
/* What the dialog is drawn with: light by default, and the dark set when the system asks for it, as the player and the editors
   are. The form controls follow through color-scheme. Defined here and not by the host, so that any element can hold this dialog;
   the options a host slots in inherit them. */
:host {
  display: contents;
  --pop-bg: #fff;
  --pop-fg: #222;
  --pop-border: #ccc;
  --pop-soft: #eee;
  --pop-faint: #666;
  --pop-fill: #f2f2f2;
  --pop-fill-hover: #e4e4e4;
  --pop-on: #dbe6f7;
  --pop-on-border: #9bb6e0;
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
    --pop-tag: #8cb8ff;
    --pop-attr: #e0a860;
    --pop-string: #7fd08a;
  }
}
/* As the video sites draw theirs: a card centred over a dimmed page, its title and a close button on one line, the ways of sharing
   as round buttons, and the link to copy in a field with its button inside. Native <dialog>, so the page behind is inert and Escape
   closes. */
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
.share-close:hover, .share-close:focus-visible {
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
.share-note {
  margin: 0 0 0.8em;
  color: var(--pop-faint);
  font-size: 0.85em;
}
.share-note[hidden], .share-embed[hidden], .share-link[hidden] {
  display: none;
}
.share-link {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  padding: 0.5em 0.6em 0.5em 0.8em;
  border: 1px solid var(--pop-border);
  border-radius: 0.9em;
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
/* Above what it changes, the link as much as the code. */
.share-freeze {
  display: block;
  margin-bottom: 0.6em;
  font-size: 0.9em;
}
/* The embed code is edited in CodeMirror once its chunk has loaded; the textarea is the stand-in until then, and the model the
   editor mirrors. */
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
.embed-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5em;
}
</style>
<dialog id="dialog" class="share-dialog" aria-labelledby="title">
  <div class="share-head">
    <h3 id="title" class="share-title">Share</h3>
    <button id="close" class="share-close" type="button" aria-label="Close">×</button>
  </div>
  <!-- What is given: the link, or the code that puts it on another page. -->
  <div class="share-options">
    <button id="link-option" class="share-option" type="button" aria-pressed="true">
      <span class="share-option-icon"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span id="link-label">Link</span>
    </button>
    <button id="embed-option" class="share-option" type="button" aria-pressed="false">
      <span class="share-option-icon"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span id="embed-label">Embed</span>
    </button>
  </div>
  <!-- What the element that holds the dialog lets its reader choose of what is shared: the player's position and options. -->
  <slot name="options"></slot>
  <p id="note" class="share-note" role="status" hidden></p>
  <!-- Unticked, what is shared follows each release; ticked, it keeps this one for good (see EmbedScript). -->
  <label class="share-freeze"><input id="freeze" type="checkbox"/> <span id="freeze-label">Freeze this version</span></label>
  <div id="link-box" class="share-link">
    <textarea id="link" class="share-link-input" rows="2" spellcheck="false" aria-label="Link"></textarea>
    <button id="link-copy" class="share-copy" type="button">Copy</button>
  </div>
  <div id="embed-box" class="share-embed" hidden>
    <div id="embed-code" class="embed-code"></div>
    <textarea id="embed-markup" class="embed-markup" rows="6" spellcheck="false"></textarea>
    <div class="embed-row">
      <button id="embed-copy" class="share-copy" type="button">Copy</button>
    </div>
  </div>
</dialog>
`

/**
 * The share dialog: the link that opens what an element shows, or the code that puts that element on another page.
 *
 * One for every element that shares, so that sharing reads the same everywhere and is written once. Each shares itself: the player
 * gives a link to the player and the code of `<rr0-sighting>`, an editor a link to the editor and the code of its own element (see
 * ShareSubject). What only one of them lets its reader choose (the player's position, its chips) it slots in as `options`, and
 * calls `refresh` when it changes.
 */
export class ShareDialogElement extends HTMLElement {

  static readonly TAG = "rr0-share-dialog"

  /** Defines the element, once. */
  static register(): void {
    if (!customElements.get(ShareDialogElement.TAG)) customElements.define(ShareDialogElement.TAG, ShareDialogElement)
  }

  /** What is shared. Nothing is given until it is set. */
  subject?: ShareSubject

  private messages: ShareMessages = shareMessages_en
  private languageToken = 0
  private readonly shadow: ShadowRoot
  private readonly dialog: HTMLDialogElement
  private readonly linkField: HTMLTextAreaElement
  private readonly linkCopy: HTMLButtonElement
  private readonly linkBox: HTMLElement
  private readonly embedBox: HTMLElement
  private readonly linkOption: HTMLButtonElement
  private readonly embedOption: HTMLButtonElement
  private readonly freeze: HTMLInputElement
  private readonly embedMarkup: HTMLTextAreaElement
  private readonly embedCopy: HTMLButtonElement
  private readonly noteElement: HTMLElement
  private codeEditor?: ShareCodeEditor
  private codeLoading?: Promise<void>

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    this.shadow.innerHTML = TEMPLATE
    const byId = <T extends HTMLElement>(id: string) => this.shadow.getElementById(id) as T
    this.dialog = byId("dialog")
    this.linkField = byId("link")
    this.linkCopy = byId("link-copy")
    this.linkBox = byId("link-box")
    this.embedBox = byId("embed-box")
    this.linkOption = byId("link-option")
    this.embedOption = byId("embed-option")
    this.freeze = byId("freeze")
    this.embedMarkup = byId("embed-markup")
    this.embedCopy = byId("embed-copy")
    this.noteElement = byId("note")
    byId("close").addEventListener("click", () => this.close())
    // A press on the dimmed page around the card, which the dialog itself receives, closes it.
    this.dialog.addEventListener("click", event => {
      if (event.target === this.dialog) this.close()
    })
    this.linkOption.addEventListener("click", () => this.show("link"))
    this.embedOption.addEventListener("click", () => this.show("embed"))
    this.freeze.addEventListener("change", () => this.refresh())
    this.linkCopy.addEventListener("click", () => void this.copy(this.linkField.value, this.linkField, this.linkCopy))
    this.embedCopy.addEventListener("click", () => void this.copy(this.codeEditor?.text ?? this.embedMarkup.value, this.embedMarkup, this.embedCopy))
    this.applyMessages()
  }

  /**
   * Speaks `language`: its holder's, decided once by the holder for everything it says.
   *
   * @return What it says in it, for the holder's own button that opens it (an editor's), or undefined when a later language superseded it.
   */
  async useLanguage(language: UfoLanguage): Promise<ShareMessages | undefined> {
    const token = ++this.languageToken
    const messages = language === "en" ? shareMessages_en : await loadShareMessages(language)
    if (token !== this.languageToken) return undefined
    this.messages = messages
    this.applyMessages()
    return messages
  }

  /** Said above what is given, for what the holder knows the reader should (an editor's unsaved changes); undefined says nothing. */
  set note(note: string | undefined) {
    this.noteElement.textContent = note ?? ""
    this.noteElement.hidden = note === undefined
  }

  get isOpen(): boolean {
    return this.dialog.open || this.dialog.hasAttribute("open")
  }

  /** Opens on the link, the one most readers want. */
  open(): void {
    this.refresh()
    this.show("link")
    if (typeof this.dialog.showModal === "function") this.dialog.showModal()
    else this.dialog.setAttribute("open", "")
    this.fitLink()
    this.linkField.select()
  }

  close(): void {
    if (typeof this.dialog.close === "function") this.dialog.close()
    else this.dialog.removeAttribute("open")
  }

  /** Writes again what is given, from the subject as it is now. */
  refresh(): void {
    const subject = this.subject
    if (!subject) return
    const frozen = this.freeze.checked
    this.linkField.value = frozen ? EmbedScript.frozenLink(subject.link(), __APP_VERSION__) : subject.link()
    this.fitLink()
    const script = frozen ? EmbedScript.frozen(subject.module, __APP_VERSION__) : EmbedScript.current(subject.module, import.meta.url, AppLocation.home())
    const markup = `<script type="module" src="${script}"></script>\n${subject.element()}`
    this.embedMarkup.value = markup
    if (this.codeEditor) this.codeEditor.text = markup
  }

  private applyMessages(): void {
    const m = this.messages
    const text = (id: string, value: string) => { this.shadow.getElementById(id)!.textContent = value }
    text("title", m.share)
    text("link-label", m.link)
    text("embed-label", m.embed)
    text("link-copy", m.copy)
    text("embed-copy", m.copy)
    text("freeze-label", m.freeze.replace("{version}", __APP_VERSION__))
    this.freeze.parentElement!.title = m.freezeHint
    this.shadow.getElementById("close")!.setAttribute("aria-label", m.close)
    this.linkField.setAttribute("aria-label", m.link)
  }

  /** What the dialog gives: the link, or the code — the same options above either, so only what is below them changes. */
  private show(view: "link" | "embed"): void {
    this.linkBox.hidden = view !== "link"
    this.embedBox.hidden = view !== "embed"
    this.linkOption.setAttribute("aria-pressed", String(view === "link"))
    this.embedOption.setAttribute("aria-pressed", String(view === "embed"))
    if (view === "embed") this.loadCodeEditor()
    else this.fitLink()
  }

  /** The link wraps, so its field is as tall as the link is long. */
  private fitLink(): void {
    this.linkField.style.height = "auto"
    this.linkField.style.height = `${this.linkField.scrollHeight}px`
  }

  /**
   * Swaps the embed view's textarea for an editor that wraps and highlights, the first time that view is shown. Its chunk
   * (CodeMirror) is fetched then and not before, so an element nobody shares from never loads it; the textarea stands in meanwhile,
   * and stays if the chunk cannot load.
   */
  private loadCodeEditor(): void {
    this.codeLoading ??= import("./ShareCodeEditor.js").then(({ ShareCodeEditor }) => {
      this.codeEditor = new ShareCodeEditor(this.shadow.getElementById("embed-code")!, this.embedMarkup.value,
        text => { this.embedMarkup.value = text }, this.messages.embed)
      this.embedMarkup.hidden = true
    }).catch(() => { this.codeLoading = undefined })
  }

  /** Clipboard write can be refused (permissions, insecure context): falls back to selecting the text so the reader can copy it
   * themselves, rather than failing silently. */
  private async copy(text: string, field: HTMLTextAreaElement, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      button.textContent = this.messages.copied
      window.setTimeout(() => (button.textContent = this.messages.copy), 1500)
    } catch {
      field.select()
    }
  }
}
