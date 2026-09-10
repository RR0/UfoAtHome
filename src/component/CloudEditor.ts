import type { SceneElement } from "./SceneElement.js"
import type { CloudInstance, CloudLayer } from "../engine/model/CloudLayer.js"
import { resolveCloudLayers } from "../engine/model/CloudLayer.js"
import { editCloudLayer, editCloudLayers } from "../engine/model/CloudEditing.js"
import { cloudOffsetAt } from "../render3d/CloudMotion.js"
import { resolveObserverPoseAt, resolveWeatherAt } from "../engine/model/Sighting.js"
import { cloudDragDelta } from "../render3d/CloudManipulation.js"
import type { CloudPoint } from "../render3d/CloudManipulation.js"
import { cloudEditorTemplate } from "./cloudEditorTemplate.js"
import { DEFAULT_ICE_CRYSTAL_ALIGNMENT } from "../engine/model/Weather.js"

/** Weather authoring shared with the editor's recording, projection and playback clock. */
export function setupCloudEditor(controls: HTMLElement, scene: SceneElement, beforeEdit: (detachWeatherSource?: boolean) => void, pointAt: (headingDeg: number, pitchDeg: number) => void, language: string = "en") {
  const translate = (en: string, fr: string) => language === "fr" ? fr : en
  controls.innerHTML = cloudEditorTemplate(language)
  const input = (id: string) => controls.querySelector<HTMLElement>("#" + id) as HTMLInputElement
  const value = (id: string) => Number(input(id).value)
  const layerSelect = controls.querySelector<HTMLElement>("#cloud-layer") as HTMLSelectElement
  const instances = controls.querySelector<HTMLElement>("#cloud-instance") as HTMLSelectElement
  const status = controls.querySelector<HTMLElement>("#cloud-status")!
  const scope = () => input("cloud-scope").value as "observation" | "instant"
  const currentLayer = () => resolveCloudLayers(resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime))[Number(layerSelect.value)]
  const instanceFields = ["east", "north", "base", "thickness", "width", "depth", "rotation", "density", "darkness"]
  const syncInstance = () => {
    const instance = currentLayer()?.instances?.find(i => i.id === instances.value)
    for (const field of instanceFields) input(`instance-${field}`).disabled = !instance
    ;(controls.querySelector<HTMLElement>("#cloud-instance-delete") as HTMLButtonElement).disabled = !instance
    ;(controls.querySelector("#cloud-instance-point") as HTMLButtonElement).disabled = !instance
    if (!instance) return
    const values = [instance.eastM, instance.northM, instance.baseM, instance.thicknessM, instance.widthM, instance.depthM, instance.rotationDeg, instance.density, instance.darkness]
    instanceFields.forEach((field, i) => { input(`instance-${field}`).value = values[i] === undefined ? "" : String(Math.round(values[i]! * 100) / 100) })
  }
  let lastTime = -1
  const sync = () => {
    const t = scene.ufoElement.currentTime
    const active = (controls.getRootNode() as ShadowRoot).activeElement
    if (t === lastTime && active instanceof HTMLInputElement && controls.contains(active)) return
    lastTime = t
    const layers = resolveCloudLayers(resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime))
    const selectedLayer = layerSelect.selectedOptions[0]?.dataset.layerId
    layerSelect.replaceChildren(...layers.map((layer, index) => {
      const option = new Option(`${index + 1} · ${layer.type} · ${Math.round(layer.baseM)} m`, String(index))
      option.dataset.layerId = layer.id
      return option
    }))
    const selectedIndex = layers.findIndex(layer => layer.id === selectedLayer)
    layerSelect.value = String(Math.max(0, selectedIndex))
    const layer = currentLayer()
    for (const id of ["cloud-type", "cloud-base", "cloud-thickness", "cloud-cover", "cloud-size", "cloud-density", "cloud-darkness", "cloud-crystal-alignment", "cloud-wind-direction", "cloud-wind-speed", "cloud-seed", "cloud-layer-delete", "cloud-instance-add"]) {
      (controls.querySelector("#" + id) as HTMLInputElement).disabled = !layer
    }
    input("cloud-crystal-alignment").closest("label")!.hidden = layer?.type !== "cirrus"
    if (!layer) { instances.replaceChildren(new Option("—", "")); syncInstance(); return }
    input("cloud-type").value = layer.type
    for (const [id, v] of Object.entries({ base: layer.baseM, thickness: layer.thicknessM, cover: layer.coverage * 100, size: layer.sizeM, density: layer.density })) {
      input(`cloud-${id}`).value = String(Math.round(v * 100) / 100)
    }
    input("cloud-darkness").value = String(layer.darkness ?? resolveWeatherAt(scene.ufoElement.sighting, t).cloudDarkness)
    const alignment = input("cloud-crystal-alignment")
    alignment.value = String(layer.iceCrystalAlignment ?? DEFAULT_ICE_CRYSTAL_ALIGNMENT)
    input("cloud-wind-direction").value = layer.windDirectionDeg === undefined ? "" : String(layer.windDirectionDeg)
    input("cloud-wind-speed").value = layer.windSpeed === undefined ? "" : String(layer.windSpeed)
    input("cloud-seed").value = layer.seed === undefined ? "" : String(layer.seed)
    const selected = instances.value
    instances.replaceChildren(new Option(translate("None", "Aucun"), ""), ...(layer.instances ?? []).map((i, index) => new Option(`${translate("Cloud", "Nuage")} ${index + 1}`, i.id)))
    instances.value = layer.instances?.some(i => i.id === selected) ? selected : ""
    syncInstance()
  }
  const edit = (change: (layer: CloudLayer) => CloudLayer, detachWeatherSource = true) => {
    if (!currentLayer()) return
    scene.ufoElement.pause()
    beforeEdit(detachWeatherSource)
    const time = scene.ufoElement.currentTime, sighting = scene.ufoElement.sighting
    editCloudLayer(sighting.weatherTrack, resolveWeatherAt(sighting, time), time, currentLayer().id, change, scope())
    scene.ufoElement.refresh()
    status.textContent = scope() === "observation" ? translate("Saved across the observation; winds preserved.", "Modifications enregistrées sur toute l’observation, vents conservés.")
      : `${(time / 1000).toFixed(1)} s · ${language === "fr" ? "Météo enregistrée à cet instant." : "Weather saved at this time."}`
  }
  // Pause before any field is edited, so a user's values cannot be committed at a moving playhead.
  controls.addEventListener("focusin", () => scene.ufoElement.pause())
  layerSelect.addEventListener("change", () => { instances.value = ""; sync() })
  instances.addEventListener("change", syncInstance)
  const editLayers = (change: (layers: CloudLayer[]) => CloudLayer[]) => {
    scene.ufoElement.pause()
    beforeEdit()
    const sighting = scene.ufoElement.sighting, t = scene.ufoElement.currentTime
    editCloudLayers(sighting.weatherTrack, resolveWeatherAt(sighting, t), t, change, scope())
    scene.ufoElement.refresh()
    sync()
  }
  controls.querySelector("#cloud-layer-add")!.addEventListener("click", () => {
    const weather = resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime)
    const layer: CloudLayer = { id: crypto.randomUUID(), type: "cumulus", baseM: 1500, thicknessM: 800, coverage: 0.5, sizeM: 1400, density: 1, darkness: weather.cloudDarkness }
    editLayers(layers => [...layers, layer])
    layerSelect.value = String(resolveCloudLayers(resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime)).findIndex(i => i.id === layer.id))
    sync()
  })
  controls.querySelector("#cloud-layer-delete")!.addEventListener("click", () => {
    const id = currentLayer()?.id
    if (id) editLayers(layers => layers.filter(layer => layer.id !== id))
  })
  const canvas = scene.ufoElement.canvasElement
  const manipulate = input("cloud-manipulate")
  let drag: { pointerId: number; id: string; ray: CloudPoint; center: CloudPoint; minBase: number; delta: CloudPoint } | undefined
  const ndc = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: 1 - (event.clientY - rect.top) / rect.height * 2 }
  }
  manipulate.addEventListener("change", () => {
    canvas.style.touchAction = manipulate.checked ? "none" : ""
    canvas.style.cursor = manipulate.checked ? "crosshair" : ""
  })
  canvas.addEventListener("click", event => {
    if (manipulate.checked) { event.preventDefault(); event.stopImmediatePropagation() }
  }, true)
  canvas.addEventListener("pointerdown", event => {
    if (!manipulate.checked || event.button !== 0) return
    event.preventDefault(); event.stopImmediatePropagation()
    scene.ufoElement.pause()
    const point = ndc(event), picked = scene.pickCloudAt(point.x, point.y)
    if (!picked) { status.textContent = translate("No individual cloud here.", "Aucun nuage individuel à cet endroit."); return }
    const layers = resolveCloudLayers(resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime))
    layerSelect.value = String(layers.findIndex(layer => layer.id === picked.layerId))
    sync()
    instances.value = picked.instanceId
    syncInstance()
    const frames = scope() === "observation" ? scene.ufoElement.sighting.weatherTrack.allKeyframes.map(frame => frame.weather) : [resolveWeatherAt(scene.ufoElement.sighting, scene.ufoElement.currentTime)]
    const bases = frames.flatMap(weather => resolveCloudLayers(weather).filter(layer => layer.id === picked.layerId)
      .flatMap(layer => (layer.instances ?? []).filter(i => i.id === picked.instanceId).map(i => i.baseM)))
    drag = { minBase: Math.min(...bases), pointerId: event.pointerId, id: picked.instanceId, center: picked.center,
      ray: scene.cloudDirectionAt(point.x, point.y), delta: { x: 0, y: 0, z: 0 } }
    canvas.setPointerCapture(event.pointerId)
    canvas.style.cursor = "grabbing"
    status.textContent = translate("Cloud selected. Drag to move it.", "Nuage sélectionné. Faire glisser pour le déplacer.")
  }, true)
  canvas.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault(); event.stopImmediatePropagation()
    const point = ndc(event), delta = cloudDragDelta(drag.ray, scene.cloudDirectionAt(point.x, point.y), drag.center)
    if (!delta) return
    delta.y = Math.max(delta.y, -drag.minBase)
    // Apply only this movement's increment, preserving differences between weather keyframes.
    const previous = drag.delta, id = drag.id
    edit(layer => ({ ...layer, instances: layer.instances?.map(i => i.id !== id ? i : { ...i,
      eastM: i.eastM + delta.x - previous.x, northM: i.northM - delta.z + previous.z,
      baseM: i.baseM + delta.y - previous.y }) }))
    drag.delta = delta
    syncInstance()
  }, true)
  const finishDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    drag = undefined
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    canvas.style.cursor = manipulate.checked ? "crosshair" : ""
  }
  canvas.addEventListener("pointerup", finishDrag)
  canvas.addEventListener("pointercancel", finishDrag)
  canvas.addEventListener("lostpointercapture", finishDrag)

  const layerFields: Record<string, keyof CloudLayer> = { "cloud-type": "type", "cloud-base": "baseM", "cloud-thickness": "thicknessM", "cloud-cover": "coverage", "cloud-size": "sizeM", "cloud-density": "density", "cloud-darkness": "darkness", "cloud-crystal-alignment": "iceCrystalAlignment" }
  for (const [id, key] of Object.entries(layerFields)) {
    const commit = () => {
      if (input(id).value === "" || !input(id).validity.valid) return
      const v = id === "cloud-type" ? input(id).value : value(id) / (id === "cloud-cover" ? 100 : 1)
      edit(layer => ({ ...layer, [key]: v }), id !== "cloud-crystal-alignment")
    }
    input(id).addEventListener(id === "cloud-type" ? "change" : "input", commit)
  }
  for (const [id, key] of [["cloud-wind-direction", "windDirectionDeg"], ["cloud-wind-speed", "windSpeed"], ["cloud-seed", "seed"]] as const) {
    input(id).addEventListener("input", () => {
      if (!input(id).validity.valid) return
      edit(layer => ({ ...layer, [key]: input(id).value === "" ? undefined : value(id) }))
    })
  }
  controls.querySelector<HTMLElement>("#cloud-instance-add")!.addEventListener("click", () => {
    const layer = currentLayer()
    if (!layer) return
    const id = crypto.randomUUID()
    const sighting = scene.ufoElement.sighting, time = scene.ufoElement.currentTime
    const pose = resolveObserverPoseAt(sighting, time)
    const offset = cloudOffsetAt(time, sighting.weatherTrack, resolveWeatherAt(sighting, 0), resolveObserverPoseAt(sighting, 0), pose, layer.id)
    const ray = scene.cloudDirectionAt(0, 0)
    const height = layer.baseM + layer.thicknessM * 0.4 - (pose?.elevationM ?? 0) - 1.6
    const distance = height * ray.y > 0 ? Math.max(500, Math.min(20000, height / ray.y)) : 5000
    const instance: CloudInstance = { id, eastM: offset.x + ray.x * distance, northM: -(offset.z + ray.z * distance),
      baseM: layer.baseM, thicknessM: layer.thicknessM, widthM: 1800, depthM: 1200, rotationDeg: 0,
      density: 1, darkness: layer.darkness }
    edit(layer => ({ ...layer, instances: [...(layer.instances ?? []), instance] }))
    sync()
    instances.value = id
    syncInstance()
    status.textContent += translate(" Individual cloud added, independent of global coverage.", " Nuage individuel ajouté : sa présence est indépendante de la couverture globale.")
  })
  controls.querySelector<HTMLElement>("#cloud-instance-delete")!.addEventListener("click", () => {
    const id = instances.value
    if (!id) return
    edit(layer => ({ ...layer, instances: layer.instances?.filter(i => i.id !== id) }))
    sync()
  })
  controls.querySelector("#cloud-instance-point")!.addEventListener("click", () => {
    const layer = currentLayer(), instance = layer?.instances?.find(i => i.id === instances.value)
    if (!instance) return
    scene.ufoElement.pause()
    const sighting = scene.ufoElement.sighting, time = scene.ufoElement.currentTime
    const pose = resolveObserverPoseAt(sighting, time)
    const offset = cloudOffsetAt(time, sighting.weatherTrack, resolveWeatherAt(sighting, 0), resolveObserverPoseAt(sighting, 0), pose, layer.id)
    const east = instance.eastM - offset.x, north = instance.northM + offset.z
    const horizontal = Math.hypot(east, north)
    // Same curved layer altitude as the volume, relative to the current observer's eye.
    const up = instance.baseM + instance.thicknessM / 2 - (pose?.elevationM ?? 0) - 1.6 - horizontal ** 2 / (2 * 6371000)
    if (horizontal === 0 && up === 0) return
    pointAt((Math.atan2(east, north) * 180 / Math.PI + 360) % 360, Math.atan2(up, horizontal) * 180 / Math.PI)
  })
  const instanceProperties: (keyof CloudInstance)[] = ["eastM", "northM", "baseM", "thicknessM", "widthM", "depthM", "rotationDeg", "density", "darkness"]
  instanceFields.forEach((field, index) => input(`instance-${field}`).addEventListener("input", () => {
    const id = instances.value, control = input(`instance-${field}`)
    if (!id || !control.validity.valid || (control.value === "" && field !== "darkness")) return
    const key = instanceProperties[index], next = control.value === "" ? undefined : value(`instance-${field}`)
    edit(layer => ({ ...layer, instances: layer.instances?.map(i => i.id !== id ? i : { ...i, [key]: next }) }))
  }))
  return {
    sync,
    stopManipulation() { drag = undefined; manipulate.checked = false; canvas.style.touchAction = ""; canvas.style.cursor = "" },
    reset() { drag = undefined; manipulate.checked = false; canvas.style.cursor = ""; canvas.style.touchAction = ""; instances.value = ""; lastTime = -1; sync() },

  }
}
