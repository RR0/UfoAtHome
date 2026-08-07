import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, SphereGeometry } from "three"
import type { Object3D } from "three"
import type { DecorKind } from "../engine/model/Decor.js"
import type { RgbColor } from "./skyColors.js"

const DEG_TO_RAD = Math.PI / 180

/** Self-illuminated parts (a lit lamp head / lit headlight) stay MeshBasicMaterial — a real light
 * source must read as bright regardless of how dark the surrounding night is, and must not itself
 * cast a shadow of its own glow. Everything else is MeshLambertMaterial, real-lit by
 * SceneRenderer's celestialLight/skyLight (see updateCelestialLight) so it actually receives real
 * shadows and self-shades — no more manual per-frame ambient-tint multiply (see this class's own
 * former applyLighting, removed once real lights replaced it). Stashed on userData so
 * SceneRenderer.addStreetlightLight can find a streetlight's own lamp-head mesh to place a real
 * PointLight at, without hardcoding which child index that is. */
interface DecorMeshUserData {
  emissive: boolean
}

function addPart(group: Group, geometry: BoxGeometry | ConeGeometry | CylinderGeometry | SphereGeometry, baseColor: RgbColor, y: number, emissive = false): Mesh {
  const material = emissive ? new MeshBasicMaterial({ color: new Color(...baseColor) }) : new MeshLambertMaterial({ color: new Color(...baseColor) })
  const mesh = new Mesh(geometry, material)
  mesh.position.y = y
  mesh.userData = { emissive } satisfies DecorMeshUserData
  // A lamp/headlight casting a shadow of its own small bulb geometry back onto itself looks like a
  // rendering glitch, not a real effect — only non-emissive (actually opaque, physically-shadowed)
  // parts participate in the shadow system at all.
  mesh.castShadow = !emissive
  mesh.receiveShadow = !emissive
  group.add(mesh)
  return mesh
}

const UNLIT_LAMP_COLOR: RgbColor = [0.32, 0.32, 0.3]
const LIT_LAMP_COLOR: RgbColor = [1, 0.85, 0.5]
const UNLIT_HEADLIGHT_COLOR: RgbColor = [0.25, 0.25, 0.25]
const LIT_HEADLIGHT_COLOR: RgbColor = [1, 0.97, 0.85]

function buildBuilding(): Group {
  const group = new Group()
  addPart(group, new BoxGeometry(6, 9, 6), [0.55, 0.54, 0.5], 4.5)
  return group
}

function buildTree(): Group {
  const group = new Group()
  addPart(group, new CylinderGeometry(0.15, 0.22, 2, 8), [0.32, 0.22, 0.14], 1)
  addPart(group, new ConeGeometry(1.4, 3, 8), [0.16, 0.32, 0.14], 3.5)
  return group
}

function buildStreetlight(lit: boolean): Group {
  const group = new Group()
  addPart(group, new CylinderGeometry(0.05, 0.08, 5, 8), [0.28, 0.28, 0.3], 2.5)
  addPart(group, new SphereGeometry(0.25, 12, 8), lit ? LIT_LAMP_COLOR : UNLIT_LAMP_COLOR, 5.1, lit)
  return group
}

const WHEEL_COLOR: RgbColor = [0.08, 0.08, 0.08]

