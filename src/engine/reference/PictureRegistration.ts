import { Euler, Matrix3, Matrix4, Object3D, Quaternion, Vector3 } from "three"
import type { ReferenceRegistration } from "../model/Reference.js"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** Where a point of the picture is, 0..1 from its top-left corner. */
export interface PicturePoint {
  u: number
  v: number
}

/** A direction from the witness — the scene's own way of naming a point of the view. */
export interface Aim {
  azimuthDeg: number
  altitudeDeg: number
}

/** One landmark, seen in the picture and in the rendered scene. */
export interface Landmark {
  picture: PicturePoint
  scene: Aim
}

export interface RegistrationFit {
  registration: ReferenceRegistration
  /** Root-mean-square angle between where each landmark is in the fitted picture and where it is
   * in the scene, degrees — what tells an author the picture fits, or that one landmark is wrong. */
  residualDeg: number
}

/**
 * Lines a picture up on the rendered scene from landmarks named in both.
 *
 * A picture is a field of directions from one point, and lining it up is finding the rotation that
 * turns the directions its pixels name, in the camera's own frame, into the directions the scene
 * names for the same landmarks — three angles, heading, pitch and roll, which two landmarks
 * already over-determine. The lens's field is a fourth unknown, fitted only when there are
 * landmarks enough to say anything about it (three, since a field changes how far apart landmarks
 * stand and two can be made to fit at any field by turning).
 *
 * Why this exists rather than a heading typed in: a heading typed in is the witness's word, and a
 * heading read off a picture that fits the horizon and two church towers is a measurement. The
 * same rotation, adopted as the witness's own pose, is what lets a recording say where they looked
 * on better grounds than their memory of it (see SightingEditorElement.adoptReferencePose).
 *
 * Solved as three's own rotation problem is: a first guess from two landmarks (the classic triad —
 * one axis along a landmark, one along the normal of the pair, the third completing them, in both
 * frames), then Gauss-Newton on the small rotation that best moves every fitted landmark onto its
 * scene direction, a handful of times, which is all a problem this well conditioned needs.
 */
export class PictureRegistration {

  /** The direction a point of the picture names in the camera's own frame — +x right, +y up,
   * looking down -z, exactly the frame ReferenceSystem stands the panel in. */
  static localDirection(point: PicturePoint, fovDeg: number, aspect: number, into = new Vector3()): Vector3 {
    const halfHeight = Math.tan((fovDeg / 2) * DEG_TO_RAD)
    return into.set((point.u * 2 - 1) * halfHeight * aspect, (1 - point.v * 2) * halfHeight, -1).normalize()
  }

  /** The inverse: where a camera-frame direction lands on the picture, or undefined behind it. */
  static picturePoint(local: Vector3, fovDeg: number, aspect: number): PicturePoint | undefined {
    if (local.z >= 0) return undefined
    const halfHeight = Math.tan((fovDeg / 2) * DEG_TO_RAD)
    const x = local.x / -local.z / (halfHeight * aspect)
    const y = local.y / -local.z / halfHeight
    return { u: (x + 1) / 2, v: (1 - y) / 2 }
  }

  /** A direction from the witness as a world vector: east +x, up +y, north -z — the decor's own
   * convention (see PhenomenonSystem.directionOf, which this repeats so as not to depend on the
   * renderer from the engine). */
  static worldDirection(aim: Aim, into = new Vector3()): Vector3 {
    const azimuth = aim.azimuthDeg * DEG_TO_RAD
    const altitude = aim.altitudeDeg * DEG_TO_RAD
    return into.set(Math.sin(azimuth) * Math.cos(altitude), Math.sin(altitude), -Math.cos(azimuth) * Math.cos(altitude))
  }

  static aimOf(direction: Vector3): Aim {
    const horizontal = Math.hypot(direction.x, direction.z)
    return {
      azimuthDeg: ((Math.atan2(direction.x, -direction.z) * RAD_TO_DEG) + 360) % 360,
      altitudeDeg: Math.atan2(direction.y, horizontal) * RAD_TO_DEG
    }
  }

