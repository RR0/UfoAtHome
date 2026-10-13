import { describe, expect, it } from "vitest"
import type { DecorObject } from "../../src/engine/model/Decor.js"
import { SceneryDates } from "../../src/component/SceneryDates.js"

const tree = (surveyedOn: string | undefined): DecorObject => ({ id: "t", kind: "tree", eastM: 0, northM: 0, origin: "ign-lidar-topo", surveyedOn })
const byHand = (surveyedOn: string): DecorObject => ({ id: "h", kind: "tree", eastM: 0, northM: 0, surveyedOn })

describe("SceneryDates", () => {
  it("takes the newest day of what surveys brought, never of what the author placed", () => {
    expect(SceneryDates.newestSurvey([tree("2022-10-07"), tree("2025-04-30"), byHand("2026-05-23"), tree(undefined)])).toBe("2025-04-30")
    expect(SceneryDates.newestSurvey([tree(undefined)])).toBeUndefined()
    expect(SceneryDates.newestSurvey([])).toBeUndefined()
  })

  it("takes the latest day an observation can be: its day, else its month's end, else its year's", () => {
    expect(SceneryDates.latestObservationDay({ year: 1981, month: 1, day: 8 })).toBe("1981-01-08")
    expect(SceneryDates.latestObservationDay({ year: 2024, month: 2 })).toBe("2024-02-29")
    expect(SceneryDates.latestObservationDay({ year: 1965 })).toBe("1965-12-31")
    expect(SceneryDates.latestObservationDay({ month: 3 })).toBeUndefined()
    expect(SceneryDates.latestObservationDay(undefined)).toBeUndefined()
  })

  it("is an anachronism only when the survey is after the latest the observation can be", () => {
    expect(SceneryDates.anachronism([tree("2022-10-07")], { year: 1981, month: 1, day: 8 })).toEqual({ survey: "2022-10-07", observation: "1981-01-08" })
    expect(SceneryDates.anachronism([tree("2022-10-07")], { year: 2026, month: 8, day: 11 })).toBeUndefined()
    // An observation of "2022" may be after the flight of October: not said to be before it.
    expect(SceneryDates.anachronism([tree("2022-10-07")], { year: 2022 })).toBeUndefined()
    expect(SceneryDates.anachronism([tree("2022-10-07")], undefined)).toBeUndefined()
  })
})