function buildVehicle(lit: boolean): Group {
  const group = new Group()
  // BoxGeometry(width=X, height=Y, depth=Z) — the car's LENGTH must be along Z, not X: heading 0
  // faces -Z (see DecorSystem's own module doc comment on headingDeg / GeoProjection's "north
  // -> -Z" convention), so anything meant to sit at "the front" only ends up there if the body's
  // long axis actually runs along Z. (A first version swapped this, leaving the headlights below
  // stranded 1.2 units past the real front face — floating detached from the body.)
  addPart(group, new BoxGeometry(1.8, 1.4, 4.2), [0.45, 0.14, 0.14], 0.7)
  addPart(group, new BoxGeometry(1.6, 0.6, 2), [0.4, 0.12, 0.12], 1.7)
  // Every part here is a child of `group` (see addPart), so it's carried along automatically by
  // the group's own position/rotation set in SceneRenderer.setDecor — a wheel never needs (and
  // must never get) its own east/north/heading tracking independent of the body.
  for (const z of [-1.4, 1.4]) {
    for (const x of [-0.95, 0.95]) {
      // CylinderGeometry's own axis defaults to local Y (a can standing upright) — rotating it
      // 90deg around Z tips that axis onto X, so the wheel's flat face reads as a proper circle
      // when viewed from the side (+-X, where it actually sits) instead of from the front.
      const wheel = addPart(group, new CylinderGeometry(0.4, 0.4, 0.3, 12), WHEEL_COLOR, 0.4)
      wheel.rotation.z = Math.PI / 2
      wheel.position.x = x
      wheel.position.z = z
    }
  }
  const headlightColor = lit ? LIT_HEADLIGHT_COLOR : UNLIT_HEADLIGHT_COLOR
  for (const sideX of [-0.7, 0.7]) {
    // The front, -length/2 along Z (see the body's own comment above on why Z is the facing axis).
    const headlight = addPart(group, new SphereGeometry(0.15, 8, 6), headlightColor, 0.7, lit)
    headlight.position.set(sideX, 0.7, -2.1)
  }
  return group
}

const FACE_INDICATOR_COLOR: RgbColor = [0.95, 0.9, 0.82]

function buildWitness(): Group {
  const group = new Group()
  addPart(group, new CylinderGeometry(0.25, 0.3, 1.5, 10), [0.3, 0.3, 0.35], 0.75)
  addPart(group, new SphereGeometry(0.22, 10, 8), [0.62, 0.52, 0.46], 1.72)
  // A small "nose" marking which way the witness is facing/looking (headingDeg) — otherwise a
  // plain cylinder+sphere silhouette reads as facing every direction at once. Bright/pale rather
  // than skin-toned so it stays legible against the head at a glance, not just on close zoom.
  // ConeGeometry's apex points +Y by default; rotating -90deg around X tips that onto -Z, the
  // same "front" convention as the vehicle's own headlights (see buildVehicle's own comment).
  const nose = addPart(group, new ConeGeometry(0.07, 0.16, 8), FACE_INDICATOR_COLOR, 1.72)
  nose.rotation.x = -Math.PI / 2
  nose.position.z = -0.2
  return group
}

/**
 * Builds/lights the compound Three.js primitive objects for decor (buildings/trees/streetlights/
 * vehicles/other witnesses) — static methods, not an instance class: each call is a single,
 * independent build with no state shared across decor objects (unlike e.g. ShapeGroup, which holds
 * a member list reused across a whole drag gesture — see [[rr0-code-style-no-free-functions]]).
 */
export class DecorSystem {
  /** headingDeg rotates the whole group around Y, same "-heading, clockwise from north" convention
   * as SceneRenderer.setObserverPose's camera yaw — meaningful for vehicle/witness, a harmless
   * no-op on a rotationally-symmetric building/tree/streetlight. */
  static build(kind: DecorKind, lit: boolean, headingDeg: number | undefined): Group {
    const group =
      kind === "building"
        ? buildBuilding()
        : kind === "tree"
          ? buildTree()
          : kind === "streetlight"
            ? buildStreetlight(lit)
            : kind === "vehicle"
              ? buildVehicle(lit)
              : buildWitness()
    if (headingDeg !== undefined) group.rotation.y = -headingDeg * DEG_TO_RAD
    return group
  }

  /** Disposes every mesh's geometry/material — Group itself owns no GPU resource of its own. */
  static dispose(group: Object3D): void {
    for (const child of group.children) {
      if (!(child instanceof Mesh)) continue
      child.geometry.dispose()
      ;(child.material as MeshBasicMaterial | MeshLambertMaterial).dispose()
    }
  }
}
