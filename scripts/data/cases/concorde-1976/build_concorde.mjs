// The Concorde film of 1976 as a recording, from what was MEASURED on the file (s48.json, s48-orb.json).
// MEASURED: how the camera tilts (the ground's shift), the slow-motion factor. Everything else about the flight is SUPPOSED, and says so.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Astronomy from 'astronomy-engine'
import { Euler, Quaternion, Vector3 } from 'three'
import { READINGS } from './readings.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const frames = JSON.parse(readFileSync(join(here, 's4b.json')))
// The shot at its own speed: one stretch of the file, from the orb coming down to the orb rising again above the fuselage.
const FROM_S = 4.25, TO_S = 9.6, RATE = 1
const FOV_V = Number(process.env.FOV_V ?? 20) // SUPPOSED: with the altitude, what makes a field of some 250 m cover 60 px; the aircraft's silhouette does not tell
const LAT = 51.0, LNG = -1.5, ALT_M = Number(process.env.ALT_M ?? 3000) // SUPPOSED: "over southern England"; 3 km from the size of the fields, some 250 m wide over 60 px
const PITCH0 = -29 // SUPPOSED, fitted: fitting the model's silhouette on the film gives 30 to 40 degrees from above
const HOURS_UTC = Number(process.env.HOURS_UTC ?? 16), SUN_LEFT_DEG = Number(process.env.SUN_LEFT ?? 130) // SUPPOSED: the film's fuselage and fin are lit on the camera's side, which puts the Sun behind the camera and to its left, out of any lens's reach
const date = new Date(Date.UTC(1976, 5, 15, Math.floor(HOURS_UTC), (HOURS_UTC % 1) * 60))
const observer = new Astronomy.Observer(LAT, LNG, ALT_M)
const eq = Astronomy.Equator('Sun', date, observer, true, true)
const sun = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal')
const heading = (sun.azimuth + SUN_LEFT_DEG) % 360
const durationS = (TO_S - FROM_S) / RATE
const smoothIn = (list, t, key) => { const s = list.filter(f => Math.abs(f.t - t) <= 0.05); return s.reduce((v, f) => v + f[key], 0) / s.length }
const tiltAt = ms => { const t = FROM_S + (ms / 1000) * RATE, s = frames.filter(f => Math.abs(f.t - t) <= 0.08); return s.reduce((v, f) => v + f.gy, 0) / s.length }
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n
const keys = []
for (let ms = 0; ms <= durationS * 1000 + 1; ms += 100) keys.push({ t: Math.round(ms), pitchDeg: round(PITCH0 + tiltAt(ms) * FOV_V / 480) })
const film = (id, t, fromS, toS, title, track) => ({
  id, kind: 'video', src: '/demo-data/concorde-1976-tlc.mp4', title,
  credit: 'British Airways Film Unit, as TLC broadcast it (copy posted on YouTube by allcoded)', creditUrl: 'https://www.youtube.com/watch?v=qgxHICb7ceg',
  opacity: 1, t, video: { fromS, toS },
  registration: { headingDeg: round(heading), pitchDeg: track[0].pitchDeg, rollDeg: -ROLL_DEG, fovDeg: FOV_V },
  registrationTrack: track.map(k => ({ t: k.t, headingDeg: round(heading), pitchDeg: k.pitchDeg, rollDeg: -ROLL_DEG }))
})
// Where the film shows the aircraft at each key: the direction of the middle of what is white in the frame, under the camera's pose then, at
// the distance its length gives (concorde-track). So laid over the film it fits frame by frame. Only the ratio of length to distance is measured.
const ROLL_DEG = Number(process.env.ROLL ?? -7.2) // the camera's: fitted, what holds the aircraft level in the frame with its nose towards the lens
const LENGTH_M = 61.66, TAN = Math.tan(FOV_V / 2 * Math.PI / 180), D2R = Math.PI / 180
// Along the aircraft's length the measure is the noisiest (its nose and tail come and go on the threshold) and the real motion the slowest: averaged
// over half a second. Up and down, a tenth, for the film's jolts are the camera's and are real.
const planeAt = ms => { const t = FROM_S + (ms / 1000) * RATE, near = w => frames.filter(f => Math.abs(f.t - t) <= w && f.plane), mean = (s, i) => s.reduce((v, f) => v + f.plane[i], 0) / s.length, wide = near(0.25), tight = near(0.05); return { y: mean(tight, 1), left: mean(wide, 3), right: mean(wide, 4) } }
const first = planeAt(0), distanceM = LENGTH_M / (2 * TAN * ((first.right - first.left) / 2) / 240)
const D2R_ = Math.PI / 180
const COURSE_DEG = (heading + Number(process.env.COURSE ?? 105)) % 360 // judged on the overlay: the near wing further back than the far one and the engines hidden, as the film shows; a flat outline cannot tell (seen from above or below it is the same)
// The flight itself, MEASURED as far as it can be: how far the ground has slid in the frame, in px, turned into metres by what a pixel covers
// on the ground there under the supposed height and field. The aircraft flies with the camera, so it takes the same path.
// Worked out at the frame's centre, while the flow is measured low in it, where the ground is nearer: calibrated on the render, 33 px/s against 43.
const groundMPerPx = (ALT_M / Math.sin(-PITCH0 * D2R)) * (FOV_V / 480 * D2R) * (33.4 / 43)
// A straight fit: the flow is steady to r = 0.999, and what is left of it frame to frame is the measure's own noise, which the observer's path and
// the aircraft's, interpolated each its own way, did not share: it shook the aircraft by half a metre.
const flowFrames = frames.filter(f => f.t >= FROM_S && f.t <= TO_S), flowMeanT = flowFrames.reduce((v, f) => v + f.t, 0) / flowFrames.length, flowMeanX = flowFrames.reduce((v, f) => v + f.gx, 0) / flowFrames.length
const flowPxPerS = flowFrames.reduce((v, f) => v + (f.t - flowMeanT) * (f.gx - flowMeanX), 0) / flowFrames.reduce((v, f) => v + (f.t - flowMeanT) ** 2, 0)
const speedMS = -flowPxPerS * RATE * groundMPerPx
const flownM = ms => speedMS * ms / 1000
const eastOf = ms => flownM(ms) * Math.sin(COURSE_DEG * D2R), northOf = ms => flownM(ms) * Math.cos(COURSE_DEG * D2R)
const latAt = ms => LAT + northOf(ms) / 111320, lngAt = ms => LNG + eastOf(ms) / (111320 * Math.cos(LAT * D2R))
const track = keys.map(k => { const p = planeAt(k.t), u = ((p.left + p.right) / 2 - 320) / 240 * TAN, v = (240 - (p.y - 8)) / 240 * TAN
  const az = (heading + Math.atan(u) / D2R) * D2R, alt = (k.pitchDeg + Math.atan(v) / D2R) * D2R
  return { t: k.t, eastM: round(eastOf(k.t) + distanceM * Math.cos(alt) * Math.sin(az), 2), northM: round(northOf(k.t) + distanceM * Math.cos(alt) * Math.cos(az), 2), altitudeM: round(ALT_M + 1.6 + distanceM * Math.sin(alt), 2), headingDeg: round(COURSE_DEG, 2) } }) // fitted on the overlay: its nose a little further from the camera, the middle of the white a little under the fuselage's
