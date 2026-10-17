import type { ObserverProvider, ObserverSetting, ObserverSettings, ObserverSettingValue } from "../engine/observer/ObserverProvider.js"
import { NumberFields } from "./NumberFields.js"

export const PROVIDER_SETTINGS_ELEMENT_NAME = "rr0-provider-settings"

/** What this element needs of a provider: nothing about what it does to a picture. */
export type SettingsProvider = Pick<ObserverProvider, "id" | "label" | "hint" | "settings">

const STYLE = `
rr0-provider-settings { display: block; }
rr0-provider-settings .ps-provider { margin: .3em 0; }
rr0-provider-settings .ps-heading { font-weight: 600; margin-right: .6em; }
rr0-provider-settings .ps-setting { display: inline-flex; align-items: center; gap: .3em; margin-right: .8em; }
`

/**
 * The settings of any list of providers, drawn from their descriptors alone — a heading per
 * provider and, for each setting, a select (a choice) or a number field with its unit after it.
 * Nothing about colour vision or alcohol is known here, so a provider added to the list shows up
 * with no change to this element or to the editor that hosts it.
 *
 * `labels` is the language: it is asked for `<provider>`, `<provider>.hint`, `<provider>.<setting>`
 * and `<provider>.<setting>.<choice>`, and a key it lacks falls back to the descriptor's English.
 * `values` is what is shown and what a person has set, by provider id then setting id; it tells
 * nobody when set, and a `settingschange` (bubbling; the native `change` of a select reaches the host as well, which is why this one has a name of its own) tells the host when a person edits.
 */
export class ProviderSettingsElement extends HTMLElement {
  private list: readonly SettingsProvider[] = []
  private words: Readonly<Record<string, string>> = {}
  private shown: Record<string, ObserverSettings> = {}

  set providers(providers: readonly SettingsProvider[]) {
    this.list = providers
    this.render()
  }

  set labels(labels: Readonly<Record<string, string>>) {
    this.words = labels
    this.render()
  }

  get values(): Record<string, ObserverSettings> {
    return this.shown
  }

  set values(values: Record<string, ObserverSettings>) {
    this.shown = structuredClone(values)
    this.render()
  }

  connectedCallback(): void {
    this.render()
  }

  private word(key: string, fallback: string): string {
    return this.words[key] ?? fallback
  }

  private current(provider: SettingsProvider, setting: ObserverSetting): ObserverSettingValue {
    return this.shown[provider.id]?.[setting.id] ?? setting.default
  }

  private edit(provider: SettingsProvider, setting: ObserverSetting, value: ObserverSettingValue | undefined): void {
    const values = { ...(this.shown[provider.id] ?? {}) }
    if (value === undefined) delete values[setting.id]
    else values[setting.id] = value
    this.shown = { ...this.shown, [provider.id]: values }
    this.dispatchEvent(new Event("settingschange", { bubbles: true }))
  }

  private render(): void {
    if (!this.isConnected && this.list.length === 0) return
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const blocks = this.list.map(provider => {
      const block = doc.createElement("div")
      block.className = "ps-provider"
      block.dataset.provider = provider.id
      const heading = doc.createElement("span")
      heading.className = "ps-heading"
      heading.textContent = this.word(provider.id, provider.label)
      heading.title = this.word(`${provider.id}.hint`, provider.hint)
      block.append(heading, ...provider.settings.map(setting => this.control(provider, setting)))
      return block
    })
    this.replaceChildren(style, ...blocks)
    NumberFields.fit(this)
  }

  private control(provider: SettingsProvider, setting: ObserverSetting): HTMLElement {
    const doc = this.ownerDocument
    const label = doc.createElement("label")
    label.className = "ps-setting"
    const name = doc.createElement("span")
    name.textContent = this.word(`${provider.id}.${setting.id}`, setting.label)
    label.append(name)
    const key = `${provider.id}-${setting.id}`
    if (setting.kind === "choice") {
      const select = doc.createElement("select")
      select.id = key
      for (const choice of setting.choices ?? []) {
        const option = doc.createElement("option")
        option.value = choice.id
        option.textContent = this.word(`${provider.id}.${setting.id}.${choice.id}`, choice.label)
        select.append(option)
      }
      select.value = String(this.current(provider, setting))
      select.addEventListener("change", () => this.edit(provider, setting, select.value))
      label.append(select)
    } else {
      const input = doc.createElement("input")
      input.id = key
      input.type = "number"
      if (setting.min !== undefined) input.min = String(setting.min)
      if (setting.max !== undefined) input.max = String(setting.max)
      if (setting.step !== undefined) input.step = String(setting.step)
      input.value = String(this.current(provider, setting))
      input.addEventListener("input", () => {
        const value = input.value.trim() === "" ? undefined : Number(input.value)
        this.edit(provider, setting, Number.isFinite(value) ? value : undefined)
      })
      label.append(input)
      if (setting.unit) label.append(doc.createTextNode(` ${setting.unit}`))
    }
    return label
  }
}

export function register(): void {
  if (!customElements.get(PROVIDER_SETTINGS_ELEMENT_NAME)) customElements.define(PROVIDER_SETTINGS_ELEMENT_NAME, ProviderSettingsElement)
}
