import { describe, expect, it } from "vitest"
import { PlayUrl } from "../../site/content/PlayUrl.js"

/** The code the Player page carries, run as it is: what is tested is what the page does with its address. */
const playAttributes = new Function(`${PlayUrl.SCRIPT}; return playAttributes`)() as (search: string) => [string, string][]
const asked = (search: string) => Object.fromEntries(playAttributes(search))

describe("What the Player page's address asks of the player", () => {
  it("sets only what the address says: the chips by default, and nothing else", () => {
    expect(playAttributes("")).toEqual([["show-labels", ""]])
    expect(playAttributes("?file=Socorro")).toEqual([["show-labels", ""]])
  })

  describe("where the recording opens", () => {
    it("takes d= as a length of time from the start, in the ways durations are said", () => {
      for (const [said, written] of [["90", "90"], ["1:30", "1:30"], ["1m30s", "1m30s"], ["PT1M30S", "PT1M30S"], ["%201m30s%20", "1m30s"]]) {
        expect(asked(`?file=x&d=${said}`)["start-time"], said).toBe(written)
      }
      expect(asked("?d=")["start-time"]).toBeUndefined()
    })

    it("takes a colon as it comes: it is allowed in a query, written or encoded", () => {
      expect(asked("?d=1:02:03")["start-time"]).toBe("1:02:03")
      expect(asked("?d=1%3A02%3A03")["start-time"]).toBe("1:02:03")
    })

    it("takes t= as a time said during the observation, with or without its day", () => {
      expect(asked("?t=02:33")["start-clock"]).toBe("02:33")
      expect(asked("?t=02:33:15")["start-clock"]).toBe("02:33:15")
      expect(asked("?t=2026-08-11T02:33:15")["start-clock"]).toBe("2026-08-11T02:33:15")
      expect(asked("?t=2026-08-11T02%3A33")["start-clock"]).toBe("2026-08-11T02:33")
      expect(asked("?t=T02:33")["start-clock"]).toBe("T02:33")
      // The attribute the time of day is not in: it is not a length.
      expect(asked("?t=02:33")["start-time"]).toBeUndefined()
    })

    it("still reads t=125 as seconds from the start, as links shared before the two were told apart say it, unless d= is there", () => {
      expect(asked("?t=125")["start-time"]).toBe("125")
      expect(asked("?t=125")["start-clock"]).toBeUndefined()
      expect(asked("?t=125&d=30")["start-time"]).toBe("30")
      expect(asked("?t=PT2M")["start-time"]).toBe("PT2M")
    })

    it("can carry both: the time said, and a length for whoever cannot place it", () => {
      expect(asked("?t=02:33&d=90")).toMatchObject({ "start-clock": "02:33", "start-time": "90" })
    })
  })

  it("takes the observer of a case as written, and not an empty one", () => {
    expect(asked("?file=Valensole&observer=ChauffourValerie").observer).toBe("ChauffourValerie")
    expect(asked("?observer=2").observer).toBe("2")
    expect(asked("?observer=").observer).toBeUndefined()
  })

  it("keeps the shared options: chips on unless labels=0, the others off unless asked", () => {
    expect(asked("?labels=0")["show-labels"]).toBeUndefined()
    expect(asked("")["show-observer-map"]).toBeUndefined()
    expect(asked("?map=1")["show-observer-map"]).toBe("")
    expect(asked("?map=0")["show-observer-map"]).toBeUndefined()
    expect(asked("")["hide-milestones"]).toBeUndefined()
    expect(asked("?moments=0")["hide-milestones"]).toBe("")
    expect(asked("?compare=1")["compare-account"]).toBe("")
    expect(asked("?compare=2")["compare-account"]).toBeUndefined()
  })
})
