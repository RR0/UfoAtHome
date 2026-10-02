import type { TrafficTexts } from "./messages/SceneNames.js"
import type { TrafficInfo } from "../engine/traffic/TrafficInfo.js"

/**
 * The label of an aircraft pointed at: who it is, how it flies, where it is in the sky, how it sounds — one line each.
 *
 * Worded for what a record can say. It names a candidate: an aircraft that was there, at that height and going that way,
 * heard (or not) from where the observer stands. It never says that this is what was seen.
 */
export class TrafficTooltip {
  /** The sentences in English, which is what a reader has until their language's module has arrived and all an English reader ever has. */
  static readonly ENGLISH: TrafficTexts = {
    unnamed: "Aircraft {hex}",
    altitude: "{value} ft",
    speed: "{value} kt",
    heading: "heading {value}°",
    position: "{distance} km away, {elevation}° above the horizon, {bearing}",
    heard: "Heard at {level} dB(A), left the aircraft {delay} s ago, {lag}° behind it: {character}{pitch}",
    rumble: "a low rumble, nothing above {cutoff} Hz",
    muffled: "a dull noise, nothing above {cutoff} Hz",
    broad: "a broad roar",
    pitchHigher: ", pitch {percent} % higher",
    pitchLower: ", pitch {percent} % lower",
    inaudible: "Not audible here: {level} dB(A) against {ambient} dB(A) of ambient noise",
    soundUnknown: "Its sound cannot be worked out: the aircraft was not recorded yet when it left",
    contrailPersistent: "Leaves a trail that lasts: the air is supersaturated over ice ({rhi} % over ice)",
    contrailShort: "Leaves a short-lived trail: the air is dry over ice ({rhi} % over ice)",
    military: "military",
    restricted: "identity withheld by its owner",
    candidate: "A compatible candidate, not an identification"
  }

  /** The highest a sound goes, Hz, for it to be called a rumble, and for it to be called dull rather than broad. */
  private static readonly RUMBLE_BELOW_HZ = 500
  private static readonly DULL_BELOW_HZ = 2000
  /** A pitch is worth mentioning past this much, as a fraction. */
  private static readonly PITCH_NOTICED = 0.03

  /**
   * The label. `towards` says where a bearing is ("au NO", "towards NW"), `locale` how numbers are written.
   */
  static text(info: TrafficInfo, texts: TrafficTexts, towards: (azimuthDeg: number) => string, locale?: string): string {
    const number = (value: number, digits = 0) => value.toLocaleString(locale, { maximumFractionDigits: digits })
    const fill = (template: string, fields: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => fields[key] ?? `{${key}}`)
    const lines: string[] = []
    const name = [info.registration, info.name].filter(Boolean).join(" · ")
    lines.push(name || fill(texts.unnamed, { hex: info.hex }))
    const flight = [
      fill(texts.altitude, { value: number(Math.round(info.altitudeFt / 100) * 100) }),
      info.groundSpeedKt === undefined ? undefined : fill(texts.speed, { value: number(Math.round(info.groundSpeedKt)) }),
      info.trackDeg === undefined ? undefined : fill(texts.heading, { value: number(Math.round(info.trackDeg)) })
    ].filter(Boolean)
    lines.push(flight.join(" · "))
    lines.push(fill(texts.position, {
      distance: number(info.sky.distanceKm, info.sky.distanceKm < 10 ? 1 : 0),
      elevation: number(Math.round(info.sky.altitudeDeg)),
      bearing: towards(info.sky.azimuthDeg)
    }))
    const heard = info.hearing
    if (!heard) lines.push(texts.soundUnknown)
    else if (!heard.audible) lines.push(fill(texts.inaudible, { level: number(Math.round(heard.levelDbA)), ambient: number(Math.round(heard.ambientDbA)) }))
    else {
      const cutoff = heard.cutoffHz ?? 0
      const character = cutoff <= TrafficTooltip.RUMBLE_BELOW_HZ ? texts.rumble : cutoff <= TrafficTooltip.DULL_BELOW_HZ ? texts.muffled : texts.broad
      const shift = heard.dopplerRatio - 1
      const pitch = Math.abs(shift) < TrafficTooltip.PITCH_NOTICED ? ""
        : fill(shift > 0 ? texts.pitchHigher : texts.pitchLower, { percent: number(Math.round(Math.abs(shift) * 100)) })
      lines.push(fill(texts.heard, {
        level: number(Math.round(heard.levelDbA)),
        delay: number(Math.round(heard.delayS)),
        lag: number(Math.round(heard.lagDeg)),
        character: fill(character, { cutoff: number(cutoff) }),
        pitch
      }))
    }
    if (info.contrail) lines.push(fill(info.contrail.persistent ? texts.contrailPersistent : texts.contrailShort, { rhi: number(Math.round(info.contrail.iceRelativeHumidity * 100)) }))
    const flags = [info.military ? texts.military : undefined, info.restricted ? texts.restricted : undefined].filter(Boolean)
    if (flags.length > 0) lines.push(flags.join(" · "))
    lines.push(texts.candidate)
    return lines.join("\n")
  }
}
