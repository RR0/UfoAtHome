/** Injected at build time by each vite.*.config.ts's own `define` block, reading package.json's
 * own version — see SightingElement.ts's own use for why (the info panel's app-identity line). */
declare const __APP_VERSION__: string

/** A worker whose code is bundled into the module as a blob (Vite's `?worker&inline`): the only kind a
 * page can start from a script that came from another origin. */
declare module "*?worker&inline" {
  const WorkerConstructor: { new (): Worker }
  export default WorkerConstructor
}
