/**
 * One-off build step (not part of `build`) that measures recordings of aircraft into `test/engine/traffic/aircraft-sound-reference.json`,
 * which the sound we play is held to (see AircraftSoundCalibration.test.ts).
 *
 * Run with: npm run build:aircraft-sound-reference [directory]   (ffmpeg on the path; the directory defaults to scripts/data/aircraft-sounds)
 *
 * The recordings are Pixabay sound effects, downloaded by hand and NOT committed (scripts/data is ignored): only what is measured of them is.
 * What each is of — the class of aircraft, what it was doing, whether the microphone was inside — is what its title says, and so a
 * HYPOTHESIS: none says its type, its distance or its thrust, and "airplane-landing" sounds to the ear like a take-off. A recording whose
 * title says nothing of its class is measured and given no class, so that nothing is held to it.
 */
import { spawnSync } from "node:child_process"
import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { AircraftSoundAnalysis, type AircraftSoundMeasure } from "./AircraftSoundAnalysis.js"

/** What an aircraft was doing when it was recorded, as its title says: passing by at a steady thrust, taking off at full thrust, or coming in to land at a low one. */
export type FlightRegime = "overflight" | "takeoff" | "approach"

interface Recording {
  /** The file's name as Pixabay serves it: its author, its title and its number. */
  file: string
  pixabayId: number
  author: string
  title: string
  /** The class of AircraftHearing's NOISE_CLASSES it is supposed to be, when the title says. */
  noiseClass?: string
  regime?: FlightRegime
  /** Recorded in the cabin. */
  inside?: boolean
  note?: string
}

const RECORDINGS: Recording[] = [
  { file: "freesound_community-commercial-jet-flies-overhead-53746.mp3", pixabayId: 53746, author: "freesound_community", title: "Commercial jet flies overhead", noiseClass: "turbofan-narrow-body", regime: "overflight", note: "type not said: a narrow-body, as most of the sky is" },
  { file: "tanweraman-heavy-plane-sound-at-night-264942.mp3", pixabayId: 264942, author: "tanweraman", title: "Heavy plane sound at night", noiseClass: "turbofan-wide-body", regime: "overflight", note: "\"heavy\" taken as a wide-body" },
  { file: "tanweraman-big-plane-sound-effect-247601.mp3", pixabayId: 247601, author: "tanweraman", title: "Big plane sound effect", noiseClass: "turbofan-wide-body", regime: "overflight", note: "\"big\" taken as a wide-body" },
  { file: "tanweraman-plane-sound-from-distance-hq-247602.mp3", pixabayId: 247602, author: "tanweraman", title: "Plane sound from distance", noiseClass: "turbofan-narrow-body", regime: "overflight" },
  { file: "freesound_community-takeoff-1-distant-32737.mp3", pixabayId: 32737, author: "freesound_community", title: "Takeoff 1 distant", noiseClass: "turbofan-narrow-body", regime: "takeoff" },
  { file: "southbaysounds-airplane-taking-off-214796.mp3", pixabayId: 214796, author: "southbaysounds", title: "Airplane taking off", noiseClass: "turbofan-narrow-body", regime: "takeoff" },
  { file: "pwlpl-plane-takeoff-sound-effect-521112.mp3", pixabayId: 521112, author: "pwlpl", title: "Plane takeoff sound effect", noiseClass: "turbofan-narrow-body", regime: "takeoff" },
  { file: "freesound_community-airplane-landing-6732.mp3", pixabayId: 6732, author: "freesound_community", title: "Airplane landing", noiseClass: "turbofan-narrow-body", regime: "approach", note: "heard as a take-off; measured as a low thrust (a bright spectrum, a fan line, no roar behind)" },
  { file: "tanweraman-small-plane-passing-by-264944.mp3", pixabayId: 264944, author: "tanweraman", title: "Small plane passing by", noiseClass: "light-piston", regime: "overflight" },
  { file: "loswin23-small-airplane-520026.mp3", pixabayId: 520026, author: "loswin23", title: "Small airplane", noiseClass: "light-piston", regime: "overflight" },
  { file: "scottishperson-sound-effect-ww2-fighter-plane-fly-past-333257.mp3", pixabayId: 333257, author: "scottishperson", title: "WW2 fighter plane fly past", noiseClass: "piston-heavy", regime: "overflight", note: "a warbird's piston engine, flying past near" },
  { file: "freesound_community-airplane-fly-by-26222.mp3", pixabayId: 26222, author: "freesound_community", title: "Airplane fly by", regime: "overflight" },
  { file: "freesound_community-airplane-95615.mp3", pixabayId: 95615, author: "freesound_community", title: "Airplane" },
  { file: "freesound_community-avion-99655.mp3", pixabayId: 99655, author: "freesound_community", title: "Avion" },
  { file: "freesound_community-airplane-atmos-22955.mp3", pixabayId: 22955, author: "freesound_community", title: "Airplane atmos" },
  { file: "greatnessdon-airplane-inside-cabin-engine-sound-calm-airplane-ambienc-630924.mp3", pixabayId: 630924, author: "greatnessdon", title: "Airplane inside cabin engine sound", inside: true },
  { file: "freesound_community-cabina-avion-45849.mp3", pixabayId: 45849, author: "freesound_community", title: "Cabina avión", inside: true }
]

/** What every recording is decoded to: one channel, at a rate that keeps everything up to 11 kHz, which is above the highest band. */
const SAMPLE_RATE = 22050
/** The phases of the unmodulated noises are drawn from this, so that two runs write the same file. */
const SEED = 20261118

function decode(path: string): Float32Array {
  const run = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 30 })
  if (run.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${run.stderr.toString()}`)
  const bytes = run.stdout
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length))
}

function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const round = (value: number) => Math.round(value * 10) / 10

const directory = process.argv[2] ?? fileURLToPath(new URL("./data/aircraft-sounds/", import.meta.url))
const measured: (Omit<Recording, "file"> & AircraftSoundMeasure)[] = []
for (const recording of RECORDINGS) {
  const path = join(directory, recording.file)
  if (!existsSync(path)) {
    console.warn(`missing, skipped: ${path}`)
    continue
  }
  const measure = AircraftSoundAnalysis.measure(decode(path), SAMPLE_RATE, seeded(SEED + recording.pixabayId))
  const { file: _file, ...about } = recording
  measured.push({
    ...about,
    durationS: round(measure.durationS),
    octaveShapeDb: measure.octaveShapeDb.map(round),
    tones: measure.tones,
    fluctuationDb: round(measure.fluctuationDb),
    unmodulatedFluctuationDb: round(measure.unmodulatedFluctuationDb)
  })
  console.log(`${recording.title}: ${measure.octaveShapeDb.map(level => level.toFixed(0)).join(" ")} dB, flicker ${measure.fluctuationDb.toFixed(1)} dB (unmodulated ${measure.unmodulatedFluctuationDb.toFixed(1)})`)
}

const out = fileURLToPath(new URL("../test/engine/traffic/aircraft-sound-reference.json", import.meta.url))
writeFileSync(out, JSON.stringify({
  about: "Measures of Pixabay recordings of aircraft (scripts/build-aircraft-sound-reference.ts): what the sound we play is held to. Classes and regimes are what the titles say.",
  sampleRate: SAMPLE_RATE,
  window: AircraftSoundAnalysis.WINDOW,
  seed: SEED,
  recordings: measured
}, null, 2) + "\n")
console.log(`${measured.length} recordings → ${out}`)
