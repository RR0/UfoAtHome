import { RecordingTitle } from "./RecordingTitle.js"
import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * Replays any reconstruction, from a link or from pasted text.
 *
 * The page the `?sighting=` links point at — the convention ufoathome.org has carried since it was
 * a single page on rr0.org, and the one every published reconstruction's own "open it" link uses.
 */
export class PlayerPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "play",
    navLabel: { en: "Player", fr: "Lecteur", es: "Reproductor", it: "Lettore" },
    title: {
      en: "Play any reconstruction",
      fr: "Rejouer n'importe quelle reconstitution",
      es: "Reproducir cualquier reconstrucción",
      it: "Riprodurre qualsiasi ricostruzione"
    },
    description: {
      en: "Open a reconstruction from a link, or paste one in. Nothing is uploaded — it is replayed "
        + "in your own browser, in the real sky of the date and place it states.",
      fr: "Ouvrez une reconstitution depuis un lien, ou collez-en une. Rien n'est téléversé : elle est "
        + "rejouée dans votre navigateur, sous le ciel réel de la date et du lieu qu'elle énonce.",
      es: "Abre una reconstrucción desde un enlace, o pega una. No se sube nada: se reproduce "
        + "en tu propio navegador, bajo el cielo real de la fecha y el lugar que indica.",
      it: "Apri una ricostruzione da un link, oppure incollane una. Non viene caricato nulla: viene riprodotta "
        + "nel tuo browser, sotto il cielo reale della data e del luogo che indica."
    },
    modules: ["/lib/rr0-sighting.mjs"]
  }

  script(language: SiteLanguage): string {
    const demoTitles = JSON.stringify(RecordingTitle.demoTitles(language))
    const messages = JSON.stringify({
      loading: ({ en: "Loading…", fr: "Chargement…", es: "Cargando…", it: "Caricamento…" })[language],
      notFound: ({
        en: "Nothing could be loaded from that link. Check the address, and that you are online.",
        fr: "Rien n'a pu être chargé depuis ce lien. Vérifiez l'adresse, et que vous êtes connecté.",
        es: "No se ha podido cargar nada desde ese enlace. Comprueba la dirección, y que tienes conexión.",
        it: "Non è stato possibile caricare nulla da quel link. Controlla l'indirizzo, e di essere connesso."
      })[language],
      cors: ({
        en: "That address answers, but the browser is not allowed to read it from this page. The file is fine — its server needs to send the header \"Access-Control-Allow-Origin: *\" with it.",
        fr: "Cette adresse répond, mais le navigateur n'a pas le droit de la lire depuis cette page. Le fichier est bon : c'est son serveur qui doit envoyer l'en-tête « Access-Control-Allow-Origin: * » avec.",
        es: "Esa dirección responde, pero el navegador no tiene permiso para leerla desde esta página. El archivo está bien — es su servidor el que debe enviar con él la cabecera «Access-Control-Allow-Origin: *».",
        it: "Quell'indirizzo risponde, ma il browser non è autorizzato a leggerlo da questa pagina. Il file va bene — è il suo server che deve inviare insieme a esso l'intestazione «Access-Control-Allow-Origin: *»."
      })[language],
      badJson: ({
        en: "That text is not a valid reconstruction: ",
        fr: "Ce texte n'est pas une reconstitution valide : ",
        es: "Ese texto no es una reconstrucción válida: ",
        it: "Questo testo non è una ricostruzione valida: "
      })[language],
      empty: ({
        en: "Nothing to play — paste a reconstruction first.",
        fr: "Rien à jouer — collez une reconstitution d'abord.",
        es: "Nada que reproducir — pega primero una reconstrucción.",
        it: "Niente da riprodurre — incolla prima una ricostruzione."
      })[language],
      playing: ({ en: "Playing {title}", fr: "Rejouer {title}", es: "Reproduciendo {title}", it: "In riproduzione: {title}" })[language],
      pasted: ({
        en: "the pasted reconstruction",
        fr: "la reconstitution collée",
        es: "la reconstrucción pegada",
        it: "la ricostruzione incollata"
      })[language],
      pasteEmpty: ({
        en: "Or paste a reconstruction in",
        fr: "Ou coller une reconstitution",
        es: "O pega una reconstrucción",
        it: "Oppure incolla una ricostruzione"
      })[language],
      pasteLoaded: ({
        en: "See or edit this file",
        fr: "Voir ou modifier ce fichier",
        es: "Ver o editar este archivo",
        it: "Vedi o modifica questo file"
      })[language],
      noRecording: ({
        en: "None of the chosen files is a .json: choose the recording, and with it the pictures or models it names.",
        fr: "Aucun fichier .json parmi ceux choisis : choisissez l'enregistrement, et avec lui les images ou modèles qu'il nomme.",
        es: "Ninguno de los archivos elegidos es un .json: elige la grabación, y con ella las imágenes o modelos que nombra.",
        it: "Nessuno dei file scelti è un .json: scegli la registrazione, e insieme a essa le immagini o i modelli che nomina."
      })[language],
      unresolved: ({
        en: "Named by the file but not chosen with it: ",
        fr: "Nommés par le fichier mais pas choisis avec lui : ",
        es: "Nombrados por el archivo pero no elegidos con él: ",
        it: "Nominati dal file ma non scelti insieme a esso: "
      })[language]
    })
    return `const messages = ${messages}
const demoTitles = ${demoTitles}
const stage = document.getElementById("player-stage")
const stageBox = document.getElementById("player-stage-box")

/* Brings the simulation into view UNDER the sticky header, not behind it: scrolling it to the very top
   of the window left its first rows covered by the header — 88 px of it on a phone, where the header
   wraps onto two lines — so a link to a recording arrived on the text below with the top of the picture
   hidden. The header's real height is read, since it is not the same on every screen. */
const showStage = smooth => {
  const header = document.querySelector(".site-header")
  const covered = header && getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0
  stageBox.style.scrollMarginTop = (covered + 8) + "px"
  stageBox.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" })
}
const status = document.getElementById("player-status")
const editLink = document.getElementById("player-edit")
const description = document.getElementById("player-description")
const pageLanguage = ${JSON.stringify(language)}
const urlField = document.getElementById("player-url")
const urlForm = document.getElementById("player-url-form")
const pastePanel = document.getElementById("player-paste")
const pasteMount = document.getElementById("player-paste-mount")
const pasteButton = document.getElementById("player-paste-play")
const heading = document.getElementById("player-heading")
const lede = document.getElementById("player-lede")
const editorPath = "/edit/"
const pasteSummary = pastePanel.querySelector("summary")
const filesField = document.getElementById("player-files")

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

/* What to call the observation now on screen: see RecordingTitle. */
${RecordingTitle.SCRIPT}

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

/**
 * What the recording says about itself, above the way into the editor.
 *
 * Read off the player rather than off the file this page fetched: a case with several observers is
 * a case.json, and each observer carries a description of their own, which has to follow the one the
 * reader picked. The page's own language first, then English, then whatever the recording has.
 * Plain text, cut into paragraphs on blank lines: a recording is data, not markup.
 */
const describe = () => {
  const said = stage.sightingData?.description
  const text = typeof said === "string" ? said
    : said ? (said[pageLanguage] ?? said.en ?? Object.values(said).find(Boolean)) : undefined
  description.replaceChildren(...(text ?? "").split(/\\n\\s*\\n/).map(part => part.trim()).filter(Boolean).map(part => {
    const paragraph = document.createElement("p")
    paragraph.textContent = part
    return paragraph
  }))
  description.hidden = description.childElementCount === 0
}
/* The recording the player is showing, as its own address: on a case with several observers, the one
   picked. The editor opens one recording and not a case, so this is where its button points. */
let shownSrc
stage.addEventListener("observerchange", event => {
  shownSrc = event.detail && event.detail.src ? event.detail.src : undefined
  describe()
  if (shownSrc && !editLink.hidden) editLink.href = editorPath + "?sighting=" + encodeURIComponent(shownSrc)
})

const reveal = (source, sighting, fallbackTitle) => {
  stageBox.hidden = false
  if (source) {
    editLink.href = editorPath + "?sighting=" + encodeURIComponent(shownSrc || source)
    editLink.hidden = false
  } else {
    editLink.hidden = true
  }
  announce(sighting, source, fallbackTitle)
  describe()
}

/** A bare name with no slash is one of this site's own demos first, then an rr0.org case
 * directory — the shape the links that predate this site were written in. A dossier is read
 * through its case.json, whose sighting events name the recordings beside it, so it works read
 * from here exactly as it does from the dossier's own page; its sighting.json after that, for a
 * dossier whose case does not list it yet. */
const resolve = requested => requested.includes("/")
  ? [requested]
  : [\`/demo-data/observer-\${requested.toLowerCase()}.json\`,
     \`/demo-data/sky-test-\${requested.toLowerCase()}.json\`,
     \`/demo-data/\${requested.toLowerCase()}.json\`,
     \`https://rr0.org/science/crypto/ufo/enquete/dossier/\${requested}/case.json\`,
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

/* The player PLAYS what it has just been given: somebody who followed a link, pasted an address or chose
   a file came to watch, not to hunt for the button. \`play=false\` in the page's own address turns that
   off, for a link meant to open the recording stopped. */
const playsAtOnce = new URLSearchParams(location.search).get("play") !== "false"
const startPlaying = () => {
  if (playsAtOnce) stage.scene?.ufoElement?.play()
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
      reveal(new URL(candidate, location.href).href, sighting, requested)
      say("")
      startPlaying()
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
  const { JsonEditor } = await import(SITE_LIB + "/site-json-editor.mjs")
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
    showStage(true)
    startPlaying()
  } catch (error) {
    say(messages.badJson + error.message, "error")
  }
})

/* Addresses made for the files last opened from disk, released when others are opened. */
let localUrls = []

/**
 * Plays a recording from the reader's own disk, with the pictures, models and sounds it names.
 *
 * A recording names those by address, and one relative to the file ("maffliers/photo.jpg") means
 * nothing once the text is in a page rather than at an address. So the files chosen with it are
 * matched by name to every such string in it, and each match is replaced by a local address for
 * that file: the whole reconstruction can then be checked before any of it is put online. Nothing
 * is uploaded.
 */
const openFiles = async files => {
  const recording = files.find(file => file.name.toLowerCase().endsWith(".json"))
  if (!recording) return say(messages.noRecording, "error")
  let sighting
  try {
    sighting = JSON.parse(await recording.text())
  } catch (error) {
    return say(messages.badJson + error.message, "error")
  }
  localUrls.forEach(url => URL.revokeObjectURL(url))
  localUrls = []
  const byName = new Map(files.filter(file => file !== recording).map(file => [file.name, file]))
  const unresolved = new Set()
  const relative = value => !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("/")
  const withLocalFiles = value => {
    if (Array.isArray(value)) return value.map(withLocalFiles)
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withLocalFiles(inner)]))
    }
    if (typeof value !== "string" || !relative(value) || !/\\.[a-z0-9]{2,5}$/i.test(value)) return value
    const file = byName.get(value.split("/").pop())
    if (!file) {
      if (/\\.(jpe?g|png|webp|gif|tiff?|glb|gltf|mp3|ogg|wav|m4a)$/i.test(value)) unresolved.add(value)
      return value
    }
    const url = URL.createObjectURL(file)
    localUrls.push(url)
    return url
  }
  const played = withLocalFiles(sighting)
  stage.sightingData = played
  showInEditor(JSON.stringify(sighting, null, 2))
  reveal(null, sighting, recording.name.replace(/\\.json$/i, ""))
  say(unresolved.size > 0 ? messages.unresolved + [...unresolved].join(", ") : "", unresolved.size > 0 ? "error" : undefined)
  showStage(true)
  startPlaying()
}

filesField.addEventListener("change", () => {
  const files = [...filesField.files]
  if (files.length > 0) void openFiles(files)
})

const asked = new URLSearchParams(location.search).get("sighting")
if (asked) {
  urlField.value = asked
  // Arriving with a recording named in the URL means being shown it, not being shown a form: the
  // stage already sits above that form, and this puts it in view straight away rather than leaving
  // the reader to guess that the thing they followed a link for is further down.
  void openUrl(asked).then(() => showStage(false))
}`
  }

  render(language: SiteLanguage): string {
    switch (language) {
      case "fr": return this.fr()
      case "es": return this.es()
      case "it": return this.it()
      default: return this.en()
    }
  }

  private form(language: SiteLanguage): string {
    return `
    <div class="player-inputs">
      <form class="player-form" id="player-url-form">
        <label for="player-url">${({ en: "From a link", fr: "Depuis un lien", es: "Desde un enlace", it: "Da un link" })[language]}</label>
        <div class="player-row">
          <input id="player-url" type="text" inputmode="url" spellcheck="false"
                 placeholder="https://…/sighting.json">
          <button class="btn btn-primary" type="submit">${({ en: "Play", fr: "Jouer", es: "Reproducir", it: "Riproduci" })[language]}</button>
        </div>
        <p class="small">${({
          en: "A full address, or the name of one of <a href=\"/demos/\">the demos</a> — <code>Socorro</code>, for instance.",
          fr: "Une adresse complète, ou le nom d'une <a href=\"/demos/\">démo</a> — par exemple <code>Socorro</code>.",
          es: "Una dirección completa, o el nombre de una de <a href=\"/demos/\">las demos</a> — <code>Socorro</code>, por ejemplo.",
          it: "Un indirizzo completo, o il nome di una delle <a href=\"/demos/\">demo</a> — <code>Socorro</code>, per esempio."
        })[language]}</p>
      </form>

      <div class="player-form">
        <label for="player-files">${({ en: "From your computer", fr: "Depuis votre ordinateur", es: "Desde tu ordenador", it: "Dal tuo computer" })[language]}</label>
        <input id="player-files" type="file" multiple accept=".json,application/json,image/*,.glb,.gltf,audio/*">
        <p class="small">${({
          en: "Choose the recording (.json), and with it the photos, models or sounds it names by a relative path: they are matched by name. Nothing is uploaded.",
          fr: "Choisissez l'enregistrement (.json), et avec lui les photos, modèles ou sons qu'il nomme par un chemin relatif : ils sont retrouvés par leur nom. Rien n'est envoyé.",
          es: "Elige la grabación (.json), y con ella las fotos, modelos o sonidos que nombra mediante una ruta relativa: se localizan por su nombre. No se sube nada.",
          it: "Scegli la registrazione (.json), e insieme a essa le foto, i modelli o i suoni che nomina con un percorso relativo: vengono ritrovati in base al nome. Non viene caricato nulla."
        })[language]}</p>
      </div>

      <details class="player-paste" id="player-paste">
        <summary>${({ en: "Or paste a reconstruction in", fr: "Ou coller une reconstitution", es: "O pega una reconstrucción", it: "Oppure incolla una ricostruzione" })[language]}</summary>
        <div class="player-paste-body">
          <div id="player-paste-mount" class="player-paste-mount" data-sample='{"version": 1, "timeline": {"keyframes": []}}'></div>
          <button class="btn" type="button" id="player-paste-play">${({ en: "Play this", fr: "Jouer ce texte", es: "Reproducir esto", it: "Riproduci questo testo" })[language]}</button>
          <p class="small">${({
            en: "Nothing leaves your browser. The format is described in <a href=\"/docs/format/\">the sighting file's page</a>.",
            fr: "Rien ne quitte votre navigateur. Le format est décrit dans <a href=\"/docs/format/\">la page du fichier d'observation</a>.",
            es: "Nada sale de tu navegador. El formato se describe en <a href=\"/docs/format/\">la página del archivo de avistamiento</a>.",
            it: "Nulla lascia il tuo browser. Il formato è descritto nella <a href=\"/docs/format/\">pagina del file di avvistamento</a>."
          })[language]}</p>
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
      <div class="stage-caption">
        <div class="player-description" id="player-description" hidden></div>
        <a class="btn" id="player-edit" href="/edit/" hidden>Edit this sighting</a>
      </div>
    </div>
${this.form("en")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>A link that opens a sighting</h2>
    <p>Anything on this page can be reached directly:
      <code>ufoathome.org/play/?sighting=</code> followed by the address of a reconstruction.
      That is the link to hand someone when you want them to see an account rather than read it —
      in an email, a post, a forum that allows nothing but text.</p>
    <p>It is also what every published reconstruction's own <q>i</q> panel hands out, and what the
      older <code>ufoathome.org/&lt;name&gt;</code> links resolve to. A name with no slash is looked
      for among this site's demos first, then as an rr0.org case, read through its
      <code>case.json</code> or else its <code>sighting.json</code>.</p>
    <p>To change what you are looking at rather than only watch it, <a href="/edit/">the
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
      <div class="stage-caption">
        <div class="player-description" id="player-description" hidden></div>
        <a class="btn" id="player-edit" href="/edit/" hidden>Éditer cette observation</a>
      </div>
    </div>
${this.form("fr")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Un lien qui ouvre une observation</h2>
    <p>Tout ce que porte cette page est atteignable directement :
      <code>ufoathome.org/play/?sighting=</code> suivi de l'adresse d'une reconstitution.
      C'est le lien à donner à quelqu'un quand on veut qu'il voie un récit plutôt qu'il le lise —
      dans un courriel, un message, un forum qui n'accepte que du texte.</p>
    <p>C'est aussi ce que distribue le panneau <q>i</q> de chaque reconstitution publiée, et ce vers
      quoi aboutissent les anciens liens <code>ufoathome.org/&lt;nom&gt;</code>. Un nom sans barre oblique est cherché
      d'abord parmi les démos de ce site, puis comme dossier de rr0.org, lu par son
      <code>case.json</code> ou à défaut son <code>sighting.json</code>.</p>
    <p>Pour modifier ce que vous regardez au lieu de seulement le regarder,
      <a href="/edit/">l'éditeur</a> prend le même paramètre. Pour poser une reconstitution
      sur une page à vous, voyez <a href="/docs/">la documentation</a>.</p>
  </div>
</section>
`
  }

  private es(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Reproductor</p>
    <h1 id="player-heading">Reproducir cualquier reconstrucción.</h1>
    <p class="lede" id="player-lede">Apúntalo a una reconstrucción que alguien haya publicado, o pega
      una. Se reproduce bajo el cielo real de la fecha y el lugar que indica.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage" id="player-stage-box" hidden>
      <rr0-sighting id="player-stage"></rr0-sighting>
      <div class="stage-caption">
        <div class="player-description" id="player-description" hidden></div>
        <a class="btn" id="player-edit" href="/edit/" hidden>Editar este avistamiento</a>
      </div>
    </div>
${this.form("es")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Un enlace que abre un avistamiento</h2>
    <p>Todo lo que hay en esta página se puede alcanzar directamente:
      <code>ufoathome.org/play/?sighting=</code> seguido de la dirección de una reconstrucción.
      Ese es el enlace que hay que dar a alguien cuando quieres que vea un relato en lugar de leerlo —
      en un correo, una publicación, un foro que no admite más que texto.</p>
    <p>Es también lo que reparte el panel <q>i</q> de cada reconstrucción publicada, y a lo que
      llevan los antiguos enlaces <code>ufoathome.org/&lt;nombre&gt;</code>. Un nombre sin barra se
      busca primero entre las demos de este sitio, y después como caso de rr0.org, leído a través de
      su <code>case.json</code> o, en su defecto, de su <code>sighting.json</code>.</p>
    <p>Para cambiar lo que estás viendo en lugar de solo mirarlo, <a href="/edit/">el
      editor</a> admite el mismo parámetro. Para poner una reconstrucción en una página propia,
      consulta <a href="/docs/">la documentación</a>.</p>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Lettore</p>
    <h1 id="player-heading">Riprodurre qualsiasi ricostruzione.</h1>
    <p class="lede" id="player-lede">Puntalo su una ricostruzione pubblicata da qualcuno, oppure
      incollane una. Viene riprodotta sotto il cielo reale della data e del luogo che indica.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage" id="player-stage-box" hidden>
      <rr0-sighting id="player-stage"></rr0-sighting>
      <div class="stage-caption">
        <div class="player-description" id="player-description" hidden></div>
        <a class="btn" id="player-edit" href="/edit/" hidden>Modifica questo avvistamento</a>
      </div>
    </div>
${this.form("it")}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Un link che apre un avvistamento</h2>
    <p>Tutto ciò che c'è in questa pagina è raggiungibile direttamente:
      <code>ufoathome.org/play/?sighting=</code> seguito dall'indirizzo di una ricostruzione.
      È il link da dare a qualcuno quando vuoi che veda un resoconto invece di leggerlo —
      in un'email, un post, un forum che accetta solo testo.</p>
    <p>È anche ciò che distribuisce il pannello <q>i</q> di ogni ricostruzione pubblicata, e ciò a
      cui rimandano i vecchi link <code>ufoathome.org/&lt;nome&gt;</code>. Un nome senza barra viene
      cercato prima tra le demo di questo sito, poi come caso di rr0.org, letto tramite il suo
      <code>case.json</code> o, in mancanza, il suo <code>sighting.json</code>.</p>
    <p>Per modificare ciò che stai guardando invece di limitarti a guardarlo, <a href="/edit/">l'editor</a>
      accetta lo stesso parametro. Per mettere una ricostruzione su una tua pagina, consulta
      <a href="/docs/">la documentazione</a>.</p>
  </div>
</section>
`
  }
}
