import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** Where this is going — and what each item is actually waiting on. */
export class RoadmapPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "roadmap",
    navLabel: { en: "Roadmap", fr: "Plan" },
    title: { en: "Where this is going", fr: "Où cela va" },
    asideFromNav: true,
    description: {
      en: "What UFO@home already reproduces, what is being built next, and what each remaining item "
        + "is waiting on — a dataset, a physical model, or a decision.",
      fr: "Ce qu'UFO@home reproduit déjà, ce qui vient ensuite, et ce que chaque élément restant "
        + "attend — un jeu de données, un modèle physique, ou une décision."
    }
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Roadmap · version 0.37</p>
    <h1>Where this is going.</h1>
    <p class="lede">One rule decides the order: <strong>reproduce everything that could have been
      visible in that sky at that moment</strong> — by data where a record exists, by calculation
      where none does, and never by invention. What follows is a plan, not a promise; the order
      moves when a real case makes it move.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Already there</h2>
    <p>Everything below is shipped and in production. It is here because a roadmap that only lists
      what is missing gives no sense of what the missing things are being added to.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Area</th><th>What it covers</th></tr>
      <tr><td>Testimony</td><td>Shape, movement, colour, transparency, halo, brilliance, blur, sound — keyframed; angular size only, with real distances derived as inequalities from what the object crossed</td></tr>
      <tr><td>The sky</td><td>Sun, Moon and phase, planets, stars to magnitude 7.5, twilight limiting magnitude, the Milky Way and the zodiacal light as line-of-sight integrals</td></tr>
      <tr><td>Sky candidates</td><td>Meteor showers with a sporadic background, 23 naked-eye comet apparitions, the satellite illumination window with the dated SATCAT count</td></tr>
      <tr><td>Atmospheric optics</td><td>22° and 46° haloes, sundogs, tangent, circumzenithal and circumhorizontal arcs, the parhelic circle, pillars — all from ice's refractive index; rainbows and moonbows ray-traced in a spherical drop</td></tr>
      <tr><td>Weather</td><td>ERA5 lookup keyframed along the observation, cloud decks, rain, snow, hail, storms with thunder, wind, cloud attenuation of every celestial body</td></tr>
      <tr><td>The ground</td><td>Real relief and aerial imagery, buildings, trees, streetlights, vehicles, windows and other witnesses, with moving tracks and regulated flashing lights</td></tr>
      <tr><td>The instrument</td><td>Eye vs rectilinear lens, sensor and focal length in millimetres, letterboxed frame, aperture, focus distance, roll, and a long exposure that accumulates star trails and dots a flashing lamp</td></tr>
      <tr><td>Provenance</td><td>Place, weather, elevation, imagery and time zone all read from named, swappable sources, with the exact query kept in the file</td></tr>
    </table>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Next</h2>

    <div class="timeline-step is-next">
      <h3>Volumetric clouds <span class="status status-next">next</span></h3>
      <p>The current deck stops at a virtual wall of fixed height, where real cloud is visible all
        the way to the horizon. A first attempt was abandoned on quality. Only a real 3D density
        model will do — to fly through (aerial sightings) as well as to hide the object behind
        (from the ground). The known cost: the cloud field is mirrored on the CPU to answer “was
        this screen point occluded?”, and a 3D density field means rebuilding that mirror.</p>
    </div>

    <div class="timeline-step is-next">
      <h3>Atmospheric re-entries <span class="status status-next">next</span></h3>
      <p>A staple misidentification, and one of the few that leaves a testimony everybody
        recognises: a slow train of fragments, then “it went out all at once”. No usable record
        exists per event, so this is an object placed by hand — but with the real extinction as it
        enters the Earth's shadow, which is the part that makes the account fit.</p>
    </div>

    <div class="timeline-step">
      <h3>A satellite pass actually propagated <span class="status status-later">planned</span></h3>
      <p>Today the tool answers whether low orbit <em>could</em> have been lit, and refuses to draw a
        pass it cannot know. For recent dates that refusal is unnecessary: current orbital elements
        are openly served and SGP4 is standard. So: a real pass for dates within about thirty days
        of the elements' epoch, with the regime stated on screen — computed, or placed by hand.</p>
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
      <h3>Historical novae and supernovae <span class="status status-later">planned</span></h3>
      <p>A new star where there was none is a textbook misperception, and a datable one. The
        catalogue is small and public — the same pattern as the comet and satellite catalogues
        already generated here.</p>
    </div>

    <div class="timeline-step">
      <h3>A real atmospheric scattering model <span class="status status-later">planned</span></h3>
      <p>The sky dome is still a gradient between colour stops — the least physical piece of the
        whole scene, and what stands between this and a genuinely correct twilight. Half the work is
        already done: the night-sky brightness model written for the Milky Way and the zodiacal light
        (airglow floor, directional twilight excess, the Moon's own contribution, in nanolamberts)
        is the same quantity, from the other end.</p>
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
    <p class="eyebrow">Plan · version 0.37</p>
    <h1>Où cela va.</h1>
    <p class="lede">Une règle décide de l'ordre : <strong>reproduire tout ce qui a pu être visible
      dans ce ciel à ce moment-là</strong> — par la donnée là où un relevé existe, par le calcul là
      où il n'y en a pas, et jamais par l'invention. Ce qui suit est un plan, pas une promesse ;
      l'ordre bouge quand un cas réel le fait bouger.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Déjà là</h2>
    <p>Tout ce qui suit est livré et en production. C'est ici parce qu'un plan qui n'énumère que ce
      qui manque ne dit rien de ce à quoi cela s'ajoute.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Domaine</th><th>Ce que cela couvre</th></tr>
      <tr><td>Témoignage</td><td>Forme, mouvement, couleur, transparence, halo, éclat, flou, son — keyframés ; taille angulaire seule, les distances réelles étant déduites en inégalités de ce que l'objet a croisé</td></tr>
      <tr><td>Le ciel</td><td>Soleil, Lune et sa phase, planètes, étoiles jusqu'à la magnitude 7,5, magnitude limite crépusculaire, Voie lactée et lumière zodiacale en intégrales le long de la ligne de visée</td></tr>
      <tr><td>Candidats du ciel</td><td>Pluies de météores avec fond sporadique, 23 apparitions de comètes visibles à l'œil nu, fenêtre d'éclairement des satellites avec le compte SATCAT daté</td></tr>
      <tr><td>Optique atmosphérique</td><td>Halos à 22° et 46°, parhélies, arcs tangent, circumzénithal et circumhorizontal, cercle parhélique, piliers — tous issus de l'indice de la glace ; arcs-en-ciel et arcs lunaires lancés dans une goutte sphérique</td></tr>
      <tr><td>Météo</td><td>Relevé ERA5 keyframé le long de l'observation, couches nuageuses, pluie, neige, grêle, orages avec tonnerre, vent, atténuation des astres par les nuages</td></tr>
      <tr><td>Le sol</td><td>Relief réel et imagerie aérienne, bâtiments, arbres, lampadaires, véhicules, vitrages et autres témoins, avec trajectoires et feux clignotants aux cadences réglementaires</td></tr>
      <tr><td>L'instrument</td><td>Œil ou objectif rectilinéaire, capteur et focale en millimètres, cadre letterboxé, diaphragme, distance de mise au point, roulis, et une pose longue qui accumule les filés d'étoiles et ponctue un feu clignotant</td></tr>
      <tr><td>Provenance</td><td>Lieu, météo, altitude, imagerie et fuseau horaire lus dans des sources nommées et interchangeables, la requête exacte restant dans le fichier</td></tr>
    </table>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>La suite</h2>

    <div class="timeline-step is-next">
      <h3>Nuages volumétriques <span class="status status-next">prochain</span></h3>
      <p>La couche actuelle s'arrête à un mur virtuel de hauteur fixe, alors que de vrais nuages se
        voient jusqu'à l'horizon. Une première tentative a été abandonnée pour cause de qualité.
        Seul un vrai champ de densité 3D fera l'affaire — pour le traverser (observations aériennes)
        comme pour masquer l'objet (depuis le sol). Le coût connu : le champ de nuages est miroité
        côté processeur pour répondre à « ce point de l'écran était-il occulté ? », et un champ 3D
        obligera à refaire ce miroir.</p>
    </div>

    <div class="timeline-step is-next">
      <h3>Rentrées atmosphériques <span class="status status-next">prochain</span></h3>
      <p>Une méprise classique, et l'une des rares qui laisse un témoignage que tout le monde
        reconnaît : un train lent de fragments, puis « ça s'est éteint d'un coup ». Aucun relevé
        exploitable n'existe par événement : ce sera donc un objet posé à la main — mais avec
        l'extinction réelle à l'entrée dans l'ombre de la Terre, qui est précisément ce qui fait
        coller le récit.</p>
    </div>

    <div class="timeline-step">
      <h3>Un passage satellite réellement propagé <span class="status status-later">planifié</span></h3>
      <p>Aujourd'hui l'outil dit si l'orbite basse <em>pouvait</em> être éclairée, et refuse de
        dessiner un passage qu'il ne peut pas connaître. Pour les dates récentes, ce refus n'est pas
        nécessaire : les éléments orbitaux courants sont servis ouvertement et SGP4 est standard.
        Donc : un vrai passage pour les dates situées à moins d'une trentaine de jours de l'époque
        des éléments, avec le régime affiché à l'écran — calculé, ou posé à la main.</p>
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
      <h3>Novae et supernovae historiques <span class="status status-later">planifié</span></h3>
      <p>Une étoile nouvelle là où il n'y en avait pas est une méprise de manuel, et une méprise
        datable. Le catalogue est petit et public — le même patron que les catalogues de comètes et
        de satellites déjà engendrés ici.</p>
    </div>

    <div class="timeline-step">
      <h3>Un vrai modèle de diffusion atmosphérique <span class="status status-later">planifié</span></h3>
      <p>Le dôme du ciel reste un dégradé entre points de couleur — la pièce la moins physique de
        toute la scène, et ce qui sépare l'outil d'un crépuscule réellement juste. La moitié du
        travail est faite : le modèle de brillance du ciel nocturne écrit pour la Voie lactée et la
        lumière zodiacale (plancher d'airglow, excès crépusculaire directionnel, apport de la Lune,
        en nanolamberts) est la même grandeur, prise par l'autre bout.</p>
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
