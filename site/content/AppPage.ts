import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The installed app: `<rr0-ufoathome>` alone, on the whole screen, in the app's shell (see PageMeta.shell).
 *
 * Where the manifest opens it (see OfflineKit.manifest): on a blank editor, the reader coming the first time something is read. Given
 * a file (`?file=` and its whole address, as every "open it" link of the site), it opens on that file's reader, the editor coming the
 * first time the pencil is used; `mode=edit` opens it in the editor, `track=` on one recording of a case. Kept out of the navigation and
 * the footer: the site's own pages are the player and the editor; this is the tool that a home screen opens.
 */
export class AppPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "app",
    navLabel: { en: "App", fr: "Application", es: "Aplicación", it: "Applicazione" },
    title: {
      en: "The app",
      fr: "L'application",
      es: "La aplicación",
      it: "L'applicazione"
    },
    description: {
      en: "Edit a reconstruction, or read one: nothing is uploaded, everything happens in your own browser.",
      fr: "Éditez une reconstitution, ou lisez-en une : rien n'est téléversé, tout se passe dans votre navigateur.",
      es: "Edita una reconstrucción, o lee una: no se sube nada, todo ocurre en tu propio navegador.",
      it: "Modifica una ricostruzione, oppure leggine una: non viene caricato nulla, tutto avviene nel tuo browser."
    },
    modules: ["/lib/rr0-ufoathome.mjs"],
    asideFromNav: true,
    asideFromFooter: true,
    shell: "app"
  }

  render(_language: SiteLanguage): string {
    // Empty until the script has read the address: an element put here would start, blank, before it is told what to open.
    return `<div class="app-stage" id="app-root"></div>`
  }

  script(_language: SiteLanguage): string {
    return `const asked = new URLSearchParams(location.search)
const app = document.createElement("rr0-ufoathome")
/* A whole address only (https://…), as the player asks: a bare name or a path of this site makes a link that works here only. */
const file = asked.get("file") ?? asked.get("sighting")
if (file && /^https?:[/][/]/i.test(file)) app.setAttribute("src", file)
for (const name of ["track", "mode"]) {
  const value = asked.get(name)
  if (value) app.setAttribute(name, value)
}
/* Which of the two is on show is in the address, so that it is the one a reload or a link opens again. */
app.addEventListener("rr0-mode", event => {
  const next = new URL(location.href)
  next.searchParams.set("mode", event.detail.mode)
  if (next.href !== location.href) history.replaceState(null, "", next)
})
document.getElementById("app-root").append(app)
`
  }
}
