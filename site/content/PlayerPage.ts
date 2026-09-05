import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * Replays any reconstruction, from a link or from pasted text.
 *
 * The page the `?sighting=` links point at — the convention ufoathome.org has carried since it was
 * a single page on rr0.org, and the one every published reconstruction's own "open it" link uses.
 */
export class PlayerPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "player",
    navLabel: { en: "Player", fr: "Lecteur" },
    title: { en: "Play any reconstruction", fr: "Rejouer n'importe quelle reconstitution" },
    description: {
      en: "Open a reconstruction from a link, or paste one in. Nothing is uploaded — it is replayed "
        + "in your own browser, in the real sky of the date and place it states.",
      fr: "Ouvrez une reconstitution depuis un lien, ou collez-en une. Rien n'est téléversé : elle est "
        + "rejouée dans votre navigateur, sous le ciel réel de la date et du lieu qu'elle énonce."
    },
    modules: ["/lib/rr0-sighting.mjs"]
  }

  private readonly catalogue = new DemoCatalogue()

  script(language: SiteLanguage): string {
    const fr = language === "fr"
    // This site knows what its own demos are called; a case id like `sky-test-halos` does not.
    // Only for these — anything else is named from what the recording itself carries.
    const demoTitles = JSON.stringify(Object.fromEntries(
      this.catalogue.demos.map(demo => [demo.src, demo.title[language]])))
    const messages = JSON.stringify({
      loading: fr ? "Chargement…" : "Loading…",
      notFound: fr
        ? "Rien n'a pu être chargé depuis ce lien. Vérifiez l'adresse, et que vous êtes connecté."
        : "Nothing could be loaded from that link. Check the address, and that you are online.",
      cors: fr
        ? "Cette adresse répond, mais le navigateur n'a pas le droit de la lire depuis cette page. Le fichier est bon : c'est son serveur qui doit envoyer l'en-tête « Access-Control-Allow-Origin: * » avec."
        : "That address answers, but the browser is not allowed to read it from this page. The file is fine — its server needs to send the header \"Access-Control-Allow-Origin: *\" with it.",
      badJson: fr ? "Ce texte n'est pas une reconstitution valide : " : "That text is not a valid reconstruction: ",
      empty: fr ? "Rien à jouer — collez une reconstitution d'abord." : "Nothing to play — paste a reconstruction first.",
      playing: fr ? "Rejouer {title}" : "Playing {title}",
      pasted: fr ? "la reconstitution collée" : "the pasted reconstruction",
      pasteEmpty: fr ? "Ou coller une reconstitution" : "Or paste a reconstruction in",
      pasteLoaded: fr ? "Voir ou modifier ce fichier" : "See or edit this file"
    })
    return `const messages = ${messages}
const demoTitles = ${demoTitles}
const stage = document.getElementById("player-stage")
const stageBox = document.getElementById("player-stage-box")
const status = document.getElementById("player-status")
const editLink = document.getElementById("player-edit")
const urlField = document.getElementById("player-url")
const urlForm = document.getElementById("player-url-form")
const pastePanel = document.getElementById("player-paste")
const pasteMount = document.getElementById("player-paste-mount")
const pasteButton = document.getElementById("player-paste-play")
const heading = document.getElementById("player-heading")
const lede = document.getElementById("player-lede")
const editorPath = "/editor/"
const pasteSummary = pastePanel.querySelector("summary")

/* The recording currently on the stage, as text — what the editor below should be holding, so that
   opening that panel shows THIS observation rather than an empty shell. Pretty-printed from the
   parsed object rather than kept as fetched: a minified file is not something to read or edit, and
   nothing but whitespace is lost on the way. */
let loadedText
/* What was last put in the editor by this page, as against by the reader. Only text still equal to
   it may be overwritten when another recording is loaded — anything else is somebody's own work. */
let editorFilled

const say = (text, kind) => {
  status.textContent = text ?? ""
  status.className = "player-status" + (kind ? " is-" + kind : "")
}

/**
 * What to call the observation now on screen.
 *
 * The case id first, because that is the name a case is filed and argued under; the witness's own
 * name next, since a single-witness recording is known by them; and the file's own name last,
 * which at least distinguishes one recording from another. A recording that says none of the three
 * keeps the page's general title, which is then the accurate one.
 */
const titleOf = (sighting, source) => {
  const known = source && demoTitles[new URL(source, location.href).pathname]
  if (known) return known
  const witness = sighting && sighting.witness
  const fullName = witness && [...(witness.firstNames || []), witness.lastName].filter(Boolean).join(" ")
  return (sighting && sighting.caseId)
    || (witness && (witness.title || fullName || witness.id))
    || (source && decodeURIComponent(source.split("/").pop() || "").replace(/\.json$/, ""))
    || undefined
}

const announce = (sighting, source, fallbackTitle) => {
  const title = titleOf(sighting, source) || fallbackTitle
  if (!title) return
  const sentence = messages.playing.replace("{title}", title)
  heading.textContent = sentence + "."
  document.title = sentence + " — UFO@home"
  // The general subtitle describes what this PAGE is for. Once it is showing one particular
  // observation, the heading says which, and a sentence explaining that you may point the page at
  // something is describing a thing already done.
  lede.hidden = true
}

const reveal = (source, sighting, fallbackTitle) => {
  stageBox.hidden = false
  if (source) {
    editLink.href = editorPath + "?sighting=" + encodeURIComponent(source)
    editLink.hidden = false
  } else {
    editLink.hidden = true
  }
  announce(sighting, source, fallbackTitle)
}

/** A bare name with no slash is one of this site's own demos first, then an rr0.org case
 * directory — the shape the links that predate this site were written in. */
const resolve = requested => requested.includes("/")
  ? [requested]
  : [\`/demo-data/witness-\${requested.toLowerCase()}.json\`,
     \`/demo-data/sky-test-\${requested.toLowerCase()}.json\`,
     \`/demo-data/\${requested.toLowerCase()}.json\`,
     \`https://rr0.org/science/crypto/ufo/enquete/dossier/\${requested}/sighting.json\`]

/**
 * Whether a cross-origin address answered at all.
 *
 * A browser rejects every kind of cross-origin failure with the same bare TypeError, on purpose —
 * telling them apart from script would leak whether a host exists. What CAN be established is
 * this: a second request in no-cors mode gets an unreadable reply, so its RESOLVING proves
 * something answered and the browser simply would not hand the bytes over. That is a CORS refusal,
 * which is worth saying because it is the one failure whose fix is on somebody else's server.
 */
const answeredButUnreadable = async url => {
  if (new URL(url, location.href).origin === location.origin) return false
  try {
    await fetch(url, { mode: "no-cors" })
    return true
  } catch {
    return false
  }
}

const openUrl = async requested => {
  say(messages.loading)
  const candidates = resolve(requested)
  let refused = false
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate)
      if (!response.ok) continue
      const sighting = await response.json() // fail here rather than inside the element
      await stage.loadFromSrc(candidate)
      showInEditor(JSON.stringify(sighting, null, 2))
      reveal(new URL(candidate, location.href).href, Array.isArray(sighting) ? undefined : sighting, requested)
      say("")
      const next = new URL(location.href)
      next.searchParams.set("sighting", requested)
      history.replaceState(null, "", next)
      return
    } catch {
      // Only the address the reader actually gave is worth diagnosing: the others are this site's
      // own guesses at what a bare name might mean, and a 404 on one of those explains nothing.
      if (candidate === requested) refused = await answeredButUnreadable(candidate)
    }
  }
  say(refused ? messages.cors : messages.notFound, "error")
}

urlForm.addEventListener("submit", event => {
  event.preventDefault()
  const value = urlField.value.trim()
  if (value) void openUrl(value)
})

// CodeMirror is worth its weight on a page where someone is about to paste JSON and get a comma
// wrong — and worth nothing to the majority who arrive here with a link. So it is fetched the
// first time the panel is opened, and never otherwise.
let editor

const showInEditor = text => {
  loadedText = text
  pasteSummary.textContent = messages.pasteLoaded
  // An editor already open and already changed is left alone: replacing what somebody has typed
  // because a second recording finished loading would throw their work away without asking.
  if (editor && editor.value !== editorFilled) return
  if (editor) {
    editor.value = text
    editorFilled = text
  }
}

pastePanel.addEventListener("toggle", async () => {
  if (!pastePanel.open || editor) return
  const { JsonEditor } = await import("/lib/site-json-editor.mjs")
  editorFilled = loadedText ?? pasteMount.dataset.sample ?? ""
  editor = new JsonEditor(pasteMount, editorFilled)
  editor.focus()
})

pasteButton.addEventListener("click", () => {
  const text = editor?.value?.trim()
  if (!text) return say(messages.empty, "error")
  try {
    const sighting = JSON.parse(text)
    stage.sightingData = sighting
    reveal(null, sighting, messages.pasted)
    say("")
    stageBox.scrollIntoView({ block: "start", behavior: "smooth" })
  } catch (error) {
    say(messages.badJson + error.message, "error")
  }
})

const asked = new URLSearchParams(location.search).get("sighting")
if (asked) {
  urlField.value = asked
  // Arriving with a recording named in the URL means being shown it, not being shown a form: the
  // stage already sits above that form, and this puts it in view straight away rather than leaving
  // the reader to guess that the thing they followed a link for is further down.
  void openUrl(asked).then(() => stageBox.scrollIntoView({ block: "start" }))
}`
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private form(language: SiteLanguage): string {
    const fr = language === "fr"
    return `
    <div class="player-inputs">
      <form class="player-form" id="player-url-form">
        <label for="player-url">${fr ? "Depuis un lien" : "From a link"}</label>
        <div class="player-row">
          <input id="player-url" type="text" inputmode="url" spellcheck="false"
                 placeholder="https://…/sighting.json">
          <button class="btn btn-primary" type="submit">${fr ? "Jouer" : "Play"}</button>
        </div>
        <p class="small">${fr
          ? "Une adresse complète, ou le nom d'une <a href=\"/demos/\">démo</a> — par exemple <code>Socorro</code>."
          : "A full address, or the name of one of <a href=\"/demos/\">the demos</a> — <code>Socorro</code>, for instance."}</p>
      </form>

      <details class="player-paste" id="player-paste">
        <summary>${fr ? "Ou coller une reconstitution" : "Or paste a reconstruction in"}</summary>
        <div class="player-paste-body">
          <div id="player-paste-mount" class="player-paste-mount" data-sample='{"version": 1, "timeline": {"keyframes": []}}'></div>
          <button class="btn" type="button" id="player-paste-play">${fr ? "Jouer ce texte" : "Play this"}</button>
          <p class="small">${fr
            ? "Rien ne quitte votre navigateur. Le format est décrit dans <a href=\"/docs/\">la documentation</a>."
            : "Nothing leaves your browser. The format is described in <a href=\"/docs/\">the documentation</a>."}</p>
        </div>
      </details>
    </div>
    <p class="player-status" id="player-status" role="status" aria-live="polite"></p>`
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Player</p>
    <h1 id="player-heading">Play any reconstruction.</h1>
    <p class="lede" id="player-lede">Point it at a reconstruction someone published, or paste one
      in. It is replayed in the real sky of the date and place it states.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage" id="player-stage-box" hidden>
      <rr0-sighting id="player-stage"></rr0-sighting>
      <p class="stage-caption">
        <a class="btn" id="player-edit" href="/editor/" hidden>Edit this sighting</a>
      </p>
    </div>
${this.form("en")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>A link that opens a sighting</h2>
    <p>Anything on this page can be reached directly:
      <code>ufoathome.org/player/?sighting=</code> followed by the address of a reconstruction.
      That is the link to hand someone when you want them to see an account rather than read it —
      in an email, a post, a forum that allows nothing but text.</p>
    <p>It is also what every published reconstruction's own <q>?</q> panel hands out, and what the
      older <code>ufoathome.org/&lt;name&gt;</code> links resolve to.</p>
    <p>To change what you are looking at rather than only watch it, <a href="/editor/">the
      editor</a> takes the same parameter. To put a reconstruction on a page of your own, see
      <a href="/docs/">the documentation</a>.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Lecteur</p>
    <h1 id="player-heading">Rejouer n'importe quelle reconstitution.</h1>
    <p class="lede" id="player-lede">Pointez-le vers une reconstitution publiée par quelqu'un, ou
      collez-en une. Elle est rejouée sous le ciel réel de la date et du lieu qu'elle énonce.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage" id="player-stage-box" hidden>
      <rr0-sighting id="player-stage"></rr0-sighting>
      <p class="stage-caption">
        <a class="btn" id="player-edit" href="/editor/" hidden>Éditer cette observation</a>
      </p>
    </div>
${this.form("fr")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Un lien qui ouvre une observation</h2>
    <p>Tout ce que porte cette page est atteignable directement :
      <code>ufoathome.org/player/?sighting=</code> suivi de l'adresse d'une reconstitution.
      C'est le lien à donner à quelqu'un quand on veut qu'il voie un récit plutôt qu'il le lise —
      dans un courriel, un message, un forum qui n'accepte que du texte.</p>
    <p>C'est aussi ce que distribue le panneau <q>?</q> de chaque reconstitution publiée, et ce vers
      quoi aboutissent les anciens liens <code>ufoathome.org/&lt;nom&gt;</code>.</p>
    <p>Pour modifier ce que vous regardez au lieu de seulement le regarder,
      <a href="/editor/">l'éditeur</a> prend le même paramètre. Pour poser une reconstitution
      sur une page à vous, voyez <a href="/docs/">la documentation</a>.</p>
  </div>
</section>
`
  }
}
