import { afterAll, afterEach } from "vitest"

/**
 * Node's, taken now, before a test can put fake timers in its place (vitest fakes setImmediate too). The tests
 * are type-checked without Node's types.
 */
const { setImmediate } = globalThis as unknown as { setImmediate(callback: () => void): unknown }

/**
 * Each test ends with a turn of the event loop. vitest awaits one test after the other, and tests that only
 * await promises already settled never give the worker such a turn: SightingEditorElement.test.ts ran some
 * 180 of them in a row, 16 s on the development machine (a message posted to the worker waited as long),
 * about three times that on CI runners. The worker keeps sending its progress reports (onTaskUpdate) to the
 * main process meanwhile, and the answers wait unread. When such a stretch outlasts their 60 s timeout and
 * the loop resumes with its timers before its messages (the stretch began after a setImmediate, or an I/O
 * callback), the timeout is handled first: "Timeout calling onTaskUpdate" (or "fetch", for a module asked
 * for), every test passing and the run failing. 140 tests of half a second each, after one waiting on a
 * setImmediate, did exactly that, and did not with this turn.
 */
afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)))

/**
 * What a test file leaves in the page is taken out at its end, so that what it built (a text editor's
 * linter has a timer, for one) is stopped while its window still exists instead of failing after it closed.
 * Files that run under Node have no page.
 */
afterAll(() => {
  if (typeof document !== "undefined") document.body.replaceChildren()
})
