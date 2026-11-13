import type { Basis } from "../../engine/persistence/Provenance.js"

/** What the editor's events panel says (see EventsPanel), in one language. */
export interface EventsMessages {
  /** The section's title: the observer's events, the phenomenon's, a body's ({body} its name). */
  title: string
  phenomenonTitle: string
  bodyTitle: string
  /** Under the title, while the poses are the events': what moving the observer by hand does. */
  derivedNote: string
  /** Under the title, once the author wrote poses of their own: they win, until the events are given back. */
  overriddenNote: string
  /** The same, for the phenomenon's events and the account's shapes. */
  derivedShapesNote: string
  overriddenShapesNote: string
  /** The same, for the bodies' events and their keyframes. */
  derivedBodiesNote: string
  overriddenBodiesNote: string
  /** How many parts a look has: "{n} parts". */
  parts: string
  /** What an event of the phenomenon is about: one of its shapes, or a group of them. */
  who: string
  /** What part of a body's model an event is about, its hint, and what none says (the whole body). */
  part: string
  partHint: string
  wholeBody: string
  /** The list's buttons: add an event, remove the picked one; and what it says with none. */
  add: string
  remove: string
  none: string
  /** How to zoom the timeline of the events and scroll it. */
  zoomHint: string
  /** The button that gives the observer the events' poses again. */
  resetToEvents: string
  /** The kinds of event, by their eventType. */
  kinds: Record<string, string>
  /** The parameters, by their key. */
  params: Record<string, string>
  /** What a parameter's short name leaves out (what its parts are, what it is a share of), said in its (?). */
  paramHints: Record<string, string>
  /** The window where what a value stands on is said (see BasisInputElement): its title and its fields. */
  basisTitle: string
  basisField: string
  howField: string
  rationaleField: string
  /** The values the player knows of a parameter, by `key.value` (the empty value: what it is when the file says none). */
  choices: Record<string, string>
  /** Said after a direction straight up. */
  zenith: string
  /** Takes a direction from where the observer looks at the playhead; and what it does. */
  lookedAt: string
  lookedAtHint: string
  /** "from … to …", around the event's times. */
  from: string
  to: string
  /** How many points a path has: "{n} points". */
  points: string
  /** A speed or a divisor row's instant. */
  at: string
  /** A row of a table of instants whose value comes at once, not from the row before; and why one would say so. */
  atOnce: string
  atOnceHint: string
  addRow: string
  removeRow: string
  /** What a value's basis is called (see Basis). */
  basis: Record<Basis, string>
}
