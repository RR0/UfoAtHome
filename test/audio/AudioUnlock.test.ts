import { describe, expect, it } from "vitest"
import { AudioUnlock } from "../../src/audio/AudioUnlock.js"

/** A context as far as the unlock touches it. */
function fakeContext(state: string) {
  const log: string[] = []
  const context = {
    state,
    destination: {},
    resume: () => { log.push("resume"); return Promise.resolve() },
    createBuffer: () => ({}),
    createBufferSource: () => ({ connect: () => log.push("connect"), start: () => log.push("start"), buffer: undefined })
  }
  return { context: context as unknown as AudioContext, log }
}

describe("AudioUnlock", () => {
  it("resumes a suspended context and starts a silent source in the same gesture, as iOS requires", () => {
    const { context, log } = fakeContext("suspended")
    AudioUnlock.unlock(context)
    expect(log).toEqual(["resume", "connect", "start"])
  })

  it("does the same for an interrupted one, which iOS leaves a page's sound in after a call", () => {
    const { context, log } = fakeContext("interrupted")
    AudioUnlock.unlock(context)
    expect(log).toContain("resume")
  })

  it("leaves a running context alone", () => {
    const { context, log } = fakeContext("running")
    AudioUnlock.unlock(context)
    expect(log).toEqual([])
  })

  it("never throws for a context that cannot do any of it", () => {
    expect(() => AudioUnlock.unlock({ state: "suspended" } as unknown as AudioContext)).not.toThrow()
  })
})
