import { BufferGeometry, CylinderGeometry } from "three"
import type { MeasuredDecorSize, WireStructure } from "../engine/model/Decor.js"

/** The geometries one overhead line is drawn with. */
export interface WireParts {
  /** One per strand, each at its own height and offset. */
  strands: BufferGeometry[]
  /** The poles at the ends the line stands on one at. */
  poles: BufferGeometry[]
}

/**
 * Builds an overhead line (electric, telephone) at its own measurements — see the "wire" decor kind.
 *
 * In the object's own frame: x across the line, y up from the ground, z along it, centred on the
 * middle of the span. Each strand is a straight thin cylinder the whole length: the sag of a real
 * line is not drawn, which is wrong by the few centimetres a short span between two poles sags and
 * by a metre or two on a long one.
 */
export class WireGeometry {
  /** A strand a centimetre across: thinner is truer and, at the distances a line is looked at from,
   * a fraction of a pixel, which the renderer draws as a broken, flickering line. */
  static readonly DEFAULT_DIAMETER_M = 0.008
  static readonly POLE_RADIUS_M = 0.13
  /** How far a pole stands above its highest strand. */
  static readonly POLE_ABOVE_M = 0.5

  /** The size a line is drawn at when nothing is stated: a span of a village line, 5 m up. */
  static readonly NATURAL_SIZE: MeasuredDecorSize = Object.freeze({ widthM: 1, lengthM: 30, heightM: 5 })

  constructor(private readonly size: MeasuredDecorSize, private readonly structure: WireStructure = {}) {
  }

  /** Where each strand hangs: the stated ones, or one at the object's own height. */
  get strands(): { heightM: number, acrossM: number }[] {
    const stated = this.structure.strands
    if (!stated || stated.length === 0) return [{ heightM: this.size.heightM, acrossM: 0 }]
    return stated.map(strand => ({ heightM: strand.heightM, acrossM: strand.acrossM ?? 0 }))
  }

  /** The z of each pole. An object faces towards -Z (a vehicle's headlights are at -length/2): so the
   * "end" its heading points to is at -half, and the "start" it points away from at +half. */
  get poleStations(): number[] {
    const half = this.size.lengthM / 2
    switch (this.structure.poles ?? "both") {
      case "start": return [half]
      case "end": return [-half]
      case "none": return []
      default: return [-half, half]
    }
  }

  get poleHeightM(): number {
    return this.structure.poleHeightM ?? Math.max(...this.strands.map(strand => strand.heightM)) + WireGeometry.POLE_ABOVE_M
  }

  build(): WireParts {
    const diameter = this.structure.diameterM ?? WireGeometry.DEFAULT_DIAMETER_M
    const strands = this.strands.map(strand => {
      // A cylinder stands along +Y: laid along Z, then hung where it is.
      const geometry = new CylinderGeometry(diameter / 2, diameter / 2, this.size.lengthM, 6)
      geometry.rotateX(Math.PI / 2)
      geometry.translate(strand.acrossM, strand.heightM, 0)
      return geometry
    })
    const poles = this.poleStations.map(z => {
      const geometry = new CylinderGeometry(WireGeometry.POLE_RADIUS_M * 0.8, WireGeometry.POLE_RADIUS_M, this.poleHeightM, 8)
      geometry.translate(0, this.poleHeightM / 2, z)
      return geometry
    })
    return { strands, poles }
  }
}