// The orb, as the film shows it: the account. Nobody is known to have seen it in flight; it is what the frames hold, so its directions are
// MEASURED and nothing else is said of it (no distance, no size in metres). Found frame by frame among the faint compact blobs of s4b.json:
// coming down and back up on the column x ≈ 444 (A, B), then rising above the fuselage (D). Between the two it crosses the dark band under the
// wing, where this copy at its own speed does not separate it from the band; the slow motion of the documentary shows it sliding there towards
// the nose (x 441 to 458), which the interpolation between the two keeps.
const OUT_OF_PICTURE = (x, y) => x < 0 || x > 640 || y < 0 || y > 480
const orbRows = (() => {
  const rows = []
  let previous = { x: 441.8, y: 41.9 }
  for (const frame of frames) {
    const rising = frame.t >= 8.5 && frame.t <= 8.8
    if (!(frame.t <= 7.06 || rising)) continue
    const candidates = frame.blobs.filter(b => b.n < 120 && b.mx - b.bg > 20 && (rising ? b.x > 455 && b.x < 475 && b.y < 250 : b.x > 425 && b.x < 480))
    if (!rising) candidates.sort((a, b) => Math.hypot(a.x - previous.x, a.y - previous.y) - Math.hypot(b.x - previous.x, b.y - previous.y))
    const blob = candidates[0]
    if (!blob || OUT_OF_PICTURE(blob.x, blob.y) || (!rising && Math.hypot(blob.x - previous.x, blob.y - previous.y) > 60)) continue
    if (!rising) previous = blob
    rows.push({ t: frame.t, x: blob.x, y: blob.y, n: blob.n })
  }
  return rows
})()
// A pixel of the film as a direction of the sky: through the panel the reference is drawn on (ReferenceSystem: its height spans the field, the
// registration turns it as intrinsic YXZ), under the registration at that instant, interpolated as ReferenceTimeline.registrationAt does.
const pitchAtMs = ms => { const after = keys.findIndex(k => k.t > ms), a = keys[Math.max(after - 1, 0)], b = keys[after === -1 ? keys.length - 1 : after]; const s = b.t > a.t ? Math.min(Math.max((ms - a.t) / (b.t - a.t), 0), 1) : 0; return a.pitchDeg + (b.pitchDeg - a.pitchDeg) * s }
const aimOfPixel = (x, y, ms) => {
  const height = 2 * TAN, width = height * 640 / 480
  const direction = new Vector3((x / 640 - 0.5) * width, (0.5 - y / 480) * height, -1).normalize()
  direction.applyQuaternion(new Quaternion().setFromEuler(new Euler(pitchAtMs(ms) * D2R, -heading * D2R, ROLL_DEG * D2R, 'YXZ')))
  return { azimuthDeg: round(((Math.atan2(direction.x, -direction.z) / D2R) + 360) % 360, 3), altitudeDeg: round(Math.asin(direction.y) / D2R, 3) }
}
const orbSizes = orbRows.map(r => 2 * Math.sqrt(r.n / Math.PI)).sort((a, b) => a - b)
const orbDeg = round(orbSizes[Math.floor(orbSizes.length / 2)] * FOV_V / 480, 3)
const ORB_TITLE = { fr: 'Orbe', en: 'Orb', es: 'Orbe', it: 'Sfera' }
const orbKeys = orbRows.filter((r, i) => r.t > 8 || i % 2 === 0 || i === orbRows.length - 1).map(r => {
  const ms = Math.round((r.t - FROM_S) / RATE * 1000)
  return { t: ms, shapes: [{ sourceId: 'orb', shape: { aim: { value: aimOfPixel(r.x, r.y, ms), basis: 'derived', rationale: `Measured on the film: where it shows it at ${r.t.toFixed(2)} s of the file: (${r.x.toFixed(1)}, ${r.y.toFixed(1)}) of its 640 × 480, under the film's registration then.` }, kind: 'oval', angular: { widthDeg: orbDeg, heightDeg: orbDeg }, color: '#eef3f2', title: ORB_TITLE } }] }
})
const lastOrbMs = orbKeys[orbKeys.length - 1].t
const timeline = { keyframes: [...orbKeys, { t: lastOrbMs + 40, shapes: [] }], order: ['orb'], groups: [] }
const recording = {
  version: 4,
  id: 'concorde-1976',
  summaryTime: 2.2,
  observer: { id: 'BritishAirwaysFilmUnit', title: 'British Airways Film Unit' },
  sources: [
    { title: 'Analysis of Concorde UFO footage', url: 'https://www.youtube.com/watch?v=qgxHICb7ceg', publication: { publisher: 'YouTube (allcoded)', time: '2015-03-12' } },
    { title: 'Concorde and UFO', url: 'https://www.youtube.com/watch?v=scQNEUNjIFc', publication: { publisher: 'YouTube (carlos barria)', time: '2022-02-13' } },
    { title: 'UFOs at close sight: aircraft', url: 'https://ufologie.patrickgross.org/htm/vidair.htm', publication: { publisher: 'Patrick Gross' } }
  ],
  milestones: [
    { t: 0, label: 'A', note: { en: 'The orb comes down from the top of the frame, on one column of the picture.', fr: "L'orbe descend du haut du cadre, sur une seule colonne de l'image.", es: 'El orbe baja desde lo alto del encuadre, por una sola columna de la imagen.', it: "La sfera scende dall'alto del fotogramma, lungo una sola colonna dell'immagine." } },
    { t: 2240, label: 'B', note: { en: 'It turns back as the camera does, a tenth of a second ahead of it.', fr: "Elle repart vers le haut quand la caméra le fait, un dixième de seconde avant elle.", es: 'Vuelve a subir cuando lo hace la cámara, una décima de segundo antes.', it: 'Risale quando lo fa la camera, un decimo di secondo prima.' } },
    { t: 3100, label: 'C', note: { en: 'It slides along the dark band under the wing, towards the nose.', fr: "Elle glisse le long de la bande sombre sous l'aile, vers le nez.", es: 'Se desliza a lo largo de la banda oscura bajo el ala, hacia el morro.', it: "Scivola lungo la banda scura sotto l'ala, verso il muso." } },
    { t: 4250, label: 'D', note: { en: 'It shows again above the fuselage, rising, as the shot ends.', fr: 'Elle réapparaît au-dessus du fuselage, en montant, à la fin du plan.', es: 'Reaparece sobre el fuselaje, subiendo, al final del plano.', it: 'Riappare sopra la fusoliera, salendo, alla fine della ripresa.' } }
  ],
  tags: ['Concorde', 'lens flare', 'Astrovision'],
  time: date.toISOString().slice(0, 19),
  utcOffsetHours: 0,
  durationSeconds: round(durationS),
  place: { name: "Southern England (supposed)", locations: [{ lat: LAT, lng: LNG }] },
  description: {
    fr: "Le Concorde de British Airways filmé depuis un Learjet par la caméra périscope Astrovision, et l'orbe qui l'accompagne. Mesurés sur le film : l'inclinaison de la caméra, le défilement du sol, le contraste, la netteté et les poussières de la copie. Ajustés sur le film : l'attitude du Concorde. Supposés : date, heure, lieu, altitude, focale, pellicule, et donc la place du Soleil. Alan Tanner, de l'équipe du film, y voit un reflet du Soleil dans le périscope.",
    en: "British Airways' Concorde filmed from a Learjet through the Astrovision periscope camera, and the orb that goes with it. Measured on the film: the camera's tilt, the ground sliding by, the copy's contrast, softness and dust. Fitted on the film: the Concorde's attitude. Supposed: date, hour, place, height, lens, film stock, hence where the Sun is. Alan Tanner, of the film's crew, sees in it a reflection of the Sun in the periscope.",
    es: "El Concorde de British Airways filmado desde un Learjet con la cámara periscópica Astrovision, y el orbe que lo acompaña. Medidos en la película: la inclinación de la cámara, el desfile del suelo, el contraste, la nitidez y el polvo de la copia. Ajustada en la película: la actitud del Concorde. Supuestos: fecha, hora, lugar, altitud, focal, película, y por tanto la posición del Sol. Alan Tanner, del equipo de la película, ve en él un reflejo del Sol en el periscopio.",
    it: "Il Concorde di British Airways filmato da un Learjet con la cinepresa a periscopio Astrovision, e la sfera che lo accompagna. Misurati sul film: l'inclinazione della camera, lo scorrere del suolo, il contrasto, la nitidezza e la polvere della copia. Adattato sul film: l'assetto del Concorde. Supposti: data, ora, luogo, altitudine, focale, pellicola, e quindi la posizione del Sole. Alan Tanner, della troupe del film, vi vede un riflesso del Sole nel periscopio." 
  },
  instrument: process.env.INSTRUMENT ?? 'cine-35mm-broadcast',
  // A rule of thumb that owes nothing to this film: the sunny day's, ISO 100 at f/11 and 1/250 s, that is f/18 for this stock of ISO 64 at the 1/48 s of a cinema camera's shutter. The stock and the settings are SUPPOSED.
  film: 'eastman-5247-1974', // SUPPOSED: one of the two negatives Kodak dates to the period, the one rated for daylight
  exposureSeconds: 1 / 48,
  observerTrack: { keyframes: keys.map(k => ({ t: k.t, pose: { lat: round(latAt(k.t), 8), lng: round(lngAt(k.t), 8), elevationM: ALT_M, headingDeg: round(heading), pitchDeg: k.pitchDeg, rollDeg: ROLL_DEG, fovDeg: FOV_V, fNumber: Number(process.env.F ?? 18) } })) },
  // What the film shows: fields under a clear air, no cloud in any frame. Stated, so that no record of a supposed date is asked for.
  weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: 0, cloudLayers: [], relativeHumidity: {"value": 0.85, "basis": "assumed", "rationale": "A humid summer afternoon over southern England; no record of the day, whose date is itself supposed"}, visibilityKm: {"value": 8, "basis": "derived", "rationale": "From the film: the haze that leaves the ground under the aircraft (5 km off) as detailed as the film shows it. The film loses the farther ground faster than any haze can, which is put down to its copy (a 480-line television transfer), not to the air"} } }] },
  timeline,
  decor: [{ id: 'concorde', kind: 'aircraft', title: { fr: 'Concorde', en: 'Concorde' }, eastM: track[0].eastM, northM: track[0].northM, headingDeg: track[0].headingDeg, sizeM: { widthM: 25.64, lengthM: 61.66, heightM: 9.74 }, model: { id: 'mgg8-concorde-g-boac-gear-up' }, track }],
  references: [film('film', 0, FROM_S, TO_S, { fr: 'Le film', en: 'The film' }, keys)]
}
const OUT = process.env.OUT ?? join(here, '..', '..', '..', '..', 'public', 'demo-data', 'observer-concorde-1976.json')
// What was added to the recording by hand after it was built, in the editor (its share picture, its pinned snapshots), is kept.
try { const before = JSON.parse(readFileSync(OUT)); for (const key of ['image', 'snapshots']) if (before[key] !== undefined) recording[key] = before[key] } catch { /* no recording yet */ }
writeFileSync(OUT, JSON.stringify(recording, null, 1))

