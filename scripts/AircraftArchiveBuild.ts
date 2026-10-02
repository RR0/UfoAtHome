/** See build-aircraft-archive.ts, the command that runs this, for what is read and written. */
import { existsSync, mkdirSync, readFileSync, createReadStream, writeFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"
import { AircraftTile } from "../src/engine/astronomy/AircraftTile.js"
import { AircraftTileWriter } from "./AircraftTileWriter.js"
import { ByteStream, TarReader } from "./TarReader.js"

export class AircraftArchiveBuild {
  private static readonly TRACE = /(?:^|\/)traces\/[0-9a-f]{2}\/trace_full_(~?[0-9a-f]+)\.json$/
  private static readonly LICENSE = "ODbL 1.0"
  private static readonly CREDIT = "adsb.lol feeders and contributors (ODbL 1.0)"

  /** [day][hour][tile "lat_lng"] → records. */
  private readonly tiles = new Map<string, Map<number, Map<string, AircraftTileWriter>>>()
  /** [day][shard] → aircraft descriptions, for the aircraft that have at least one position kept. */
  private readonly aircraft = new Map<string, Map<string, Record<string, [string, string]>>>()

  /** `source` names the instance the release comes from (e.g. readsb-prod-0); the index records it for each day written. */
  constructor(private readonly out: string, private readonly step: number, private readonly source?: string) {}

  async run(parts: string[]): Promise<void> {
    const reader = new TarReader(new ByteStream(this.chunksOf(parts)))
    let traces = 0
    let read = 0
    let kept = 0
    for await (const entry of reader.entries()) {
      const match = AircraftArchiveBuild.TRACE.exec(entry.name)
      if (!match) {
        await entry.skip()
        continue
      }
      traces++
      const data = await entry.read()
      const json = JSON.parse((data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data) : data).toString("utf8"))
      const counts = this.addTrace(match[1], json)
      read += counts.read
      kept += counts.kept
      if (traces % 10000 === 0) console.log(`${traces} aircraft, ${read} positions, ${kept} kept`)
    }
    if (traces === 0) throw new Error("No aircraft trace found: not an ADSB.lol history release?")
    const days = this.write()
    console.log(`${this.out}: ${traces} aircraft, ${read} positions of which ${kept} kept, days ${days.join(", ")}`)
  }

  /** The parts, in order, as one stream of chunks. */
  private async *chunksOf(parts: string[]): AsyncGenerator<Buffer> {
    for (const part of parts) {
      for await (const chunk of createReadStream(part, { highWaterMark: 1 << 20 })) yield chunk as Buffer
    }
  }

  /** Files one aircraft's day into the tiles its positions fall in. */
  private addTrace(hex: string, json: { r?: string; t?: string; timestamp: number; trace: any[][] }): { read: number; kept: number } {
    const nonIcao = hex.startsWith("~")
    const icao = parseInt(nonIcao ? hex.slice(1) : hex, 16) | (nonIcao ? AircraftTile.NON_ICAO_FLAG : 0)
    // A release holds a day: the few positions its traces carry past midnight are the next release's
    // to give. Keeping them would make a day's hours depend on the order the releases are ingested in
    // (the next day's own first hour, if ingested before, would be overwritten by their few points).
    const ownDay = Math.floor(json.timestamp / 86400)
    let last = -Infinity
    let kept = 0
    for (const point of json.trace) {
      const [seconds, lat, lng, altitude, speed, track] = point
      if (typeof altitude !== "number" || typeof lat !== "number" || typeof lng !== "number") continue
      const at = json.timestamp + seconds
      if (Math.floor(at / 86400) !== ownDay) continue
      if (at - last < this.step) continue
      last = at
      kept++
      const hour = Math.floor(at / 3600)
      const day = new Date(hour * 3600000).toISOString().slice(0, 10)
      const key = `${Math.floor(lat)}_${Math.floor(lng)}`
      this.tileOf(day, hour % 24, key).append(
        icao >>> 0,
        Math.min(AircraftTile.MAX_DT, Math.round((at - hour * 3600) * 10)),
        Math.round(lat * 1e5),
        Math.round(lng * 1e5),
        Math.max(-32768, Math.min(32767, Math.round(altitude / 25))),
        typeof speed === "number" ? Math.min(0xfffe, Math.round(speed * 10)) : AircraftTile.UNKNOWN,
        typeof track === "number" ? Math.round(((track % 360) + 360) % 360 * 10) : AircraftTile.UNKNOWN
      )
      this.noteAircraft(day, hex, json)
    }
    return { read: json.trace.length, kept }
  }

  private tileOf(day: string, hour: number, key: string): AircraftTileWriter {
    let hours = this.tiles.get(day)
    if (!hours) this.tiles.set(day, hours = new Map())
    let tiles = hours.get(hour)
    if (!tiles) hours.set(hour, tiles = new Map())
    let tile = tiles.get(key)
    if (!tile) tiles.set(key, tile = new AircraftTileWriter())
    return tile
  }

  private noteAircraft(day: string, hex: string, json: { r?: string; t?: string }): void {
    let shards = this.aircraft.get(day)
    if (!shards) this.aircraft.set(day, shards = new Map())
    const shard = hex.startsWith("~") ? "non-icao" : hex.slice(0, 2)
    let described = shards.get(shard)
    if (!described) shards.set(shard, described = {})
    described[hex] ??= [json.r ?? "", json.t ?? ""]
  }

  /** Writes the days' packs, indexes and aircraft shards, and merges the days into the root index. */
  private write(): string[] {
    const days = [...this.tiles.keys()].sort()
    for (const day of days) {
      const dayDir = path.join(this.out, day)
      mkdirSync(path.join(dayDir, "aircraft"), { recursive: true })
      for (const [hour, tiles] of this.tiles.get(day)!) {
        const name = String(hour).padStart(2, "0")
        const members: Buffer[] = []
        const index: Record<string, [number, number]> = {}
        let offset = 0
        for (const key of [...tiles.keys()].sort()) {
          const member = gzipSync(tiles.get(key)!.bytes(), { level: 9 })
          index[key] = [offset, member.length]
          members.push(member)
          offset += member.length
        }
        writeFileSync(path.join(dayDir, `${name}.pack`), Buffer.concat(members))
        writeFileSync(path.join(dayDir, `${name}.json`), JSON.stringify(index))
      }
      for (const [shard, described] of this.aircraft.get(day) ?? []) {
        writeFileSync(path.join(dayDir, "aircraft", `${shard}.json`), JSON.stringify(described))
      }
    }
    this.writeRootIndex(days)
    return days
  }

  private writeRootIndex(days: string[]): void {
    const file = path.join(this.out, "index.json")
    const before = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}
    const known: string[] = before.days ?? []
    const all = [...new Set([...known, ...days])].sort()
    const sources: Record<string, string> = { ...before.sources }
    if (this.source) for (const day of days) sources[day] = this.source
    const index = {
      credit: AircraftArchiveBuild.CREDIT,
      license: AircraftArchiveBuild.LICENSE,
      source: "https://github.com/adsblol (globe_history_YYYY releases)",
      stepSeconds: this.step,
      record: "u32 icao (bit 24: non-ICAO), u16 dt (ds from hour start), i32 lat 1e-5, i32 lng 1e-5, i16 alt (25 ft), u16 gs (0.1 kt), u16 track (0.1 deg); little-endian, 0xFFFF unknown",
      from: all[0],
      to: all[all.length - 1],
      days: all,
      sources
    }
    writeFileSync(file, JSON.stringify(index, null, 2) + "\n")
  }
}
