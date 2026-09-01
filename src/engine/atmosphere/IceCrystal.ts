/**
 * One ice crystal, and what a ray of sunlight does inside it.
 *
 * This is the piece that makes the rest of the halo family possible. The 22-degree ring and the
 * sundogs have closed forms (see IceHalos), and that is why they were the first things this project
 * drew — but the display a photograph actually shows is not two forms. It is a ring, a second much
 * larger ring, an arc riding on top of the ring, a coloured arc near the zenith, a white circle
 * running right round the sky at the Sun's own height, a shaft standing above the Sun. Each of
 * those has its own derivation, its own existence condition, and its own dependence on how high the
 * Sun stands, and writing six more closed forms would be six more chances to place something by
 * hand.
 *
 * So nothing here is placed. A crystal is a hexagonal prism — six side faces sixty degrees apart
 * and two flat ends — and a ray is followed through it by Snell's law and Fresnel's, entering,
 * refracting, bouncing off the inside of a face when it cannot get out, and finally leaving in some
 * direction. Do that for a few million rays through crystals drawn from a population of
 * orientations and the whole display appears in the answer: the ring is where the rays that crossed
 * two side faces pile up, the big ring is where the rays that crossed a side and an end pile up, the
 * sundogs are what a flat-lying crystal does to that first pile, the pillar is the Sun's own image
 * smeared by crystals that are not quite level. NONE of those words appear in this file. It knows
 * about a prism and a refractive index; the sky comes out.
 *
 * This is how halo simulators have worked since Greenler, and it is the reason they agree with
 * photographs on forms nobody derived by hand.
 */

import { Fresnel } from "./Fresnel.js"

/**
 * The refractive index of ice as a function of wavelength.
 *
 * The whole colour of a halo — red inside, blue outside, and the vivid spectrum of the arc near the
 * zenith — is this one function not being constant. It is fitted through the two indices IceHalos
 * already states, in Cauchy's form (n = A + B/λ²), so there is still exactly one pair of measured
 * numbers behind every angle this project draws.
 */
export class IceRefraction {
  /** The wavelengths the two anchoring indices were measured at, nanometres. */
  static readonly RED_NM = 656.3
  static readonly BLUE_NM = 435.8

  private static readonly ANCHOR_RED = 1.3067
  private static readonly ANCHOR_BLUE = 1.317

  /** Cauchy's B, in nm², from the two anchors: the entire dispersion of ice in one number. */
  private static readonly B =
    (IceRefraction.ANCHOR_BLUE - IceRefraction.ANCHOR_RED) /
    (1 / (IceRefraction.BLUE_NM * IceRefraction.BLUE_NM) - 1 / (IceRefraction.RED_NM * IceRefraction.RED_NM))

  private static readonly A = IceRefraction.ANCHOR_RED - IceRefraction.B / (IceRefraction.RED_NM * IceRefraction.RED_NM)

  static indexAt(wavelengthNm: number): number {
    return IceRefraction.A + IceRefraction.B / (wavelengthNm * wavelengthNm)
  }
}

/** A ray leaving a crystal: which way it went, and how much of the incident light went with it. */
export interface EmergentRay {
  x: number
  y: number
  z: number
  weight: number
}

/**
 * A hexagonal prism with a stated orientation, ready to be shot at.
 *
 * Held as eight planes rather than as vertices, because that is all a convex body needs: a ray is
 * inside it while it is on the inner side of every plane, so entry and exit are a maximum and a
 * minimum over eight numbers, with no polygon clipping anywhere.
 */
export class IceCrystal {
  /** Outward normals, xyz triples, packed: 6 prism faces then the 2 basal faces. */
  private readonly normals = new Float64Array(24)
  /** Each face's distance from the crystal's centre. */
  private readonly offsets = new Float64Array(8)
  /** A sphere that certainly contains the crystal — where incident rays are aimed from. */
  private radius = 1

