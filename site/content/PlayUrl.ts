/**
 * What the Player page's address asks of the player, as the attributes of the `<rr0-sighting>` it holds.
 *
 * The page script that does it is written out here once, as the page carries it (the same text is what the tests run), so that what a link says and
 * what the element is given cannot drift apart. An attribute is set only for what the address says: a link that says nothing of the map leaves the
 * map as it is by default, and one that says `labels=0` is the only one that turns the chips off.
 *
 * - `d=` a LENGTH of time from the start of the observation, as durations are said: `d=90`, `d=1:30`, `d=1m30s`, `d=PT1M30S` (attribute `start-time`);
 * - `t=` a TIME said during the observation, `t=02:33:15` or with its day `t=2026-08-11T02:33:15` (attribute `start-clock`), which the recording
 *   places once it is loaded. `t=125`, which links shared before the two were told apart say, is still a number of seconds from the start; a
 *   `d=` beside it wins over that;
 * - `observer=` which recording of a case opens first;
 * - `labels=0` hides the summary chips, `map=1` opens the observer map, `moments=0` hides the named moments, `compare=1` sets the account beside
 *   the interpretation.
 *
 * Whether a value is a length or a time of day that can be read is the element's to say (see PlaybackPosition): this only tells a time of day
 * from a length by its shape, to put it in the right attribute, and passes the text on as it was written.
 */
export class PlayUrl {

  /** The page script's `playAttributes(search)`: the `[name, value]` pairs to set on the player, from the address's query string. */
  static readonly SCRIPT = `const playAttributes = search => {
  const params = new URLSearchParams(search)
  const said = name => (params.get(name) ?? "").trim()
  const attributes = []
  const length = said("d")
  const time = said("t")
  if (length !== "") attributes.push(["start-time", length])
  // A time of day (hours and minutes, with its day perhaps) is not a length: t=02:33 and t=2026-08-11T02:33:15. A bare number is the seconds links
  // shared before the two were told apart say, and an explicit d= outranks it.
  if (time !== "") {
    if (/^(\\d{4}-\\d{2}-\\d{2}[T ])?T?\\d{1,2}:\\d{2}(:\\d{2}([.,]\\d+)?)?$/.test(time)) attributes.push(["start-clock", time])
    else if (length === "") attributes.push(["start-time", time])
  }
  // The chips are on unless told off; the others are off unless asked.
  if (params.get("labels") !== "0") attributes.push(["show-labels", ""])
  if (params.get("map") === "1") attributes.push(["show-observer-map", ""])
  if (params.get("moments") === "0") attributes.push(["hide-milestones", ""])
  if (params.get("compare") === "1") attributes.push(["compare-account", ""])
  const observer = said("observer")
  if (observer !== "") attributes.push(["observer", observer])
  return attributes
}`
}
