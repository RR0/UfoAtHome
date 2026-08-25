import { BackSide, BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, SphereGeometry } from "three"
import type { Object3D } from "three"
import type { DecorKind, DecorLight, DecorObject, DecorSide } from "../engine/model/Decor.js"
import { DEFAULT_BUILDING_FLOORS, isLightOnAt } from "../engine/model/Decor.js"
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
  /** Set on a lamp built from DecorObject.lights — see DecorSystem.addLights. Lets setLights find
   * its own mesh again per tick, and keeps setLit (which re-tints every OTHER emissive part as one)
   * from repainting a navigation light the colour of a headlight. */
  lightId?: string
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

/** The modelled radius of a declared lamp, before setLights scales it for distance. */
const LAMP_RADIUS_M = 0.25
/** The angular radius a lamp is never drawn smaller than: 0.07 degrees, so an ordinary navigation
 * light spreads to about a seventh of the Moon's width and a wingtip strobe (four times the
 * intensity, hence twice the radius) to about a quarter. Tuned by eye against what a bright point
 * really blooms to at night rather than derived — the bulb's own size is not what anyone sees at
 * these distances. See setLights. */
const LAMP_MIN_ANGULAR_RADIUS_RAD = 0.0012

/** `#rrggbb` to the 0-1 triple every material here takes. Falls back to white rather than throwing:
 * a lamp of an unparseable colour should still light up. */
function hexToRgb(hex: string): RgbColor {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return [1, 1, 1]
  const value = parseInt(match[1], 16)
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255]
}

const UNLIT_LAMP_COLOR: RgbColor = [0.32, 0.32, 0.3]
const LIT_LAMP_COLOR: RgbColor = [1, 0.85, 0.5]
const UNLIT_HEADLIGHT_COLOR: RgbColor = [0.25, 0.25, 0.25]
const LIT_HEADLIGHT_COLOR: RgbColor = [1, 0.97, 0.85]

/** No entry at all for a side gets no mesh — a plain, unremarkable stretch of wall, not a distinct
 * patch stuck onto it (an earlier version always rendered a pane there regardless of state, which
 * read as a bricked-up window rather than a genuinely windowless wall — see this project's own
 * memory notes). A PRESENT entry always gets one real glass-tinted 3D box pane, with the material's
 * own `opacity` driven directly by DecorObject.windows' 0-100 value — 0 renders fully transparent
 * (genuinely invisible, not a solid color that merely reads as "dark" — an earlier "open" state
 * used an opaque near-black color instead of real transparency, which looked like a physically
 * blocked-up window rather than an opening, see this project's own memory notes), 100 fully
 * opaque. Sits WINDOW_MARGIN proud of the body's own face to avoid z-fighting with it; a real 3D
 * box with actual thickness, so it reads correctly from the room's own interior too (see addRoom
 * below), no extra double-sided material needed. */
const WINDOW_COLOR: RgbColor = [0.55, 0.68, 0.72]
const WINDOW_MARGIN = 0.03
const WINDOW_THICKNESS = 0.05

/** Rotation.y that makes buildWitness's own "nose" (see its own doc comment — points -Z by
 * default) face outward through the given side of the object it's placed inside, matching the
 * front=-Z/behind=+Z/right=+X/left=-X convention buildVehicle's own body/headlights already use.
 * The 4 vehicle-only corners share their plain left/right counterpart's own yaw — looking out the
 * left side of a car faces the same -X direction whether you're in the front or rear seat, only
 * WHERE along the cabin you're sitting differs (see sideOffset). */
const SIDE_YAW_RAD: Record<DecorSide, number> = {
  front: 0,
  behind: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
  "front-left": Math.PI / 2,
  "behind-left": Math.PI / 2,
  "front-right": -Math.PI / 2,
  "behind-right": -Math.PI / 2
}

function windowOpacityPercent(windows: DecorObject["windows"], side: DecorSide): number | undefined {
  return windows?.[side]
}

function addWindowPane(group: Group, sizeX: number, sizeY: number, sizeZ: number, x: number, y: number, z: number, opacityPercent: number | undefined): void {
  if (opacityPercent === undefined) return
  const material = new MeshLambertMaterial({ color: new Color(...WINDOW_COLOR), transparent: true, opacity: opacityPercent / 100 })
  const mesh = new Mesh(new BoxGeometry(sizeX, sizeY, sizeZ), material)
  mesh.position.set(x, y, z)
  group.add(mesh)
}

