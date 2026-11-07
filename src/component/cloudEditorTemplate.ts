import { Messages } from "../i18n/MessageCatalog.js"
import type { CloudEditorMessages } from "./messages/CloudEditorMessages.js"


type Key = keyof CloudEditorMessages

/**
 * Cloud controls live inside the weather panel; all numbers are recording data.
 *
 * Every text carries the key it was written from (`data-text`, `data-placeholder`), so that the
 * reader's own language, which arrives after the controls are up and wired, can be put in place
 * without rebuilding them (see localize).
 */
export class CloudEditorTemplate {

  /** The controls, with no word yet: each text is put in by localize, in the reader's language. */
  static html(): string {
    const m = Messages.none<CloudEditorMessages>()
    const t = (key: Key) => `<span data-text="${key}">${m[key]}</span>`
    return `<div class="cloud-panel">
    <p data-text="intro">${m.intro}</p>
    <div class="cloud-fields">
    <label>${t("editScope")}<select id="cloud-scope"><option value="instant" data-text="scopeInstant">${m.scopeInstant}</option><option value="observation" data-text="scopeObservation">${m.scopeObservation}</option></select></label>
    <div id="cloud-layer-list" class="cloud-list"></div>
    <div id="cloud-layer-parameters" class="cloud-parameters"></div>
    </div>
    <p data-text="editHelp">${m.editHelp}</p>
    <details><summary data-text="individualClouds">${m.individualClouds}</summary><div class="cloud-fields">
    <div id="cloud-instance-list" class="cloud-list"></div>
    <label><input id="cloud-manipulate" type="checkbox">${t("manipulate")}</label>
    <div id="cloud-instance-parameters" class="cloud-parameters"></div>
    </div><p data-text="individualHelp">${m.individualHelp}</p></details>
    <p id="cloud-status" role="status"></p></div>`
  }

  /** Puts `messages` in place of the texts the controls under `root` were built with. */
  static localize(root: ParentNode, messages: CloudEditorMessages): void {
    for (const element of root.querySelectorAll<HTMLElement>("[data-text]")) {
      element.textContent = messages[element.dataset.text as Key]
    }
  }
}
