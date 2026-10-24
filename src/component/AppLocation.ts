/**
 * Where the application is, for the links that open a recording in it (the editor, the player).
 *
 * ufoathome.org, except on a copy of the site served from this very machine: a reader who clicks
 * "edit" on `localhost:5181` has the recording and the editor of THAT copy in front of them (a local
 * file, a recording being written), and was sent to production, where neither exists. Told apart by
 * the bundle having been loaded from the page's own origin, and that origin being a local host: a page
 * that carries its own copy of the bundle for any other reason, on a domain with no editor, still
 * sends its readers to ufoathome.org.
 */
export class AppLocation {
  static readonly PRODUCTION = "https://ufoathome.org"

  static home(): string {
    try {
      const bundle = new URL(import.meta.url)
      const page = new URL(location.href)
      const local = page.hostname === "localhost" || page.hostname === "127.0.0.1" || page.hostname === "[::1]" || page.hostname.endsWith(".localhost")
      return local && bundle.origin === page.origin ? page.origin : AppLocation.PRODUCTION
    } catch {
      return AppLocation.PRODUCTION
    }
  }
}
