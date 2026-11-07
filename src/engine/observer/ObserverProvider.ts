import type { MessageCatalog } from "../../i18n/MessageCatalog.js"
import type { Perception } from "./Perception.js"

/** What a setting holds: a number, or the id of one of its choices. */
export type ObserverSettingValue = number | string

/** The values a recording states for one provider, by setting id. Only what differs from the
 * setting's default is stored: absent means the default, which is a typical observer. */
export type ObserverSettings = Record<string, ObserverSettingValue>

/** One adjustable setting a provider asks the editor to show. Data, never code: the editor draws
 * any setting from this alone, which is what lets a provider be added without touching it. */
export interface ObserverSetting {
  id: string
  kind: "number" | "choice"
  /** The value that means "nothing special". */
  default: ObserverSettingValue
  /** For a number: its bounds, step and unit (said AFTER the field, as every field here does). */
  min?: number
  max?: number
  step?: number
  unit?: string
  /**
   * For a number: the same value said in another unit, shown after the field as an equivalence ("≈ 0.8 g/L" beside "0.08 %"), which is
   * `factor` times the value, with `digits` decimals.
   */
  also?: { unit: string; factor: number; digits?: number }
  /** For a choice: its ids, each named by the key `<provider>.<id>.<choice>` of the provider's messages. */
  choices?: { id: string }[]
}

/**
 * Something about an observer that bends what they see, and the settings that decide how far.
 *
 * The same principle as ElevationProvider and ImageryProvider: the scene and the editor depend only
 * on this interface, the composition is in ONE file (ObserverProviders), and adding or swapping a
 * source of perception means writing a provider and listing it there. Each provider owns its
 * settings and says where its numbers come from, because a number about a human nobody can look up
 * is an invention, and this project does not state those.
 */
export interface ObserverProvider {
  /** Stable id: what a recording names, and the prefix of this provider's message keys. */
  id: string
  /**
   * Its words in the reader's language (see MessageCatalog), by key: `<id>` its heading, `<id>.hint` what it models and what it does NOT,
   * `<id>.<setting>` each setting and `<id>.<setting>.<choice>` each choice of one.
   */
  messages: MessageCatalog<Readonly<Record<string, string>>>
  /** Where its numbers come from: citations, in the order they are used. */
  sources: string[]
  settings: ObserverSetting[]
  /** What these settings do to the picture. Values missing or out of range are read as the
   * default / clamped: a recording is not trusted to stay in range. */
  perceive(values: ObserverSettings): Perception
}
