import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

interface Slide {
  readonly src: string
  /** Which single recording the "edit this" link opens, when `src` names several witnesses. */
  readonly editSrc?: string
  readonly caption: Said<string>
}

/** The front page: what you can do with it, one carousel of live reconstructions, and why it is
 * built the way it is. */
export class HomePage implements SitePage {

  readonly meta: PageMeta = {
    slug: { en: "", fr: "" },
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
    modules: ["/lib/rr0-eyewitness.mjs"]
  }

  private readonly slides: readonly Slide[] = [
    {
      src: "/demo-data/witnesses-manifest.json",
      editSrc: "/demo-data/witness-chiles.json",
      caption: {
        en: "Chiles &amp; Whitted, 24 July 1948, 02:45, near Montgomery, Alabama. Two airline pilots, "
          + "two accounts that do not match — switch witness in the toolbar.",
        fr: "Chiles et Whitted, 24 juillet 1948, 02:45, près de Montgomery (Alabama). Deux pilotes de "
          + "ligne, deux récits qui ne concordent pas — changez de témoin dans la barre d'outils."
      }
    },
    {
      src: "/demo-data/witness-valensole.json",
      caption: {
        en: "Valensole, 1 July 1965, 05:45. Dawn on the plateau, the Sun still below the horizon, and "
          + "the real relief of that field under the witness's feet.",
        fr: "Valensole, 1ᵉʳ juillet 1965, 05:45. L'aube sur le plateau, le Soleil encore sous l'horizon, "
          + "et le relief réel de ce champ sous les pieds du témoin."
      }
    },
    {
      src: "/demo-data/sky-test-halos.json",
      caption: {
        en: "A cirrus veil and a Sun 20° up. Nothing here is placed by hand: a hexagonal ice prism and "
          + "Snell's law give the 22° ring, the sundogs and the arcs their exact angles.",
        fr: "Un voile de cirrus et un Soleil à 20°. Rien ici n'est posé à la main : un prisme hexagonal "
          + "de glace et la loi de Snell donnent à l'anneau de 22°, aux parhélies et aux arcs leurs angles exacts."
      }
    },
    {
      src: "/demo-data/sky-test-rainbow.json",
      caption: {
        en: "A rainbow needs four things at once: rain, a Sun low enough, a gap in the cloud, and a "
          + "witness facing away from it. Remove one and there is nothing to see.",
        fr: "Un arc-en-ciel demande quatre choses à la fois : de la pluie, un Soleil assez bas, une "
          + "trouée dans les nuages, et un témoin qui lui tourne le dos. Retirez-en une et il n'y a rien."
      }
    },
    {
      src: "/demo-data/sky-test-aircraft.json",
      caption: {
        en: "No object is drawn here — there isn't one. An airliner at 6 000 m on a twenty-second "
          + "exposure: steady lamps draw lines, flashing ones drop dots at regular intervals.",
        fr: "Aucun objet n'est dessiné ici — il n'y en a pas. Un avion de ligne à 6 000 m sur une pose "
          + "de vingt secondes : les feux fixes tracent des lignes, les clignotants posent des points réguliers."
      }
    }
  ]

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
    const slides = JSON.stringify(this.slides.map(slide => ({
      src: slide.src,
      edit: slide.editSrc ?? slide.src,
      caption: slide.caption[language]
    })))
    return `const slides = ${slides}
// A recording as long as Valensole's four and a half minutes would hold the carousel for as long
// as the rest of the page put together, so a slide moves on at its own end OR at this, whichever
// comes first. Long enough to see what a sky is doing, short enough that nobody waits for it.
const MAX_SLIDE_MS = 25000
// How long the carousel stays out of the way after the reader has touched it.
const RESUME_MS = 60000
const editorPath = ${JSON.stringify(fr ? "/fr/editeur/" : "/editor/")}

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
  caption.innerHTML = slide.caption
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
    const dots = this.slides.map((_, at) =>
      `<button class="carousel-dot" type="button" aria-current="${at === 0}" aria-label="${fr ? "Reconstitution" : "Reconstruction"} ${at + 1}"></button>`
    ).join("\n        ")
    const carousel = `
    <div class="carousel" id="hero-carousel" data-auto="on">
      <div class="stage">
        <rr0-eyewitness id="hero-stage"></rr0-eyewitness>
        <div class="carousel-bar">
          <button class="carousel-nav" type="button" data-step="-1" aria-label="${fr ? "Précédente" : "Previous"}">‹</button>
          <div class="carousel-dots">
        ${dots}
          </div>
          <button class="carousel-nav" type="button" data-step="1" aria-label="${fr ? "Suivante" : "Next"}">›</button>
          <a class="carousel-edit" id="hero-edit" href="${fr ? "/fr/editeur/" : "/editor/"}">${fr ? "Modifier cette observation" : "Edit this sighting"}</a>
        </div>
        <p class="stage-caption" id="hero-caption"></p>
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
    <h2>Two things to do with it</h2>
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
    <h2>A testimony is an angle, not a measurement</h2>
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
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Everything else is looked up or computed</h2>
    <p class="lede prose-wide">The witness supplies the object. Nothing else in the scene is left to
      memory.</p>
    <div class="cards">
      <div class="card">
        <h3>The sky</h3>
        <p>Sun, Moon and its phase, planets, a star catalogue down to magnitude 7.5 — positioned for
          that instant and that latitude. The Milky Way and the zodiacal light are integrated along
          the line of sight, not painted as a texture.</p>
      </div>
      <div class="card">
        <h3>What else was up there</h3>
        <p>Comets at their own apparition, meteor showers with their radiant and rate over a
          sporadic background, satellites with the Earth's shadow worked out to say whether one
          could have been lit at all.</p>
      </div>
      <div class="card">
        <h3>Ice and water</h3>
        <p>22° and 46° haloes, sundogs, pillars, tangent and circumzenithal arcs — every angle
          derived from ice's refractive index, none of them stored. Rainbows and moonbows traced
          through a spherical drop.</p>
      </div>
      <div class="card">
        <h3>The weather that day</h3>
        <p>Cloud cover, cloud base, rain, snow, storms, wind — read from ERA5, the ECMWF reanalysis,
          hourly and worldwide from 1940 on. The exact query is kept in the file, so the claim stays
          checkable decades later.</p>
      </div>
      <div class="card">
        <h3>The ground</h3>
        <p>Real relief and aerial imagery around the witness, and the decor that got in the way:
          buildings, trees, streetlights, vehicles, windows, other witnesses — with their lights,
          their flash rates and their tracks.</p>
      </div>
      <div class="card">
        <h3>The instrument</h3>
        <p>An eye is not a lens. Naked-eye viewing maps an angle to an angle; a camera maps it to
          <code>f·tan θ</code>, with a sensor, a focal length, an aperture and an exposure that
          draws star trails and dots a flashing light.</p>
      </div>
    </div>
    <p class="small">Every source is named where its data is reported, with the attribution its
      licence requires — and can be swapped for another. The picker <em>is</em> the credit. What is
      still missing, and what each item is waiting on, is on <a href="/roadmap/">the roadmap</a>.</p>
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
      <a class="btn btn-primary" href="/fr/editeur/">Décrire votre propre observation</a>
      <a class="btn" href="/fr/demos/">Voir ce qu'il sait faire</a>
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
    <h2>Deux choses à en faire</h2>
    <div class="uses">
      <a class="use" href="/fr/editeur/">
        <h3>Décrire votre propre observation</h3>
        <p>Dessinez ce que vous avez vu, enregistrez son mouvement, puis dites quand et où — et le
          ciel de cet instant apparaît derrière, avec la météo qui était relevée. Corrigez la forme
          jusqu'à ce que cela corresponde. Ce que vous obtenez est un fichier qui est le vôtre : il
          n'y a pas de compte, et rien n'est téléversé.</p>
        <p class="use-more">Ouvrir l'éditeur →</p>
      </a>
      <a class="use" href="/fr/documentation/">
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
    <h2>Un témoignage est un angle, pas une mesure</h2>
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
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Tout le reste est relevé ou calculé</h2>
    <p class="lede prose-wide">Le témoin fournit l'objet. Rien d'autre dans la scène n'est laissé à
      la mémoire.</p>
    <div class="cards">
      <div class="card">
        <h3>Le ciel</h3>
        <p>Soleil, Lune et sa phase, planètes, un catalogue d'étoiles jusqu'à la magnitude 7,5 —
          placés pour cet instant et cette latitude. La Voie lactée et la lumière zodiacale sont
          intégrées le long de la ligne de visée, non plaquées en texture.</p>
      </div>
      <div class="card">
        <h3>Ce qu'il y avait d'autre là-haut</h3>
        <p>Les comètes à leur apparition propre, les pluies de météores avec leur radiant et leur
          taux au-dessus d'un fond sporadique, les satellites — avec l'ombre de la Terre calculée
          pour dire si l'un d'eux pouvait seulement être éclairé.</p>
      </div>
      <div class="card">
        <h3>La glace et l'eau</h3>
        <p>Halos à 22° et 46°, parhélies, piliers, arcs tangents et circumzénithaux — chaque angle
          dérivé de l'indice de réfraction de la glace, aucun n'est stocké. Arcs-en-ciel et arcs
          lunaires tracés dans une goutte sphérique.</p>
      </div>
      <div class="card">
        <h3>La météo de ce jour-là</h3>
        <p>Couverture nuageuse, base des nuages, pluie, neige, orages, vent — lus dans ERA5, la
          réanalyse de l'ECMWF, horaire et mondiale depuis 1940. La requête exacte est conservée
          dans le fichier : l'affirmation reste vérifiable des décennies plus tard.</p>
      </div>
      <div class="card">
        <h3>Le sol</h3>
        <p>Relief réel et imagerie aérienne autour du témoin, et le décor qui s'est interposé :
          bâtiments, arbres, lampadaires, véhicules, vitrages, autres témoins — avec leurs feux,
          leurs cadences de clignotement et leurs trajectoires.</p>
      </div>
      <div class="card">
        <h3>L'instrument</h3>
        <p>Un œil n'est pas un objectif. À l'œil nu, un angle reste un angle ; un appareil le
          projette en <code>f·tan θ</code>, avec un capteur, une focale, un diaphragme et une pose
          qui trace les filés d'étoiles et ponctue un feu clignotant.</p>
      </div>
    </div>
    <p class="small">Chaque source est nommée là où sa donnée est rapportée, avec l'attribution
      qu'exige sa licence — et peut être remplacée par une autre. Le sélecteur <em>est</em> le
      crédit. Ce qui manque encore, et ce que chaque élément attend, est sur
      <a href="/fr/plan/">la page du plan</a>.</p>
  </div>
</section>
`
  }
}
