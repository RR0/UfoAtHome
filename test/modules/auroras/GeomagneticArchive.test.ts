import { describe, expect, test } from "vitest"
import { GeomagneticArchive } from "../../../src/engine/astronomy/GeomagneticArchive.js"

describe("GeomagneticArchive", () => {
  const year = (year: number, stepHours: number, values: number[]) => ({ year, stepHours, values })
  const archive = (files: Record<number, unknown>) => {
    const asked: string[] = []
    const fetchImpl = (async (url: string) => {
      asked.push(url)
      const file = files[Number(url.match(/(\d{4})\.json/)![1])]
      return { ok: file !== undefined, json: async () => file } as Response
    }) as typeof fetch
    return { archive: new GeomagneticArchive({ fetchImpl, baseUrls: ["https://example.org/kp/"] }), asked }
  }

  test("gives the hourly Hp60 of a recording's night, each at the middle of its hour, from the hour before", async () => {
    const values = new Array<number>(8784).fill(-1)
    const start = Date.UTC(2024, 4, 10, 21, 30)
    const hour = Math.floor((start - Date.UTC(2024, 0, 1)) / 3_600_000)
    values[hour - 1] = 27
    values[hour] = 28
    values[hour + 1] = 32
    const { archive: a } = archive({ 2024: year(2024, 1, values) })
    const keys = await a.between(start, start + 600_000)
    expect(keys!.map(key => key.kp)).toEqual([9, 28 / 3, 32 / 3])
    expect(keys![1].t).toBe(Date.UTC(2024, 4, 10, 21, 30))
  })

  test("reads Kp every three hours before 1985", async () => {
    const values = new Array<number>(2920).fill(-1)
    const start = Date.UTC(1938, 0, 25, 19)
    const step = Math.floor((start - Date.UTC(1938, 0, 1)) / 10_800_000)
    values[step] = 25
    const { archive: a } = archive({ 1938: year(1938, 3, values) })
    const keys = await a.between(start, start + 600_000)
    expect(keys).toEqual([{ t: Date.UTC(1938, 0, 25, 19, 30), kp: 25 / 3 }])
  })

  test("asks nothing before 1932, and says so rather than a quiet field when it cannot be reached", async () => {
    const { archive: a, asked } = archive({})
    expect(await a.between(Date.UTC(1920, 0, 1), Date.UTC(1920, 0, 2))).toBeUndefined()
    expect(asked).toEqual([])
    expect(await a.between(Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2))).toBeUndefined()
  })

  test("makes the aurora of a recording from it, its instants the recording's", () => {
    expect(GeomagneticArchive.asAurora([{ t: 5000, kp: 4 }], 1000)).toEqual({ id: GeomagneticArchive.AURORA_ID, activity: [{ t: 4000, kp: 4 }] })
  })
})