  /** The rotation a registration states, camera frame to world — heading about the vertical
   * (clockwise from north, so negative about +y since north is -z), then pitch, then roll about
   * the picture's own axis: three's intrinsic YXZ, the order the renderer gives the camera. */
  static rotationOf(registration: ReferenceRegistration): Quaternion {
    const carrier = new Object3D()
    carrier.rotation.set(registration.pitchDeg * DEG_TO_RAD, -registration.headingDeg * DEG_TO_RAD, -(registration.rollDeg ?? 0) * DEG_TO_RAD, "YXZ")
    return carrier.quaternion.clone()
  }

  /** The three angles a rotation states, the inverse of rotationOf. */
  static anglesOf(rotation: Quaternion): Pick<ReferenceRegistration, "headingDeg" | "pitchDeg" | "rollDeg"> {
    const euler = new Euler().setFromQuaternion(rotation, "YXZ")
    const headingDeg = ((-euler.y * RAD_TO_DEG) % 360 + 360) % 360
    const rollDeg = -euler.z * RAD_TO_DEG
    return { headingDeg, pitchDeg: euler.x * RAD_TO_DEG, rollDeg: Math.abs(rollDeg) < 1e-9 ? 0 : rollDeg }
  }

  /** Where a point of the picture looks in the world under a registration. */
  static worldDirectionOf(point: PicturePoint, registration: ReferenceRegistration, aspect: number, into = new Vector3()): Vector3 {
    return this.localDirection(point, registration.fovDeg, aspect, into).applyQuaternion(this.rotationOf(registration))
  }

  /** Where a world direction lands on the picture under a registration, or undefined off it. */
  static picturePointOf(direction: Vector3, registration: ReferenceRegistration, aspect: number): PicturePoint | undefined {
    const local = direction.clone().applyQuaternion(this.rotationOf(registration).invert())
    const point = this.picturePoint(local, registration.fovDeg, aspect)
    if (!point || point.u < 0 || point.u > 1 || point.v < 0 || point.v > 1) return undefined
    return point
  }

  /**
   * The registration that best lines the landmarks up — at the field given, or, with three
   * landmarks or more, at the field that fits best between 1° and 179°.
   *
   * Undefined with fewer than two landmarks, or two that name the same direction: one landmark
   * fixes where the picture points and nothing about how it is turned around that.
   */
  static solve(landmarks: Landmark[], aspect: number, fovDeg: number, fitField = landmarks.length >= 3): RegistrationFit | undefined {
    if (landmarks.length < 2) return undefined
    if (!fitField) return this.solveAtField(landmarks, aspect, fovDeg)
    // Golden-section search on the field: the residual is smooth in it and has one minimum for
    // landmarks that fit at all. Bracketed wide, since a scan's field is anybody's guess.
    let low = 1
    let high = 179
    const ratio = (Math.sqrt(5) - 1) / 2
    let a = high - ratio * (high - low)
    let b = low + ratio * (high - low)
    let fitA = this.solveAtField(landmarks, aspect, a)
    let fitB = this.solveAtField(landmarks, aspect, b)
    for (let step = 0; step < 60 && high - low > 1e-4; step++) {
      if (!fitA || !fitB) return undefined
      if (fitA.residualDeg < fitB.residualDeg) {
        high = b
        b = a
        fitB = fitA
        a = high - ratio * (high - low)
        fitA = this.solveAtField(landmarks, aspect, a)
      } else {
        low = a
        a = b
        fitA = fitB
        b = low + ratio * (high - low)
        fitB = this.solveAtField(landmarks, aspect, b)
      }
    }
    const best = fitA && fitB ? (fitA.residualDeg < fitB.residualDeg ? fitA : fitB) : (fitA ?? fitB)
    return best
  }

