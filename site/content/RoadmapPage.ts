import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** What is coming, and what each item is actually waiting on. */
export class RoadmapPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "roadmap",
    navLabel: { en: "Roadmap", fr: "Évolutions" },
    title: { en: "Future developments", fr: "Futures évolutions" },
    asideFromNav: true,
    description: {
      en: "What UFO@home already reproduces, what is being built next, and what each remaining item "
        + "is waiting on — a dataset, a physical model, or a decision.",
      fr: "Ce qu'UFO@home reproduit déjà, ce qui vient ensuite, et ce que chaque élément restant "
        + "attend — un jeu de données, un modèle physique, ou une décision."
    }
  }

  /** @param version The one from package.json. It used to be typed into the eyebrow by hand, where
   * it sat at 0.37 for eight releases — on the one page whose whole subject is what is current. */
  constructor(private readonly version: string) {
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Roadmap · version ${this.version}</p>
    <h1>Future developments.</h1>
    <p class="lede">One rule decides the order: <strong>reproduce everything that could have been
      visible in that sky at that moment</strong> — by data where a record exists, by calculation
      where none does, and never by invention. What follows is a plan, not a promise; the order
      moves when a real case makes it move.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p>What the tool already reconstructs, and how each part of it is computed and checked, is on
      <a href="/context/">the context page</a>; every source behind it is listed under
      <a href="/docs/sources/">sources and choices</a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Next</h2>

    <div class="timeline-step is-next">
      <h3>Atmospheric re-entries <span class="status status-next">next</span></h3>
      <p>A staple misidentification, and one of the few that leaves a testimony everybody
        recognises: a slow train of fragments, then “it went out all at once”. No usable record
        exists per event, so this is an object placed by hand — but with the real extinction as it
        enters the Earth's shadow, which is the part that makes the account fit.</p>
    </div>

    <div class="timeline-step">
      <h3>Radar propagation anomalies <span class="status status-later">blocked on data</span></h3>
      <p>Temperature inversions and ducting — the explanation behind a whole family of radar/visual
        cases. The criterion is a refractivity gradient below −157 units per kilometre, which needs
        the temperature and humidity profile with height. Checked and ruled out: Open-Meteo does not
        serve pressure levels in archive mode. The real source is IGRA, the radiosonde archive, and
        that is what this is waiting on.</p>
    </div>


    <div class="timeline-step">
      <h3>Weather balloons <span class="status status-later">considered</span></h3>
      <p>A documented network of launches from the 1940s on — and the Roswell explanation. Datable,
        placeable, and a shape nobody expects.</p>
    </div>

    <h2>On the object's side</h2>

    <div class="timeline-step">
      <h3>Textures on shapes <span class="status status-later">planned</span></h3>
      <p>Blended with the colour rather than replacing it, keyframed and serialized like every other
        appearance field. Witnesses describe surfaces — ribbed, matte, mirror-like — and today the
        format cannot hold that.</p>
    </div>

    <div class="timeline-step">
      <h3>Observed entities <span class="status status-later">design open</span></h3>
      <p>Three of the four shipped case files involve one. The open question is whether an entity is
        a 2D shape (testimony, like the object) or a 3D decor object. The model says “what reached
        the witness's eye”, which argues for the shape.</p>
    </div>

    <h2>On the environment's side</h2>

    <div class="timeline-step">
      <h3>Observing from an aircraft <span class="status status-later">planned</span></h3>
      <p>As already supported from a building or a car. Half of aviation testimony is given from a
        cockpit, and a window frame that hides fifteen degrees of sky is part of the account.</p>
    </div>

    <div class="timeline-step">
      <h3>Downloaded 3D models, on demand <span class="status status-later">planned</span></h3>
      <p>Real dashboards, real windscreen pillars — to see exactly what angular width a pillar
        masked. And the inverse case, which matters more: real aircraft seen from the ground and
        taken for something else, at the angle and with the reflections they actually give.</p>
    </div>

    <div class="timeline-step">
      <h3>A video as the scene <span class="status status-later">planned</span></h3>
      <p>A photograph of the place is <a href="/context/#pictures">already there</a>. A video is the
        same registration with a picture that moves: a texture locked to the timeline, the witness's
        own footage with the reconstruction over it, frame by frame. And a horizon traced on a picture
        that fits would hide what passed below it — metres coming back from a photograph the way they
        come back from a decor crossing.</p>
    </div>

    <div class="timeline-step">
      <h3>Reflections of interior lights on glazing <span class="status status-later">planned</span></h3>
      <p>A room lamp, a dashboard light, on a window or a windscreen. The last missing piece of
        “being inside” — and, on its own, the explanation of a good number of accounts.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>How the order gets decided</h2>
    <p>By which misperception the item lets someone actually test, and by whether the data or the
      physics for it exists. Something with no record behind it does not get invented — it either
      gets computed from first principles, or it stays a hand-placed object that the interface
      admits is hand-placed.</p>
    <p>If you have a case that needs something on this list — or something that is not on it —
      <a href="https://github.com/RR0/UfoAtHome/issues/new">say so</a>. A real dated, placed, sourced
      sighting moves an item up this page faster than anything else can.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Évolutions · version ${this.version}</p>
    <h1>Futures évolutions.</h1>
    <p class="lede">Une règle décide de l'ordre : <strong>reproduire tout ce qui a pu être visible
      dans ce ciel à ce moment-là</strong> — par la donnée là où un relevé existe, par le calcul là
      où il n'y en a pas, et jamais par l'invention. Ce qui suit est un plan, pas une promesse ;
      l'ordre bouge quand un cas réel le fait bouger.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p>Ce que l'outil reconstitue déjà, et comment chaque partie en est calculée et vérifiée, est sur
      <a href="/context/">la page de contexte</a> ; chaque source derrière est listée dans
      <a href="/docs/sources/">sources et choix</a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>La suite</h2>

    <div class="timeline-step is-next">
      <h3>Rentrées atmosphériques <span class="status status-next">prochain</span></h3>
      <p>Une méprise classique, et l'une des rares qui laisse un témoignage que tout le monde
        reconnaît : un train lent de fragments, puis « ça s'est éteint d'un coup ». Aucun relevé
        exploitable n'existe par événement : ce sera donc un objet posé à la main — mais avec
        l'extinction réelle à l'entrée dans l'ombre de la Terre, qui est précisément ce qui fait
        coller le récit.</p>
    </div>

    <div class="timeline-step">
      <h3>Anomalies de propagation radar <span class="status status-later">en attente de données</span></h3>
      <p>Inversions de température et conduits — l'explication derrière toute une famille de cas
        radar/visuels. Le critère est un gradient de réfractivité inférieur à −157 unités par
        kilomètre, ce qui demande le profil de température et d'humidité avec l'altitude. Vérifié et
        écarté : Open-Meteo ne sert pas les niveaux de pression en archive. La vraie source est
        IGRA, l'archive des radiosondages, et c'est ce que cet élément attend.</p>
    </div>


    <div class="timeline-step">
      <h3>Ballons-sondes <span class="status status-later">envisagé</span></h3>
      <p>Un réseau de lâchers documenté depuis les années 1940 — et l'explication de Roswell.
        Datable, situable, et une forme à laquelle personne ne s'attend.</p>
    </div>

    <h2>Du côté de l'objet</h2>

    <div class="timeline-step">
      <h3>Textures sur les formes <span class="status status-later">planifié</span></h3>
      <p>Mêlées à la couleur plutôt que la remplaçant, keyframées et sérialisées comme tout autre
        champ d'apparence. Les témoins décrivent des surfaces — nervurée, mate, comme un miroir — et
        le format ne sait pas encore le retenir.</p>
    </div>

    <div class="timeline-step">
      <h3>Entités observées <span class="status status-later">conception ouverte</span></h3>
      <p>Trois des quatre dossiers livrés en comportent une. La question ouverte est de savoir si une
        entité est une forme 2D (un témoignage, comme l'objet) ou un objet de décor 3D. Le modèle dit
        « ce qui a atteint l'œil du témoin », ce qui plaide pour la forme.</p>
    </div>

    <h2>Du côté de l'environnement</h2>

    <div class="timeline-step">
      <h3>Observer depuis un avion <span class="status status-later">planifié</span></h3>
      <p>Comme c'est déjà possible depuis un bâtiment ou une voiture. La moitié des témoignages
        aéronautiques sont donnés depuis un cockpit, et un montant de hublot qui masque quinze degrés
        de ciel fait partie du récit.</p>
    </div>

    <div class="timeline-step">
      <h3>Modèles 3D téléchargés à la demande <span class="status status-later">planifié</span></h3>
      <p>De vrais tableaux de bord, de vrais montants de pare-brise — pour voir exactement quelle
        largeur angulaire un montant masquait. Et le cas inverse, qui compte davantage : de vrais
        avions vus du sol et pris pour autre chose, sous l'angle et avec les reflets qu'ils donnent
        réellement.</p>
    </div>

    <div class="timeline-step">
      <h3>Une vidéo comme scène <span class="status status-later">planifié</span></h3>
      <p>La photo des lieux est <a href="/context/#pictures">déjà là</a>. Une vidéo, c'est le même
        recalage avec une image qui bouge : une texture verrouillée sur la timeline, les propres
        images du témoin avec la reconstitution par-dessus, image par image. Et un horizon tracé sur
        une photo qui tient cacherait ce qui est passé dessous — des mètres qui reviendraient d'une
        photo comme ils reviennent d'un croisement de décor.</p>
    </div>

    <div class="timeline-step">
      <h3>Reflets des lumières intérieures sur les vitrages <span class="status status-later">planifié</span></h3>
      <p>Une lampe de pièce, une lumière de tableau de bord, sur une vitre ou un pare-brise. Le
        dernier morceau manquant d'« être à l'intérieur » — et, à lui seul, l'explication d'un bon
        nombre de récits.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Comment l'ordre est décidé</h2>
    <p>Par la méprise que l'élément permet réellement de tester, et par l'existence de la donnée ou
      de la physique correspondante. Ce qui n'a aucun relevé derrière soi ne s'invente pas : ou bien
      cela se calcule depuis les principes, ou bien cela reste un objet posé à la main que
      l'interface reconnaît comme tel.</p>
    <p>Si vous avez un cas qui a besoin de quelque chose sur cette liste — ou de quelque chose qui
      n'y est pas — <a href="https://github.com/RR0/UfoAtHome/issues/new">dites-le</a>. Une
      observation réelle, datée, située et sourcée fait remonter un élément de cette page plus vite
      que tout le reste.</p>
  </div>
</section>
`
  }
}
