import type { Object3D } from "three"

/**
 * Loads one glTF/GLB file into a scene graph, importing the loader itself only the first time.
 *
 * three.js's GLTFLoader is an addon, not part of the core, and it is around a hundred kilobytes.
 * Almost every recording has no model at all — the decor primitives are the default and the
 * fallback — so paying for the loader in the bundle everybody downloads would be paying for the
 * exception. The dynamic import puts it in its own chunk that is fetched the first time a recording
 * actually names a model, and never otherwise, which is what "téléchargés à la demande" means here
 * for the loader as much as for the models.
 *
 * Nothing about the result is decor-specific: what comes back is the file's own scene graph, at its
 * own scale and in its own orientation. Fitting it to what the recording measured is a separate
 * step, on purpose — see DecorSystem.fitToSize.
 */
export async function loadGltfScene(url: string): Promise<Object3D> {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
  const loader = new GLTFLoader()
  return new Promise<Object3D>((resolve, reject) => {
    loader.load(
      url,
      gltf => resolve(gltf.scene),
      undefined,
      // GLTFLoader reports failures as an ErrorEvent or an Error depending on where they happened
      // (network vs parse), and rejecting with a bare one of those loses the address entirely —
      // which is the single most useful thing to know when a model doesn't appear.
      error => reject(new Error(`Could not load 3D model ${url}: ${error instanceof Error ? error.message : String(error)}`))
    )
  })
}
