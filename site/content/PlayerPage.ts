import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * Replays any reconstruction, from a link or from pasted text.
 *
 * The page the `?sighting=` links point at — the convention ufoathome.org has carried since it was
 * a single page on rr0.org, and the one every published reconstruction's own "open it" link uses.
 */
export class PlayerPage implements SitePage {

  readonly meta: PageMeta = {
    slug: { en: "player", fr: "lecteur" },
    navLabel: { en: "Player", fr: "Lecteur" },
    title: { en: "Play any reconstruction", fr: "Rejouer n'importe quelle reconstitution" },
    description: {
      en: "Open a reconstruction from a link, or paste one in. Nothing is uploaded — it is replayed "
        + "in your own browser, in the real sky of the date and place it states.",
      fr: "Ouvrez une reconstitution depuis un lien, ou collez-en une. Rien n'est téléversé : elle est "
        + "rejouée dans votre navigateur, sous le ciel réel de la date et du lieu qu'elle énonce."
    },
    modules: ["/lib/rr0-eyewitness.mjs"]
  }

  script(language: SiteLanguage): string {
    const fr = language === "fr"
    const messages = JSON.stringify({
      loading: fr ? "Chargement…" : "Loading…",
      notFound: fr
        ? "Rien n'a pu être chargé depuis ce lien. Vérifiez l'adresse, et que le fichier est lisible depuis un autre site (en-tête CORS)."
        : "Nothing could be loaded from that link. Check the address, and that the file is readable from another site (a CORS header).",
      badJson: fr ? "Ce texte n'est pas une reconstitution valide : " : "That text is not a valid reconstruction: ",
      empty: fr ? "Rien à jouer — collez une reconstitution d'abord." : "Nothing to play — paste a reconstruction first.",
      editorOpen: fr ? "Modifier cette observation" : "Edit this sighting"
    })
    return `const messages = ${messages}
const stage = document.getElementById("player-stage")
const stageBox = document.getElementById("player-stage-box")
const status = document.getElementById("player-status")
const editLink = document.getElementById("player-edit")
const urlField = document.getElementById("player-url")
const urlForm = document.getElementById("player-url-form")
const pastePanel = document.getElementById("player-paste")
const pasteMount = document.getElementById("player-paste-mount")
const pasteButton = document.getElementById("player-paste-play")
const editorPath = ${JSON.stringify(fr ? "/fr/editeur/" : "/editor/")}

const say = (text, kind) => {
  status.textContent = text ?? ""
  status.className = "player-status" + (kind ? " is-" + kind : "")
}

const reveal = source => {
  stageBox.hidden = false
  if (source) {
    editLink.href = editorPath + "?sighting=" + encodeURIComponent(source)
    editLink.hidden = false
  } else {
    editLink.hidden = true
  }
}

/** A bare name with no slash is one of this site's own demos first, then an rr0.org case
 * directory — the shape the links that predate this site were written in. */
const resolve = requested => requested.includes("/")
  ? [requested]
  : [\`/demo-data/witness-\${requested.toLowerCase()}.json\`,
     \`/demo-data/sky-test-\${requested.toLowerCase()}.json\`,
     \`https://rr0.org/science/crypto/ufo/enquete/dossier/\${requested}/sighting.json\`]

const openUrl = async requested => {
  say(messages.loading)
  for (const candidate of resolve(requested)) {
    try {
      const response = await fetch(candidate, { method: "GET" })
      if (!response.ok) continue
      await response.json() // fail here rather than inside the element, so the message is ours
      await stage.loadFromSrc(candidate)
      reveal(new URL(candidate, location.href).href)
      say("")
      const next = new URL(location.href)
      next.searchParams.set("sighting", requested)
      history.replaceState(null, "", next)
      return
    } catch {
      // Try the next candidate; the message below is for having exhausted them all.
    }
  }
  say(messages.notFound, "error")
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
pastePanel.addEventListener("toggle", async () => {
  if (!pastePanel.open || editor) return
  const { JsonEditor } = await import("/lib/site-json-editor.mjs")
  editor = new JsonEditor(pasteMount, pasteMount.dataset.sample ?? "")
  editor.focus()
})

pasteButton.addEventListener("click", () => {
  const text = editor?.value?.trim()
  if (!text) return say(messages.empty, "error")
  try {
    stage.sightingData = JSON.parse(text)
    reveal(null)
    say("")
    stageBox.scrollIntoView({ block: "start", behavior: "smooth" })
  } catch (error) {
    say(messages.badJson + error.message, "error")
  }
})

const asked = new URLSearchParams(location.search).get("sighting")
if (asked) {
  urlField.value = asked
  void openUrl(asked)
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
          ? "Une adresse complète, ou le nom d'une <a href=\"/fr/demos/\">démo</a> — par exemple <code>Socorro</code>."
          : "A full address, or the name of one of <a href=\"/demos/\">the demos</a> — <code>Socorro</code>, for instance."}</p>
      </form>

      <details class="player-paste" id="player-paste">
        <summary>${fr ? "Ou coller une reconstitution" : "Or paste a reconstruction in"}</summary>
        <div class="player-paste-body">
          <div id="player-paste-mount" class="player-paste-mount" data-sample='{"version": 1, "timeline": {"keyframes": []}}'></div>
          <button class="btn" type="button" id="player-paste-play">${fr ? "Jouer ce texte" : "Play this"}</button>
          <p class="small">${fr
            ? "Rien ne quitte votre navigateur. Le format est décrit dans <a href=\"/fr/documentation/\">la documentation</a>."
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
    <h1>Play any reconstruction.</h1>
    <p class="lede">Point it at a reconstruction someone published, or paste one in. It is replayed
      here, in your own browser, in the real sky of the date and place it states — and nothing is
      sent anywhere.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
${this.form("en")}
    <div class="stage" id="player-stage-box" hidden>
      <rr0-eyewitness id="player-stage"></rr0-eyewitness>
      <p class="stage-caption">
        <a class="btn" id="player-edit" href="/editor/" hidden>Edit this sighting</a>
      </p>
    </div>
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
    <h1>Rejouer n'importe quelle reconstitution.</h1>
    <p class="lede">Pointez-le vers une reconstitution publiée par quelqu'un, ou collez-en une. Elle
      est rejouée ici, dans votre navigateur, sous le ciel réel de la date et du lieu qu'elle énonce
      — et rien n'est envoyé nulle part.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
${this.form("fr")}
    <div class="stage" id="player-stage-box" hidden>
      <rr0-eyewitness id="player-stage"></rr0-eyewitness>
      <p class="stage-caption">
        <a class="btn" id="player-edit" href="/fr/editeur/" hidden>Modifier cette observation</a>
      </p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Un lien qui ouvre une observation</h2>
    <p>Tout ce que porte cette page est atteignable directement :
      <code>ufoathome.org/fr/lecteur/?sighting=</code> suivi de l'adresse d'une reconstitution.
      C'est le lien à donner à quelqu'un quand on veut qu'il voie un récit plutôt qu'il le lise —
      dans un courriel, un message, un forum qui n'accepte que du texte.</p>
    <p>C'est aussi ce que distribue le panneau <q>?</q> de chaque reconstitution publiée, et ce vers
      quoi aboutissent les anciens liens <code>ufoathome.org/&lt;nom&gt;</code>.</p>
    <p>Pour modifier ce que vous regardez au lieu de seulement le regarder,
      <a href="/fr/editeur/">l'éditeur</a> prend le même paramètre. Pour poser une reconstitution
      sur une page à vous, voyez <a href="/fr/documentation/">la documentation</a>.</p>
  </div>
</section>
`
  }
}
