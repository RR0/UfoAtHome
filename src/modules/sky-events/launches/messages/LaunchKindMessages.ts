import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the launches are called, and what the scene's tooltip says of a puff of a plume (see LAUNCH_KIND). */
export interface LaunchKindMessages {
  /** The editor's part. */
  title: string
  /** What a launch with no title or mission is called. */
  name: string
  /** The tooltip's detail: {name}, {part}, {distance}, {height} (km). */
  detail: string
  /** The part: the ascent's exhaust. */
  ascent: string
  /** The part: an engine burn's exhaust. */
  burn: string
  /** The part: vented propellant. */
  vent: string
}

/** One chunk per language (see MessageCatalog). */
export const LAUNCH_KIND_MESSAGES = Messages.catalog<LaunchKindMessages>({
  en: () => import("./LaunchKindMessages_en.js").then(m => m.launchKindMessages_en),
  fr: () => import("./LaunchKindMessages_fr.js").then(m => m.launchKindMessages_fr),
  es: () => import("./LaunchKindMessages_es.js").then(m => m.launchKindMessages_es),
  it: () => import("./LaunchKindMessages_it.js").then(m => m.launchKindMessages_it)
})
