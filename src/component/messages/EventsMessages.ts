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
  /** The list's buttons: add an event, remove the picked one; and what it says with none. */
  add: string
  remove: string
  none: string
  /** The button that gives the observer the events' poses again. */
  resetToEvents: string
  /** The kinds of event, by their eventType. */
  kinds: Record<string, string>
  /** The parameters, by their key. */
  params: Record<string, string>
  /** "from … to …", around the event's times. */
  from: string
  to: string
  /** How many points a path has: "{n} points". */
  points: string
  /** A speed or a divisor row's instant. */
  at: string
  /** What a value's basis is called (see Basis). */
  basis: Record<"stated" | "derived" | "assumed" | "measured", string>
}
