/**
 * Equirectangular lat/lng <-> local X/Z meters, centered on an observer's own position — accurate
 * enough at the ~1km radius terrain patch uses (see TerrainMeshBuilder). Shares its convention
 * with skyColors.ts's horizontalToCartesian: azimuth 0deg (north) -> -Z, east -> +X, +Y up.
 */
const DEG_TO_RAD = Math.PI / 180
const METERS_PER_DEG_LAT = 111320

export interface LocalMeters {
  x: number
  z: number
}

export function geoToLocalMeters(latDeg: number, lngDeg: number, originLatDeg: number, originLngDeg: number): LocalMeters {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(originLatDeg * DEG_TO_RAD)
  const north = (latDeg - originLatDeg) * METERS_PER_DEG_LAT
  const east = (lngDeg - originLngDeg) * metersPerDegLng
  return { x: east, z: -north }
}

export function localMetersToGeo(x: number, z: number, originLatDeg: number, originLngDeg: number): { lat: number; lng: number } {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(originLatDeg * DEG_TO_RAD)
  const north = -z
  const east = x
  return { lat: originLatDeg + north / METERS_PER_DEG_LAT, lng: originLngDeg + east / metersPerDegLng }
}
