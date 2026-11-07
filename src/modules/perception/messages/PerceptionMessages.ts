import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of the built-in sources of perception, by the keys the settings element asks: `<provider>`, `<provider>.hint`,
 * `<provider>.<setting>` and `<provider>.<setting>.<choice>` (see ProviderSettingsElement, ObserverProvider.messages).
 */
export type PerceptionMessages = Readonly<Record<string, string>>

/** One chunk per language (see MessageCatalog). */
export const PERCEPTION_MESSAGES = Messages.catalog<PerceptionMessages>({
  en: () => import("./PerceptionMessages_en.js").then(m => m.perceptionMessages_en),
  fr: () => import("./PerceptionMessages_fr.js").then(m => m.perceptionMessages_fr),
  es: () => import("./PerceptionMessages_es.js").then(m => m.perceptionMessages_es),
  it: () => import("./PerceptionMessages_it.js").then(m => m.perceptionMessages_it)
})
