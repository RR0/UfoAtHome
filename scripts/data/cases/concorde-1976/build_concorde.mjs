// The Concorde film of 1976 as a recording, from what was MEASURED on the file (s48.json, s48-orb.json).
// MEASURED: how the camera tilts (the ground's shift), the slow-motion factor. Everything else about the flight is SUPPOSED, and says so.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Astronomy from 'astronomy-engine'

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
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  decor: [{ id: 'concorde', kind: 'aircraft', title: { fr: 'Concorde', en: 'Concorde' }, eastM: track[0].eastM, northM: track[0].northM, headingDeg: track[0].headingDeg, sizeM: { widthM: 25.64, lengthM: 61.66, heightM: 9.74 }, model: { id: 'mgg8-concorde-g-boac-gear-up' }, track }],
  references: [film('film', 0, FROM_S, TO_S, { fr: 'Le film', en: 'The film' }, keys)]
}
writeFileSync(process.env.OUT ?? join(here, '..', '..', '..', '..', 'public', 'demo-data', 'observer-concorde-1976.json'), JSON.stringify(recording, null, 1))
console.log({ distanceM: round(distanceM, 1), speedMS: round(speedMS, 1), groundMPerPx: round(groundMPerPx, 2), durationS: round(durationS), sunAz: round(sun.azimuth, 1), sunAlt: round(sun.altitude, 1), heading: round(heading, 1), pitchRange: [Math.min(...keys.map(k => k.pitchDeg)), Math.max(...keys.map(k => k.pitchDeg))], keys: keys.length })