const ROOM_PANEL_THICKNESS = 0.05
const ROOM_WALL_COLOR: RgbColor = [0.6, 0.58, 0.53]
const ROOM_FLOOR_CEILING_COLOR: RgbColor = [0.5, 0.5, 0.48]

function addRoomPanel(group: Group, sizeX: number, sizeY: number, sizeZ: number, x: number, y: number, z: number, color: RgbColor): void {
  const material = new MeshLambertMaterial({ color: new Color(...color), side: BackSide })
  const mesh = new Mesh(new BoxGeometry(sizeX, sizeY, sizeZ), material)
  mesh.position.set(x, y, z)
  group.add(mesh)
}

/** One window gap to leave in a room wall — `main` its size along the wall's own main axis,
 * `center` its position along that axis (0 = wall center), matching whatever addWindowPane's own
 * call sites for this kind/side already build it at (the single source of truth
 * addFramedRoomWall needs; the numbers are pure duplication of addWindowPane's own literals, kept
 * in sync by hand — both are read together in buildBuilding/buildVehicle, not spread across the
 * file). An explicit center (not always 0) is what lets a wall carry more than one gap — see
 * addFramedRoomWall's own doc comment for why a vehicle's left/right walls need that. */
interface WallWindow {
  main: number
  center: number
}

/** Builds one side of the room as a picture frame around zero or more window gaps along its own
 * main axis, instead of a single solid panel — used whenever this side has ANY window entry
 * (regardless of opacity, even 0): the window pane itself (addWindowPane) is usually much smaller
 * than the whole wall (e.g. a building's BUILDING_WINDOW_WIDTH=1.4 out of BUILDING_WIDTH=6), so
 * skipping the ENTIRE wall panel there — an earlier version's behavior — left most of that side as
 * an unintended void straight through to the sky, not a wall with a window in it (seen directly in
 * a user screenshot: two side walls framing a huge open gap instead of a recognizable window).
 * `mainIsX` picks the wall's own horizontal axis: true for a front/behind wall (its plane is X-Y,
 * thin along Z), false for a left/right wall (its plane is Z-Y, thin along X) — same distinction
 * addWindowPane's own call sites already make explicitly per side. More than one gap is what a
 * vehicle's own left/right wall needs now (front-door window + rear-door window — see DecorSide's
 * own doc comment on why a car's side isn't a single window the way a building's is); every other
 * wall today passes exactly one. Decomposition: two full-width caps (top/bottom, above/below the
 * windows' own shared height) plus one strip per gap, tiling every stretch of wall before/between/
 * after the (center-sorted) gaps — together covering the whole panel minus the gaps themselves,
 * with no overlap, for any gap count including zero (see addRoom's own solid-panel branch for why
 * zero never actually reaches here in practice). */
function addFramedRoomWall(
  group: Group,
  mainIsX: boolean,
  fullMain: number,
  fullHeight: number,
  windows: WallWindow[],
  windowHeight: number,
  crossFixed: number,
  yCenter: number,
  color: RgbColor
): void {
  const capHeight = (fullHeight - windowHeight) / 2
  const panel = (main: number, y: number, mainOffset: number, yOffset: number) => {
    if (main <= 0) return
    if (mainIsX) addRoomPanel(group, main, y, ROOM_PANEL_THICKNESS, mainOffset, yCenter + yOffset, crossFixed, color)
    else addRoomPanel(group, ROOM_PANEL_THICKNESS, y, main, crossFixed, yCenter + yOffset, mainOffset, color)
  }
  panel(fullMain, capHeight, 0, fullHeight / 2 - capHeight / 2)
  panel(fullMain, capHeight, 0, -(fullHeight / 2 - capHeight / 2))
  const sorted = [...windows].sort((a, b) => a.center - b.center)
  let cursor = -fullMain / 2
  for (const w of sorted) {
    const gapStart = w.center - w.main / 2
    const stripMain = gapStart - cursor
    panel(stripMain, windowHeight, cursor + stripMain / 2, 0)
    cursor = w.center + w.main / 2
  }
  const tailMain = fullMain / 2 - cursor
  panel(tailMain, windowHeight, cursor + tailMain / 2, 0)
}

