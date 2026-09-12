import type { SaidText } from "./SaidText.js"

/**
 * What a picture of the place is: a photograph, or a full-turn panorama.
 *
 * A "photo" is what an ordinary camera makes — a rectilinear image whose field is the lens's — and
 * is laid over the scene as a flat panel at that field. A "panorama" is an equirectangular image
 * covering the whole sphere (a 360° camera, a stitched turn on the spot), and is laid over it as a
 * sphere. A video is a picture that moves and is not here yet: it is a texture that follows the
 * timeline, and the same registration.
 */
export type ReferenceKind = "photo" | "panorama"

/**
 * Which way the picture was pointed — the whole of what it takes to lay it over the scene, and
 * nothing but angles: a picture is a field of directions from one point, and a direction is what
 * this project stores about anything (see BaseShape.angular for the phenomenon's own).
 *
 * The same three angles an ObserverPose holds, and for the same reason: a photograph IS a pose,
 * the camera's own. Registering a picture on the rendered relief — lining its horizon up with the
 * rendered horizon, its landmarks with the rendered ones — is what MEASURES these, where a pose
 * typed by hand only states them. That is the point of the exercise: a heading a reader could only
 * take the witness's word for becomes one a reader can check against a picture.
 */
export interface ReferenceRegistration {
  /** Degrees clockwise from true north, the direction the picture's centre looks at. */
  headingDeg: number
  /** Degrees above the local horizontal, positive up. */
  pitchDeg: number
  /** Degrees the picture is tilted about its own axis, positive clockwise as it is looked at —
   * see ObserverPose.rollDeg. Absent means level. */
  rollDeg?: number
  /**
   * The picture's VERTICAL field, degrees — what the lens took in top to bottom, its horizontal
   * field following from the image's own aspect ratio. A panorama ignores it: it covers everything.
   *
   * A parameter of the registration rather than something read off the file, because most pictures
   * of a place carry no lens data at all — a magazine scan, a print, a screenshot — and a field
   * chosen so that the landmarks line up is as much a measurement as the heading is.
   */
  fovDeg: number
}

/**
 * One detail of the place named in the picture and in the rendered scene — a tree that hid the
 * thing, a fence, a church tower: the same point, twice.
 *
 * What lines the picture up (see PictureRegistration): two of them turn it to fit, three or more
 * fit its field too. Kept in the recording rather than in the editor's own memory, because they
 * are the working of a measurement: the heading a picture gives once it fits is only as good as
 * the landmarks it fits on, and a reader has to be able to see them, move one, and get the same
 * answer.
 */
export interface PictureLandmark {
  id: string
  /** What the detail is — "Arbre masquant", "barrière". Translatable — see SaidText. */
  label?: SaidText
  /** Where it is on the picture, 0..1 from the top-left corner. */
  picture: { u: number; v: number }
  /** Where it is from the witness, in the scene. */
  scene: { azimuthDeg: number; altitudeDeg: number }
}

/**
 * A picture of where it happened, laid over the reconstruction so the two can be compared.
 *
 * Why it exists: everything the scene draws is computed — the relief from an elevation model, the
 * sky from the ephemeris, the decor from what an author placed — and a reader looking at it has no
 * way to tell a faithful reconstruction from a plausible one. A photograph of the same place does
 * that: laid over the render at an opacity a reader can vary, every tree the model does not know,
 * every ridge the thirty-metre relief smoothed away, and the phenomenon drawn over both of them,
 * is one picture. When the photograph carries the phenomenon itself — a witness's own picture, or
 * an investigator's sketch of the trajectory drawn on a view from the spot — the comparison is
 * the testimony against the reconstruction, which is the whole reason to reconstruct.
 *
 * Not decor, deliberately. A decor object is a thing in metres standing in the scene, tested
 * against the depth of everything else; a picture is a field of directions from one point, valid
 * from that point alone, and nothing in the scene may hide it or be hidden by it. What it may do
 * is bound: the day a horizon line traced on it hides what passed below it, metres will come back
 * from it the way they come back from a decor crossing (see SizeEstimate) — but that is a later
 * statement, made on it, not by it.
 */
export interface SceneReference {
  /** Stable id, what the editor's own list and a future trace on the picture name. */
  id: string
  kind: ReferenceKind
  /**
   * Where the picture is: an address, or the picture itself as a `data:` URL.
   *
   * An address is preferred — a recording stays a few kilobytes, and rr0.org's own case pictures
   * are served to any origin. A `data:` URL is what a picture uploaded from a reader's own disk
   * becomes, so that the recording stays self-contained the way its embed snippet promises; it
   * costs the file the picture's own size, and the editor says so past a few hundred kilobytes.
   * Either way the bytes have to be readable across origins, since they are drawn by WebGL.
   */
  src: string
  /** What to call it — "Vue depuis le muret, fin été 1968". Translatable — see SaidText. */
  title?: SaidText
  /**
   * Who made it and on what terms — shown wherever the picture is, because a credit that is not
   * displayed is not a licence (see DataSource for the same rule on the data). */
  credit?: string
  /** Where that credit points: the source page, the licence. */
  creditUrl?: string
  /**
   * The instant of the timeline it was taken at, milliseconds, for a picture made DURING the
   * observation — by the witness, or by whoever was there. Absent for a picture of the place made
   * at some other time, which is most of them: an investigator's, a passer-by's, a street-level
   * capture years later. The distinction is what the picture can be compared with: a picture of
   * the place is compared with the scene, a picture of the sighting also with the phenomenon, and
   * only at its own instant.
   */
  t?: number
  /**
   * Whether somebody drew on it — a trajectory, an outline, an arrow — so that what the picture
   * shows of the phenomenon is a statement made afterwards, not a thing the camera recorded.
   * Cussac's own is one: the sphere and its spiral drawn by hand on a 1968 view from the spot.
   */
  drawing?: boolean
  /**
   * How much of it shows, 0 to 1 — the starting point of the reader's own slider, since the
   * comparison is made by sliding: all picture, all render, and the registration checked at every
   * step between.
   */
  opacity: number
  registration: ReferenceRegistration
  /** The details it was lined up on — see PictureLandmark. Absent means none named yet. */
  landmarks?: PictureLandmark[]
}

/** What a picture starts as before anybody registers it: level, straight ahead of the witness,
 * an ordinary lens's field. */
export const DEFAULT_REFERENCE_OPACITY = 0.5
export const DEFAULT_REFERENCE_FOV_DEG = 40

/** Past this many bytes of `data:` URL the editor warns that the recording is carrying a picture
 * it would rather point at. */
export const REFERENCE_INLINE_WARNING_BYTES = 400_000
