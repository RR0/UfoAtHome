import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** The front page: what you can do with it, one carousel of live reconstructions, and why it is
 * built the way it is. */
export class HomePage implements SitePage {

  readonly meta: PageMeta = {
    slug: "",
    navLabel: { en: "Home", fr: "Accueil", es: "Inicio", it: "Home" },
    title: {
      en: "Reconstruct what the witness saw",
      fr: "Reconstituer ce que le témoin a vu",
      es: "Reconstruir lo que vio el testigo",
      it: "Ricostruire ciò che ha visto il testimone"
    },
    description: {
      en: "UFO@home is a free, open-source tool that replays a UFO sighting as its witness described it — "
        + "the shape, its movement, and the real sky of that date, time and place.",
      fr: "UFO@home est un outil libre qui rejoue une observation d'ovni telle que son témoin l'a décrite — "
        + "la forme, son mouvement, et le ciel réel de cette date, de cette heure et de ce lieu.",
      es: "UFO@home es una herramienta libre y de código abierto que reproduce un avistamiento ovni tal como lo describió su testigo — "
        + "la forma, su movimiento y el cielo real de esa fecha, esa hora y ese lugar.",
      it: "UFO@home è uno strumento libero e open source che riproduce un avvistamento UFO così come l'ha descritto il suo testimone — "
        + "la forma, il suo movimento e il cielo reale di quella data, di quell'ora e di quel luogo."
    },
    modules: ["/lib/rr0-sighting.mjs"]
  }

  private readonly catalogue = new DemoCatalogue()

  /**
   * The carousel: plays each reconstruction through, then moves to the next.
   *
   * Auto-advance yields to the reader. Any click, key or touch inside it means they are looking at
   * THIS one — advancing out from under someone who just paused a scene to examine it would be the
   * worst thing this page could do — so the sequence stops and the arrows become theirs. It picks
   * itself up again after a while of nothing happening, or as soon as the recording they were
   * watching runs to its end: a reader who pressed play on one wants the next one after it, not a
   * frozen last frame for a minute (a recording no longer loops by default).
   */
  script(language: SiteLanguage): string {
    const slides = JSON.stringify(this.catalogue.demos.map(demo => ({
      src: demo.src,
      edit: demo.editSrc ?? demo.src,
      title: demo.title[language],
      blurb: demo.blurb[language]
    })))
    return `const slides = ${slides}
// A recording as long as Valensole's four and a half minutes would hold the carousel for as long
// as the rest of the page put together, so a slide moves on at its own end OR at this, whichever
// comes first. Long enough to see what a sky is doing, short enough that nobody waits for it.
const MAX_SLIDE_MS = 25000
// How long the carousel stays out of the way after the reader has touched it.
const RESUME_MS = 60000
const editorPath = "/edit/"

const stage = document.getElementById("hero-stage")
const caption = document.getElementById("hero-caption")
const editLink = document.getElementById("hero-edit")
const dots = [...document.querySelectorAll(".carousel-dot")]
const carousel = document.getElementById("hero-carousel")

let index = 0
let auto = true
let slideTimer
let resumeTimer
// Whether the stage is in the reader's viewport — see the observer below.
let onScreen = true

const ufo = () => stage.scene?.ufoElement

const armSlideTimer = () => {
  clearTimeout(slideTimer)
  if (auto && onScreen) slideTimer = setTimeout(() => { if (auto) show(index + 1) }, MAX_SLIDE_MS)
}

const show = async position => {
  index = (position + slides.length) % slides.length
  const slide = slides[index]
  caption.innerHTML = "<strong>" + slide.title + "</strong> " + slide.blurb
  editLink.href = editorPath + "?sighting=" + encodeURIComponent(slide.edit)
  for (const [at, dot] of dots.entries()) dot.setAttribute("aria-current", String(at === index))
  clearTimeout(slideTimer)
  try {
    await stage.loadFromSrc(slide.src)
    const player = ufo()
    if (player) {
      // Looping would mean this slide never ends, and the sequence never moves.
      player.autoReplayEnabled = false
      // Nobody asked for these recordings one by one: the controls come with a touch, not with each start.
      player.quietControls = true
      if (onScreen) player.play()
    }
  } catch {
    // A demo that will not load must not stop the carousel — move on.
    if (auto) slideTimer = setTimeout(() => show(index + 1), 1000)
    return
  }
  armSlideTimer()
}

// The stage plays only while the reader can see it. A scene nobody is looking at still asks the
// graphics card for its clouds sixty times a second, and that is what made the rest of this page
// stutter under the reader's own scroll. Out of view it pauses where it stands and the sequence
// holds; back in view it picks the same slide up — unless the reader had stopped it themselves.
new IntersectionObserver(entries => {
  for (const entry of entries) {
    onScreen = entry.isIntersecting
    const player = ufo()
    if (!onScreen) {
      clearTimeout(slideTimer)
      player?.pause()
    } else if (auto) {
      if (player && player.playbackState !== "playing") player.play()
      armSlideTimer()
    }
  }
}, { threshold: 0.05 }).observe(stage)

// Fired by the recording running off its own end, and composed, so it crosses the element's shadow
// roots to reach this page.
// Whoever started it: once the recording is over there is nothing left to examine, so the sequence
// takes over again rather than leaving the reader on a stopped last frame.
stage.addEventListener("ended", () => {
  if (!onScreen) return
  clearTimeout(resumeTimer)
  auto = true
  carousel.dataset.auto = "on"
  show(index + 1)
})

const takeOver = () => {
  auto = false
  clearTimeout(slideTimer)
  clearTimeout(resumeTimer)
  carousel.dataset.auto = "off"
  resumeTimer = setTimeout(() => {
    auto = true
    carousel.dataset.auto = "on"
    show(index + 1)
  }, RESUME_MS)
}

for (const type of ["pointerdown", "keydown", "touchstart"]) {
  carousel.addEventListener(type, takeOver, { passive: true })
}

for (const button of carousel.querySelectorAll("[data-step]")) {
  button.addEventListener("click", () => show(index + Number(button.dataset.step)))
}
for (const [at, dot] of dots.entries()) {
  dot.addEventListener("click", () => show(at))
}

show(0)`
  }