  /**
   * Orients and sizes the crystal: `c` is its main axis (the direction of the two flat ends),
   * `roll` fixes which way the six side faces point about that axis, and the width and length are
   * its real dimensions across that axis and along it.
   *
   * THE SIZE MATTERS AS MUCH AS THE SHAPE, and it is easy to leave out. A crystal scatters in
   * proportion to the area it turns toward the light, so a hundred-micron plate and a forty-micron
   * column present quite different amounts of sky even in equal numbers — part of why sundogs are a
   * display most people have seen and Parry arcs one almost nobody has. Give every habit the same
   * width and that difference vanishes, and the sky comes out with the wrong forms winning.
   */
  set(cx: number, cy: number, cz: number, roll: number, width: number, length: number): void {
    // Any two directions across the axis will do for the hexagon's own frame; the roll then turns
    // the faces to where the caller wants them.
    let ux = 0
    let uy = 0
    let uz = 0
    if (Math.abs(cz) < 0.9) {
      ux = -cy
      uy = cx
      uz = 0
    } else {
      ux = 0
      uy = -cz
      uz = cy
    }
    const uLength = Math.hypot(ux, uy, uz) || 1
    ux /= uLength
    uy /= uLength
    uz /= uLength
    const vx = cy * uz - cz * uy
    const vy = cz * ux - cx * uz
    const vz = cx * uy - cy * ux
    const halfWidth = width / 2
    const halfLength = length / 2
    for (let face = 0; face < 6; face++) {
      const angle = roll + (face * Math.PI) / 3
      const cosine = Math.cos(angle)
      const sine = Math.sin(angle)
      this.normals[face * 3] = ux * cosine + vx * sine
      this.normals[face * 3 + 1] = uy * cosine + vy * sine
      this.normals[face * 3 + 2] = uz * cosine + vz * sine
      this.offsets[face] = halfWidth
    }
    this.normals[18] = cx
    this.normals[19] = cy
    this.normals[20] = cz
    this.offsets[6] = halfLength
    this.normals[21] = -cx
    this.normals[22] = -cy
    this.normals[23] = -cz
    this.offsets[7] = halfLength
    this.radius = Math.hypot(halfWidth, halfLength)
  }

  /** How far off the crystal's centre an incident ray may pass and still have a chance of hitting
   * it — the disc a caller aims rays through, so that every face is struck in proportion to the
   * area it presents, which is what decides how bright each form comes out. */
  get aimRadius(): number {
    return this.radius
  }

