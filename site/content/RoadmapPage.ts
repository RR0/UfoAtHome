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
      <p>A staple misidentification, and one of the few that leaves an account everybody
        recognises: a slow train of fragments, then “it went out all at once”. Since 2000 the
        Aerospace Corporation's CORDS database dates each re-entry and flags the ones that were
        seen; its CSV export will be archived next to the orbital elements, since the site does not
        let a browser read it. Before 2000 the re-entry stays an object placed by hand. Either way
        it goes out at the real moment it enters the Earth's shadow, which is the part that makes
        the account fit.</p>
    </div>

    <div class="timeline-step">
      <h3>Radar propagation anomalies <span class="status status-later">blocked on data</span></h3>
      <p>Temperature inversions and ducting — the explanation behind a whole family of radar/visual
        cases. The criterion is a refractivity gradient below −157 units per kilometre, which needs
        the temperature and humidity profile with height. Checked and ruled out: Open-Meteo does not
        serve pressure levels in archive mode. The real source is IGRA, the radiosonde archive,
        with the University of Wyoming soundings and Météo-France's public data as other entry
        points, and that is what this is waiting on.</p>
    </div>


    <div class="timeline-step">
      <h3>Weather balloons <span class="status status-later">considered</span></h3>
      <p>A documented network of launches from the 1940s on — and the Roswell explanation. Datable,
        placeable, and a shape nobody expects.</p>
    </div>

    <div class="timeline-step">
      <h3>Recorded fireballs <span class="status status-later">planned</span></h3>
      <p>Meteors in the sky today are computed: shower radiants and sporadic rates. A fireball that
        a camera network actually recorded (FRIPON in France from about 2016, the Global Meteor
        Network, the IMO and AMS reports) would be the real event, with its track, to be matched
        within a day and half an hour of the stated time.</p>
    </div>

    <div class="timeline-step">
      <h3>Air traffic <span class="status status-later">blocked on data</span></h3>
      <p>Flightradar24's archive is paid and recent, and older cases have no track at all. What is
        left for them: published airways and approach procedures (the French eAIP), the calendar of
        temporary military areas, and the airfields near the observer. For recent cases, a KML
        track exported from a flight tracker is enough to place the aircraft.</p>
    </div>

    <div class="timeline-step">
      <h3>Contrails <span class="status status-later">planned</span></h3>
      <p>Whether an aircraft that day left a trail follows from the temperature and humidity at its
        altitude (the Appleman chart), which the upper-air reanalysis already used for the clouds
        provides.</p>
    </div>

    <h2>On the object's side</h2>

    <div class="timeline-step">
      <h3>A trajectory from directions <span class="status status-later">planned</span></h3>
      <p>Directions are what observers give best. Fitting a great circle through them, for one
        observer or several, gives the plane of the track and its spread: the COBEPS did it with a
        stereonet for the Braine-le-Comte case (2015) and found a mean track of N 7.7°. The same fit
        applies to a track drawn on a registered photograph, which then comes out as an absolute
        direction to compare with a meteor, a satellite or an aircraft. On a night photograph, the
        stars themselves can do the registration (astrometry).</p>
    </div>

    <div class="timeline-step">
      <h3>Textures on shapes <span class="status status-later">planned</span></h3>
      <p>Blended with the colour rather than replacing it, keyframed and serialized like every other
        appearance field. Observers describe surfaces — ribbed, matte, mirror-like — and today the
        <a href="/docs/format/">format</a> cannot hold that.</p>
    </div>

    <div class="timeline-step">
      <h3>Observed entities <span class="status status-later">design open</span></h3>
      <p>Three of the four shipped case files involve one. The open question is whether an entity is
        a 2D shape (account, like the object) or a 3D decor object. The model says “what reached
        the observer's eye”, which argues for the shape.</p>
    </div>

    <h2>On the environment's side</h2>

    <div class="timeline-step">
      <h3>Observing from an aircraft <span class="status status-later">planned</span></h3>
      <p>As already supported from a building or a car. Half of aviation account is given from a
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
        same registration with a picture that moves: a texture locked to the timeline, the observer's
        own footage with the reconstruction over it, frame by frame. And a horizon traced on a picture
        that fits would hide what passed below it — metres coming back from a photograph the way they
        come back from a decor crossing.</p>
    </div>

    <div class="timeline-step">
      <h3>Reflections of interior lights on glazing <span class="status status-later">planned</span></h3>
      <p>A room lamp, a dashboard light, on a window or a windscreen. The last missing piece of
        “being inside” — and, on its own, the explanation of a good number of accounts.</p>
    </div>

    <div class="timeline-step">
      <h3>Magnetic declination <span class="status status-later">planned</span></h3>
      <p>A bearing taken with a compass is magnetic, and the difference with true north depends on
        the place and the year: several degrees in France in the 1950s. The recording should say
        which north a bearing refers to, and the tool correct it from the geomagnetic model.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Evaluating the account</h2>
    <p>Reconstructing the sky is half the work; the other half is knowing how much each part of an
      account can be trusted. <cite>The Reliability of UFO Witness Testimony</cite>
      (V.J. Ballester-Olmos and R.W. Heiden eds., 2023) measures it, and its figures are meant to
      become checks in the tool. The detailed list, chapter by chapter, is
      <a href="https://github.com/RR0/UfoAtHome/blob/master/docs/testimony-evaluation-leads.md">in
      the repository</a>.</p>

    <div class="timeline-step">
      <h3>Each statement with its known error <span class="status status-later">planned</span></h3>
      <p>Counts, layout, heading and time are the reliable part; distances, altitudes and speeds are
        not. A stated angular size is typically 3 to 30 times too large, and asking the observer to
        show the full Moon the same way measures their own factor. The time is right within a few
        minutes for nine observers out of ten, a duration can be off by a factor of three, an
        elevation is overestimated (more often than underestimated), and a low light is placed at
        the horizon whatever its distance.</p>
    </div>

    <div class="timeline-step">
      <h3>Remote checks before any judgement <span class="status status-later">planned</span></h3>
      <p>The Moon, the planets and bright stars along the bearing, recorded fireballs and
        re-entries, launches, lanterns drifting with the measured wind, flares, lightning: each is a
        check the date and place already allow. And when nothing fits, the same checks run again
        with the date shifted by a day, a month or a year, since a wrong date is a common error.</p>
    </div>

    <div class="timeline-step">
      <h3>Versions and influences <span class="status status-later">design open</span></h3>
      <p>Every dated version of an account, compared field by field, with the earliest weighing
        most; what the observer had read or watched before each one (press, television, fiction);
        feedback received; whether a detail first appeared under hypnosis; whether the observers
        were questioned separately. N accounts are N confirmations only if they are independent.</p>
    </div>

    <div class="timeline-step">
      <h3>Published indexes <span class="status status-later">considered</span></h3>
      <p>Part of Vallee's SVP index (how far the data must be bent to fit an explanation) and of the
        Ballester-Olmos and Guasp subjectivity index can be computed from a recording; the rest are
        investigator fields, with an explicit “unknown”. Explained cases serve as the control group:
        a feature is anomalous only if it differs from the same feature in explained cases.</p>
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
      <p>Une méprise classique, et l'une des rares qui laisse un compte rendu que tout le monde
        reconnaît : un train lent de fragments, puis « ça s'est éteint d'un coup ». Depuis 2000, la
        base CORDS de l'Aerospace Corporation date chaque rentrée et signale celles qui ont été
        vues ; son export CSV sera archivé à côté des éléments orbitaux, puisque le site ne se
        laisse pas lire par un navigateur. Avant 2000, la rentrée reste un objet posé à la main.
        Dans les deux cas, elle s'éteint au moment réel où elle entre dans l'ombre de la Terre,
        ce qui est précisément ce qui fait coller le récit.</p>
    </div>

    <div class="timeline-step">
      <h3>Anomalies de propagation radar <span class="status status-later">en attente de données</span></h3>
      <p>Inversions de température et conduits — l'explication derrière toute une famille de cas
        radar/visuels. Le critère est un gradient de réfractivité inférieur à −157 unités par
        kilomètre, ce qui demande le profil de température et d'humidité avec l'altitude. Vérifié et
        écarté : Open-Meteo ne sert pas les niveaux de pression en archive. La vraie source est
        IGRA, l'archive des radiosondages, avec les sondages de l'université du Wyoming et les
        données publiques de Météo-France comme autres portes d'entrée, et c'est ce que cet élément
        attend.</p>
    </div>


    <div class="timeline-step">
      <h3>Ballons-sondes <span class="status status-later">envisagé</span></h3>
      <p>Un réseau de lâchers documenté depuis les années 1940 — et l'explication de Roswell.
        Datable, situable, et une forme à laquelle personne ne s'attend.</p>
    </div>

    <div class="timeline-step">
      <h3>Bolides enregistrés <span class="status status-later">planifié</span></h3>
      <p>Les météores du ciel sont aujourd'hui calculés : radiants des essaims et taux sporadiques.
        Un bolide qu'un réseau de caméras a réellement enregistré (FRIPON en France depuis 2016
        environ, le Global Meteor Network, les signalements de l'IMO et de l'AMS) serait
        l'événement réel, avec sa trajectoire, à apparier à un jour et une demi-heure près de
        l'heure donnée.</p>
    </div>

    <div class="timeline-step">
      <h3>Trafic aérien <span class="status status-later">en attente de données</span></h3>
      <p>L'archive de Flightradar24 est payante et récente, et les cas plus anciens n'ont aucune
        trace. Il leur reste les routes aériennes et procédures d'approche publiées (l'eAIP
        français), le calendrier des zones militaires temporaires, et les aérodromes proches de
        l'observateur. Pour un cas récent, une trace KML exportée d'un suivi de vols suffit à placer
        l'avion.</p>
    </div>

    <div class="timeline-step">
      <h3>Traînées de condensation <span class="status status-later">planifié</span></h3>
      <p>Qu'un avion ait laissé une traînée ce jour-là se déduit de la température et de l'humidité
        à son altitude (le diagramme d'Appleman), que fournit déjà la réanalyse en altitude
        utilisée pour les nuages.</p>
    </div>

    <h2>Du côté de l'objet</h2>

    <div class="timeline-step">
      <h3>Une trajectoire tirée des directions <span class="status status-later">planifié</span></h3>
      <p>Les directions sont ce que les observateurs donnent le mieux. Y ajuster un grand cercle,
        pour un observateur ou plusieurs, donne le plan de la trajectoire et sa dispersion : le
        COBEPS l'a fait au stéréonet pour le cas de Braine-le-Comte (2015) et trouvé une
        trajectoire moyenne de N 7,7°. Le même ajustement s'applique à une trajectoire tracée sur
        une photo recalée, qui sort alors en direction absolue, à comparer avec un météore, un
        satellite ou un avion. Sur une photo de nuit, les étoiles elles-mêmes peuvent faire le
        recalage (astrométrie).</p>
    </div>

    <div class="timeline-step">
      <h3>Textures sur les formes <span class="status status-later">planifié</span></h3>
      <p>Mêlées à la couleur plutôt que la remplaçant, keyframées et sérialisées comme tout autre
        champ d'apparence. Les observateurs décrivent des surfaces — nervurée, mate, comme un miroir — et
        le <a href="/docs/format/">format</a> ne sait pas encore le retenir.</p>
    </div>

    <div class="timeline-step">
      <h3>Entités observées <span class="status status-later">conception ouverte</span></h3>
      <p>Trois des quatre dossiers livrés en comportent une. La question ouverte est de savoir si une
        entité est une forme 2D (un compte rendu, comme l'objet) ou un objet de décor 3D. Le modèle dit
        « ce qui a atteint l'œil de l'observateur », ce qui plaide pour la forme.</p>
    </div>

    <h2>Du côté de l'environnement</h2>

    <div class="timeline-step">
      <h3>Observer depuis un avion <span class="status status-later">planifié</span></h3>
      <p>Comme c'est déjà possible depuis un bâtiment ou une voiture. La moitié des comptes rendus
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
        images de l'observateur avec la reconstitution par-dessus, image par image. Et un horizon tracé sur
        une photo qui tient cacherait ce qui est passé dessous — des mètres qui reviendraient d'une
        photo comme ils reviennent d'un croisement de décor.</p>
    </div>

    <div class="timeline-step">
      <h3>Reflets des lumières intérieures sur les vitrages <span class="status status-later">planifié</span></h3>
      <p>Une lampe de pièce, une lumière de tableau de bord, sur une vitre ou un pare-brise. Le
        dernier morceau manquant d'« être à l'intérieur » — et, à lui seul, l'explication d'un bon
        nombre de récits.</p>
    </div>

    <div class="timeline-step">
      <h3>Déclinaison magnétique <span class="status status-later">planifié</span></h3>
      <p>Un cap pris à la boussole est magnétique, et l'écart avec le nord vrai dépend du lieu et de
        l'année : plusieurs degrés en France dans les années 1950. L'enregistrement devrait dire à
        quel nord se rapporte un cap, et l'outil le corriger d'après le modèle géomagnétique.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Évaluer le compte rendu</h2>
    <p>Reconstituer le ciel, c'est la moitié du travail ; l'autre moitié est de savoir quel crédit
      accorder à chaque partie d'un compte rendu. <cite lang="en">The Reliability of UFO Witness
      Testimony</cite> (V.J. Ballester-Olmos et R.W. Heiden dir., 2023) le mesure, et ses chiffres
      ont vocation à devenir des vérifications dans l'outil. La liste détaillée, chapitre par
      chapitre, est
      <a href="https://github.com/RR0/UfoAtHome/blob/master/docs/testimony-evaluation-leads.md">dans
      le dépôt</a> (en anglais).</p>

    <div class="timeline-step">
      <h3>Chaque énoncé avec son erreur connue <span class="status status-later">planifié</span></h3>
      <p>Le nombre, la disposition, le cap et l'heure sont la partie fiable ; les distances,
        altitudes et vitesses ne le sont pas. Une taille angulaire énoncée est typiquement 3 à 30
        fois trop grande, et demander à l'observateur de montrer la pleine Lune de la même façon
        mesure son propre facteur. L'heure est juste à quelques minutes près pour neuf observateurs
        sur dix, une durée peut être fausse d'un facteur trois, une hauteur est surestimée (plus
        souvent que sous-estimée), et une lumière basse est placée à l'horizon quelle que soit sa
        distance.</p>
    </div>

    <div class="timeline-step">
      <h3>Les vérifications à distance, avant tout jugement <span class="status status-later">planifié</span></h3>
      <p>La Lune, les planètes et les étoiles brillantes dans la direction donnée, les bolides et
        rentrées enregistrés, les lancements, les lanternes qui dérivent avec le vent mesuré, les
        fusées éclairantes, la foudre : autant de vérifications que la date et le lieu permettent
        déjà. Et quand rien ne colle, les mêmes vérifications recommencent avec la date décalée
        d'un jour, d'un mois ou d'un an, car une date fausse est une erreur fréquente.</p>
    </div>

    <div class="timeline-step">
      <h3>Versions et influences <span class="status status-later">conception ouverte</span></h3>
      <p>Chaque version datée d'un compte rendu, comparée champ par champ, la plus ancienne pesant
        le plus ; ce que l'observateur avait lu ou vu avant chacune (presse, télévision, fiction) ;
        les retours reçus ; si un détail est apparu d'abord sous hypnose ; si les observateurs ont
        été interrogés séparément. N comptes rendus ne font N confirmations que s'ils sont
        indépendants.</p>
    </div>

    <div class="timeline-step">
      <h3>Les indices publiés <span class="status status-later">envisagé</span></h3>
      <p>Une partie de l'indice SVP de Vallee (à quel point il faut tordre les données pour qu'une
        explication colle) et de l'indice de subjectivité de Ballester-Olmos et Guasp se calcule à
        partir d'un enregistrement ; le reste relève de champs d'enquêteur, avec un « inconnu »
        explicite. Les cas expliqués servent de groupe témoin : un trait n'est anormal que s'il
        diffère du même trait dans les cas expliqués.</p>
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
