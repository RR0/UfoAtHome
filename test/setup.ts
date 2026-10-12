import { afterAll } from "vitest"

/**
 * What a test file leaves in the page is taken out at its end, so that what it built (a text editor's
 * linter has a timer, for one) is stopped while its window still exists instead of failing after it closed.
 * Files that run under Node have no page.
 */
afterAll(() => {
  if (typeof document !== "undefined") document.body.replaceChildren()
})
