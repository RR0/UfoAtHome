/**
 * One interchangeable source of real-world data the editor can be pointed at — a geocoder, a
 * weather record, an elevation or imagery tileset.
 *
 * This is what the credits became. Naming who the data comes from and letting it be chosen are the
 * same act: a static "© OpenStreetMap" tucked beside a field says where today's answer came from
 * but hides that it is a choice, and a picker with no attribution credits nobody. One control does
 * both — the option names the source, the link beside it carries the attribution its licence
 * requires. Registries stay one-entry until a second implementation exists (see placeSources.ts and
 * weatherSources.ts, both single today), which is the point: the seam is visible before it is used.
 */
export interface DataSource<T> {
  /** Stable id — what a stored preference or a URL parameter would name. */
  id: string
  /** Short name for the picker: the service, not its licence ("Nominatim", "Open-Meteo"). */
  name: string
  /** The attribution its licence requires, shown verbatim beside the picker. */
  credit: string
  /** Where that attribution points — the licence or the service's own terms. */
  creditUrl: string
  /** Built on demand, so choosing a source that is never used costs nothing. */
  create(): T
}

/** Looks a source up by id, falling back to the registry's first entry — the default everywhere,
 * and what an unknown id (an old preference, a hand-edited URL) resolves to rather than nothing. */
export function dataSourceById<T>(sources: DataSource<T>[], id: string | undefined): DataSource<T> {
  return sources.find(source => source.id === id) ?? sources[0]
}
