import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** The front page: what you can do with it, one carousel of live reconstructions, and why it is
 * built the way it is. */
export class HomePage implements SitePage {

  readonly meta: PageMeta = {
    slug: "",
    navLabel: { en: "Home", fr: "Accueil" },
    title: {
      en: "Reconstruct what the witness saw",
      fr: "Reconstituer ce que le témoin a vu"
    },
    description: {
      en: "UFO@home is a free, open-source tool that replays a UFO sighting as its witness described it — "
        + "the shape, its movement, and the real sky of that date, time and place.",
      fr: "UFO@home est un outil libre qui rejoue une observation d'ovni telle que son témoin l'a décrite — "
        + "la forme, son mouvement, et le ciel réel de cette date, de cette heure et de ce lieu."
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
   * itself up again after a while of nothing happening.
   */
  script(language: SiteLanguage): string {
    const fr = language === "fr"
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
const editorPath = "/editor/"

const stage = document.getElementById("hero-stage")
const caption = document.getElementById("hero-caption")
const editLink = document.getElementById("hero-edit")
const dots = [...document.querySelectorAll(".carousel-dot")]
const carousel = document.getElementById("hero-carousel")

let index = 0
let auto = true
let slideTimer
let resumeTimer

const ufo = () => stage.scene?.ufoElement

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
      player.play()
    }
  } catch {
    // A demo that will not load must not stop the carousel — move on.
    if (auto) slideTimer = setTimeout(() => show(index + 1), 1000)
    return
  }
  if (auto) slideTimer = setTimeout(() => { if (auto) show(index + 1) }, MAX_SLIDE_MS)
}

// Fired by the recording running off its own end, and composed, so it crosses the element's shadow
// roots to reach this page.
stage.addEventListener("ended", () => { if (auto) show(index + 1) })

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
    const fr = language === "fr"
    const dots = this.catalogue.demos.map((demo, at) =>
      `<button class="carousel-dot" type="button" aria-current="${at === 0}" title="${demo.title[language]}" aria-label="${demo.title[language]}"></button>`
    ).join("\n          ")
    const carousel = `
    <div class="carousel" id="hero-carousel" data-auto="on">
      <div class="stage">
        <div class="carousel-viewport">
          <rr0-sighting id="hero-stage"></rr0-sighting>
          <button class="carousel-nav is-prev" type="button" data-step="-1" aria-label="${fr ? "Précédente" : "Previous"}"></button>
          <button class="carousel-nav is-next" type="button" data-step="1" aria-label="${fr ? "Suivante" : "Next"}"></button>
        </div>
        <div class="carousel-dots" role="group" aria-label="${fr ? "Reconstitutions" : "Reconstructions"}">
          ${dots}
        </div>
        <p class="stage-caption">
          <span id="hero-caption"></span>
          <span class="carousel-sep" aria-hidden="true"> — </span>
          <a class="carousel-edit" id="hero-edit" href="/editor/">${fr ? "Éditer cette observation" : "Edit this sighting"}</a>
        </p>
      </div>
    </div>`
    return fr ? this.fr(carousel) : this.en(carousel)
  }

  private en(carousel: string): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Free software · MIT · embeddable anywhere</p>
    <h1>Reconstruct what the witness saw.</h1>
    <p class="lede">Draw the shape. Record how it moved. Replay it against the sky that was
      actually over that place, at that hour, on that date — the Sun, the Moon, the stars, the
      weather on record, the ground itself. Not an artist's impression: a reconstruction anyone
      can check.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/editor/">Describe your own sighting</a>
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
      <a class="use" href="/editor/">
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
          this site once you hold the files. It is MIT: use it, change it, redistribute it, fork it.</p>
        <p class="use-more">Read the documentation →</p>
      </a>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Two principles</h2>

    <div class="principle">
      <h3>Interpret nothing</h3>
      <p class="lede prose-wide">A testimony is an angle, not a measurement. Hold to what the
        witness described seeing, and infer no solid body, no distance, no craft behind it. Every
        inference laid on top is data nobody supplied — and it quietly constrains the account, or
        rules out an explanation that had every right to stand.</p>
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
          thing, and the format is built so that the difference has somewhere to live.</p>
      </div>
    </div>

    <div class="principle">
      <h3>Contextualise</h3>
      <p class="lede prose-wide">Everything else is looked up or computed. Reproduce the checkable
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
          <p class="card-more"><a href="/sources/#sky">Down to which magnitude →</a></p>
        </div>
        <div class="card">
          <h4>What else was up there</h4>
          <p>Comets, meteor showers, satellites — each drawn only if it could have been visible from
            there, then. Being lit is not the same as being seen, and the Earth's shadow settles that
            one.</p>
          <p class="card-more"><a href="/sources/#space">How each is decided →</a></p>
        </div>
        <div class="card">
          <h4>Ice and water</h4>
          <p>Haloes, sundogs, pillars, tangent and circumzenithal arcs, rainbows and moonbows. Not one
            of those angles is stored: they come out of ice's refractive index and the shape of a
            drop, which is what keeps the whole display consistent with the Sun that made it.</p>
          <p class="card-more"><a href="/sources/#ice">Which ones, and from what →</a></p>
        </div>
        <div class="card">
          <h4>The weather that day</h4>
          <p>Cloud, rain, snow, storms and wind, read from a worldwide hourly reanalysis going back to
            1940 — and keyframed along the observation, so a sky that cleared, clears. The exact query
            stays in the file: the claim is checkable decades later.</p>
          <p class="card-more"><a href="/sources/#weather">Which record, and what it gives →</a></p>
        </div>
        <div class="card">
          <h4>The ground</h4>
          <p>Real relief and aerial imagery around the witness, and the decor that got in the way:
            buildings, trees, streetlights, vehicles, windows, other witnesses. How high they stood is
            looked up from where they stood, and nobody can be placed under the ground.</p>
          <p class="card-more"><a href="/sources/#ground">Why the horizon moves →</a></p>
        </div>
        <div class="card">
          <h4>The instrument</h4>
          <p>An eye is not a lens, and the device decides the picture: only the settings it could
            really have had are offered, one that did not exist yet is flagged against the date, and
            it — not the witness — sets how faint a thing could be recorded at all. Which is why so
            many “the sky was full of stars” accounts come with an empty black photograph.</p>
          <p class="card-more"><a href="/sources/#instrument">The numbers behind that →</a></p>
        </div>
      </div>
      <p class="small">Every source is named where its data is reported, and can be swapped for
        another — the picker <em>is</em> the credit. Where each one comes from, what it gives and
        where it stops: <a href="/sources/">check what the scene claims</a>. What is still missing is
        on <a href="/roadmap/">the roadmap</a>.</p>
      </div>
    </div>
  </section>
  `
    }

    private fr(carousel: string): string {
      return `
  <section class="band hero">
    <div class="wrap">
      <p class="eyebrow">Logiciel libre · MIT · intégrable partout</p>
      <h1>Reconstituer ce que le témoin a vu.</h1>
      <p class="lede">Dessinez la forme. Enregistrez son mouvement. Rejouez-la sous le ciel qui se
        trouvait réellement au-dessus de ce lieu, à cette heure, ce jour-là — le Soleil, la Lune, les
        étoiles, la météo relevée, le sol lui-même. Pas une vue d'artiste : une reconstitution que
        n'importe qui peut vérifier.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/editor/">Décrire votre propre observation</a>
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
        <a class="use" href="/editor/">
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
            aucune compilation, aucune dépendance à ce site dès lors que vous avez les fichiers. C'est
            du MIT : utilisez-le, modifiez-le, redistribuez-le, forkez-le.</p>
          <p class="use-more">Lire la documentation →</p>
        </a>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <h2>Deux principes</h2>

      <div class="principle">
        <h3>Ne pas interpréter</h3>
        <p class="lede prose-wide">Un témoignage est un angle, pas une mesure. S'en tenir à ce que le
          témoin décrit avoir vu, et n'en inférer ni corps solide, ni distance, ni engin derrière.
          Chaque inférence posée par-dessus est une donnée que personne n'a fournie — et elle
          contraint le récit en silence, ou écarte une explication qui avait tout droit de tenir.</p>
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
          de l'autre n'ont pas vu la même chose, et le format est fait pour que cette différence ait
          où se loger.</p>
        </div>
      </div>

      <div class="principle">
        <h3>Contextualiser</h3>
        <p class="lede prose-wide">Tout le reste est relevé ou calculé. Reproduire aussi fidèlement
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
          <p class="card-more"><a href="/sources/#sky">Jusqu'à quelle magnitude →</a></p>
        </div>
        <div class="card">
          <h4>Ce qu'il y avait d'autre là-haut</h4>
          <p>Comètes, pluies de météores, satellites — chacun n'est dessiné que s'il pouvait être vu
            de là, à ce moment-là. Être éclairé n'est pas être vu, et c'est l'ombre de la Terre qui
            tranche.</p>
          <p class="card-more"><a href="/sources/#space">Comment chacun est décidé →</a></p>
        </div>
        <div class="card">
          <h4>La glace et l'eau</h4>
          <p>Halos, parhélies, piliers, arcs tangents et circumzénithaux, arcs-en-ciel et arcs
            lunaires. Aucun de ces angles n'est stocké : ils sortent de l'indice de réfraction de la
            glace et de la forme d'une goutte, ce qui garde tout le cortège cohérent avec le Soleil
            qui l'a fait.</p>
          <p class="card-more"><a href="/sources/#ice">Lesquels, et d'après quoi →</a></p>
        </div>
        <div class="card">
          <h4>La météo de ce jour-là</h4>
          <p>Nuages, pluie, neige, orages et vent, lus dans une réanalyse mondiale et horaire qui
            remonte à 1940 — et keyframés le long de l'observation, si bien qu'un ciel qui s'est
            dégagé se dégage. La requête exacte reste dans le fichier : l'affirmation est vérifiable
            des décennies plus tard.</p>
          <p class="card-more"><a href="/sources/#weather">Quelle source, et ce qu'elle donne →</a></p>
        </div>
        <div class="card">
          <h4>Le sol</h4>
          <p>Relief réel et imagerie aérienne autour du témoin, et le décor qui s'est interposé :
            bâtiments, arbres, lampadaires, véhicules, vitrages, autres témoins. À quelle hauteur il
            se tenait se relève d'où il se tenait, et on ne peut placer personne sous le sol.</p>
          <p class="card-more"><a href="/sources/#ground">Pourquoi l'horizon se déplace →</a></p>
        </div>
        <div class="card">
          <h4>L'instrument</h4>
          <p>Un œil n'est pas un objectif, et c'est l'appareil qui décide de l'image : seuls les
            réglages qu'il pouvait réellement avoir sont proposés, un appareil qui n'existait pas
            encore est signalé face à la date, et c'est lui — non le témoin — qui fixe ce qui pouvait
            être enregistré. D'où tant de récits de « ciel plein d'étoiles » accompagnés d'une
            photographie noire et vide.</p>
          <p class="card-more"><a href="/sources/#instrument">Les nombres derrière cela →</a></p>
        </div>
      </div>
      <p class="small">Chaque source est nommée là où sa donnée est rapportée, et peut être
        remplacée par une autre — le sélecteur <em>est</em> le crédit. D'où vient chacune, ce qu'elle
        donne et où elle s'arrête : <a href="/sources/">vérifier ce que la scène affirme</a>. Ce qui
        manque encore est sur <a href="/roadmap/">la page du plan</a>.</p>
      </div>
    </div>
  </section>
  `
    }
  }