  private static solveAtField(landmarks: Landmark[], aspect: number, fovDeg: number): RegistrationFit | undefined {
    const local = landmarks.map(landmark => this.localDirection(landmark.picture, fovDeg, aspect))
    const world = landmarks.map(landmark => this.worldDirection(landmark.scene))
    const initial = this.triad(local, world)
    if (!initial) return undefined
    const rotation = this.refine(initial, local, world)
    const angles = this.anglesOf(rotation)
    return {
      registration: { ...angles, fovDeg },
      residualDeg: this.residualDeg(rotation, local, world)
    }
  }

  /** The rotation taking the frame built on the two most separated landmarks in the picture onto
   * the frame built on the same two in the world. */
  private static triad(local: Vector3[], world: Vector3[]): Quaternion | undefined {
    let first = 0
    let second = 1
    let widest = -1
    for (let i = 0; i < local.length; i++) {
      for (let j = i + 1; j < local.length; j++) {
        const separation = local[i]!.clone().cross(local[j]!).lengthSq()
        if (separation > widest) {
          widest = separation
          first = i
          second = j
        }
      }
    }
    if (widest < 1e-12) return undefined
    const basis = (a: Vector3, b: Vector3): Matrix3 => {
      const x = a.clone().normalize()
      const z = a.clone().cross(b).normalize()
      const y = z.clone().cross(x)
      return new Matrix3().set(x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z)
    }
    const from = basis(local[first]!, local[second]!)
    const to = basis(world[first]!, world[second]!)
    // R = to · fromᵀ: a vector's coordinates in the picture frame, read off in the world frame.
    const rotation = to.multiply(from.transpose())
    return new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(rotation))
  }

  /** Gauss-Newton on the small rotation ω that best moves every fitted direction onto its world
   * direction: for each landmark, (R·l) + ω × (R·l) ≈ w, a linear system in ω solved by its
   * normal equations, applied, and repeated until it no longer moves anything. */
  private static refine(initial: Quaternion, local: Vector3[], world: Vector3[]): Quaternion {
    const rotation = initial.clone()
    const fitted = new Vector3()
    for (let iteration = 0; iteration < 20; iteration++) {
      const normal = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0)
      const n = normal.elements
      const rhs = new Vector3()
      for (let i = 0; i < local.length; i++) {
        fitted.copy(local[i]!).applyQuaternion(rotation)
        // ω × f = -[f]× ω, so the Jacobian row block is -[f]×, i.e. J = [[0, f.z, -f.y], [-f.z, 0, f.x], [f.y, -f.x, 0]].
        const f = fitted
        const J = [
          [0, f.z, -f.y],
          [-f.z, 0, f.x],
          [f.y, -f.x, 0]
        ]
        const r = [world[i]!.x - f.x, world[i]!.y - f.y, world[i]!.z - f.z]
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            // Column-major storage: element (row, col) is at col * 3 + row.
            for (let k = 0; k < 3; k++) n[col * 3 + row]! += J[k]![row]! * J[k]![col]!
          }
          rhs.setComponent(row, rhs.getComponent(row) + J[0]![row]! * r[0]! + J[1]![row]! * r[1]! + J[2]![row]! * r[2]!)
        }
      }
      // Damped a little, so that two landmarks (a rank-deficient block along their own axis at
      // the solution) still invert cleanly.
      for (let d = 0; d < 3; d++) n[d * 3 + d]! += 1e-9
      const omega = rhs.applyMatrix3(normal.invert())
      const angle = omega.length()
      if (angle < 1e-12) break
      const step = new Quaternion().setFromAxisAngle(omega.normalize(), angle)
      rotation.premultiply(step).normalize()
      if (angle < 1e-10) break
    }
    return rotation
  }

  private static residualDeg(rotation: Quaternion, local: Vector3[], world: Vector3[]): number {
    let sum = 0
    const fitted = new Vector3()
    for (let i = 0; i < local.length; i++) {
      fitted.copy(local[i]!).applyQuaternion(rotation)
      const angle = fitted.angleTo(world[i]!) * RAD_TO_DEG
      sum += angle * angle
    }
    return Math.sqrt(sum / local.length)
  }
}