  render(language: SiteLanguage): string {
    const dots = this.catalogue.demos.map((demo, at) =>
      `<button class="carousel-dot" type="button" aria-current="${at === 0}" title="${demo.title[language]}" aria-label="${demo.title[language]}"></button>`
    ).join("\n          ")
    const carousel = `
    <div class="carousel" id="hero-carousel" data-auto="on">
      <div class="stage">
        <div class="carousel-viewport">
          <rr0-sighting id="hero-stage"></rr0-sighting>
          <button class="carousel-nav is-prev" type="button" data-step="-1" aria-label="${({ en: "Previous", fr: "Précédente", es: "Anterior", it: "Precedente" })[language]}"></button>
          <button class="carousel-nav is-next" type="button" data-step="1" aria-label="${({ en: "Next", fr: "Suivante", es: "Siguiente", it: "Successiva" })[language]}"></button>
        </div>
        <div class="carousel-dots" role="group" aria-label="${({ en: "Reconstructions", fr: "Reconstitutions", es: "Reconstrucciones", it: "Ricostruzioni" })[language]}">
          ${dots}
        </div>
        <p class="stage-caption">
          <span id="hero-caption"></span>
          <span class="carousel-sep" aria-hidden="true"> — </span>
          <a class="carousel-edit" id="hero-edit" href="/edit/">${({ en: "Edit this sighting", fr: "Éditer cette observation", es: "Editar este avistamiento", it: "Modifica questo avvistamento" })[language]}</a>
        </p>
      </div>
    </div>`
    switch (language) {
      case "fr": return this.fr(carousel)
      case "es": return this.es(carousel)
      case "it": return this.it(carousel)
      default: return this.en(carousel)
    }
  }

  private en(carousel: string): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Free software · embeddable anywhere</p>
    <h1>Reconstruct what the witness saw.</h1>
    <p class="lede">Draw the shape. Record how it moved. Replay it against the sky that was
      actually over that place, at that hour, on that date — the Sun, the Moon, the stars, the
      weather on record, the ground itself. Not an artist's impression: a reconstruction anyone
      can check.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/edit/">Describe your own sighting</a>
      <a class="btn" href="/demos/">See what it can do</a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
${carousel}
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Two uses</h2>
    <div class="uses">
      <a class="use" href="/edit/">
        <h3>Describe your own sighting</h3>
        <p>Draw what you saw and record how it moved, then say when and where — and the sky of that
          moment appears behind it, along with the weather that was on record. Correct the shape
          until it matches. What you get is a file that is yours; there is no account and nothing is
          uploaded.</p>
        <p class="use-more">Open the editor →</p>
      </a>
      <a class="use" href="/docs/">
        <h3>Put it on your own site</h3>
        <p>Two lines of HTML place a reconstruction in an article, a case file or a report — your
          recording, on your host, under your name. No framework, no build step, no dependency on
          this site once you hold the files. Use it, change it, redistribute it, fork it.</p>
        <p class="use-more">Read the documentation →</p>
      </a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Two principles</h2>