/** The enclosure of the room the witness stands inside, visible only from within (BackSide
 * materials — the object's own exterior shell already covers the outside view, this would just
 * double up on top of it there): 4 side walls plus a floor and ceiling. A side passed an empty
 * window list gets one plain solid panel; a non-empty one (any opacity, even 0 — still an opening,
 * not a wall) gets a framed wall instead (see addFramedRoomWall) so the rest of that side, outside
 * the window gap(s), still reads as a wall rather than a void. Only ever built when witnessSide is
 * set — see buildBuilding/buildVehicle's own call sites — a room nobody stands in is never
 * rendered from its own inside. `windowHeight` is shared by every gap on a given wall (true for
 * every caller today — even a vehicle's own front-door/rear-door pair are always the same
 * height). */
function addRoom(
  group: Group,
  halfWidth: number,
  halfDepth: number,
  floorY: number,
  ceilingY: number,
  windowHeight: number,
  front: WallWindow[],
  behind: WallWindow[],
  left: WallWindow[],
  right: WallWindow[]
): void {
  const centerY = (floorY + ceilingY) / 2
  const height = ceilingY - floorY
  const wall = (windows: WallWindow[], mainIsX: boolean, fullMain: number, crossFixed: number) => {
    if (windows.length === 0) {
      if (mainIsX) addRoomPanel(group, fullMain, height, ROOM_PANEL_THICKNESS, 0, centerY, crossFixed, ROOM_WALL_COLOR)
      else addRoomPanel(group, ROOM_PANEL_THICKNESS, height, fullMain, crossFixed, centerY, 0, ROOM_WALL_COLOR)
    } else {
      addFramedRoomWall(group, mainIsX, fullMain, height, windows, windowHeight, crossFixed, centerY, ROOM_WALL_COLOR)
    }
  }
  wall(front, true, halfWidth * 2, -halfDepth + ROOM_PANEL_THICKNESS)
  wall(behind, true, halfWidth * 2, halfDepth - ROOM_PANEL_THICKNESS)
  wall(left, false, halfDepth * 2, -halfWidth + ROOM_PANEL_THICKNESS)
  wall(right, false, halfDepth * 2, halfWidth - ROOM_PANEL_THICKNESS)
  addRoomPanel(group, halfWidth * 2, ROOM_PANEL_THICKNESS, halfDepth * 2, 0, floorY + ROOM_PANEL_THICKNESS, 0, ROOM_FLOOR_CEILING_COLOR)
  addRoomPanel(group, halfWidth * 2, ROOM_PANEL_THICKNESS, halfDepth * 2, 0, ceilingY - ROOM_PANEL_THICKNESS, 0, ROOM_FLOOR_CEILING_COLOR)
}

/** Local (x,z) offset, within a decor object's own UNROTATED local space, of where someone
 * standing at `side` ends up — center along the wall/cabin they're not next to, `inset` in from
 * the wall/cabin they are. The single source of truth for this math: both addOccupant (the visible
 * figure) and SceneRenderer's camera placement (occupantView, below — "look outward from inside
 * this decor object") must agree exactly, or the camera would render from a different spot than
 * where the figure appears to stand. The 4 vehicle-only corners reuse their plain left/right
 * counterpart's own X inset (same distance from the door) but additionally offset along Z by
 * VEHICLE_DOOR_WINDOW_Z, toward whichever of the front/rear seats they name — see that constant's
 * own doc comment for why this specific Z value (it's the same one the door windows themselves
 * are centered at, so a seated occupant always lines up with their own window). */
function sideOffset(side: DecorSide, halfWidth: number, halfDepth: number, inset: number): { x: number; z: number } {
  switch (side) {
    case "front":
      return { x: 0, z: -(halfDepth - inset) }
    case "behind":
      return { x: 0, z: halfDepth - inset }
    case "left":
      return { x: -(halfWidth - inset), z: 0 }
    case "right":
      return { x: halfWidth - inset, z: 0 }
    case "front-left":
      return { x: -(halfWidth - inset), z: -VEHICLE_DOOR_WINDOW_Z }
    case "front-right":
      return { x: halfWidth - inset, z: -VEHICLE_DOOR_WINDOW_Z }
    case "behind-left":
      return { x: -(halfWidth - inset), z: VEHICLE_DOOR_WINDOW_Z }
    case "behind-right":
      return { x: halfWidth - inset, z: VEHICLE_DOOR_WINDOW_Z }
  }
}

/** Places a scaled-down buildWitness figure inside `group`, standing/sitting at `y` (local, i.e.
 * the occupied floor's own ground level for a building, roughly seat height for a vehicle), offset
 * from center toward `side` so it reads as standing near that side's window, and rotated to look
 * outward through it. `halfExtentAlongSide`/`inset` control how close to the wall it stands. */
