import { ModuleRegistry } from "../../../ModuleRegistry.js"
import type { DataSource } from "../../../../engine/source/DataSource.js"
import type { MessageCatalog } from "../../../../i18n/MessageCatalog.js"
import type { ReentryTemplate, ReentryType, ReentryTypeMessages } from "./ReentryType.js"
import { REENTRY_TYPE_NAMES } from "./messages/ReentryTypeNames.js"
import type { ReentryTypeNames } from "./messages/ReentryTypeNames.js"

/** The name of a built-in type, from the catalog of their names. */
const named = (key: keyof ReentryTypeNames): MessageCatalog<ReentryTypeMessages> => ({
  load: language => REENTRY_TYPE_NAMES.load(language).then(names => ({ name: names[key] }))
})

const builtIn = (key: string, name: keyof ReentryTypeNames, nature: ReentryType["nature"], template: ReentryTemplate): DataSource<ReentryType> => ({
  id: key,
  name: key,
  credit: "UFO@home",
  creditUrl: "https://ufoathome.org/docs/format/",
  create: () => ({ key, nature, messages: named(name), template })
})

/**
 * Every type of re-entry an author picks from (see ReentryType), in the order they are offered. A module's come after these. A
 * `DataSource` whose `id` is the type's key.
 *
 * What a new one is (ReentryTemplate) is an order of magnitude of its type, to be replaced by what the sources establish: a meteor enters
 * at 11 to 72 km/s and burns out in a second or so above 80 km; a fireball, brighter than Venus, lasts a few seconds and goes deeper; what
 * was in orbit comes in at some 7.5 km/s and is seen for a minute or more, between 80 and 60 km, a satellite or a rocket stage breaking up
 * into a train of pieces (Zond IV's stage, Starlink satellites), a capsule, made to survive, burning as one bright head.
 */
export const REENTRY_TYPE_SOURCES: DataSource<ReentryType>[] = ModuleRegistry.point("reentryTypes").provide(ModuleRegistry.BUILT_IN, [
  builtIn("meteor", "meteor", "natural", {
    distanceKm: 150, speedKmS: 40, durationS: 1, fromAltitudeKm: 100, toAltitudeKm: 85,
    fragments: [{ id: "main", absoluteMagnitude: 0, trainS: 0.3, sheds: [] }]
  }),
  builtIn("fireball", "fireball", "natural", {
    distanceKm: 150, speedKmS: 30, durationS: 3, fromAltitudeKm: 100, toAltitudeKm: 60,
    fragments: [{ id: "main", absoluteMagnitude: -6 }]
  }),
  builtIn("satellite", "satellite", "artificial", {
    distanceKm: 300, speedKmS: 7.5, durationS: 60, fromAltitudeKm: 82, toAltitudeKm: 72,
    fragments: [{ id: "main", absoluteMagnitude: -3 }, { id: "piece-2", lagS: 2, absoluteMagnitude: -1.5 }]
  }),
  builtIn("rocket-stage", "rocketStage", "artificial", {
    distanceKm: 300, speedKmS: 7.5, durationS: 60, fromAltitudeKm: 82, toAltitudeKm: 72,
    fragments: [{ id: "main", absoluteMagnitude: -4 }, { id: "piece-2", lagS: 1.5, absoluteMagnitude: -2.5 }, { id: "piece-3", lagS: 3, absoluteMagnitude: -1.5 }]
  }),
  builtIn("capsule", "capsule", "artificial", {
    distanceKm: 300, speedKmS: 7.5, durationS: 40, fromAltitudeKm: 80, toAltitudeKm: 55,
    fragments: [{ id: "main", absoluteMagnitude: -5, sheds: [] }]
  })
])