    <div class="principle">
      <h3>Contextualise</h3>
      <p class="lede prose-wide">First, what can be checked. Reproduce the checkable
        conditions of that place and that moment as faithfully as they can be reproduced, and the
        scene answers back: here is an explanation that fits what was really overhead, and here is
        one this sky has just ruled out. The witness supplies the phenomenon; nothing else is left
        to memory.</p>
      <div class="cards">
        <div class="card">
          <h4>The sky</h4>
          <p>Sun, Moon and its phase, planets, stars, the Milky Way and the zodiacal light, placed by
            ephemeris for that instant and that place. What is drawn stops where the eye that was
            looking stopped — and where the data itself stops, the tool says so rather than drawing a
            sky emptier than the night was. Point at any of it and it names itself.</p>
          <p class="card-more"><a href="/context/#sky">Down to which magnitude →</a></p>
        </div>
        <div class="card">
          <h4>What else was up there</h4>
          <p>Comets, novae and supernovae, meteor showers, satellites — each drawn only if it could have been visible from
            there, then. Being lit is not the same as being seen, and the Earth's shadow settles that
            one.</p>
          <p class="card-more"><a href="/context/#space">How each is decided →</a></p>
        </div>
        <div class="card">
          <h4>Ice and water</h4>
          <p>Haloes, sundogs, pillars, tangent and circumzenithal arcs, rainbows and moonbows. Not one
            of those angles is stored: they come out of ice's refractive index and the shape of a
            drop, which is what keeps the whole display consistent with the Sun that made it.</p>
          <p class="card-more"><a href="/context/#ice">Which ones, and from what →</a></p>
        </div>
        <div class="card">
          <h4>The weather that day</h4>
          <p>Cloud, rain, snow, storms and wind, read from a worldwide hourly reanalysis going back to
            1940 and keyframed along the observation. Clouds form separate metre-based layers with
            their own type, thickness, size, density and motion; individual volumes can be moved to
            test whether they really hide the phenomenon. The exact query stays checkable.</p>
          <p class="card-more"><a href="/context/#weather">Which record, and what it gives →</a></p>
        </div>
        <div class="card">
          <h4>The ground</h4>
          <p>Real relief and aerial imagery around the witness, and the decor that got in the way:
            buildings, trees, streetlights, vehicles, windows, other witnesses. How high they stood is
            looked up from where they stood, and nobody can be placed under the ground.</p>
          <p class="card-more"><a href="/context/#ground">Why the horizon moves →</a></p>
        </div>
        <div class="card">
          <h4>The instrument</h4>
          <p>An eye is not a lens, and the device decides the picture: only the settings it could
            really have had are offered, one that did not exist yet is flagged against the date, and
            it — not the witness — sets how faint a thing could be recorded at all. Which is why so
            many “the sky was full of stars” accounts come with an empty black photograph.</p>
          <p class="card-more"><a href="/context/#instrument">The numbers behind that →</a></p>
        </div>
        <div class="card">
          <h4>A picture of the place</h4>
          <p>Everything the scene draws is computed, and nothing tells a faithful reconstruction from
            a plausible one. A photograph of the same place does: laid over the render at any
            opacity, lined up on two or three landmarks, it shows every tree the relief did not know
            — and hands back the heading the witness actually faced, as a measurement.</p>
          <p class="card-more"><a href="/context/#pictures">How a picture is lined up →</a></p>
        </div>
      </div>
      <p class="small">Every source is named where its data is reported, and can be swapped for
        another — the picker <em>is</em> the credit. Where each one comes from, what it gives and
        where it stops: <a href="/context/">check what the scene claims</a>. What is still missing is
        on <a href="/roadmap/">the roadmap</a>.</p>
      </div>

    <div class="principle">
      <h3>Bound the hypotheses</h3>
      <p class="lede prose-wide">From what is known with enough certainty and what the witness
        reports, narrow down what the phenomenon can have been, without taking on the witness's own
        interpretation of it. A testimony is an angle, not a measurement: it does not say that an
        object was there, nor how far away. Set against the scene it still says a great deal: which
        sizes go with which distances, a distance bounded once the phenomenon passed in front of or
        behind something whose position is known, which candidates of that sky fit it and which it
        rules out.</p>
      <div class="prose-wide">
        <p>Nobody perceives metres. A witness perceives an <em>angle</em>: the thing covered a
          thumbnail at arm's length, a fifth of the windscreen, two full Moons. “About thirty metres
          long” is a conclusion drawn from a distance they could not perceive either, and the two
          errors multiply.</p>
        <p>So a UFO@home recording stores how big the object <em>looked</em>, in degrees, and stores
          no real size and no real distance anywhere. Metres come back in one case only: when the
          object was seen to pass behind or in front of something whose position is known. That is an
          inequality, and the tool reports it as one — including, most of the time, “unknown”.</p>
        <p>The object is drawn as a flat shape on the witness's field of view, never as a solid body
          placed in space. That is deliberate. Assuming a craft at a distance is already an
          interpretation, and it quietly rules out the explanations that matter most: a halo, a
          planet, a satellite, an aircraft's landing light, a lenticular cloud. A 2D shape assumes
          only what the witness actually claimed — that this is what reached their eye.</p>
        <p>Which is why a case with several witnesses is several recordings, not one. Each states
          what one person saw from where they stood, and a reconstruction can step from one to the
          other — the reader through a picker, the author by placing the others in the scene and
          opening their accounts from there. Two people a hundred metres apart did not see the same
          thing, and <a href="/docs/format/#several-observers-the-case">the format</a> is built so that the difference has somewhere to live.</p>
      </div>
    </div>
    </div>
  </section>
  `
    }

    private fr(carousel: string): string {
      return `
  <section class="band hero">
    <div class="wrap">
      <p class="eyebrow">Logiciel libre · intégrable partout</p>
      <h1>Reconstituer ce que le témoin a vu.</h1>
      <p class="lede">Dessinez la forme. Enregistrez son mouvement. Rejouez-la sous le ciel qui se
        trouvait réellement au-dessus de ce lieu, à cette heure, ce jour-là — le Soleil, la Lune, les
        étoiles, la météo relevée, le sol lui-même. Pas une vue d'artiste : une reconstitution que
        n'importe qui peut vérifier.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/edit/">Décrire votre propre observation</a>
        <a class="btn" href="/demos/">Voir ce qu'il sait faire</a>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
  ${carousel}
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <h2>Deux usages</h2>
      <div class="uses">
        <a class="use" href="/edit/">
          <h3>Décrire votre propre observation</h3>
          <p>Dessinez ce que vous avez vu, enregistrez son mouvement, puis dites quand et où — et le
            ciel de cet instant apparaît derrière, avec la météo qui était relevée. Corrigez la forme
            jusqu'à ce que cela corresponde. Ce que vous obtenez est un fichier qui est le vôtre : il
            n'y a pas de compte, et rien n'est téléversé.</p>
          <p class="use-more">Ouvrir l'éditeur →</p>
        </a>
        <a class="use" href="/docs/">
          <h3>L'intégrer à votre site</h3>
          <p>Deux lignes de HTML posent une reconstitution dans un article, un dossier ou un rapport —
            votre enregistrement, sur votre hébergement, sous votre nom. Aucun <i lang="en">framework</i>,
            aucune compilation, aucune dépendance à ce site dès lors que vous avez les fichiers.
            Utilisez-le, modifiez-le, redistribuez-le, forkez-le.</p>
          <p class="use-more">Lire la documentation →</p>
        </a>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <h2>Deux principes</h2>