function addOccupant(group: Group, side: DecorSide, y: number, scale: number, halfWidth: number, halfDepth: number, inset: number): void {
  const figure = buildWitness()
  figure.scale.setScalar(scale)
  figure.rotation.y = SIDE_YAW_RAD[side]
  const { x, z } = sideOffset(side, halfWidth, halfDepth, inset)
  figure.position.set(x, y, z)
  group.add(figure)
}

const BUILDING_WIDTH = 6
const BUILDING_DEPTH = 6
const BUILDING_FLOOR_HEIGHT = 3
const BUILDING_WINDOW_WIDTH = 1.4
const BUILDING_WINDOW_HEIGHT = BUILDING_FLOOR_HEIGHT * 0.5
const BUILDING_WITNESS_INSET = 1.2
const VEHICLE_WITNESS_INSET = 0.35
/** Where the visible occupant FIGURE's own base (feet) sits — a plausible seated pose relative to
 * the vehicle body, chosen purely by how the scaled-down buildWitness figure looks there. Not the
 * same thing as the camera's own eye height (VEHICLE_EYE_Y, defined near the vehicle's other
 * cabin constants below) — occupantView used to reuse this single value for BOTH, which put the
 * camera's eye above the cabin's own ceiling (addRoom's room spans VEHICLE_CABIN_Y ±
 * VEHICLE_CABIN_HEIGHT/2, nowhere near 0.75) — a real bug caught by a user testing the vehicle
 * interior view, seeing only the cabin's own roof from above instead of being inside the cabin at
 * all. */
const VEHICLE_WITNESS_Y = 0.75
/** Eye height a standing witness has above whatever floor they're on — building's own
 * occupantView adds this to the occupied floor's own ground level. Not reused for the vehicle
 * case (see VEHICLE_EYE_Y) — nobody stands fully upright inside a car-sized cabin. */
const EYE_HEIGHT_M = 1.6

function buildBuilding(floors: number, windows: DecorObject["windows"], witnessSide: DecorSide | undefined, occupiedFloor: number | undefined): Group {
  const group = new Group()
  // "floors" counts upper stories above the ground floor (French "étages", not counting the "rez-
  // de-chaussée") — a building with floors=2 has 3 levels total, matching the previous fixed
  // height of 9 (3 levels * BUILDING_FLOOR_HEIGHT=3) exactly when DEFAULT_FLOORS=2.
  const levels = Math.max(1, floors + 1)
  const height = levels * BUILDING_FLOOR_HEIGHT
  addPart(group, new BoxGeometry(BUILDING_WIDTH, height, BUILDING_DEPTH), [0.55, 0.54, 0.5], height / 2)
  const halfWidth = BUILDING_WIDTH / 2
  const halfDepth = BUILDING_DEPTH / 2
  for (let level = 0; level < levels; level++) {
    const y = level * BUILDING_FLOOR_HEIGHT + BUILDING_FLOOR_HEIGHT / 2
    addWindowPane(group, BUILDING_WINDOW_WIDTH, BUILDING_WINDOW_HEIGHT, WINDOW_THICKNESS, 0, y, -halfDepth - WINDOW_MARGIN, windowOpacityPercent(windows, "front"))
    addWindowPane(group, BUILDING_WINDOW_WIDTH, BUILDING_WINDOW_HEIGHT, WINDOW_THICKNESS, 0, y, halfDepth + WINDOW_MARGIN, windowOpacityPercent(windows, "behind"))
    addWindowPane(group, WINDOW_THICKNESS, BUILDING_WINDOW_HEIGHT, BUILDING_WINDOW_WIDTH, -halfWidth - WINDOW_MARGIN, y, 0, windowOpacityPercent(windows, "left"))
    addWindowPane(group, WINDOW_THICKNESS, BUILDING_WINDOW_HEIGHT, BUILDING_WINDOW_WIDTH, halfWidth + WINDOW_MARGIN, y, 0, windowOpacityPercent(windows, "right"))
  }
  if (witnessSide) {
    const level = Math.min(Math.max(occupiedFloor ?? 0, 0), levels - 1)
    addOccupant(group, witnessSide, level * BUILDING_FLOOR_HEIGHT, 0.72, halfWidth, halfDepth, BUILDING_WITNESS_INSET)
    const wallWindow = (side: DecorSide): WallWindow[] => (windowOpacityPercent(windows, side) !== undefined ? [{ main: BUILDING_WINDOW_WIDTH, center: 0 }] : [])
    addRoom(
      group,
      halfWidth,
      halfDepth,
      level * BUILDING_FLOOR_HEIGHT,
      (level + 1) * BUILDING_FLOOR_HEIGHT,
      BUILDING_WINDOW_HEIGHT,
      wallWindow("front"),
      wallWindow("behind"),
      wallWindow("left"),
      wallWindow("right")
    )
  }
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
  // The lamp head is ALWAYS emissive (true, not `lit`) — lit can now change mid-recording (see
  // Decor.ts's own resolveDecorLitAt/DecorSystem.setLit), and a mesh built non-emissive here
  // (MeshLambertMaterial, receiving real scene lighting) could never later be toggled to read as
  // a genuine light source in place — only its *color* changes at runtime, never its material
  // class. Building it emissive from the start, in whichever color matches this initial `lit`,
  // is what setLit's own later re-tints actually assume.
  addPart(group, new SphereGeometry(0.25, 12, 8), lit ? LIT_LAMP_COLOR : UNLIT_LAMP_COLOR, 5.1, true)
  return group
}

