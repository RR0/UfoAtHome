import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The long form of the home page's "Contextualise" cards.
 *
 * Named after the principle it belongs to rather than after the data it cites: "sources" was only
 * half of it — half of this page is derived rather than looked up, and none of it is here to credit
 * anybody. It is here to say what the context of an observation was.
 *
 * Those cards had grown into the detail itself — magnitudes, catalogue sizes in kilobytes, the
 * projection formula — which is the wrong place for it twice over: it buries what a first reader
 * needs (what is taken care of, and how carefully) under what only a second reader wants (the
 * number, and where it stops). So the cards state the rule, and each links to its section here.
 *
 * Every number on this page is one the tool actually applies; the point of naming them is that a
 * reconstruction's claims can be checked, so a claim that cannot be checked has no business here.
 */
export class ContextPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "context",
    navLabel: { en: "Context", fr: "Contexte" },
    title: {
      en: "Check what the scene claims",
      fr: "Vérifier ce que la scène affirme"
    },
    asideFromNav: true,
    description: {
      en: "Every part of a reconstruction that is not the witness's own testimony: where its data "
        + "comes from, how it is computed, and the point at which it stops and says so.",
      fr: "Chaque partie d'une reconstitution qui n'est pas le témoignage lui-même : d'où vient sa "
        + "donnée, comment elle est calculée, et le point où elle s'arrête et le dit."
    }
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Home</a></p>
    <h1>Check what the scene claims.</h1>
    <p class="lede">The witness supplies the phenomenon. Everything else is looked up in a named
      record or computed from physics — and where neither can answer, the tool says so instead of
      drawing something plausible. This is that, part by part, with the numbers it actually
      applies.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2 id="sky">The sky</h2>
    <p>Sun, Moon and its phase, the planets and the stars are placed by ephemeris for that instant,
      that latitude and that longitude. Nothing is a picture of a sky: point at any of it and it
      names itself — “Venus, mag −4, 8° above the horizon”.</p>
    <p>What is drawn from the catalogue stops at magnitude 6.5, and that number is a fact about a
      <em>witness</em> rather than about the sky: it is how faint a dark-adapted human eye goes.
      Put something else in front of the same night and the threshold moves with it — see
      <a href="#instrument">the instrument</a>.</p>
    <p>The catalogue follows the same threshold. A naked-eye sky costs 400 kB, down to magnitude
      7.5; 57 688 more stars, down to magnitude 9, are fetched only by a recording whose own optics
      reach that far. Past magnitude 9 it is the data that stops, and the tool reports the limit
      rather than drawing a sky emptier than the photograph held.</p>
    <p>The Milky Way and the zodiacal light are integrated along the line of sight rather than
      painted as a texture — which is why they move correctly with the season, the hour and the
      observer's latitude instead of merely being in the right place once.</p>

    <h2 id="space">What else was up there</h2>
    <p>Each of these is a candidate explanation, so each must answer the same question before it is
      drawn: could it have been visible <em>from there, then</em>?</p>
    <p><strong>Comets</strong> appear at their own apparition and nowhere else. The catalogue is
      generated from JPL Horizons and the orbit is propagated, so a comet is either there on that
      date or it is not.</p>
    <p><strong>Meteor showers</strong> come with their radiant and their hourly rate for that night,
      over the sporadic background that never stops.</p>
    <p><strong>Satellites</strong> get the harder question, because being lit is not the same as
      being seen: the Earth's shadow is computed for the date and hour to say whether one could
      have caught the Sun at all. Without period orbital elements no individual pass is drawn for
      historical dates — but how many objects were in orbit on that date is known, and stated.</p>

    <h2 id="ice">Ice and water</h2>
    <p>22° and 46° haloes, sundogs, the parhelic circle, tangent, circumzenithal and circumhorizontal
      arcs: not one of those angles is stored. Each is derived from the refractive index of ice and
      the geometry of the crystal, which is what makes the whole display move together and stay
      consistent with the Sun's own height.</p>
    <p>Rainbows and moonbows are ray-traced through a spherical drop for the same reason — the
      order of the colours, the gap between the two bows and the light inside the primary come out
      of the trace rather than being drawn in.</p>

    <h2 id="weather">The weather that day</h2>
    <p>Cloud cover, cloud base, rain, snow, hail, storms and their thunder, and wind are read from
      ERA5, the ECMWF reanalysis: hourly, worldwide, from 1940 on. They are keyframed along the
      observation, so a sky that cleared during those four minutes clears in the reconstruction.</p>
    <p>Cloud attenuates every celestial body rather than merely covering it, which is what makes a
      Moon behind thin cloud read as a Moon behind thin cloud.</p>
    <p>The exact query is kept in the recording. That is the part that matters: the claim stays
      checkable decades later, by someone who does not trust this tool.</p>

    <h2 id="ground">The ground</h2>
    <p>Real relief and aerial imagery are fetched around the witness, along with the decor that got
      in the way: buildings, trees, streetlights, vehicles, windows and other witnesses — with
      their lights, their flash rates and their tracks.</p>
    <p>How high the witness stood is looked up from where they stood. The ground under those
      coordinates comes from a real elevation model, so the altitude on the form is a height above
      sea level whose floor is the ground itself: nobody can be placed under it. And it is not a
      detail — at 1500 m the horizon really is 1.2° lower than it is at sea level, which is enough
      to decide whether something was above it.</p>

    <h2 id="instrument">The instrument</h2>
    <p>An eye is not a lens. Naked-eye viewing maps an angle to an angle; a camera maps it to
      <code>f·tan θ</code>, with a sensor, a focal length, an aperture and an exposure that draws
      star trails and dots a flashing light. Switch the device and the whole frame changes —
      <a href="/demos/#instrument-eye">the same sighting through three of them</a>.</p>
    <p>Only what that device could actually have been set to is offered: an Instamatic had one
      aperture and one shutter speed, so there is nothing to choose, and a camera that did not exist
      yet is flagged against the observation's own date.</p>
    <p>And the instrument decides how faint a thing could be recorded at all. That same Instamatic
      stops at magnitude 4.2 — two short of the witness holding it, which is half of why so many
      “the sky was full of stars” accounts come with an empty black photograph. A 50 mm at f/2 for
      twenty seconds reaches 9.7, three magnitudes <em>past</em> that witness. Aperture, shutter and
      focal length settle it against the sky's own brightness.</p>
    <p>A longer pose stops helping once the sky has slid further than the lens can resolve, which is
      why an hour on a tripod is no deeper than five seconds on one — only longer trails.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p class="small">Every source is named where its data is reported, with the attribution its
      licence requires — and can be swapped for another. The picker <em>is</em> the credit. What is
      still missing, and what each item is waiting on, is on <a href="/roadmap/">the roadmap</a>.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Accueil</a></p>
    <h1>Vérifier ce que la scène affirme.</h1>
    <p class="lede">Le témoin fournit le phénomène. Tout le reste est relevé dans une source nommée
      ou calculé depuis la physique — et là où ni l'un ni l'autre ne répond, l'outil le dit plutôt
      que de dessiner quelque chose de vraisemblable. Voici cela, élément par élément, avec les
      nombres qu'il applique réellement.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2 id="sky">Le ciel</h2>
    <p>Soleil, Lune et sa phase, planètes et étoiles sont placés par éphémérides pour cet instant,
      cette latitude et cette longitude. Rien n'est une image de ciel : pointez n'importe quoi et
      cela se nomme — « Vénus, mag −4, 8° au-dessus de l'horizon ».</p>
    <p>Ce qui en est dessiné s'arrête à la magnitude 6,5, et ce nombre est un fait sur le
      <em>témoin</em>, pas sur le ciel : c'est la magnitude qu'atteint un œil humain accoutumé à
      l'obscurité. Placez autre chose devant la même nuit et le seuil suit — voir
      <a href="#instrument">l'instrument</a>.</p>
    <p>Le catalogue suit ce même seuil. Un ciel vu à l'œil nu coûte 400 ko, jusqu'à la magnitude
      7,5 ; 57 688 étoiles de plus, jusqu'à la magnitude 9, ne sont chargées que par un
      enregistrement dont les optiques vont jusque-là. Au-delà de la magnitude 9, c'est la donnée
      qui s'arrête, et l'outil signale la limite plutôt que de dessiner un ciel plus vide que ne
      l'était la photographie.</p>
    <p>La Voie lactée et la lumière zodiacale sont intégrées le long de la ligne de visée plutôt que
      plaquées en texture — c'est pourquoi elles bougent correctement avec la saison, l'heure et la
      latitude de l'observateur, au lieu d'être au bon endroit une fois pour toutes.</p>

    <h2 id="space">Ce qu'il y avait d'autre là-haut</h2>
    <p>Chacun de ces éléments est une explication candidate, donc chacun doit répondre à la même
      question avant d'être dessiné : pouvait-il être visible <em>de là, à ce moment-là</em> ?</p>
    <p>Les <strong>comètes</strong> apparaissent à leur apparition propre et nulle part ailleurs. Le
      catalogue est engendré depuis JPL Horizons et l'orbite est propagée : une comète est à cette
      date, ou elle n'y est pas.</p>
    <p>Les <strong>pluies de météores</strong> ont leur radiant et leur taux horaire pour cette
      nuit-là, au-dessus du fond sporadique qui, lui, ne s'arrête jamais.</p>
    <p>Les <strong>satellites</strong> reçoivent la question la plus difficile, car être éclairé
      n'est pas être vu : l'ombre de la Terre est calculée pour la date et l'heure afin de dire si
      l'un d'eux pouvait seulement recevoir le Soleil. Faute d'éléments orbitaux d'époque, aucun
      passage individuel n'est tracé pour les dates anciennes — mais le nombre d'objets en orbite à
      cette date-là est connu, et il est indiqué.</p>

    <h2 id="ice">La glace et l'eau</h2>
    <p>Halos à 22° et 46°, parhélies, cercle parhélique, arcs tangents, circumzénithal et
      circumhorizontal : pas un de ces angles n'est stocké. Chacun est dérivé de l'indice de
      réfraction de la glace et de la géométrie du cristal, ce qui fait que tout le cortège bouge
      ensemble et reste cohérent avec la hauteur du Soleil.</p>
    <p>Arcs-en-ciel et arcs lunaires sont tracés dans une goutte sphérique pour la même raison :
      l'ordre des couleurs, la bande sombre entre les deux arcs et la clarté à l'intérieur du
      premier sortent du tracé au lieu d'y être ajoutés.</p>

    <h2 id="weather">La météo de ce jour-là</h2>
    <p>Couverture nuageuse, base des nuages, pluie, neige, grêle, orages et leur tonnerre, vent sont
      lus dans ERA5, la réanalyse de l'ECMWF : horaire, mondiale, depuis 1940. Ils sont keyframés le
      long de l'observation, si bien qu'un ciel qui s'est dégagé pendant ces quatre minutes se
      dégage aussi dans la reconstitution.</p>
    <p>Les nuages atténuent chaque astre au lieu de simplement le couvrir, et c'est ce qui fait
      qu'une Lune derrière un voile se lit comme une Lune derrière un voile.</p>
    <p>La requête exacte est conservée dans l'enregistrement. C'est la partie qui compte :
      l'affirmation reste vérifiable des décennies plus tard, par quelqu'un qui ne fait pas
      confiance à cet outil.</p>

    <h2 id="ground">Le sol</h2>
    <p>Relief réel et imagerie aérienne sont chargés autour du témoin, avec le décor qui s'est
      interposé : bâtiments, arbres, lampadaires, véhicules, vitrages et autres témoins — avec leurs
      feux, leurs cadences de clignotement et leurs trajectoires.</p>
    <p>À quelle hauteur le témoin se tenait se relève d'où il se tenait. Le sol sous ces coordonnées
      vient d'un modèle d'élévation réel, si bien que l'altitude du formulaire est une altitude
      au-dessus du niveau de la mer dont le plancher est le sol lui-même : on ne peut placer
      personne dessous. Et ce n'est pas un détail — à 1500 m, l'horizon est réellement 1,2° plus bas
      qu'au niveau de la mer, ce qui suffit à décider si quelque chose était au-dessus de lui.</p>

    <h2 id="instrument">L'instrument</h2>
    <p>Un œil n'est pas un objectif. À l'œil nu, un angle reste un angle ; un appareil le projette en
      <code>f·tan θ</code>, avec un capteur, une focale, un diaphragme et une pose qui trace les
      filés d'étoiles et ponctue un feu clignotant. Changez d'appareil et toute l'image change —
      <a href="/demos/#instrument-eye">la même observation à travers trois d'entre eux</a>.</p>
    <p>Seuls les réglages que cet appareil pouvait réellement avoir sont proposés : un Instamatic
      avait un diaphragme et une vitesse, donc il n'y a rien à choisir, et un appareil qui n'existait
      pas encore est signalé face à la date de l'observation.</p>
    <p>Et c'est l'instrument qui décide de ce qui pouvait être enregistré. Ce même Instamatic
      s'arrête à la magnitude 4,2 — deux de moins que le témoin qui le tient, ce qui est la moitié de
      la raison pour laquelle tant de récits de « ciel plein d'étoiles » s'accompagnent d'une
      photographie noire et vide. Un 50 mm à f/2 pendant vingt secondes atteint 9,7, trois
      magnitudes <em>au-delà</em> de ce témoin. Diaphragme, pose et focale en décident, face à la
      clarté du ciel lui-même.</p>
    <p>Allonger la pose cesse d'aider dès que le ciel a glissé plus loin que ce que l'objectif sait
      séparer : une heure sur trépied ne va pas plus loin que cinq secondes, elle fait seulement des
      filés plus longs.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p class="small">Chaque source est nommée là où sa donnée est rapportée, avec l'attribution
      qu'exige sa licence — et peut être remplacée par une autre. Le sélecteur <em>est</em> le
      crédit. Ce qui manque encore, et ce que chaque élément attend, est sur
      <a href="/roadmap/">la page des futures évolutions</a>.</p>
  </div>
</section>
`
  }
}