      <div class="principle">
        <h3>Contextualiser</h3>
        <p class="lede prose-wide">D'abord, ce qui se vérifie. Reproduire aussi fidèlement
          que possible les conditions vérifiables de ce lieu et de cet instant, et la scène répond :
          voici une explication qui s'accorde à ce qui était réellement là-haut, et voici celle que ce
          ciel vient d'exclure. Le témoin fournit le phénomène ; rien d'autre n'est laissé à la
          mémoire.</p>
      <div class="cards">
        <div class="card">
          <h4>Le ciel</h4>
          <p>Soleil, Lune et sa phase, planètes, étoiles, Voie lactée et lumière zodiacale, placés par
            éphémérides pour cet instant et ce lieu. Ce qui est dessiné s'arrête où s'arrêtait l'œil
            qui regardait — et là où c'est la donnée qui s'arrête, l'outil le dit plutôt que de
            dessiner un ciel plus vide que ne l'était la nuit. Pointez n'importe quoi et cela se
            nomme.</p>
          <p class="card-more"><a href="/context/#sky">Jusqu'à quelle magnitude →</a></p>
        </div>
        <div class="card">
          <h4>Ce qu'il y avait d'autre là-haut</h4>
          <p>Comètes, novae et supernovae, pluies de météores, satellites — chacun n'est dessiné que s'il pouvait être vu
            de là, à ce moment-là. Être éclairé n'est pas être vu, et c'est l'ombre de la Terre qui
            tranche.</p>
          <p class="card-more"><a href="/context/#space">Comment chacun est décidé →</a></p>
        </div>
        <div class="card">
          <h4>La glace et l'eau</h4>
          <p>Halos, parhélies, piliers, arcs tangents et circumzénithaux, arcs-en-ciel et arcs
            lunaires. Aucun de ces angles n'est stocké : ils sortent de l'indice de réfraction de la
            glace et de la forme d'une goutte, ce qui garde tout le cortège cohérent avec le Soleil
            qui l'a fait.</p>
          <p class="card-more"><a href="/context/#ice">Lesquels, et d'après quoi →</a></p>
        </div>
        <div class="card">
          <h4>La météo de ce jour-là</h4>
          <p>Nuages, pluie, neige, orages et vent, lus dans une réanalyse mondiale et horaire qui
            remonte à 1940 et keyframés le long de l'observation. Les nuages forment des couches
            métriques distinctes avec leurs propres type, épaisseur, taille, densité et mouvement ;
            des volumes individuels peuvent être déplacés pour vérifier s'ils masquent réellement le
            phénomène. La requête exacte reste vérifiable.</p>
          <p class="card-more"><a href="/context/#weather">Quelle source, et ce qu'elle donne →</a></p>
        </div>
        <div class="card">
          <h4>Le sol</h4>
          <p>Relief réel et imagerie aérienne autour du témoin, et le décor qui s'est interposé :
            bâtiments, arbres, lampadaires, véhicules, vitrages, autres témoins. À quelle hauteur il
            se tenait se relève d'où il se tenait, et on ne peut placer personne sous le sol.</p>
          <p class="card-more"><a href="/context/#ground">Pourquoi l'horizon se déplace →</a></p>
        </div>
        <div class="card">
          <h4>L'instrument</h4>
          <p>Un œil n'est pas un objectif, et c'est l'appareil qui décide de l'image : seuls les
            réglages qu'il pouvait réellement avoir sont proposés, un appareil qui n'existait pas
            encore est signalé face à la date, et c'est lui — non le témoin — qui fixe ce qui pouvait
            être enregistré. D'où tant de récits de « ciel plein d'étoiles » accompagnés d'une
            photographie noire et vide.</p>
          <p class="card-more"><a href="/context/#instrument">Les nombres derrière cela →</a></p>
        </div>
        <div class="card">
          <h4>Une photo des lieux</h4>
          <p>Tout ce que la scène dessine est calculé, et rien ne distingue une reconstitution fidèle
            d'une reconstitution vraisemblable. Une photo du même endroit, si : posée sur le rendu à
            l'opacité qu'on veut, recalée sur deux ou trois repères, elle montre chaque arbre que le
            relief ignorait — et rend le cap que le témoin avait réellement, comme une mesure.</p>
          <p class="card-more"><a href="/context/#pictures">Comment une photo se recale →</a></p>
        </div>
      </div>
      <p class="small">Chaque source est nommée là où sa donnée est rapportée, et peut être
        remplacée par une autre — le sélecteur <em>est</em> le crédit. D'où vient chacune, ce qu'elle
        donne et où elle s'arrête : <a href="/context/">vérifier ce que la scène affirme</a>. Ce qui
        manque encore est sur <a href="/roadmap/">la page des futures évolutions</a>.</p>
      </div>

