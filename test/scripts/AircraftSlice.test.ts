import { gzipSync, gunzipSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { AircraftSlice } from "../../scripts/AircraftSlice.js"

/** A pack of three tiles, each one gzip member, and the offsets that say where. */
function pack() {
  const members: Record<string, Buffer> = { "48_2": gzipSync("paris"), "48_3": gzipSync("east"), "10_10": gzipSync("far") }
  const offsets: Record<string, [number, number]> = {}
  let at = 0
  const parts: Buffer[] = []
  for (const [key, member] of Object.entries(members)) {
    offsets[key] = [at, member.length]
    at += member.length
    parts.push(member)
  }
  return { bytes: Buffer.concat(parts), offsets }
}

describe("AircraftSlice", () => {
  it("keeps the tiles asked for, each as it was, with offsets that point at them in the new pack", () => {
    const { bytes, offsets } = pack()
    const slice = AircraftSlice.of(bytes, offsets, ["48_3", "48_2"])
    expect(Object.keys(slice.offsets).sort()).toEqual(["48_2", "48_3"])
    const read = (key: string) => {
      const [offset, length] = slice.offsets[key]
      return gunzipSync(slice.bytes.subarray(offset, offset + length)).toString()
    }
    expect(read("48_2")).toBe("paris")
    expect(read("48_3")).toBe("east")
  })

  it("leaves out a tile the pack does not have, and every one that was not asked for", () => {
    const { bytes, offsets } = pack()
    const slice = AircraftSlice.of(bytes, offsets, ["48_2", "0_0"])
    expect(Object.keys(slice.offsets)).toEqual(["48_2"])
    expect(slice.bytes.length).toBe(offsets["48_2"][1])
  })

  it("is empty when nothing is asked for", () => {
    const { bytes, offsets } = pack()
    expect(AircraftSlice.of(bytes, offsets, []).bytes.length).toBe(0)
  })
})