const WHEEL_COLOR: RgbColor = [0.08, 0.08, 0.08]
const VEHICLE_CABIN_HALF_WIDTH = 0.8
const VEHICLE_CABIN_HALF_DEPTH = 1.0
const VEHICLE_CABIN_Y = 1.7
const VEHICLE_CABIN_HEIGHT = 0.6
const VEHICLE_WINDOW_HEIGHT = 0.4
const VEHICLE_WINDSHIELD_WIDTH = 1.2
/** Was one VEHICLE_SIDE_WINDOW_LENGTH=1.6 pane spanning nearly the whole cabin depth per side —
 * replaced by two shorter door windows (front-left/front-right/behind-left/behind-right, see
 * DecorSide's own doc comment) once a real car's left/right side turned out to have 2 windows
 * each, not 1. */
const VEHICLE_DOOR_WINDOW_LENGTH = 0.7
/** Front door window centered at -this along Z, behind door at +this — cabin half-depth is
 * VEHICLE_CABIN_HALF_DEPTH=1.0, so this leaves ~0.15 margin at the cabin's own front/rear edges
 * and a ~0.3 gap at Z=0 for the B-pillar between the two doors. Also what sideOffset uses to seat
 * a front-left/front-right/behind-left/behind-right occupant exactly under their own window. */
const VEHICLE_DOOR_WINDOW_Z = 0.5
/** The camera's own absolute eye height while inside a vehicle — set to VEHICLE_CABIN_Y itself
 * (the cabin's own vertical center, which is also where every window pane is centered), well
 * within the room addRoom builds (VEHICLE_CABIN_Y +/- VEHICLE_CABIN_HEIGHT/2). Deliberately NOT
 * EYE_HEIGHT_M (a standing witness's eye height) — nobody stands upright inside a car-sized cabin
 * — and deliberately NOT VEHICLE_WITNESS_Y either (see that constant's own doc comment on why a
 * figure's visual base and the camera's own eye height are different concerns). */
const VEHICLE_EYE_Y = VEHICLE_CABIN_Y