      <div class="principle">
        <h3>Borner les hypothèses</h3>
        <p class="lede prose-wide">À partir de ce qui est connu avec assez de certitude et de ce que
          le témoin rapporte, cerner ce que le phénomène a pu être, sans adopter d'emblée
          l'interprétation qu'en fait le témoin. Un témoignage est un angle, pas une mesure : il ne
          dit pas qu'un objet était là, ni à quelle distance. Confronté à la scène, il en dit pourtant
          beaucoup : quelles tailles vont avec quelles distances, une distance bornée dès que le
          phénomène est passé devant ou derrière quelque chose dont la position est connue, quels
          candidats de ce ciel lui conviennent et lesquels il exclut.</p>
        <div class="prose-wide">
        <p>Personne ne perçoit des mètres. Un témoin perçoit un <em>angle</em> : la chose couvrait un
          ongle de pouce à bout de bras, un cinquième du pare-brise, deux pleines Lunes. « Une
          trentaine de mètres de long » est une conclusion tirée d'une distance qu'il ne percevait pas
          davantage, et les deux erreurs se multiplient.</p>
        <p>Un enregistrement UFO@home retient donc la taille <em>apparente</em> de l'objet, en degrés,
          et ne stocke nulle part une taille ni une distance réelles. Les mètres ne reviennent que
          dans un cas : quand l'objet a été vu passer derrière ou devant quelque chose dont la
          position est connue. C'est une inégalité, et l'outil la présente comme telle — y compris,
          le plus souvent, « inconnue ».</p>
        <p>L'objet est dessiné comme une forme plate dans le champ de vision du témoin, jamais comme
          un corps solide placé dans l'espace. C'est délibéré. Supposer un engin à une distance donnée
          est déjà une interprétation, et cela écarte en silence les explications qui comptent le
          plus : un halo, une planète, un satellite, le phare d'atterrissage d'un avion, un nuage
          lenticulaire. Une forme 2D ne suppose que ce que le témoin a réellement affirmé : voilà ce
          qui est parvenu à son œil.</p>
        <p>C'est pourquoi un dossier à plusieurs témoins fait plusieurs enregistrements, et non un
          seul. Chacun énonce ce qu'une personne a vu d'où elle se tenait, et une reconstitution
          permet de passer de l'un à l'autre — le lecteur par un sélecteur, l'auteur en plaçant les
          autres dans la scène et en ouvrant leur récit depuis là. Deux personnes à cent mètres l'une
          de l'autre n'ont pas vu la même chose, et <a href="/docs/format/#several-observers-the-case">le format</a> est fait pour que cette différence ait
          où se loger.</p>
        </div>
      </div>
    </div>
  </section>
  `
    }

  private es(carousel: string): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Software libre · integrable en cualquier sitio</p>
    <h1>Reconstruir lo que vio el testigo.</h1>
    <p class="lede">Dibuja la forma. Registra cómo se movió. Reprodúcela sobre el cielo que había
      realmente sobre ese lugar, a esa hora, en esa fecha — el Sol, la Luna, las estrellas, el
      tiempo que quedó registrado, el propio suelo. No una recreación artística: una reconstrucción
      que cualquiera puede comprobar.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/edit/">Describe tu propio avistamiento</a>
      <a class="btn" href="/demos/">Mira lo que sabe hacer</a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
${carousel}
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Dos usos</h2>
    <div class="uses">
      <a class="use" href="/edit/">
        <h3>Describe tu propio avistamiento</h3>
        <p>Dibuja lo que viste y registra cómo se movió, luego di cuándo y dónde — y el cielo de ese
          momento aparece detrás, junto con el tiempo que quedó registrado. Corrige la forma hasta
          que coincida. Lo que obtienes es un archivo que es tuyo: no hay cuenta y no se sube
          nada.</p>
        <p class="use-more">Abrir el editor →</p>
      </a>
      <a class="use" href="/docs/">
        <h3>Ponlo en tu propio sitio</h3>
        <p>Dos líneas de HTML colocan una reconstrucción en un artículo, un expediente o un informe —
          tu grabación, en tu alojamiento, con tu nombre. Sin <i lang="en">framework</i>, sin paso de
          compilación, sin depender de este sitio una vez que tienes los archivos. Úsalo, modifícalo,
          redistribúyelo, haz un fork.</p>
        <p class="use-more">Leer la documentación →</p>
      </a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Dos principios</h2>

    <div class="principle">
      <h3>Contextualizar</h3>
      <p class="lede prose-wide">Primero, lo que se puede comprobar. Reproducir las condiciones
        comprobables de ese lugar y ese momento tan fielmente como se puedan reproducir, y la escena
        responde: esta es una explicación que encaja con lo que había realmente en lo alto, y esta
        otra la acaba de descartar este cielo. El testigo aporta el fenómeno; nada más se deja a la
        memoria.</p>
      <div class="cards">
        <div class="card">
          <h4>El cielo</h4>
          <p>Sol, Luna y su fase, planetas, estrellas, la Vía Láctea y la luz zodiacal, situados por
            efemérides para ese instante y ese lugar. Lo que se dibuja se detiene donde se detenía el
            ojo que miraba — y donde se detienen los propios datos, la herramienta lo dice en lugar de
            dibujar un cielo más vacío de lo que estaba la noche. Señala cualquier cosa y dirá su
            nombre.</p>
          <p class="card-more"><a href="/context/#sky">Hasta qué magnitud →</a></p>
        </div>
        <div class="card">
          <h4>Qué más había allá arriba</h4>
          <p>Cometas, novas y supernovas, lluvias de meteoros, satélites — cada uno dibujado solo si pudo ser visible desde
            allí, en ese momento. Estar iluminado no es lo mismo que ser visto, y la sombra de la
            Tierra lo decide.</p>
          <p class="card-more"><a href="/context/#space">Cómo se decide cada uno →</a></p>
        </div>
        <div class="card">
          <h4>Hielo y agua</h4>
          <p>Halos, parhelios, pilares, arcos tangentes y circuncenitales, arcoíris y arcoíris
            lunares. Ninguno de esos ángulos está almacenado: salen del índice de refracción del hielo
            y de la forma de una gota, lo que mantiene todo el conjunto coherente con el Sol que lo
            produjo.</p>
          <p class="card-more"><a href="/context/#ice">Cuáles, y a partir de qué →</a></p>
        </div>
        <div class="card">
          <h4>El tiempo de aquel día</h4>
          <p>Nubes, lluvia, nieve, tormentas y viento, leídos de un reanálisis mundial y horario que
            se remonta a 1940 y fijados en fotogramas clave a lo largo de la observación. Las nubes
            forman capas distintas, medidas en metros, con su propio tipo, espesor, tamaño, densidad y
            movimiento; los volúmenes individuales pueden moverse para comprobar si ocultan realmente
            el fenómeno. La consulta exacta sigue siendo comprobable.</p>
          <p class="card-more"><a href="/context/#weather">Qué registro, y qué aporta →</a></p>
        </div>
        <div class="card">
          <h4>El suelo</h4>
          <p>Relieve real e imágenes aéreas alrededor del testigo, y el decorado que se interpuso:
            edificios, árboles, farolas, vehículos, ventanas, otros testigos. A qué altura estaban se
            consulta desde donde estaban, y nadie puede quedar colocado bajo tierra.</p>
          <p class="card-more"><a href="/context/#ground">Por qué se mueve el horizonte →</a></p>
        </div>
        <div class="card">
          <h4>El instrumento</h4>
          <p>Un ojo no es un objetivo, y el aparato decide la imagen: solo se ofrecen los ajustes que
            realmente pudo tener, uno que aún no existía se señala frente a la fecha, y es él — no el
            testigo — quien fija lo débil que podía ser algo para quedar registrado. Por eso tantos
            relatos de «el cielo estaba lleno de estrellas» vienen con una fotografía negra y
            vacía.</p>
          <p class="card-more"><a href="/context/#instrument">Las cifras que hay detrás →</a></p>
        </div>
        <div class="card">
          <h4>Una foto del lugar</h4>
          <p>Todo lo que dibuja la escena está calculado, y nada distingue una reconstrucción fiel de
            una verosímil. Una fotografía del mismo lugar sí: superpuesta al render con cualquier
            opacidad, alineada con dos o tres referencias, muestra cada árbol que el relieve no
            conocía — y devuelve el rumbo al que miraba realmente el testigo, como una medida.</p>
          <p class="card-more"><a href="/context/#pictures">Cómo se alinea una foto →</a></p>
        </div>
      </div>
      <p class="small">Cada fuente se nombra allí donde se presentan sus datos, y puede sustituirse
        por otra — el selector <em>es</em> el crédito. De dónde viene cada una, qué aporta y dónde se
        detiene: <a href="/context/">comprueba lo que afirma la escena</a>. Lo que aún falta está en
        <a href="/roadmap/">la hoja de ruta</a>.</p>
      </div>

    <div class="principle">
      <h3>Acotar las hipótesis</h3>
      <p class="lede prose-wide">A partir de lo que se sabe con suficiente certeza y de lo que
        relata el testigo, delimitar lo que pudo ser el fenómeno, sin asumir la interpretación que
        el propio testigo hace de él. Un testimonio es un ángulo, no una medida: no dice que hubiera
        un objeto allí, ni a qué distancia. Confrontado con la escena, dice sin embargo mucho: qué
        tamaños van con qué distancias, una distancia acotada en cuanto el fenómeno pasó por delante
        o por detrás de algo cuya posición se conoce, qué candidatos de ese cielo encajan y cuáles
        descarta.</p>
      <div class="prose-wide">
        <p>Nadie percibe metros. Un testigo percibe un <em>ángulo</em>: la cosa cubría una uña del
          pulgar con el brazo extendido, una quinta parte del parabrisas, dos lunas llenas. «Unos
          treinta metros de largo» es una conclusión sacada de una distancia que tampoco podía
          percibir, y los dos errores se multiplican.</p>
        <p>Por eso una grabación de UFO@home almacena lo grande que <em>parecía</em> el objeto, en
          grados, y no almacena en ninguna parte un tamaño real ni una distancia real. Los metros solo
          vuelven en un caso: cuando se vio al objeto pasar por detrás o por delante de algo cuya
          posición se conoce. Eso es una desigualdad, y la herramienta la presenta como tal —
          incluido, la mayoría de las veces, «desconocida».</p>
        <p>El objeto se dibuja como una forma plana en el campo de visión del testigo, nunca como un
          cuerpo sólido situado en el espacio. Es deliberado. Suponer una nave a cierta distancia ya
          es una interpretación, y descarta en silencio las explicaciones que más importan: un halo,
          un planeta, un satélite, el faro de aterrizaje de un avión, una nube lenticular. Una forma
          2D solo supone lo que el testigo afirmó realmente: que esto es lo que llegó a su ojo.</p>
        <p>Por eso un caso con varios testigos son varias grabaciones, no una. Cada una expone lo que
          vio una persona desde donde estaba, y una reconstrucción permite pasar de una a otra — el
          lector mediante un selector, el autor colocando a los demás en la escena y abriendo sus
          testimonios desde allí. Dos personas a cien metros una de otra no vieron lo mismo, y <a href="/docs/format/#several-observers-the-case">el formato</a> está hecho para que esa diferencia tenga dónde vivir.</p>
      </div>
    </div>
    </div>
  </section>
  `
  }

  private it(carousel: string): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Software libero · integrabile ovunque</p>
    <h1>Ricostruire ciò che ha visto il testimone.</h1>
    <p class="lede">Disegna la forma. Registra come si è mossa. Riproducila sotto il cielo che c'era
      davvero sopra quel luogo, a quell'ora, in quella data — il Sole, la Luna, le stelle, il meteo
      registrato, il suolo stesso. Non un'impressione d'artista: una ricostruzione che chiunque può
      verificare.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/edit/">Descrivi il tuo avvistamento</a>
      <a class="btn" href="/demos/">Scopri cosa sa fare</a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
