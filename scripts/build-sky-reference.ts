/**
 * One-off build step (not part of `build`/`prepublishOnly`) that traces the reference skies the
 * real-time scattering model is checked against, into `test/engine/atmosphere/sky-reference.json`.
 *
 * Run with: npm run build:sky-reference   (a few minutes: one process per case, all at once)
 *
 * Every value is a Monte Carlo estimate from SkyMonteCarlo — the same medium as SkyScattering and
 * the GPU tables, with no approximation but noise — so the file is an ORACLE for the approximation,
 * not a measurement of any real sky. Real skies are checked elsewhere, against Patat et al. (2006).
 *
 * The inputs are written into the file beside the results (medium, seed, paths) so a change to the
 * medium without re-running this is visible in a diff, and a test can refuse a stale file.
 *
 * Path counts rise with the depth of the twilight: the estimate there is heavy-tailed, a handful of
 * rare paths that reach the still-lit atmosphere carrying most of the light. Measured before choosing
 * them: at -10° and 550 nm, 4 000 paths gave half the converged value and 400 000 gave 14 % more;
 * three seeds at 4 000 000 agreed to 2 %.
 */
import { fork } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { AtmosphereProfile, type AtmosphereConditions } from "../src/engine/atmosphere/AtmosphereProfile.js"
import { VisibleSpectrum } from "../src/engine/atmosphere/Spectrum.js"
import { SkyMonteCarlo } from "../test/engine/atmosphere/SkyMonteCarlo.js"

interface SkyReferenceCase {
  readonly name: string
  readonly conditions: AtmosphereConditions
  readonly altitudeM: number
  readonly sunAltitudeDeg: number
  readonly view: { readonly altitudeDeg: number; readonly azimuthDeg: number }
  readonly paths: number
}

const PARANAL = { aerosolOpticalDepth: 0.05 }
const HAZY_SEA_LEVEL = { aerosolOpticalDepth: 0.15 }
const SEED = 20260914

function pathsFor(sunAltitudeDeg: number): number {
  return sunAltitudeDeg >= 0 ? 200_000 : sunAltitudeDeg >= -6 ? 500_000 : 2_000_000
}

const CASES: SkyReferenceCase[] = [
  ...[30, 0, -4, -6, -8, -10, -12, -14, -16].map(sunAltitudeDeg => ({
    name: `Paranal zenith, Sun at ${sunAltitudeDeg}°`,
    conditions: PARANAL,
    altitudeM: 2635,
    sunAltitudeDeg,
    view: { altitudeDeg: 90, azimuthDeg: 0 },
    paths: pathsFor(sunAltitudeDeg)
  })),
  // The two halves of a twilight sky, low down: toward the glow, and the Earth's shadow opposite.
  ...[0, 180].flatMap(azimuthDeg =>
    [-3, -8].map(sunAltitudeDeg => ({
      name: `Paranal 10° up, ${azimuthDeg === 0 ? "toward" : "away from"} a Sun at ${sunAltitudeDeg}°`,
      conditions: PARANAL,
      altitudeM: 2635,
      sunAltitudeDeg,
      view: { altitudeDeg: 10, azimuthDeg },
      paths: pathsFor(sunAltitudeDeg)
    }))
  ),
  // A witness in an aircraft: less air above, and a horizon below eye level.
  ...[90, -2].map(altitudeDeg => ({
    name: `10 km up, looking at ${altitudeDeg}° toward a Sun at -6°`,
    conditions: HAZY_SEA_LEVEL,
    altitudeM: 10_000,
    sunAltitudeDeg: -6,
    view: { altitudeDeg, azimuthDeg: 0 },
    paths: pathsFor(-6)
  })),
  // A hazy day at sea level.
  ...[
    { altitudeDeg: 90, azimuthDeg: 0 },
    { altitudeDeg: 5, azimuthDeg: 90 },
    { altitudeDeg: 48, azimuthDeg: 0 }
  ].map(view => ({
    name: `Sea level, Sun at 45°, looking at ${view.altitudeDeg}° / ${view.azimuthDeg}°`,
    conditions: HAZY_SEA_LEVEL,
    altitudeM: 2,
    sunAltitudeDeg: 45,
    view,
    paths: pathsFor(45)
  }))
]

function direction(altitudeDeg: number, azimuthDeg: number) {
  const altitude = (altitudeDeg * Math.PI) / 180
  const azimuth = (azimuthDeg * Math.PI) / 180
  return { x: Math.cos(altitude) * Math.sin(azimuth), y: Math.sin(altitude), z: Math.cos(altitude) * Math.cos(azimuth) }
}

function trace(skyCase: SkyReferenceCase) {
  const profile = new AtmosphereProfile(skyCase.conditions)
  const estimate = new SkyMonteCarlo(profile).estimate(
    skyCase.altitudeM,
    direction(skyCase.view.altitudeDeg, skyCase.view.azimuthDeg),
    direction(skyCase.sunAltitudeDeg, 0),
    { paths: skyCase.paths, seed: SEED }
  )
  const spectrum = Array.from(estimate.radiance, (value, index) => value * AtmosphereProfile.SOLAR_IRRADIANCE[index])
  const xyz = VisibleSpectrum.tristimulus(AtmosphereProfile.WAVELENGTHS_NM, spectrum, AtmosphereProfile.WAVELENGTH_STEP_NM)
  return {
    ...skyCase,
    radiance: Array.from(estimate.radiance),
    relativeError: Array.from(estimate.standardError, (error, index) => error / estimate.radiance[index]),
    luminanceCdM2: xyz[1],
    chromaticity: [xyz[0] / (xyz[0] + xyz[1] + xyz[2]), xyz[1] / (xyz[0] + xyz[1] + xyz[2])]
  }
}

const caseIndex = process.argv.indexOf("--case")
if (caseIndex >= 0) {
  process.send!(trace(CASES[Number(process.argv[caseIndex + 1])]))
  process.exit(0)
}

const started = Date.now()
const results = await Promise.all(
  CASES.map(
    (_, index) =>
      new Promise((resolve, reject) => {
        const child = fork(fileURLToPath(import.meta.url), ["--case", String(index)], { execArgv: ["--import", "tsx"] })
        child.on("message", message => {
          console.log(`${((Date.now() - started) / 1000).toFixed(0)} s  ${CASES[index].name}`)
          resolve(message)
        })
        child.on("error", reject)
        child.on("exit", code => code === 0 || reject(new Error(`case ${index} exited with ${code}`)))
      })
  )
)
const output = fileURLToPath(new URL("../test/engine/atmosphere/sky-reference.json", import.meta.url))
writeFileSync(
  output,
  JSON.stringify(
    {
      generatedBy: "scripts/build-sky-reference.ts",
      seed: SEED,
      medium: {
        wavelengthsNm: AtmosphereProfile.WAVELENGTHS_NM,
        solarIrradiance: AtmosphereProfile.SOLAR_IRRADIANCE,
        ozoneCrossSection: AtmosphereProfile.OZONE_CROSS_SECTION,
        groundAlbedo: 0.3
      },
      cases: results
    },
    null,
    1
  ) + "\n"
)
console.log(`${results.length} cases in ${((Date.now() - started) / 1000).toFixed(0)} s -> ${output}`)
