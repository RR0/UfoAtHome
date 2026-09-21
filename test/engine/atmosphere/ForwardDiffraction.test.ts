import { describe, expect, it } from "vitest"
import { ForwardDiffraction } from "../../../src/engine/atmosphere/ForwardDiffraction.js"

const degrees = (rad: number) => (rad * 180) / Math.PI
const angleOf = (step: number) => (step / (ForwardDiffraction.STEPS - 1)) * ForwardDiffraction.MAX_ANGLE_RAD

describe("the light a large particle throws just past itself", () => {
  it("has J₁ where the tables put it", () => {
    expect(ForwardDiffraction.bessel1(1)).toBeCloseTo(0.4400506, 6)
    expect(ForwardDiffraction.bessel1(10)).toBeCloseTo(0.0434727, 6)
    expect(ForwardDiffraction.bessel1(3.8317)).toBeCloseTo(0, 4)
    expect(ForwardDiffraction.bessel1(-1)).toBeCloseTo(-0.4400506, 6)
    expect(ForwardDiffraction.airy(0)).toBe(1)
  })

  it("sends a particle's whole diffracted light forward, and none of it twice", () => {
    // ∫ P dΩ over the forward hemisphere, for a cloud droplet.
    let sum = 0
    const steps = 200000
    for (let i = 0; i < steps; i++) {
      const theta = ((i + 0.5) / steps) * (Math.PI / 2)
      sum += ForwardDiffraction.phaseOf(theta, 8, 550) * 2 * Math.PI * Math.sin(theta) * (Math.PI / 2 / steps)
    }
    expect(sum).toBeGreaterThan(0.97)
    expect(sum).toBeLessThan(1.01)
  })

  it("rings a thin cloud's corona red outside blue, near two and a half degrees", () => {
    const profile = ForwardDiffraction.profile(ForwardDiffraction.CLOUD_DROPLETS)
    const firstMinimum = (channel: number) => {
      for (let step = 1; step < ForwardDiffraction.STEPS - 1; step++) {
        const here = profile[step * 3 + channel]
        if (here < profile[(step - 1) * 3 + channel] && here <= profile[(step + 1) * 3 + channel]) return degrees(angleOf(step))
      }
      return Infinity
    }
    const red = firstMinimum(0)
    const blue = firstMinimum(2)
    expect(red).toBeGreaterThan(blue)
    expect(red).toBeGreaterThan(2)
    expect(red).toBeLessThan(3.5)
  })

  it("makes of the haze's mixed sizes a smooth, nearly white glow that falls away over tens of degrees", () => {
    const profile = ForwardDiffraction.profile(ForwardDiffraction.HAZE_COARSE_MODE)
    let previous = Infinity
    for (let step = 0; step < ForwardDiffraction.STEPS; step += 8) {
      const green = profile[step * 3 + 1]
      expect(green).toBeLessThanOrEqual(previous * 1.0001)
      previous = green
    }
    const at5 = Math.round((5 / 30) * (ForwardDiffraction.STEPS - 1))
    const [red, green, blue] = [profile[at5 * 3], profile[at5 * 3 + 1], profile[at5 * 3 + 2]]
    expect(Math.max(red, green, blue) / Math.min(red, green, blue)).toBeLessThan(1.5)
    // Brighter by far at a degree than at twenty.
    const at1 = Math.round((1 / 30) * (ForwardDiffraction.STEPS - 1))
    const at20 = Math.round((20 / 30) * (ForwardDiffraction.STEPS - 1))
    expect(profile[at1 * 3 + 1] / profile[at20 * 3 + 1]).toBeGreaterThan(20)
  })

  it("lights a lux from a full Moon and a hundred thousand from the Sun", () => {
    expect(ForwardDiffraction.illuminanceOf(-26.74)).toBeCloseTo(1.05e5, -4)
    expect(ForwardDiffraction.illuminanceOf(-12.7)).toBeCloseTo(0.256, 2)
  })

  it("draws the most corona through a veil of optical depth one, and none through a deck", () => {
    const at = (tau: number) => ForwardDiffraction.coronaScale(tau)
    expect(at(1)).toBeGreaterThan(at(0.3))
    expect(at(1)).toBeGreaterThan(at(3))
    expect(at(20)).toBeLessThan(at(1) / 1000)
    expect(ForwardDiffraction.airMass(90)).toBeCloseTo(1, 2)
    expect(ForwardDiffraction.airMass(0)).toBeGreaterThan(35)
  })
})