${carousel}
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Due usi</h2>
    <div class="uses">
      <a class="use" href="/edit/">
        <h3>Descrivi il tuo avvistamento</h3>
        <p>Disegna ciò che hai visto e registra come si è mosso, poi di' quando e dove — e il cielo di
          quel momento compare dietro, insieme al meteo che era stato registrato. Correggi la forma
          finché non corrisponde. Ciò che ottieni è un file tuo: non c'è nessun account e non viene
          caricato nulla.</p>
        <p class="use-more">Apri l'editor →</p>
      </a>
      <a class="use" href="/docs/">
        <h3>Mettilo sul tuo sito</h3>
        <p>Due righe di HTML collocano una ricostruzione in un articolo, in un fascicolo o in un
          rapporto — la tua registrazione, sul tuo hosting, a tuo nome. Nessun
          <i lang="en">framework</i>, nessuna fase di compilazione, nessuna dipendenza da questo sito
          una volta che hai i file. Usalo, modificalo, ridistribuiscilo, fanne un fork.</p>
        <p class="use-more">Leggi la documentazione →</p>
      </a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Due principi</h2>

    <div class="principle">
      <h3>Contestualizzare</h3>
      <p class="lede prose-wide">Prima di tutto, ciò che si può verificare. Riprodurre le condizioni
        verificabili di quel luogo e di quel momento con tutta la fedeltà possibile, e la scena
        risponde: ecco una spiegazione che si accorda con ciò che c'era davvero lassù, ed ecco una che
        questo cielo ha appena escluso. Il testimone fornisce il fenomeno; nient'altro è lasciato alla
        memoria.</p>
      <div class="cards">
        <div class="card">
          <h4>Il cielo</h4>
          <p>Sole, Luna e la sua fase, pianeti, stelle, la Via Lattea e la luce zodiacale, collocati
            tramite effemeridi per quell'istante e quel luogo. Ciò che viene disegnato si ferma dove
            si fermava l'occhio che guardava — e dove si fermano i dati stessi, lo strumento lo dice
            invece di disegnare un cielo più vuoto di quanto fosse la notte. Indica qualsiasi cosa e
            ti dirà il suo nome.</p>
          <p class="card-more"><a href="/context/#sky">Fino a quale magnitudine →</a></p>
        </div>
        <div class="card">
          <h4>Cos'altro c'era lassù</h4>
          <p>Comete, novae e supernovae, sciami meteorici, satelliti — ciascuno disegnato solo se poteva essere visibile da
            lì, in quel momento. Essere illuminato non è la stessa cosa che essere visto, ed è l'ombra
            della Terra a deciderlo.</p>
          <p class="card-more"><a href="/context/#space">Come si decide ciascuno →</a></p>
        </div>
        <div class="card">
          <h4>Ghiaccio e acqua</h4>
          <p>Aloni, pareli, colonne di luce, archi tangenti e circumzenitali, arcobaleni e arcobaleni
            lunari. Nessuno di quegli angoli è memorizzato: derivano dall'indice di rifrazione del
            ghiaccio e dalla forma di una goccia, ed è questo che mantiene l'intero fenomeno coerente
            con il Sole che lo ha prodotto.</p>
          <p class="card-more"><a href="/context/#ice">Quali, e a partire da cosa →</a></p>
        </div>
        <div class="card">
          <h4>Il meteo di quel giorno</h4>
          <p>Nuvole, pioggia, neve, temporali e vento, letti da una rianalisi mondiale oraria che
            risale al 1940 e fissati in fotogrammi chiave lungo l'osservazione. Le nuvole formano
            strati distinti, misurati in metri, ciascuno con il proprio tipo, spessore, dimensione,
            densità e movimento; i singoli volumi possono essere spostati per verificare se nascondono
            davvero il fenomeno. La richiesta esatta resta verificabile.</p>
          <p class="card-more"><a href="/context/#weather">Quale fonte, e cosa fornisce →</a></p>
        </div>
        <div class="card">
          <h4>Il suolo</h4>
          <p>Rilievo reale e immagini aeree attorno al testimone, e gli elementi che si sono
            frapposti: edifici, alberi, lampioni, veicoli, finestre, altri testimoni. L'altezza a cui
            si trovavano viene ricavata dal punto in cui si trovavano, e nessuno può essere collocato
            sottoterra.</p>
          <p class="card-more"><a href="/context/#ground">Perché l'orizzonte si sposta →</a></p>
        </div>
        <div class="card">
          <h4>Lo strumento</h4>
          <p>Un occhio non è un obiettivo, ed è l'apparecchio a decidere l'immagine: vengono proposte
            solo le impostazioni che poteva avere davvero, uno che ancora non esisteva viene segnalato
            rispetto alla data, ed è lui — non il testimone — a stabilire quanto debole potesse essere
            una cosa per venire registrata. Ecco perché tanti racconti di «il cielo era pieno di
            stelle» sono accompagnati da una fotografia nera e vuota.</p>
          <p class="card-more"><a href="/context/#instrument">I numeri dietro tutto questo →</a></p>
        </div>
        <div class="card">
          <h4>Una foto del luogo</h4>
          <p>Tutto ciò che la scena disegna è calcolato, e nulla distingue una ricostruzione fedele da
            una verosimile. Una fotografia dello stesso luogo sì: sovrapposta al rendering con
            qualsiasi opacità, allineata su due o tre punti di riferimento, mostra ogni albero che il
            rilievo non conosceva — e restituisce la direzione verso cui guardava davvero il
            testimone, come una misura.</p>
          <p class="card-more"><a href="/context/#pictures">Come si allinea una foto →</a></p>
        </div>
      </div>
      <p class="small">Ogni fonte è nominata là dove i suoi dati vengono riportati, e può essere
        sostituita con un'altra — il selettore <em>è</em> il credito. Da dove viene ciascuna, cosa
        fornisce e dove si ferma: <a href="/context/">verifica ciò che la scena afferma</a>. Ciò che
        manca ancora è nella <a href="/roadmap/">tabella di marcia</a>.</p>
      </div>

    <div class="principle">
      <h3>Circoscrivere le ipotesi</h3>
      <p class="lede prose-wide">A partire da ciò che si sa con sufficiente certezza e da ciò che il
        testimone riferisce, restringere ciò che il fenomeno può essere stato, senza fare propria
        l'interpretazione che ne dà il testimone stesso. Una testimonianza è un angolo, non una
        misura: non dice che un oggetto fosse lì, né a quale distanza. Messa a confronto con la scena
        dice però molto: quali dimensioni vanno con quali distanze, una distanza delimitata non appena
        il fenomeno è passato davanti o dietro a qualcosa di cui si conosce la posizione, quali
        candidati di quel cielo gli si addicono e quali esclude.</p>
      <div class="prose-wide">
        <p>Nessuno percepisce metri. Un testimone percepisce un <em>angolo</em>: la cosa copriva
          un'unghia del pollice a braccio teso, un quinto del parabrezza, due lune piene. «Lungo una
          trentina di metri» è una conclusione tratta da una distanza che non poteva percepire
          nemmeno lei, e i due errori si moltiplicano.</p>
        <p>Così una registrazione di UFO@home memorizza quanto grande <em>sembrava</em> l'oggetto, in
          gradi, e non memorizza da nessuna parte una dimensione reale né una distanza reale. I metri
          tornano in un solo caso: quando l'oggetto è stato visto passare dietro o davanti a qualcosa
          di cui si conosce la posizione. È una disuguaglianza, e lo strumento la presenta come tale —
          compreso, il più delle volte, «sconosciuta».</p>
        <p>L'oggetto viene disegnato come una forma piatta nel campo visivo del testimone, mai come un
          corpo solido collocato nello spazio. È una scelta deliberata. Supporre un velivolo a una
          certa distanza è già un'interpretazione, e scarta in silenzio le spiegazioni che contano di
          più: un alone, un pianeta, un satellite, il faro di atterraggio di un aereo, una nube
          lenticolare. Una forma 2D presuppone solo ciò che il testimone ha davvero affermato: che è
          questo ciò che è arrivato al suo occhio.</p>
        <p>Ecco perché un caso con più testimoni è fatto di più registrazioni, non di una sola.
          Ciascuna espone ciò che una persona ha visto dal punto in cui si trovava, e una ricostruzione
          permette di passare dall'una all'altra — il lettore tramite un selettore, l'autore
          collocando gli altri nella scena e aprendo da lì le loro testimonianze. Due persone a cento
          metri l'una dall'altra non hanno visto la stessa cosa, e <a href="/docs/format/#several-observers-the-case">il formato</a> è costruito perché quella differenza abbia un posto dove stare.</p>
      </div>
    </div>
    </div>
  </section>
  `
  }
}