  /**
   * Follows one ray of one colour through the crystal and reports every way light left it.
   *
   * `weightOut` receives one entry per emergence: the direction the light travelled and the
   * fraction of the incident ray that took it. Both of Fresnel's shares are followed — the part
   * that reflects off the outside (which is what puts an image of the Sun below the horizon, and a
   * white circle right round the sky) and the part that refracts in, then at every inner face the
   * part that gets out and the part that stays in. Light trapped by total internal reflection keeps
   * its whole weight, which is why the forms that need a bounce are not faint.
   *
   * Returns how many emergences were written.
   */
  trace(
    dirX: number,
    dirY: number,
    dirZ: number,
    offsetA: number,
    offsetB: number,
    refractiveIndex: number,
    out: EmergentRay[]
  ): number {
    // Aim the ray at a random point of the disc across it, from outside the crystal.
    let sideX = -dirY
    let sideY = dirX
    let sideZ = 0
    let length = Math.hypot(sideX, sideY, sideZ)
    if (length < 1e-6) {
      sideX = 1
      sideY = 0
      sideZ = 0
      length = 1
    }
    sideX /= length
    sideY /= length
    sideZ /= length
    const upX = dirY * sideZ - dirZ * sideY
    const upY = dirZ * sideX - dirX * sideZ
    const upZ = dirX * sideY - dirY * sideX
    const startX = sideX * offsetA + upX * offsetB - dirX * this.radius * 2
    const startY = sideY * offsetA + upY * offsetB - dirY * this.radius * 2
    const startZ = sideZ * offsetA + upZ * offsetB - dirZ * this.radius * 2

    let entryFace = -1
    let entryT = -Infinity
    let exitT = Infinity
    for (let face = 0; face < 8; face++) {
      const nx = this.normals[face * 3]
      const ny = this.normals[face * 3 + 1]
      const nz = this.normals[face * 3 + 2]
      const denominator = nx * dirX + ny * dirY + nz * dirZ
      const distance = this.offsets[face] - (nx * startX + ny * startY + nz * startZ)
      if (denominator > 1e-9) {
        const t = distance / denominator
        if (t < exitT) exitT = t
      } else if (denominator < -1e-9) {
        const t = distance / denominator
        if (t > entryT) {
          entryT = t
          entryFace = face
        }
      } else if (distance < 0) {
        return 0
      }
    }
    if (entryFace < 0 || entryT >= exitT) return 0

    let count = 0
    const entryNx = this.normals[entryFace * 3]
    const entryNy = this.normals[entryFace * 3 + 1]
    const entryNz = this.normals[entryFace * 3 + 2]
    const cosIncident = -(entryNx * dirX + entryNy * dirY + entryNz * dirZ)
    const outerReflectance = Fresnel.reflectance(cosIncident, 1, refractiveIndex)

    // The share that never gets in: a mirror image of the source in the crystal's own face. Tilted
    // faces send it to places a refracted ray never reaches, and that is a whole family of forms.
    out[count].x = dirX + 2 * cosIncident * entryNx
    out[count].y = dirY + 2 * cosIncident * entryNy
    out[count].z = dirZ + 2 * cosIncident * entryNz
    out[count].weight = outerReflectance
    count++

    // The share that refracts in, and is followed until it leaves or fades.
    const eta = 1 / refractiveIndex
    const cosRefracted = Math.sqrt(Math.max(0, 1 - eta * eta * (1 - cosIncident * cosIncident)))
    let rayX = eta * dirX + (eta * cosIncident - cosRefracted) * entryNx
    let rayY = eta * dirY + (eta * cosIncident - cosRefracted) * entryNy
    let rayZ = eta * dirZ + (eta * cosIncident - cosRefracted) * entryNz
    let pointX = startX + dirX * entryT
    let pointY = startY + dirY * entryT
    let pointZ = startZ + dirZ * entryT
    let weight = 1 - outerReflectance

    for (let bounce = 0; bounce < IceCrystal.MAX_BOUNCES && weight > IceCrystal.MIN_WEIGHT; bounce++) {
      let hitFace = -1
      let hitT = Infinity
      for (let face = 0; face < 8; face++) {
        const nx = this.normals[face * 3]
        const ny = this.normals[face * 3 + 1]
        const nz = this.normals[face * 3 + 2]
        const denominator = nx * rayX + ny * rayY + nz * rayZ
        if (denominator <= 1e-9) continue
        const t = (this.offsets[face] - (nx * pointX + ny * pointY + nz * pointZ)) / denominator
        if (t > 1e-9 && t < hitT) {
          hitT = t
          hitFace = face
        }
      }
      if (hitFace < 0) break
      const nx = this.normals[hitFace * 3]
      const ny = this.normals[hitFace * 3 + 1]
      const nz = this.normals[hitFace * 3 + 2]
      const cosInside = nx * rayX + ny * rayY + nz * rayZ
      const sineOut = refractiveIndex * Math.sqrt(Math.max(0, 1 - cosInside * cosInside))
      pointX += rayX * hitT
      pointY += rayY * hitT
      pointZ += rayZ * hitT
      if (sineOut < 1) {
        const cosOut = Math.sqrt(Math.max(0, 1 - sineOut * sineOut))
        const reflectance = Fresnel.reflectance(cosInside, refractiveIndex, 1)
        out[count].x = refractiveIndex * rayX - (refractiveIndex * cosInside - cosOut) * nx
        out[count].y = refractiveIndex * rayY - (refractiveIndex * cosInside - cosOut) * ny
        out[count].z = refractiveIndex * rayZ - (refractiveIndex * cosInside - cosOut) * nz
        out[count].weight = weight * (1 - reflectance)
        count++
        if (count >= out.length) return count
        weight *= reflectance
      }
      // Whatever did not leave stays in and is reflected off the inside of that same face — the
      // whole of it when the angle is too steep to escape at all.
      const twice = 2 * cosInside
      rayX -= twice * nx
      rayY -= twice * ny
      rayZ -= twice * nz
    }
    return count
  }

  /** How many times a ray is allowed to bounce around inside before what is left of it is dropped.
   * The forms that need three or four faces exist; nothing anybody has photographed needs eight. */
  static readonly MAX_BOUNCES = 6
  private static readonly MIN_WEIGHT = 1e-4
}