function buildVehicle(lit: boolean, windows: DecorObject["windows"], witnessSide: DecorSide | undefined): Group {
  const group = new Group()
  // BoxGeometry(width=X, height=Y, depth=Z) — the car's LENGTH must be along Z, not X: heading 0
  // faces -Z (see DecorSystem's own module doc comment on headingDeg / GeoProjection's "north
  // -> -Z" convention), so anything meant to sit at "the front" only ends up there if the body's
  // long axis actually runs along Z. (A first version swapped this, leaving the headlights below
  // stranded 1.2 units past the real front face — floating detached from the body.)
  addPart(group, new BoxGeometry(1.8, 1.4, 4.2), [0.45, 0.14, 0.14], 0.7)
  addPart(group, new BoxGeometry(VEHICLE_CABIN_HALF_WIDTH * 2, VEHICLE_CABIN_HEIGHT, VEHICLE_CABIN_HALF_DEPTH * 2), [0.4, 0.12, 0.12], VEHICLE_CABIN_Y)
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
    // Always emissive (true, not `lit`) — see buildStreetlight's own doc comment on why: lit can
    // change mid-recording, and only a mesh already built emissive can be re-tinted in place later
    // by DecorSystem.setLit.
    const headlight = addPart(group, new SphereGeometry(0.15, 8, 6), headlightColor, 0.7, true)
    headlight.position.set(sideX, 0.7, -2.1)
  }
  // Windshield/rear window sit on the cabin box's own front/behind faces — never openable for a
  // vehicle (isWindowOpenable in Decor.ts returns false there, so the recorder UI clamps their
  // opacity to FIXED_WINDOW_MIN_OPACITY_PERCENT); the 4 door windows go all the way to 0 —
  // windowOpacityPercent() itself applies with no special-casing either way.
  addWindowPane(group, VEHICLE_WINDSHIELD_WIDTH, VEHICLE_WINDOW_HEIGHT, WINDOW_THICKNESS, 0, VEHICLE_CABIN_Y, -VEHICLE_CABIN_HALF_DEPTH - WINDOW_MARGIN, windowOpacityPercent(windows, "front"))
  addWindowPane(group, VEHICLE_WINDSHIELD_WIDTH, VEHICLE_WINDOW_HEIGHT, WINDOW_THICKNESS, 0, VEHICLE_CABIN_Y, VEHICLE_CABIN_HALF_DEPTH + WINDOW_MARGIN, windowOpacityPercent(windows, "behind"))
  // 2 door windows per side (front seat/rear seat), not 1 — see VEHICLE_DOOR_WINDOW_LENGTH/Z's own
  // doc comment.
  addWindowPane(group, WINDOW_THICKNESS, VEHICLE_WINDOW_HEIGHT, VEHICLE_DOOR_WINDOW_LENGTH, -VEHICLE_CABIN_HALF_WIDTH - WINDOW_MARGIN, VEHICLE_CABIN_Y, -VEHICLE_DOOR_WINDOW_Z, windowOpacityPercent(windows, "front-left"))
  addWindowPane(group, WINDOW_THICKNESS, VEHICLE_WINDOW_HEIGHT, VEHICLE_DOOR_WINDOW_LENGTH, -VEHICLE_CABIN_HALF_WIDTH - WINDOW_MARGIN, VEHICLE_CABIN_Y, VEHICLE_DOOR_WINDOW_Z, windowOpacityPercent(windows, "behind-left"))
  addWindowPane(group, WINDOW_THICKNESS, VEHICLE_WINDOW_HEIGHT, VEHICLE_DOOR_WINDOW_LENGTH, VEHICLE_CABIN_HALF_WIDTH + WINDOW_MARGIN, VEHICLE_CABIN_Y, -VEHICLE_DOOR_WINDOW_Z, windowOpacityPercent(windows, "front-right"))
  addWindowPane(group, WINDOW_THICKNESS, VEHICLE_WINDOW_HEIGHT, VEHICLE_DOOR_WINDOW_LENGTH, VEHICLE_CABIN_HALF_WIDTH + WINDOW_MARGIN, VEHICLE_CABIN_Y, VEHICLE_DOOR_WINDOW_Z, windowOpacityPercent(windows, "behind-right"))
  if (witnessSide) {
    addOccupant(group, witnessSide, VEHICLE_WITNESS_Y, 0.5, VEHICLE_CABIN_HALF_WIDTH, VEHICLE_CABIN_HALF_DEPTH, VEHICLE_WITNESS_INSET)
    const doorWindow = (frontSide: DecorSide, behindSide: DecorSide): WallWindow[] => {
      const result: WallWindow[] = []
      if (windowOpacityPercent(windows, frontSide) !== undefined) result.push({ main: VEHICLE_DOOR_WINDOW_LENGTH, center: -VEHICLE_DOOR_WINDOW_Z })
      if (windowOpacityPercent(windows, behindSide) !== undefined) result.push({ main: VEHICLE_DOOR_WINDOW_LENGTH, center: VEHICLE_DOOR_WINDOW_Z })
      return result
    }
    const windshield: WallWindow[] = windowOpacityPercent(windows, "front") !== undefined ? [{ main: VEHICLE_WINDSHIELD_WIDTH, center: 0 }] : []
    const rearWindow: WallWindow[] = windowOpacityPercent(windows, "behind") !== undefined ? [{ main: VEHICLE_WINDSHIELD_WIDTH, center: 0 }] : []
    addRoom(
      group,
      VEHICLE_CABIN_HALF_WIDTH,
      VEHICLE_CABIN_HALF_DEPTH,
      VEHICLE_CABIN_Y - VEHICLE_CABIN_HEIGHT / 2,
      VEHICLE_CABIN_Y + VEHICLE_CABIN_HEIGHT / 2,
      VEHICLE_WINDOW_HEIGHT,
      windshield,
      rearWindow,
      doorWindow("front-left", "behind-left"),
      doorWindow("front-right", "behind-right")
    )
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

/** A narrow-body airliner's own dimensions, in meters — 35 m of span, 37 of length. Kept crude on
 * purpose: at the distance an aircraft is mistaken for something else, its silhouette is a couple
 * of pixels and it is the LIGHTS that make the image (see LightRig.ts). A real airframe belongs
 * with the downloadable 3D models, not here. */
const AIRCRAFT_HALF_SPAN = 17
const AIRCRAFT_HALF_LENGTH = 18.5
const AIRCRAFT_BODY_COLOR: RgbColor = [0.16, 0.16, 0.18]

function buildAircraft(): Group {
  const group = new Group()
  const fuselage = addPart(group, new CylinderGeometry(1.8, 1.8, AIRCRAFT_HALF_LENGTH * 2, 10), AIRCRAFT_BODY_COLOR, 0)
  // Cylinders stand up by default; an aeroplane lies along its own +z.
  fuselage.rotation.x = Math.PI / 2
  addPart(group, new BoxGeometry(AIRCRAFT_HALF_SPAN * 2, 0.5, 4.5), AIRCRAFT_BODY_COLOR, 0)
  const fin = addPart(group, new BoxGeometry(0.4, 5.5, 4), AIRCRAFT_BODY_COLOR, 3)
  fin.position.z = -AIRCRAFT_HALF_LENGTH + 2
  return group
}

/**
 * Builds/lights the compound Three.js primitive objects for decor (buildings/trees/streetlights/
 * vehicles/other witnesses) — static methods, not an instance class: each call is a single,
 * independent build with no state shared across decor objects (unlike e.g. ShapeGroup, which holds
 * a member list reused across a whole drag gesture — see [[rr0-code-style-no-free-functions]]).
 */
export class DecorSystem {
  /** Where the camera should sit/face to render "from inside" `object`, at the side its
   * witnessSide names — local (x,z) offset from the object's own anchor point (before that
   * object's own headingDeg rotation/world position are applied — SceneRenderer.
   * updateDecorAnchoring does that part, the same way it already anchors decor to the witness's
   * real-world drift), the camera's own ABSOLUTE eye height (not an offset — SceneRenderer sets
   * camera.position.y to this value directly, no "+1.6" added on top; see EYE_HEIGHT_M's own doc
   * comment for why building/vehicle can't share that formula), and the heading (same convention
   * as ObserverPose.headingDeg) that makes the camera look outward through that side. (x,z) reuse
   * sideOffset — the exact same numbers addOccupant places the visible figure at — so the camera
   * always renders from exactly where that figure appears to stand, never a different spot; eyeY
   * is deliberately its OWN number for vehicle (VEHICLE_EYE_Y), not tied to the figure's own base
   * position (VEHICLE_WITNESS_Y) — a figure's visual "feet" placement and a camera's own eye
   * height serve different purposes and don't need to be the same value. Throws if
   * object.witnessSide is unset — callers (SceneRenderer) only call this after finding an object
   * that has one. */
  static occupantView(object: DecorObject): { x: number; z: number; eyeY: number; headingDeg: number } {
    const side = object.witnessSide
    if (!side) throw new Error("occupantView requires object.witnessSide to be set")
    const { x, z } =
      object.kind === "vehicle"
        ? sideOffset(side, VEHICLE_CABIN_HALF_WIDTH, VEHICLE_CABIN_HALF_DEPTH, VEHICLE_WITNESS_INSET)
        : sideOffset(side, BUILDING_WIDTH / 2, BUILDING_DEPTH / 2, BUILDING_WITNESS_INSET)
    const eyeY = object.kind === "vehicle" ? VEHICLE_EYE_Y : (object.occupiedFloor ?? 0) * BUILDING_FLOOR_HEIGHT + EYE_HEIGHT_M
    const headingDeg = (object.headingDeg ?? 0) - SIDE_YAW_RAD[side] / DEG_TO_RAD
    return { x, z, eyeY, headingDeg }
  }

  /** headingDeg rotates the whole group around Y, same "-heading, clockwise from north" convention
   * as SceneRenderer.setObserverPose's camera yaw — meaningful for vehicle/witness, a harmless
   * no-op on a rotationally-symmetric building/tree/streetlight. Takes the whole DecorObject
   * (rather than each field as its own parameter, as this used to) now that building/vehicle need
   * several more fields (windows/witnessSide/floors/occupiedFloor) — `lit` alone stays a
   * separate parameter since callers pass a time-resolved value (resolveDecorLitAt), not the
   * object's own static `lit` field. */
  static build(object: DecorObject, lit: boolean): Group {
    const group =
      object.kind === "building"
        ? buildBuilding(object.floors ?? DEFAULT_BUILDING_FLOORS, object.windows, object.witnessSide, object.occupiedFloor)
        : object.kind === "tree"
          ? buildTree()
          : object.kind === "streetlight"
            ? buildStreetlight(lit)
            : object.kind === "vehicle"
              ? buildVehicle(lit, object.windows, object.witnessSide)
              : object.kind === "aircraft"
                ? buildAircraft()
                : buildWitness()
    if (object.headingDeg !== undefined) group.rotation.y = -object.headingDeg * DEG_TO_RAD
    this.addLights(group, object.lights)
    return group
  }

  /** One small emissive sphere per declared lamp, at its own place on the body. Built dark: every
   * one of them is switched by setLights on the very first tick, from the pattern it declares. */
  private static addLights(group: Group, lights: DecorLight[] | undefined): void {
    for (const light of lights ?? []) {
      const mesh = addPart(group, new SphereGeometry(LAMP_RADIUS_M, 8, 6), hexToRgb(light.color), light.offsetM.y, true)
      mesh.position.set(light.offsetM.x, light.offsetM.y, light.offsetM.z)
      mesh.userData = { emissive: true, lightId: light.id } satisfies DecorMeshUserData
      mesh.visible = false
    }
  }

  /**
   * Switches every declared lamp for the instant `t`, and sizes it for its distance.
   *
   * A real navigation light is a point: at three kilometres its bulb subtends far less than a
   * pixel, and rendering it true to size would make an aircraft that is plainly visible in life
   * disappear here. What the eye and the sensor actually see at that range is not the bulb but its
   * glare, whose size comes from the optics rather than from the lamp — so the mesh is scaled to
   * hold a constant small ANGLE instead of a constant size, which is the same argument (and the
   * same remedy) as the floor already applied to the planets in SceneRenderer.
   *
   * `distanceM` is measured to the object as a whole; a wingtip is not meaningfully further away
   * than a tail at any distance where this matters.
   */
  static setLights(group: Group, lights: DecorLight[] | undefined, t: number, distanceM: number): void {
    if (!lights || lights.length === 0) return
    const byId = new Map(lights.map(light => [light.id, light]))
    const scale = Math.max(1, (distanceM * LAMP_MIN_ANGULAR_RADIUS_RAD) / LAMP_RADIUS_M)
    for (const child of group.children) {
      if (!(child instanceof Mesh)) continue
      const lightId = (child.userData as DecorMeshUserData).lightId
      if (!lightId) continue
      const light = byId.get(lightId)
      if (!light) continue
      child.visible = isLightOnAt(light, t)
      child.scale.setScalar(scale * (light.intensity ?? 1) ** 0.5)
    }
  }

  /** Re-tints a streetlight's lamp head / vehicle's headlights in place when their lit state
   * changes mid-recording (see Decor.ts's own resolveDecorLitAt) — every emissive part in the
   * group gets the same on/off color, which is correct today (a streetlight has one lamp, a
   * vehicle's two headlights always switch together) without needing to track parts individually.
   * A no-op for building/tree/witness: they have no emissive children (see addPart's own
   * `emissive` flag), so the loop below simply finds nothing to retint. */
  static setLit(group: Group, kind: DecorKind, lit: boolean): void {
    const color = kind === "streetlight" ? (lit ? LIT_LAMP_COLOR : UNLIT_LAMP_COLOR) : lit ? LIT_HEADLIGHT_COLOR : UNLIT_HEADLIGHT_COLOR
    for (const child of group.children) {
      const data = child.userData as DecorMeshUserData
      // A declared lamp keeps its own regulated colour — a red port light must not be repainted
      // the warm white of a headlight just because both are emissive.
      if (!(child instanceof Mesh) || !data.emissive || data.lightId) continue
      ;(child.material as MeshBasicMaterial).color.setRGB(...color)
    }
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
