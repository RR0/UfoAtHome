/**
 * Ingestion step (not part of `build`/`prepublishOnly`) that turns one day of ADSB.lol's open
 * historical data into an archive of the aircraft that were in the sky, indexed by day, hour and
 * place, so that a scene can fetch the traffic around any observer for the hour of any recording,
 * from static files and without a key.
 *
 * Run with: npm run build:aircraft [--out dir] [--step seconds] <release parts...>
 * (default parts: every scripts/data/adsb/*.tar.* file; default out: scripts/data/adsb/out)
 *
 * SOURCE: a daily release of https://github.com/adsblol/globe_history_YYYY, e.g.
 * v2025.12.30-planes-readsb-prod-0.tar.aa + .ab (3.2 GB), ODbL 1.0. It is a plain tar (split in
 * parts of 2 GB, which are read here as one stream) holding one `traces/<xx>/trace_full_<icao>.json`
 * per aircraft: a gzip-compressed JSON object with the aircraft's registration and type, a
 * `timestamp` (seconds, UTC, midnight of the day) and `trace`, an array of
 * [seconds since timestamp, lat, lng, baro altitude ft | "ground", ground speed kt, track °, ...].
 * The positions come every 2 to 8 s, from the feeders' receivers.
 *
 * OUTPUT, for each hour that has traffic:
 *   <out>/<YYYY-MM-DD>/<HH>.pack   independent gzip members, one per 1° tile, back to back
 *   <out>/<YYYY-MM-DD>/<HH>.json   { "<floor lat>_<floor lng>": [offset, length] } into the pack
 * so a tile is ONE ranged request on a static host, whose three or nine neighbours cover 150 km. One
 * file per tile and hour would be some eighty thousand files a day; this is 24.
 *   <out>/<YYYY-MM-DD>/aircraft/<xx>.json   { "<icao hex>": [registration, type] }, sharded by the
 * first two hex digits, fetched only for the aircraft a scene decides to show.
 *   <out>/index.json   the days held, merged from one run to the next.
 *
 * A tile, once gunzipped, is a series of 20-byte little-endian records, sorted by aircraft then time:
 *   u32 icao   the 24-bit address; bit 24 set for a non-ICAO address (the source's "~" ones)
 *   u16 dt     deciseconds since the start of the hour (0 to 35999)
 *   i32 lat    1e-5 degrees
 *   i32 lng    1e-5 degrees
 *   i16 alt    barometric altitude in units of 25 ft
 *   u16 gs     ground speed, 0.1 kt; 0xFFFF when unknown
 *   u16 track  0.1 degree; 0xFFFF when unknown
 * Positions on the ground are dropped (nothing parked is mistaken for the sky), and an aircraft is
 * thinned to one position every --step seconds (default 5): an airliner's path is smooth at that
 * rate, and it halves the archive. On the day measured (2025-12-30, one instance): 61 thousand
 * aircraft, 47 million positions, 6.7 thousand tiles, about 570 MB for the world.
 *
 * WHAT IS NOT KEPT: the receivers' coverage is not the sky. Aircraft that do not broadcast ADS-B or
 * are out of range of every feeder are not in it, so an aircraft's absence says nothing. The whole
 * day is held in memory (a gigabyte or so) because the tar is ordered by aircraft, not by place.
 */
import { readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { AircraftArchiveBuild } from "./AircraftArchiveBuild.js"

class AircraftArchiveCommand {
  private static readonly DATA = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "scripts", "data", "adsb")

  /** Reads `--out` and `--step`; what remains are the release parts (by default, those found in scripts/data/adsb). */
  static async main(args: string[]): Promise<void> {
    const option = (name: string, fallback: string): string => {
      const at = args.indexOf(name)
      return at < 0 ? fallback : args.splice(at, 2)[1]
    }
    const out = option("--out", path.join(AircraftArchiveCommand.DATA, "out"))
    const step = Number(option("--step", "5"))
    const parts = args.length > 0 ? args : readdirSync(AircraftArchiveCommand.DATA)
      .filter(name => /\.tar(\.[a-z]+)?$/.test(name)).sort().map(name => path.join(AircraftArchiveCommand.DATA, name))
    await new AircraftArchiveBuild(out, step).run(parts)
  }
}

await AircraftArchiveCommand.main(process.argv.slice(2))