// The readings, each a recording of its own (the account's place, time, pose, film and decor; no phenomenon of its own, since what it
// claims is in its `interpretation`), and the case that lists them beside the film (see readings.mjs for what each says and found).
const DEMO = dirname(OUT)
const ORB_SIZE_RAD = orbDeg * D2R
const caseEvents = [{ type: 'event', eventType: 'sighting', id: 'film', time: '1976', title: 'British Airways Film Unit', url: 'observer-concorde-1976.json' }]
// The glint a reading claims on the aircraft: a point as bright as the Sun reflected in glass, where the film shows the windscreen (the
// dark cockpit, MEASURED at 4.5 s: 93 % of the aircraft's length from its tail, 21.5 px above the middle of its white, for an aircraft
// 541 px long), carried with the aircraft frame by frame as the film shows it, at the aircraft's distance. The lens's ghosts are not
// stated: the camera's own are drawn from every light of the picture (see GhostPass), this one with them.
const WINDSCREEN_ALONG = (581 - 78) / (619 - 78), WINDSCREEN_ABOVE_PX = 21.5, WINDSCREEN_LENGTH_PX = 619 - 78
const glintBody = ({ luminanceCdM2, sizeM }) => ({
  id: 'glint',
  title: { fr: "L'éclat du Soleil au pare-brise (supposé)", en: "The Sun's glint on the windscreen (supposed)", es: 'El destello del Sol en el parabrisas (supuesto)', it: 'Il bagliore del Sole sul parabrezza (supposto)' },
  explains: [], model: { id: 'sphere' },
  track: [
    ...keys.map((key, index) => {
      const p = planeAt(key.t), length = p.right - p.left
      const aim = aimOfPixel(p.left + WINDSCREEN_ALONG * length, p.y - WINDSCREEN_ABOVE_PX * length / WINDSCREEN_LENGTH_PX, key.t)
      return { t: key.t, ...(index === 0 ? { present: true, sizeM: { widthM: sizeM, lengthM: sizeM, heightM: sizeM }, appearance: { color: '#ffffff', luminanceCdM2 } } : {}), ...aim, distanceM: round(distanceM, 1) }
    })
  ]
})
for (const reading of READINGS) {
  const { image: _image, snapshots: _snapshots, milestones: _milestones, ...account } = recording
  const bodies = reading.glint ? [glintBody(reading.glint)] : reading.distanceM === undefined ? [] : [{
    id: 'orb', title: ORB_TITLE, explains: ['orb'], model: { id: 'sphere' },
    track: [
      ...orbKeys.map((key, index) => ({
        t: key.t, ...(index === 0 ? { present: true } : {}), ...key.shapes[0].shape.aim.value, distanceM: reading.distanceM,
        ...(index === 0 ? { sizeM: { widthM: round(reading.distanceM * ORB_SIZE_RAD, 2), lengthM: round(reading.distanceM * ORB_SIZE_RAD, 2), heightM: round(reading.distanceM * ORB_SIZE_RAD, 2) }, appearance: { color: '#f4f6f5', albedo: 0.8 } } : {})
      })),
      { t: lastOrbMs + 40, present: false }
    ]
  }]
  const file = `interpretation-concorde-1976-${reading.id}.json`
  writeFileSync(join(DEMO, file), JSON.stringify({
    ...account,
    id: `concorde-1976-${reading.id}`,
    tags: [...account.tags, 'interpretation'],
    ...(reading.lens ? { lens: reading.lens } : {}),
    timeline: { keyframes: [], order: [], groups: [] },
    // The film is there to be compared with, not laid over what the reading claims: drawn at full opacity it hid it. Its slider brings it back.
    references: account.references.map(reference => ({ ...reference, opacity: 0 })),
    interpretation: { title: reading.title, bodies, findings: reading.findings }
  }, null, 1))
  caseEvents.push({ type: 'event', eventType: 'sighting', id: reading.id, interpretationOf: 'film', ...(reading.time ? { time: reading.time } : {}), by: reading.by, title: reading.title, url: file })
}
const CASE = join(DEMO, 'case-concorde-1976.json')
const caseJson = JSON.parse(readFileSync(CASE))
writeFileSync(CASE, JSON.stringify({ ...caseJson, events: caseEvents }, null, 1) + '\n')
console.log({ distanceM: round(distanceM, 1), speedMS: round(speedMS, 1), groundMPerPx: round(groundMPerPx, 2), durationS: round(durationS), sunAz: round(sun.azimuth, 1), sunAlt: round(sun.altitude, 1), heading: round(heading, 1), pitchRange: [Math.min(...keys.map(k => k.pitchDeg)), Math.max(...keys.map(k => k.pitchDeg))], keys: keys.length })
