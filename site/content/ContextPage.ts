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
    navLabel: { en: "Context", fr: "Contexte", es: "Contexto", it: "Contesto" },
    title: {
      en: "Check what the scene claims",
      fr: "Vérifier ce que la scène affirme",
      es: "Comprobar lo que afirma la escena",
      it: "Verificare ciò che la scena afferma"
    },
    asideFromNav: true,
    description: {
      en: "Every part of a reconstruction that is not the observer's own account: where its data "
        + "comes from, how it is computed, and the point at which it stops and says so.",
      fr: "Chaque partie d'une reconstitution qui n'est pas le compte rendu lui-même : d'où vient sa "
        + "donnée, comment elle est calculée, et le point où elle s'arrête et le dit.",
      es: "Cada parte de una reconstrucción que no es el propio relato del observador: de dónde proceden sus "
        + "datos, cómo se calcula y el punto en el que se detiene y lo dice.",
      it: "Ogni parte di una ricostruzione che non è il resoconto dell'osservatore stesso: da dove vengono i suoi "
        + "dati, come viene calcolata e il punto in cui si ferma e lo dice."
    }
  }

  render(language: SiteLanguage): string {
    switch (language) {
      case "fr": return this.fr()
      case "es": return this.es()
      case "it": return this.it()
      default: return this.en()
    }
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Home</a></p>
    <h1>Check what the scene claims.</h1>
    <p class="lede">The observer supplies the phenomenon. Everything else is looked up in a named
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
      <em>observer</em> rather than about the sky: it is how faint a dark-adapted human eye goes.
      Put something else in front of the same night and the threshold moves with it — see
      <a href="#instrument">the instrument</a>.</p>
    <p>The catalogue follows the same threshold. A naked-eye sky costs 400 kB, down to magnitude
      7.5; 57 688 more stars, down to magnitude 9, are fetched only by a recording whose own optics
      reach that far. Past magnitude 9 it is the data that stops, and the tool reports the limit
      rather than drawing a sky emptier than the photograph held.</p>
    <p>The catalogue is written for the year 2000, and the axis the sky turns about has moved since.
      Every star is carried to the date of the observation: a degree in 1918, fourteen in 1006,
      which is the difference between two constellations.</p>
    <p>The Milky Way and the zodiacal light are integrated along the line of sight rather than
      painted as a texture — which is why they move correctly with the season, the hour and the
      observer's latitude instead of merely being in the right place once.</p>

    <h2 id="light">The light of the sky</h2>
    <p>The sky itself is not a colour gradient. Sunlight and moonlight are traced through a
      spherical atmosphere at fifteen wavelengths across what an eye sees, the way light really
      reaches an observer: scattered once by the air on its way, then again and again, dimmed by
      what stands in front of it. Three things make up that air. The molecules of the air itself,
      which scatter blue far more than red and make the sky blue. The haze, which whitens the
      horizon and puts a bright aureole around the Sun, and which is thicker on a humid day than a
      dry one: its amount follows the relative humidity of the weather record. And the ozone
      layer, which absorbs a little orange, invisible at noon and the whole reason a twilight
      zenith is deep blue rather than a greyish yellow.</p>
    <p>Everything a clear sky does then follows without being painted: the reddening and the
      brighter band along the horizon at sunset, the Earth's shadow rising opposite the Sun with
      the pink band above it, the slow darkening of twilight toward the east first, the deeper
      blue seen from an aircraft, the thinner air above a high site, and the moonlit sky, which is
      the same scattering of a far fainter source. The airglow of the upper atmosphere stays as the
      floor of every moonless night, brighter near the horizon where a line of sight crosses more
      of its layer.</p>
    <p>The model is checked rather than trusted. A slow Monte Carlo trace of the same atmosphere,
      with no approximation but noise, puts the sky the scene draws within a quarter of a magnitude
      and a hundredth in colour from a hazy noon to a Sun sixteen degrees down, from the ground and
      from an aircraft. One place is known to be too dark, by two thirds of a magnitude: the Earth's
      shadow low in the sky during nautical twilight. And the zenith meets the twilight photometry
      measured at the Paranal observatory to within half a magnitude, without ever having been
      fitted to it.</p>
    <p>What reaches the screen is what an eye adapted to that sky makes of it: a night sky is not
      ten million times darker than a day sky to an observer standing in it, and colour gives way to
      a dim blue-grey as the rods take over from the cones. A camera does none of this, so a
      recording made through one keeps the blue a long exposure really shows. How bright a day and a
      moonless night are shown are the two choices in that chain, and they are stated as choices.</p>
    <p>What it does not do: no light pollution, no volcanic haze, no refraction of the Sun below the
      horizon, and the clouds are drawn on their own rather than dimming the light of the sky around
      them. How much haze a given town put in the air is unknowable from a record of 1948; only how
      much the humidity swelled it is modelled. The sources, and the choices behind each of them, are
      listed under <a href="/docs/sources/#air">the air</a>.</p>

    <h2 id="space">What else was up there</h2>
    <p>Each of these is a candidate explanation, so each must answer the same question before it is
      drawn: could it have been visible <em>from there, then</em>?</p>
    <p><strong>Comets</strong> appear at their own apparition and nowhere else. The catalogue is
      generated from JPL Horizons and the orbit is propagated, so a comet is either there on that
      date or it is not.</p>
    <p><strong>Novae and supernovae</strong> shine only on the nights their recorded light curve
      covers, and nowhere outside it: before the first record the star may already have been rising,
      and nobody can say how bright. Thirty-three eruptions reached the naked eye, from the supernova of
      1006 to RS Ophiuchi in 2021. Their brightness is measured by the AAVSO for every nova up to
      2006, reconstructed from Tycho's and Kepler's own comparisons for 1572 and 1604, and held to a
      few chronicled dates for 1054 and 1181; each one says which.</p>
    <p><strong>Eclipses</strong> are never declared. At every instant the Sun's and the Moon's positions
      as seen from the observer's own place, parallax included, say how much of the Sun's disc the
      Moon covers; the scene draws that crescent, the daylight it leaves, the corona when nothing is
      left, and the stars and planets the darker sky then allows, and for the second or two either side of totality the beads of light that the Moon's own relief lets through (NASA's LOLA map of its surface, with the libration of the day). It is why 11 August 1999 is total at
      Reims and a mere 99&nbsp;% at Paris. Seen bare-eyed, a crescent Sun is still a dazzling one: the
      shape shows through a filter, as it does for anyone who looks.</p>
    <p><strong>The Moon</strong> is drawn at the size it has that day: its orbit is an ellipse, so its disc is
      0.56° across at perigee and 0.49° at apogee, the 14&nbsp;% that “a supermoon” is made of. It is
      <em>not</em> larger on the horizon, where it is even a little farther: that impression is an illusion of the
      mind, which a camera does not share, and the scene does not copy it. What is true of a low Moon is its
      colour, which is the air's: the long path takes out its blue. That is all there is to the “lune rousse”
      of French lore, the full Moon of the lunation after Easter, which stands low because the Sun opposite it is
      already high.</p>
    <p><strong>Meteor showers</strong> come with their radiant and their hourly rate for that night,
      over the sporadic background that never stops.</p>
    <p><strong>Recorded fireballs</strong> are events, not rates: since December 2018 the Global
      Meteor Network's cameras have triangulated where each bright one began and ended and how bright
      it peaked, and a recording of that date draws every one that burned during it, from where the
      observer stood, as bright as its distance makes it.</p>
    <p><strong>Satellites</strong> get the harder question, because being lit is not the same as
      being seen: the Earth's shadow is computed for the date and hour to say whether one could
      have caught the Sun at all, and how many objects were in orbit on that date is known, and
      stated. Since February 2021 the tool goes further: the orbital elements saved once or twice a
      day by Laurent Chabin (SCEAU) give every satellite's real pass, lit through the Earth's shadow
      and as bright as it was measured to be, Starlink trains included. Before that date no
      individual pass is drawn, because none could be drawn truthfully.</p>
    <p><strong>Re-entries</strong> are placed by an interpretation, not found: a satellite or rocket
      stage breaking up into burning pieces, on a path somebody established (orbital elements are off
      by minutes in the last orbit). It is placed on the Earth, 70 to 100 km up, and seen through
      the Earth's curvature from where the observer stood, each piece as bright as its distance
      makes it, with its tail along its own path, until it has burned. It glows from its own
      heating, so the Earth's shadow does not put it out. Which re-entries could have been in a
      sky is stated from the record (CORDS since 2000, the satellite catalogue's decay days since
      1957), each with its precision: a sighting on record near enough in time and place, a
      prediction whose window meets the observation, or a bare day. An orbit that never comes within
      sight of the observer's latitude is never listed.</p>

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
      ERA5, the ECMWF reanalysis: hourly, worldwide, from 1940 on (for the last five days, which it has
      not caught up with, the forecast model's own analysis). They are keyframed along the
      observation, so a sky that cleared during those four minutes clears in the reconstruction.</p>
    <p>A record says how much of the sky each layer covered, never where: the arrangement of the clouds
      is the reconstruction's own. It is drifted along the day by the record's wind and set apart from
      one day to the next, so that scrolling through the hours shows clouds that move and change, but
      it is not a picture of the clouds that were there.</p>
    <p>Cloud attenuates every celestial body rather than merely covering it, which is what makes a
      Moon behind thin cloud read as a Moon behind thin cloud.</p>
    <p>The exact query is kept in the recording. That is the part that matters: the claim stays
      checkable decades later, by someone who does not trust this tool.</p>

    <h2 id="ground">The ground</h2>
    <p>Real relief and aerial imagery are fetched around the observer, along with the decor that got
      in the way: buildings, trees, streetlights, vehicles, windows and other observers — with
      their lights, their flash rates and their tracks.</p>
    <p>How high the observer stood is looked up from where they stood. The ground under those
      coordinates comes from a real elevation model, so the altitude on the form is a height above
      sea level whose floor is the ground itself: nobody can be placed under it. And it is not a
      detail — at 1500 m the horizon really is 1.2° lower than it is at sea level, which is enough
      to decide whether something was above it.</p>

    <h2 id="instrument">The instrument</h2>
    <p>An eye is not a lens. Naked-eye viewing maps an angle to an angle; a camera maps it to
      <code>f·tan θ</code>, with a sensor, a focal length, an aperture and an exposure that draws
      star trails and dots a flashing light. Switch the device and the whole frame changes —
      <a href="/demos/instruments/#instrument-eye">the same sighting through three of them</a>.</p>
    <p>Only what that device could actually have been set to is offered: an Instamatic had one
      aperture and one shutter speed, so there is nothing to choose, and a camera that did not exist
      yet is flagged against the observation's own date.</p>
    <p>And the instrument decides how faint a thing could be recorded at all. That same Instamatic
      stops at magnitude 4.2 — two short of the observer holding it, which is half of why so many
      “the sky was full of stars” accounts come with an empty black photograph. A 50 mm at f/2 for
      twenty seconds reaches 9.7, three magnitudes <em>past</em> that observer. Aperture, shutter and
      focal length settle it against the sky's own brightness.</p>
    <p>A longer pose stops helping once the sky has slid further than the lens can resolve, which is
      why an hour on a tripod is no deeper than five seconds on one — only longer trails.</p>
    <p>Something can also be held <em>in front of</em> the instrument. A solar filter — eclipse glasses, or
      the film that goes over a lens — cuts everything by a hundred-thousandfold: the sky goes black, no
      star is drawn, and the Sun is left alone, which is the only way the shape of a partly eclipsed Sun
      can be seen at all (<a href="/demos/sky/#eclipse">the partial phases of 1999, through one</a>).
      It changes no angle, only the light, and it is put on and taken off along the recording: the glasses come off for totality.</p>

    <h2 id="pictures">A picture of the place</h2>
    <p>Everything above is computed, and a reader looking at the result has no way to tell a faithful
      reconstruction from a plausible one. A photograph of the same place does. A recording can carry
      pictures of where it happened — an observer's own, an investigator's, a magazine scan, a
      street-level capture — each laid over the render at an opacity the reader slides between all
      picture and all render, with the phenomenon drawn over both. Every tree the thirty-metre relief
      smoothed away, every ridge, the actual hedge, is then one picture with the reconstruction.
      <a href="/demos/sightings/#cussac">Cussac</a> carries its first: the 1968 view from the spot with the
      sphere and its climb drawn on by hand. With several pictures, the button opens a list above it,
      where each one is shown or hidden and faded on its own: <a href="/demos/sightings/#mcminnville">McMinnville</a>
      lays two prints over the same scene.</p>
    <p>A picture is a field of directions from one point, and it is lined up as one: heading, pitch,
      roll and the lens's field, angles and nothing else. It stands in the three-dimensional scene as
      a flat panel at that field — which is what a lens makes — and is drawn through whatever the
      instrument declares, so the same picture is right under an eye's equidistant view and under a
      50 mm's rectilinear one, and stays put when the reader turns. Nothing in the scene hides it and
      it hides nothing.</p>
    <p>Lining it up is a measurement, not a feeling. Name a landmark on the picture and the same one
      in the render — a church tower, the end of a hedge, the horizon under a tree — and two of them
      turn the picture to fit; three or more fit its field too. The residual says how well it fits,
      landmark by landmark, in green, orange or red: one that will not go below a degree is telling
      you the picture was not taken from that spot, or that the relief is wrong there. And a picture
      that fits gives back the heading the observer actually faced — adopted into their pose with its
      provenance written down, where a heading typed in was only their word. Street-level pictures
      taken nearby (Panoramax, open imagery) arrive already lined up in heading, a full turn arriving
      as a panorama.</p>
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
    <p class="lede">L'observateur fournit le phénomène. Tout le reste est relevé dans une source nommée
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
      <em>observateur</em>, pas sur le ciel : c'est la magnitude qu'atteint un œil humain accoutumé à
      l'obscurité. Placez autre chose devant la même nuit et le seuil suit — voir
      <a href="#instrument">l'instrument</a>.</p>
    <p>Le catalogue suit ce même seuil. Un ciel vu à l'œil nu coûte 400 ko, jusqu'à la magnitude
      7,5 ; 57 688 étoiles de plus, jusqu'à la magnitude 9, ne sont chargées que par un
      enregistrement dont les optiques vont jusque-là. Au-delà de la magnitude 9, c'est la donnée
      qui s'arrête, et l'outil signale la limite plutôt que de dessiner un ciel plus vide que ne
      l'était la photographie.</p>
    <p>Le catalogue est écrit pour l'an 2000, et l'axe autour duquel tourne le ciel s'est déplacé
      depuis. Chaque étoile est ramenée à la date de l'observation : un degré en 1918, quatorze en
      1006, soit la différence entre deux constellations.</p>
    <p>La Voie lactée et la lumière zodiacale sont intégrées le long de la ligne de visée plutôt que
      plaquées en texture — c'est pourquoi elles bougent correctement avec la saison, l'heure et la
      latitude de l'observateur, au lieu d'être au bon endroit une fois pour toutes.</p>

    <h2 id="light">La lumière du ciel</h2>
    <p>Le ciel lui-même n'est pas un dégradé de couleurs. La lumière du Soleil et de la Lune est
      suivie à travers une atmosphère sphérique, à quinze longueurs d'onde couvrant ce que voit un
      œil, comme elle atteint réellement un observateur : diffusée une fois par l'air en chemin, puis
      encore et encore, atténuée par ce qui se trouve devant. Trois choses composent cet air. Les
      molécules de l'air lui-même, qui diffusent bien plus le bleu que le rouge et font le ciel
      bleu. La brume, qui blanchit l'horizon et met une auréole claire autour du Soleil, et qui est
      plus épaisse par temps humide que par temps sec : sa quantité suit l'humidité relative du
      relevé météo. Et la couche d'ozone, qui absorbe un peu d'orange, invisible à midi et seule
      raison pour laquelle un zénith crépusculaire est d'un bleu profond plutôt que d'un jaune
      grisâtre.</p>
    <p>Tout ce que fait un ciel clair en découle sans être peint : le rougeoiement et la bande plus
      claire le long de l'horizon au coucher, l'ombre de la Terre qui monte à l'opposé du Soleil
      avec la bande rose au-dessus, le crépuscule qui s'assombrit d'abord à l'est, le bleu plus
      profond vu d'avion, l'air plus mince au-dessus d'un site en altitude, et le ciel de clair de
      lune, qui est la même diffusion d'une source bien plus faible. La lueur propre de la haute
      atmosphère reste le plancher de toute nuit sans Lune, plus claire près de l'horizon, là où
      une ligne de visée traverse davantage de sa couche.</p>
    <p>Le modèle est vérifié plutôt que cru. Un lent calcul de Monte Carlo de la même atmosphère,
      sans autre approximation que le bruit, place le ciel dessiné par la scène à un quart de
      magnitude et un centième de couleur près, d'un midi brumeux à un Soleil seize degrés sous
      l'horizon, depuis le sol comme depuis un avion. Un endroit est connu pour être trop sombre,
      de deux tiers de magnitude : l'ombre de la Terre, bas dans le ciel, pendant le crépuscule
      nautique. Et le zénith rejoint à une demi-magnitude près la photométrie du crépuscule mesurée
      à l'observatoire de Paranal, sans jamais avoir été ajusté dessus.</p>
    <p>Ce qui arrive à l'écran est ce qu'en fait un œil adapté à ce ciel : pour un observateur qui s'y
      tient, un ciel nocturne n'est pas dix millions de fois plus sombre qu'un ciel de jour, et la
      couleur cède la place à un gris-bleu sombre à mesure que les bâtonnets prennent le relais des
      cônes. Un appareil photo ne fait rien de tout cela : un enregistrement fait à travers lui garde
      le bleu que montre vraiment une pose longue. La luminosité donnée à un jour et à une nuit sans
      Lune sont les deux choix de cette chaîne, et ils sont dits comme tels.</p>
    <p>Ce qu'il ne fait pas : pas de pollution lumineuse, pas de brume volcanique, pas de réfraction
      du Soleil sous l'horizon, et les nuages sont dessinés à part au lieu d'assombrir la lumière du
      ciel autour d'eux. La quantité de brume qu'une ville mettait dans l'air ne peut pas se lire dans
      un relevé de 1948 ; seul son gonflement par l'humidité est modélisé. Les sources, et les choix
      faits pour chacune, sont listés sous <a href="/docs/sources/#air">l'air</a>.</p>

    <h2 id="space">Ce qu'il y avait d'autre là-haut</h2>
    <p>Chacun de ces éléments est une explication candidate, donc chacun doit répondre à la même
      question avant d'être dessiné : pouvait-il être visible <em>de là, à ce moment-là</em> ?</p>
    <p>Les <strong>comètes</strong> apparaissent à leur apparition propre et nulle part ailleurs. Le
      catalogue est engendré depuis JPL Horizons et l'orbite est propagée : une comète est à cette
      date, ou elle n'y est pas.</p>
    <p>Les <strong>novae et supernovae</strong> ne brillent que les nuits que couvre leur courbe de
      lumière relevée, et jamais en dehors : avant le premier relevé, l'étoile montait peut-être
      déjà, et personne ne peut dire à quel éclat. Trente-trois éruptions ont atteint l'œil nu, de la
      supernova de 1006 à RS Ophiuchi en 2021. Leur éclat est mesuré par l'AAVSO pour toutes les
      novae jusqu'en 2006, reconstitué d'après les comparaisons de Tycho et de Kepler eux-mêmes pour
      1572 et 1604, et tenu à quelques dates des chroniques pour 1054 et 1181 ; chacune dit ce
      qu'il en est.</p>
    <p>Les <strong>éclipses</strong> ne sont jamais déclarées. À chaque instant, les positions du Soleil
      et de la Lune vues de la place même de l'observateur, parallaxe comprise, disent quelle part du
      disque solaire la Lune recouvre ; la scène dessine ce croissant, le jour qu'il laisse, la couronne
      quand il ne reste rien, et les étoiles et planètes que le ciel plus sombre permet alors, et pendant la seconde ou deux qui entourent la totalité les grains de lumière que laisse passer le relief même de la Lune (la carte LOLA de la NASA, avec la libration du jour). C'est ce
      qui rend le 11 août 1999 total à Reims et seulement à 99&nbsp;% à Paris. À l'œil nu, un Soleil en
      croissant reste éblouissant : sa forme ne se voit qu'à travers un filtre, comme pour quiconque
      regarde.</p>
    <p>La <strong>Lune</strong> est dessinée à la taille qu'elle a ce jour-là : son orbite est une ellipse, son
      disque fait donc 0,56° au périgée et 0,49° à l'apogée, les 14&nbsp;% dont est faite une « super-lune ».
      Elle n'est <em>pas</em> plus grosse à l'horizon, où elle est même un peu plus loin : cette impression est
      une illusion de l'esprit, qu'un appareil photo ne partage pas, et la scène ne la copie pas. Ce qui est
      vrai d'une Lune basse, c'est sa couleur, qui est celle de l'air : le long trajet lui retire le bleu. C'est
      tout ce qu'il y a dans la « lune rousse » du folklore, la pleine Lune de la lunaison qui suit Pâques, basse
      parce que le Soleil qui lui fait face est déjà haut.</p>
    <p>Les <strong>pluies de météores</strong> ont leur radiant et leur taux horaire pour cette
      nuit-là, au-dessus du fond sporadique qui, lui, ne s'arrête jamais.</p>
    <p>Les <strong>bolides enregistrés</strong> sont des événements, pas des taux : depuis décembre
      2018, les caméras du Global Meteor Network triangulent où chaque bolide brillant a commencé et
      fini et quel éclat il a atteint, et un enregistrement de cette date dessine chacun de ceux qui
      ont brûlé pendant qu'il dure, depuis la place de l'observateur, aussi brillant que sa distance
      le permet.</p>
    <p>Les <strong>satellites</strong> reçoivent la question la plus difficile, car être éclairé
      n'est pas être vu : l'ombre de la Terre est calculée pour la date et l'heure afin de dire si
      l'un d'eux pouvait seulement recevoir le Soleil, et le nombre d'objets en orbite à cette
      date-là est connu, et il est indiqué. Depuis février 2021, l'outil va plus loin : les éléments
      orbitaux sauvegardés une ou deux fois par jour par Laurent Chabin (SCEAU) donnent le vrai
      passage de chaque satellite, éclairé à travers l'ombre de la Terre et aussi brillant qu'on l'a
      mesuré, trains de Starlink compris. Avant cette date, aucun passage individuel n'est tracé,
      faute de pouvoir l'être honnêtement.</p>
    <p><strong>Les rentrées atmosphériques</strong> sont posées par une interprétation, pas
      trouvées : un satellite ou un étage de fusée se désagrégeant en morceaux qui brûlent, sur un
      chemin que quelqu'un a établi (les éléments orbitaux sont faux de plusieurs minutes sur la
      dernière orbite). La rentrée est placée sur la Terre, entre 70 et 100 km d'altitude, et vue à
      travers la courbure de la Terre depuis l'endroit où se tenait l'observateur, chaque morceau
      aussi brillant que sa distance le permet, avec sa traînée le long de son propre chemin,
      jusqu'à ce qu'il ait brûlé. Elle brille de son propre échauffement : l'ombre de la Terre ne
      l'éteint pas. Les rentrées qui ont pu être dans un ciel sont énoncées depuis le registre (CORDS
      depuis 2000, les jours de rentrée du catalogue des satellites depuis 1957), chacune avec sa
      précision : une observation au registre assez proche dans le temps et l'espace, une prévision
      dont la fenêtre rencontre l'observation, ou un simple jour. Une orbite qui ne passe jamais en
      vue de la latitude de l'observateur n'est jamais listée.</p>

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
      lus dans ERA5, la réanalyse de l'ECMWF : horaire, mondiale, depuis 1940 (pour les cinq derniers jours,
      qu'elle n'a pas rattrapés, l'analyse du modèle de prévision). Ils sont keyframés le
      long de l'observation, si bien qu'un ciel qui s'est dégagé pendant ces quatre minutes se
      dégage aussi dans la reconstitution.</p>
    <p>Un relevé dit quelle part du ciel chaque couche couvrait, jamais où : la disposition des nuages
      est celle de la reconstitution. Elle dérive au fil de la journée avec le vent du relevé et diffère
      d'un jour à l'autre, si bien qu'en faisant défiler les heures on voit des nuages bouger et
      changer, mais ce n'est pas une image des nuages qui étaient là.</p>
    <p>Les nuages atténuent chaque astre au lieu de simplement le couvrir, et c'est ce qui fait
      qu'une Lune derrière un voile se lit comme une Lune derrière un voile.</p>
    <p>La requête exacte est conservée dans l'enregistrement. C'est la partie qui compte :
      l'affirmation reste vérifiable des décennies plus tard, par quelqu'un qui ne fait pas
      confiance à cet outil.</p>

    <h2 id="ground">Le sol</h2>
    <p>Relief réel et imagerie aérienne sont chargés autour de l'observateur, avec le décor qui s'est
      interposé : bâtiments, arbres, lampadaires, véhicules, vitrages et autres observateurs — avec leurs
      feux, leurs cadences de clignotement et leurs trajectoires.</p>
    <p>À quelle hauteur l'observateur se tenait se relève d'où il se tenait. Le sol sous ces coordonnées
      vient d'un modèle d'élévation réel, si bien que l'altitude du formulaire est une altitude
      au-dessus du niveau de la mer dont le plancher est le sol lui-même : on ne peut placer
      personne dessous. Et ce n'est pas un détail — à 1500 m, l'horizon est réellement 1,2° plus bas
      qu'au niveau de la mer, ce qui suffit à décider si quelque chose était au-dessus de lui.</p>

    <h2 id="instrument">L'instrument</h2>
    <p>Un œil n'est pas un objectif. À l'œil nu, un angle reste un angle ; un appareil le projette en
      <code>f·tan θ</code>, avec un capteur, une focale, un diaphragme et une pose qui trace les
      filés d'étoiles et ponctue un feu clignotant. Changez d'appareil et toute l'image change —
      <a href="/demos/instruments/#instrument-eye">la même observation à travers trois d'entre eux</a>.</p>
    <p>Seuls les réglages que cet appareil pouvait réellement avoir sont proposés : un Instamatic
      avait un diaphragme et une vitesse, donc il n'y a rien à choisir, et un appareil qui n'existait
      pas encore est signalé face à la date de l'observation.</p>
    <p>Et c'est l'instrument qui décide de ce qui pouvait être enregistré. Ce même Instamatic
      s'arrête à la magnitude 4,2 — deux de moins que l'observateur qui le tient, ce qui est la moitié de
      la raison pour laquelle tant de récits de « ciel plein d'étoiles » s'accompagnent d'une
      photographie noire et vide. Un 50 mm à f/2 pendant vingt secondes atteint 9,7, trois
      magnitudes <em>au-delà</em> de cet observateur. Diaphragme, pose et focale en décident, face à la
      clarté du ciel lui-même.</p>
    <p>Allonger la pose cesse d'aider dès que le ciel a glissé plus loin que ce que l'objectif sait
      séparer : une heure sur trépied ne va pas plus loin que cinq secondes, elle fait seulement des
      filés plus longs.</p>
    <p>On peut aussi tenir quelque chose <em>devant</em> l'instrument. Un filtre solaire — lunettes d'éclipse,
      ou film posé sur un objectif — réduit tout d'un facteur 100 000 : le ciel devient noir, aucune étoile
      n'est dessinée, et il ne reste que le Soleil, ce qui est la seule façon de voir la forme d'un Soleil
      en partie éclipsé (<a href="/demos/sky/#eclipse">les phases partielles de 1999, à travers l'un d'eux</a>).
      Il ne change aucun angle, seulement la lumière, et se met et s'ôte le long de l'enregistrement : les lunettes s'ôtent pour la totalité.</p>

    <h2 id="pictures">Une photo des lieux</h2>
    <p>Tout ce qui précède est calculé, et un lecteur devant le résultat n'a aucun moyen de
      distinguer une reconstitution fidèle d'une reconstitution vraisemblable. Une photo du même
      endroit, si. Un enregistrement peut porter des photos des lieux — celle de l'observateur, celle d'un
      enquêteur, la page d'une revue, une capture de rue — chacune posée sur le rendu à une opacité
      que le lecteur fait glisser entre tout photo et tout rendu, le phénomène dessiné par-dessus.
      Chaque arbre que le relief à trente mètres avait lissé, chaque crête, la vraie haie, ne font
      plus qu'une image avec la reconstitution. <a href="/demos/sightings/#cussac">Cussac</a> porte la
      première : la vue de 1968 depuis le lieu, avec la sphère et son envol dessinés à la main. Avec
      plusieurs photos, le bouton ouvre au-dessus de lui une liste où chacune se montre, se cache et
      s'estompe pour elle seule : <a href="/demos/sightings/#mcminnville">McMinnville</a> pose deux
      clichés sur la même scène.</p>
    <p>Une photo est un champ de directions depuis un point, et se recale comme tel : cap, assiette,
      roulis et champ de l'objectif, des angles et rien d'autre. Elle se tient dans la scène en trois
      dimensions comme un panneau plan à ce champ — ce qu'un objectif produit — et se rend à travers
      ce que l'instrument déclare, donc la même photo est juste sous la vue équidistante d'un œil et
      sous la vue rectilinéaire d'un 50 mm, et reste en place quand le lecteur tourne. Rien dans la
      scène ne la cache et elle ne cache rien.</p>
    <p>Le recalage est une mesure, pas une impression. Nommez un repère sur la photo et le même
      dans le rendu — un clocher, le bout d'une haie, l'horizon sous un arbre — et deux repères
      tournent la photo pour les faire coïncider ; trois ou plus ajustent aussi son champ. L'écart
      résiduel dit si elle tient, repère par repère, en vert, orange ou rouge : un repère qui ne
      descend pas sous un degré vous dit que la photo n'a pas été prise de ce point, ou que le
      relief est faux là. Et une photo qui tient rend le cap que l'observateur avait réellement —
      adopté dans sa pose avec sa provenance écrite, là où un cap saisi n'était que sa parole. Les
      photos de rue prises à proximité (Panoramax, imagerie ouverte) arrivent déjà recalées en cap,
      un tour complet arrivant comme panorama.</p>
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

  private es(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Inicio</a></p>
    <h1>Comprobar lo que afirma la escena.</h1>
    <p class="lede">El observador aporta el fenómeno. Todo lo demás se consulta en un registro con
      nombre o se calcula a partir de la física — y allí donde ni lo uno ni lo otro puede responder,
      la herramienta lo dice en lugar de dibujar algo verosímil. Esto es eso, parte por parte, con
      los números que realmente aplica.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2 id="sky">El cielo</h2>
    <p>El Sol, la Luna y su fase, los planetas y las estrellas se sitúan por efemérides para ese
      instante, esa latitud y esa longitud. Nada es una imagen de un cielo: señala cualquier cosa y
      se nombra a sí misma — «Venus, mag −4, 8° sobre el horizonte».</p>
    <p>Lo que se dibuja del catálogo se detiene en la magnitud 6,5, y ese número es un hecho sobre un
      <em>observador</em> y no sobre el cielo: es hasta dónde llega un ojo humano adaptado a la
      oscuridad. Pon otra cosa delante de la misma noche y el umbral se desplaza con ella — mira
      <a href="#instrument">el instrumento</a>.</p>
    <p>El catálogo sigue el mismo umbral. Un cielo a simple vista cuesta 400 kB, hasta la magnitud
      7,5; otras 57 688 estrellas, hasta la magnitud 9, solo se descargan para una grabación cuya
      propia óptica llega tan lejos. Más allá de la magnitud 9 son los datos los que se detienen, y la
      herramienta indica el límite en lugar de dibujar un cielo más vacío que el que mostraba la
      fotografía.</p>
    <p>El catálogo está escrito para el año 2000, y el eje en torno al cual gira el cielo se ha
      desplazado desde entonces. Cada estrella se lleva a la fecha de la observación: un grado en
      1918, catorce en 1006, que es la diferencia entre dos constelaciones.</p>
    <p>La Vía Láctea y la luz zodiacal se integran a lo largo de la línea de visión en lugar de
      pintarse como una textura — por eso se mueven correctamente con la estación, la hora y la
      latitud del observador en vez de estar simplemente en el lugar correcto una vez.</p>

    <h2 id="light">La luz del cielo</h2>
    <p>El cielo en sí no es un degradado de color. La luz del Sol y de la Luna se sigue a través de
      una atmósfera esférica en quince longitudes de onda que cubren lo que ve un ojo, tal como la
      luz llega realmente a un observador: dispersada una vez por el aire en su camino, luego una y
      otra vez, atenuada por lo que se interpone. Tres cosas componen ese aire. Las moléculas del
      propio aire, que dispersan el azul mucho más que el rojo y hacen azul el cielo. La bruma, que
      blanquea el horizonte y pone una aureola brillante alrededor del Sol, y que es más espesa en un
      día húmedo que en uno seco: su cantidad sigue la humedad relativa del registro meteorológico. Y
      la capa de ozono, que absorbe un poco de naranja, invisible a mediodía y la única razón de que
      un cenit crepuscular sea de un azul profundo y no de un amarillo grisáceo.</p>
    <p>Todo lo que hace un cielo despejado se deduce entonces sin pintarlo: el enrojecimiento y la
      franja más brillante a lo largo del horizonte al ponerse el Sol, la sombra de la Tierra que
      sube frente al Sol con la franja rosada encima, el lento oscurecimiento del crepúsculo primero
      hacia el este, el azul más profundo visto desde un avión, el aire más fino sobre un lugar
      elevado, y el cielo iluminado por la Luna, que es la misma dispersión de una fuente mucho más
      débil. La luminiscencia de la alta atmósfera queda como el suelo de toda noche sin Luna, más
      brillante cerca del horizonte, donde una línea de visión atraviesa más de su capa.</p>
    <p>El modelo se comprueba en lugar de darse por bueno. Un lento cálculo de Monte Carlo de la
      misma atmósfera, sin más aproximación que el ruido, sitúa el cielo que dibuja la escena a menos
      de un cuarto de magnitud y una centésima de color, desde un mediodía brumoso hasta un Sol
      dieciséis grados bajo el horizonte, desde el suelo y desde un avión. Se sabe que un lugar es
      demasiado oscuro, en dos tercios de magnitud: la sombra de la Tierra baja en el cielo durante
      el crepúsculo náutico. Y el cenit coincide a media magnitud con la fotometría del crepúsculo
      medida en el observatorio de Paranal, sin haber sido nunca ajustado a ella.</p>
    <p>Lo que llega a la pantalla es lo que hace de ese cielo un ojo adaptado a él: para un
      observador que está en él, un cielo nocturno no es diez millones de veces más oscuro que un
      cielo diurno, y el color cede el paso a un gris azulado tenue a medida que los bastones toman
      el relevo de los conos. Una cámara no hace nada de esto, así que una grabación hecha a través
      de una conserva el azul que muestra realmente una exposición larga. El brillo con que se
      muestran un día y una noche sin Luna son las dos elecciones de esa cadena, y se declaran como
      elecciones.</p>
    <p>Lo que no hace: ni contaminación lumínica, ni bruma volcánica, ni refracción del Sol bajo el
      horizonte, y las nubes se dibujan aparte en lugar de atenuar la luz del cielo a su alrededor.
      Cuánta bruma ponía en el aire una ciudad dada no puede saberse a partir de un registro de 1948;
      solo se modela cuánto la hinchaba la humedad. Las fuentes, y las decisiones detrás de cada una,
      se enumeran en <a href="/docs/sources/#air">el aire</a>.</p>

    <h2 id="space">Qué más había allá arriba</h2>
    <p>Cada uno de estos es una explicación candidata, así que cada uno debe responder a la misma
      pregunta antes de ser dibujado: ¿podía ser visible <em>desde allí, en ese momento</em>?</p>
    <p><strong>Los cometas</strong> aparecen en su propia aparición y en ninguna otra. El catálogo se
      genera a partir de JPL Horizons y la órbita se propaga, así que un cometa está ahí en esa fecha
      o no lo está.</p>
    <p><strong>Las novas y supernovas</strong> brillan solo las noches que cubre su curva de luz
      registrada, y nunca fuera de ella: antes del primer registro la estrella quizá ya estaba
      subiendo, y nadie puede decir con qué brillo. Treinta y tres erupciones fueron visibles a simple
      vista, desde la supernova de 1006 hasta RS Ophiuchi en 2021. Su brillo está medido por la AAVSO
      para cada nova hasta 2006, reconstruido a partir de las propias comparaciones de Tycho y de
      Kepler para 1572 y 1604, y ceñido a unas pocas fechas de las crónicas para 1054 y 1181; cada
      una dice cuál es su caso.</p>
    <p>Los <strong>eclipses</strong> nunca se declaran. En cada instante, las posiciones del Sol y de la
      Luna vistas desde el lugar mismo del observador, paralaje incluida, dicen qué parte del disco
      solar cubre la Luna; la escena dibuja ese creciente, la luz del día que deja, la corona cuando no
      queda nada, y las estrellas y los planetas que permite entonces el cielo más oscuro, y durante uno o dos segundos a cada lado de la totalidad los granos de luz que deja pasar el propio relieve de la Luna (el mapa LOLA de la NASA, con la libración del día). Por eso el
      11 de agosto de 1999 es total en Reims y solo del 99&nbsp;% en París. A simple vista, un Sol en
      creciente sigue deslumbrando: su forma solo se ve a través de un filtro, como para cualquiera
      que mire.</p>
    <p>La <strong>Luna</strong> se dibuja con el tamaño que tiene ese día: su órbita es una elipse, por lo que su
      disco mide 0,56° en el perigeo y 0,49° en el apogeo, el 14&nbsp;% del que está hecha una «superluna». <em>No</em>
      es más grande en el horizonte, donde incluso está un poco más lejos: esa impresión es una ilusión de la mente,
      que una cámara no comparte, y la escena no la copia. Lo que es cierto de una Luna bassa es su color, que es el
      del aire: el largo recorrido le quita el azul. Eso es todo lo que hay en la «lune rousse» del folclore, la Luna
      llena de la lunación que sigue a la Pascua, baja porque el Sol que tiene enfrente ya está alto.</p>
    <p><strong>Las lluvias de meteoros</strong> llegan con su radiante y su tasa horaria de esa noche,
      sobre el fondo esporádico que nunca se detiene.</p>
    <p><strong>Los bólidos registrados</strong> son sucesos, no tasas: desde diciembre de 2018 las
      cámaras de la Global Meteor Network triangulan dónde empezó y terminó cada bólido brillante y qué
      brillo alcanzó, y una grabación de esa fecha dibuja cada uno de los que ardieron mientras dura,
      desde el lugar del observador, tan brillante como lo permite su distancia.</p>
    <p><strong>Los satélites</strong> reciben la pregunta más difícil, porque estar iluminado no es lo
      mismo que ser visto: la sombra de la Tierra se calcula para la fecha y la hora para decir si
      alguno podía siquiera recibir el Sol, y cuántos objetos había en órbita en esa fecha se sabe, y
      se indica. Desde febrero de 2021 la herramienta va más allá: los elementos orbitales guardados
      una o dos veces al día por Laurent Chabin (SCEAU) dan el paso real de cada satélite, iluminado a
      través de la sombra de la Tierra y tan brillante como se midió, trenes de Starlink incluidos.
      Antes de esa fecha no se dibuja ningún paso individual, porque ninguno podría dibujarse con
      veracidad.</p>
    <p><strong>Las reentradas atmosféricas</strong> las coloca una interpretación, no se
      encuentran: un satélite o una etapa de cohete que se desintegra en pedazos que arden, sobre un
      camino que alguien estableció (los elementos orbitales yerran en minutos en la última órbita).
      Se sitúa sobre la Tierra, entre 70 y 100 km de altura, y se ve a través de la curvatura de la
      Tierra desde donde estaba el observador, cada pedazo tan brillante como lo permite su
      distancia, con su estela a lo largo de su propio camino, hasta que ha ardido. Brilla por su
      propio calentamiento: la sombra de la Tierra no la apaga. Las reentradas que pudieron estar en
      un cielo se enuncian desde el registro (CORDS desde 2000, los días de reentrada del catálogo de
      satélites desde 1957), cada una con su precisión: una observación registrada lo bastante
      cercana en tiempo y lugar, una predicción cuya ventana alcanza la observación, o un simple
      día. Una órbita que nunca pasa a la vista de la latitud del observador nunca se lista.</p>

    <h2 id="ice">Hielo y agua</h2>
    <p>Halos de 22° y 46°, parhelios, el círculo parhélico, arcos tangentes, circuncenital y
      circunhorizontal: ninguno de esos ángulos está almacenado. Cada uno se deriva del índice de
      refracción del hielo y de la geometría del cristal, que es lo que hace que todo el conjunto se
      mueva a la vez y siga siendo coherente con la altura del propio Sol.</p>
    <p>Los arcoíris y los arcos lunares se trazan con rayos a través de una gota esférica por la misma
      razón — el orden de los colores, el hueco entre los dos arcos y la luz dentro del primario
      salen del trazado en lugar de dibujarse.</p>

    <h2 id="weather">El tiempo de aquel día</h2>
    <p>La nubosidad, la base de las nubes, la lluvia, la nieve, el granizo, las tormentas y sus
      truenos, y el viento se leen de ERA5, el reanálisis del ECMWF: horario, mundial, desde 1940 (para los últimos cinco días, que aún
      no ha alcanzado, el análisis del modelo de previsión). Se
      interpolan por fotogramas clave a lo largo de la observación, así que un cielo que se despejó
      durante esos cuatro minutos se despeja en la reconstrucción.</p>
    <p>Un registro dice qué parte del cielo cubría cada capa, nunca dónde: la disposición de las nubes
      es la de la reconstrucción. Deriva a lo largo del día con el viento del registro y difiere de un
      día a otro, de modo que al recorrer las horas se ven nubes que se mueven y cambian, pero no es
      una imagen de las nubes que había.</p>
    <p>Las nubes atenúan cada cuerpo celeste en lugar de limitarse a taparlo, que es lo que hace que
      una Luna tras nubes finas se lea como una Luna tras nubes finas.</p>
    <p>La consulta exacta se guarda en la grabación. Esa es la parte que importa: la afirmación sigue
      siendo comprobable décadas después, por alguien que no confía en esta herramienta.</p>

    <h2 id="ground">El terreno</h2>
    <p>El relieve real y las imágenes aéreas se descargan alrededor del observador, junto con el
      decorado que se interpuso: edificios, árboles, farolas, vehículos, ventanas y otros observadores
      — con sus luces, sus frecuencias de destello y sus trayectorias.</p>
    <p>A qué altura estaba el observador se consulta a partir de dónde estaba. El suelo bajo esas
      coordenadas procede de un modelo de elevación real, así que la altitud del formulario es una
      altura sobre el nivel del mar cuyo suelo es el propio terreno: nadie puede quedar por debajo. Y
      no es un detalle — a 1500 m el horizonte está realmente 1,2° más bajo que al nivel del mar, lo
      que basta para decidir si algo estaba por encima de él.</p>

    <h2 id="instrument">El instrumento</h2>
    <p>Un ojo no es un objetivo. A simple vista, un ángulo se corresponde con un ángulo; una cámara lo
      proyecta en <code>f·tan θ</code>, con un sensor, una distancia focal, una apertura y una
      exposición que dibuja trazos de estrellas y convierte en puntos una luz intermitente. Cambia de
      aparato y todo el encuadre cambia —
      <a href="/demos/instruments/#instrument-eye">el mismo avistamiento a través de tres de ellos</a>.</p>
    <p>Solo se ofrece lo que ese aparato podía tener realmente: una Instamatic tenía una apertura y
      una velocidad de obturación, así que no hay nada que elegir, y una cámara que aún no existía
      queda señalada frente a la fecha de la propia observación.</p>
    <p>Y el instrumento decide lo débil que podía llegar a registrarse algo. Esa misma Instamatic se
      detiene en la magnitud 4,2 — dos menos que el observador que la sostiene, lo que explica la
      mitad de por qué tantos relatos de «el cielo estaba lleno de estrellas» vienen con una
      fotografía negra y vacía. Un 50 mm a f/2 durante veinte segundos llega a 9,7, tres magnitudes
      <em>más allá</em> de ese observador. La apertura, la obturación y la focal lo deciden frente al
      propio brillo del cielo.</p>
    <p>Una exposición más larga deja de ayudar en cuanto el cielo se ha desplazado más de lo que el
      objetivo puede resolver, y por eso una hora sobre un trípode no llega más hondo que cinco
      segundos — solo da trazos más largos.</p>
    <p>También se puede sostener algo <em>delante</em> del instrumento. Un filtro solar — gafas de eclipse, o la
      película que se pone sobre un objetivo — reduce todo cien mil veces: el cielo se vuelve negro, no se
      dibuja ninguna estrella, y solo queda el Sol, que es la única manera de ver la forma de un Sol
      parcialmente eclipsado (<a href="/demos/sky/#eclipse">las fases parciales de 1999, a través de uno</a>).
      No cambia ningún ángulo, solo la luz, y se pone y se quita a lo largo de la grabación: las gafas se quitan para la totalidad.</p>

    <h2 id="pictures">Una foto del lugar</h2>
    <p>Todo lo anterior está calculado, y un lector que mira el resultado no tiene forma de
      distinguir una reconstrucción fiel de una verosímil. Una fotografía del mismo lugar sí la tiene.
      Una grabación puede llevar fotos del lugar donde ocurrió — la del propio observador, la de un
      investigador, el escaneo de una revista, una captura a pie de calle — cada una superpuesta al
      render con una opacidad que el lector desliza entre todo foto y todo render, con el fenómeno
      dibujado sobre ambos. Cada árbol que el relieve de treinta metros había alisado, cada cresta,
      el seto real, forman entonces una sola imagen con la reconstrucción.
      <a href="/demos/sightings/#cussac">Cussac</a> lleva la primera: la vista de 1968 desde el lugar, con la
      esfera y su ascenso dibujados a mano.</p>
    <p>Una foto es un campo de direcciones desde un punto, y se alinea como tal: rumbo, cabeceo,
      alabeo y el campo del objetivo, ángulos y nada más. Se sitúa en la escena tridimensional como
      un panel plano con ese campo — que es lo que produce un objetivo — y se dibuja a través de lo
      que declara el instrumento, así que la misma foto es correcta bajo la vista equidistante de un
      ojo y bajo la rectilínea de un 50 mm, y se queda en su sitio cuando el lector gira. Nada en la
      escena la oculta y ella no oculta nada.</p>
    <p>Alinearla es una medida, no una impresión. Nombra un punto de referencia en la foto y el mismo
      en el render — un campanario, el extremo de un seto, el horizonte bajo un árbol — y dos de ellos
      giran la foto para que encaje; tres o más ajustan también su campo. El residuo dice lo bien que
      encaja, punto por punto, en verde, naranja o rojo: uno que no baja de un grado te está diciendo
      que la foto no se tomó desde ese lugar, o que el relieve está mal ahí. Y una foto que encaja
      devuelve el rumbo al que el observador miraba realmente — adoptado en su pose con su procedencia
      anotada, donde un rumbo tecleado era solo su palabra. Las fotos a pie de calle tomadas cerca
      (Panoramax, imágenes abiertas) llegan ya alineadas en rumbo, y una vuelta completa llega como
      panorama.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p class="small">Cada fuente se nombra allí donde se presentan sus datos, con la atribución que
      exige su licencia — y puede sustituirse por otra. El selector <em>es</em> el crédito. Lo que aún
      falta, y lo que espera cada elemento, está en <a href="/roadmap/">la hoja de ruta</a>.</p>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Home</a></p>
    <h1>Verificare ciò che la scena afferma.</h1>
    <p class="lede">L'osservatore fornisce il fenomeno. Tutto il resto è ricavato da una fonte
      nominata o calcolato dalla fisica — e dove né l'una né l'altra sanno rispondere, lo strumento
      lo dice invece di disegnare qualcosa di plausibile. Eccolo, parte per parte, con i numeri che
      applica davvero.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2 id="sky">Il cielo</h2>
    <p>Sole, Luna e la sua fase, pianeti e stelle sono collocati per effemeridi per quell'istante,
      quella latitudine e quella longitudine. Niente è un'immagine di cielo: punta qualunque cosa e
      si nomina da sé — «Venere, mag −4, 8° sopra l'orizzonte».</p>
    <p>Ciò che viene disegnato dal catalogo si ferma alla magnitudine 6,5, e quel numero è un fatto
      che riguarda un <em>osservatore</em> e non il cielo: è fin dove arriva un occhio umano adattato
      al buio. Metti qualcos'altro davanti alla stessa notte e la soglia si sposta con esso — vedi
      <a href="#instrument">lo strumento</a>.</p>
    <p>Il catalogo segue la stessa soglia. Un cielo a occhio nudo costa 400 kB, fino alla magnitudine
      7,5; altre 57 688 stelle, fino alla magnitudine 9, vengono scaricate solo da una registrazione
      la cui ottica arriva fin lì. Oltre la magnitudine 9 sono i dati a fermarsi, e lo strumento
      segnala il limite invece di disegnare un cielo più vuoto di quello che mostrava la
      fotografia.</p>
    <p>Il catalogo è scritto per l'anno 2000, e l'asse attorno a cui gira il cielo si è spostato da
      allora. Ogni stella è riportata alla data dell'osservazione: un grado nel 1918, quattordici nel
      1006, cioè la differenza fra due costellazioni.</p>
    <p>La Via Lattea e la luce zodiacale sono integrate lungo la linea di vista invece di essere
      dipinte come una texture — ed è per questo che si muovono correttamente con la stagione, l'ora
      e la latitudine dell'osservatore invece di trovarsi al posto giusto una volta sola.</p>

    <h2 id="light">La luce del cielo</h2>
    <p>Il cielo stesso non è una sfumatura di colore. La luce del Sole e della Luna è seguita
      attraverso un'atmosfera sferica a quindici lunghezze d'onda che coprono ciò che vede un occhio,
      nel modo in cui la luce raggiunge davvero un osservatore: diffusa una volta dall'aria lungo il
      cammino, poi ancora e ancora, attenuata da ciò che le sta davanti. Tre cose compongono
      quell'aria. Le molecole dell'aria stessa, che diffondono il blu molto più del rosso e rendono
      blu il cielo. La foschia, che sbianca l'orizzonte e mette un'aureola luminosa attorno al Sole,
      e che è più spessa in una giornata umida che in una secca: la sua quantità segue l'umidità
      relativa del dato meteorologico. E lo strato di ozono, che assorbe un po' di arancione,
      invisibile a mezzogiorno e unica ragione per cui uno zenit crepuscolare è di un blu profondo
      anziché di un giallo grigiastro.</p>
    <p>Tutto ciò che fa un cielo sereno ne segue allora senza essere dipinto: l'arrossamento e la
      fascia più luminosa lungo l'orizzonte al tramonto, l'ombra della Terra che sale opposta al Sole
      con la fascia rosa sopra, il lento oscurarsi del crepuscolo prima verso est, il blu più profondo
      visto da un aereo, l'aria più sottile sopra un sito elevato, e il cielo al chiaro di luna, che è
      la stessa diffusione di una sorgente molto più debole. La luminescenza dell'alta atmosfera resta
      come pavimento di ogni notte senza Luna, più luminosa vicino all'orizzonte dove una linea di
      vista attraversa più del suo strato.</p>
    <p>Il modello è verificato anziché creduto. Un lento calcolo Monte Carlo della stessa atmosfera,
      senza altra approssimazione che il rumore, colloca il cielo disegnato dalla scena entro un
      quarto di magnitudine e un centesimo di colore, da un mezzogiorno nebbioso a un Sole sedici
      gradi sotto l'orizzonte, da terra e da un aereo. Un punto è noto per essere troppo scuro, di due
      terzi di magnitudine: l'ombra della Terra bassa nel cielo durante il crepuscolo nautico. E lo
      zenit concorda entro mezza magnitudine con la fotometria del crepuscolo misurata
      all'osservatorio del Paranal, senza esservi mai stato adattato.</p>
    <p>Ciò che arriva sullo schermo è ciò che ne fa un occhio adattato a quel cielo: per un
      osservatore che vi si trova, un cielo notturno non è dieci milioni di volte più scuro di un cielo
      diurno, e il colore cede il posto a un grigio-azzurro tenue man mano che i bastoncelli prendono
      il posto dei coni. Una fotocamera non fa nulla di tutto questo, quindi una registrazione fatta
      attraverso di essa conserva il blu che una posa lunga mostra davvero. Quanto luminosi vengono
      mostrati un giorno e una notte senza Luna sono le due scelte di quella catena, e sono dichiarate
      come scelte.</p>
    <p>Ciò che non fa: niente inquinamento luminoso, niente foschia vulcanica, niente rifrazione del
      Sole sotto l'orizzonte, e le nuvole sono disegnate a parte invece di attenuare la luce del cielo
      attorno a loro. Quanta foschia mettesse nell'aria una data città non si può sapere da un dato
      del 1948; è modellato solo quanto l'umidità la gonfiasse. Le fonti, e le scelte dietro ciascuna,
      sono elencate sotto <a href="/docs/sources/#air">l'aria</a>.</p>

    <h2 id="space">Cos'altro c'era lassù</h2>
    <p>Ciascuno di questi è una spiegazione candidata, quindi ciascuno deve rispondere alla stessa
      domanda prima di essere disegnato: poteva essere visibile <em>da lì, in quel momento</em>?</p>
    <p><strong>Le comete</strong> compaiono al loro passaggio e in nessun altro. Il catalogo è
      generato da JPL Horizons e l'orbita è propagata, quindi una cometa c'è in quella data oppure
      non c'è.</p>
    <p><strong>Novae e supernovae</strong> brillano solo nelle notti coperte dalla loro curva di luce
      registrata, e mai al di fuori: prima della prima registrazione la stella poteva già essere in
      salita, e nessuno può dire con quale luminosità. Trentatré eruzioni hanno raggiunto l'occhio
      nudo, dalla supernova del 1006 a RS Ophiuchi nel 2021. La loro luminosità è misurata dall'AAVSO
      per ogni nova fino al 2006, ricostruita dai confronti di Tycho e di Keplero stessi per il 1572 e
      il 1604, e ancorata a poche date delle cronache per il 1054 e il 1181; ciascuna dice quale sia il
      suo caso.</p>
    <p>Le <strong>eclissi</strong> non sono mai dichiarate. A ogni istante, le posizioni del Sole e della
      Luna viste dal luogo stesso dell'osservatore, parallasse compresa, dicono quanta parte del disco
      solare la Luna copre; la scena disegna quella falce, la luce del giorno che lascia, la corona
      quando non resta nulla, e le stelle e i pianeti che il cielo più buio consente allora, e per un secondo o due ai lati della totalità i grani di luce che lascia passare il rilievo stesso della Luna (la mappa LOLA della NASA, con la librazione del giorno). Per questo
      l'11 agosto 1999 è totale a Reims e solo al 99&nbsp;% a Parigi. A occhio nudo, un Sole a falce
      resta abbagliante: la sua forma si vede solo attraverso un filtro, come per chiunque guardi.</p>
    <p>La <strong>Luna</strong> è disegnata della dimensione che ha quel giorno: la sua orbita è un'ellisse, quindi il
      suo disco misura 0,56° al perigeo e 0,49° all'apogeo, il 14&nbsp;% di cui è fatta una «superluna». <em>Non</em> è
      più grande all'orizzonte, dove è anzi un po' più lontana: quell'impressione è un'illusione della mente, che una
      fotocamera non condivide, e la scena non la copia. Ciò che è vero di una Luna bassa è il suo colore, che è quello
      dell'aria: il lungo percorso le toglie il blu. È tutto ciò che c'è nella «lune rousse» del folclore, la Luna piena
      della lunazione che segue la Pasqua, bassa perché il Sole che le sta di fronte è già alto.</p>
    <p><strong>Gli sciami meteorici</strong> arrivano con il loro radiante e il loro tasso orario per
      quella notte, sopra il fondo sporadico che non si ferma mai.</p>
    <p><strong>I bolidi registrati</strong> sono eventi, non tassi: dal dicembre 2018 le telecamere
      della Global Meteor Network triangolano dove ogni bolide luminoso è iniziato e finito e quale
      luminosità ha raggiunto, e una registrazione di quella data disegna ciascuno di quelli che sono
      bruciati mentre dura, dal punto dell'osservatore, luminoso quanto la sua distanza consente.</p>
    <p><strong>I satelliti</strong> ricevono la domanda più difficile, perché essere illuminati non è
      la stessa cosa che essere visti: l'ombra della Terra è calcolata per la data e l'ora per dire se
      uno di essi poteva anche solo ricevere il Sole, e quanti oggetti fossero in orbita in quella
      data è noto, e dichiarato. Da febbraio 2021 lo strumento va oltre: gli elementi orbitali salvati
      una o due volte al giorno da Laurent Chabin (SCEAU) danno il passaggio reale di ogni satellite,
      illuminato attraverso l'ombra della Terra e luminoso quanto è stato misurato, treni di Starlink
      compresi. Prima di quella data non viene disegnato alcun passaggio individuale, perché nessuno
      potrebbe esserlo in modo veritiero.</p>
    <p><strong>I rientri atmosferici</strong> sono collocati da un'interpretazione, non trovati:
      un satellite o uno stadio di razzo che si disintegra in pezzi che bruciano, su un percorso che
      qualcuno ha stabilito (gli elementi orbitali sbagliano di minuti nell'ultima orbita). È posto
      sulla Terra, tra 70 e 100 km di quota, e visto attraverso la curvatura della Terra dal punto
      in cui stava l'osservatore, ogni pezzo luminoso quanto la sua distanza consente, con la sua
      scia lungo il proprio percorso, finché non è bruciato. Brilla del proprio riscaldamento:
      l'ombra della Terra non lo spegne. I rientri che possono essere stati in un cielo sono
      enunciati dal registro (CORDS dal 2000, i giorni di rientro del catalogo dei satelliti dal
      1957), ciascuno con la sua precisione: un'osservazione registrata abbastanza vicina nel tempo e
      nello spazio, una previsione la cui finestra incontra l'osservazione, o un semplice giorno.
      Un'orbita che non passa mai in vista della latitudine dell'osservatore non è mai elencata.</p>

    <h2 id="ice">Ghiaccio e acqua</h2>
    <p>Aloni di 22° e 46°, pareli, il cerchio parelico, archi tangenti, circumzenitale e
      circumorizzontale: nessuno di quegli angoli è memorizzato. Ciascuno è derivato dall'indice di
      rifrazione del ghiaccio e dalla geometria del cristallo, ed è questo che fa muovere insieme
      l'intero fenomeno e lo mantiene coerente con l'altezza del Sole stesso.</p>
    <p>Arcobaleni e arcobaleni lunari sono tracciati con raggi attraverso una goccia sferica per la
      stessa ragione — l'ordine dei colori, lo spazio fra i due archi e la luce all'interno del
      primario escono dal tracciamento invece di essere disegnati.</p>

    <h2 id="weather">Il meteo di quel giorno</h2>
    <p>Copertura nuvolosa, base delle nubi, pioggia, neve, grandine, temporali e i loro tuoni, e vento
      sono letti da ERA5, la rianalisi dell'ECMWF: oraria, mondiale, dal 1940 (per gli ultimi cinque giorni, che non ha
      ancora raggiunto, l'analisi del modello di previsione). Sono interpolati per
      fotogrammi chiave lungo l'osservazione, così che un cielo che si è rasserenato durante quei
      quattro minuti si rasserena nella ricostruzione.</p>
    <p>Un dato dice quanta parte del cielo ogni strato coprisse, mai dove: la disposizione delle nubi è
      quella della ricostruzione. Deriva lungo la giornata con il vento del dato e differisce da un
      giorno all'altro, così scorrendo le ore si vedono nubi che si muovono e cambiano, ma non è
      un'immagine delle nubi che c'erano.</p>
    <p>Le nuvole attenuano ogni corpo celeste invece di coprirlo soltanto, ed è ciò che fa sì che una
      Luna dietro nubi sottili si legga come una Luna dietro nubi sottili.</p>
    <p>La richiesta esatta è conservata nella registrazione. È la parte che conta: l'affermazione
      resta verificabile decenni dopo, da qualcuno che non si fida di questo strumento.</p>

    <h2 id="ground">Il terreno</h2>
    <p>Il rilievo reale e le immagini aeree vengono scaricati attorno all'osservatore, insieme
      all'arredo che si è frapposto: edifici, alberi, lampioni, veicoli, finestre e altri osservatori
      — con le loro luci, le loro frequenze di lampeggio e le loro traiettorie.</p>
    <p>A che altezza si trovasse l'osservatore si ricava da dove si trovava. Il suolo sotto quelle
      coordinate viene da un modello di elevazione reale, quindi l'altitudine del modulo è un'altezza
      sul livello del mare il cui pavimento è il terreno stesso: nessuno può esservi collocato sotto.
      E non è un dettaglio — a 1500 m l'orizzonte è davvero 1,2° più basso che al livello del mare, il
      che basta a decidere se qualcosa gli stava sopra.</p>

    <h2 id="instrument">Lo strumento</h2>
    <p>Un occhio non è un obiettivo. A occhio nudo un angolo corrisponde a un angolo; una fotocamera
      lo proietta in <code>f·tan θ</code>, con un sensore, una lunghezza focale, un diaframma e una
      posa che disegna le scie delle stelle e trasforma in puntini una luce lampeggiante. Cambia
      apparecchio e tutta l'inquadratura cambia —
      <a href="/demos/instruments/#instrument-eye">lo stesso avvistamento attraverso tre di essi</a>.</p>
    <p>Viene offerto solo ciò su cui quell'apparecchio poteva davvero essere impostato: una Instamatic
      aveva un solo diaframma e un solo tempo di posa, quindi non c'è nulla da scegliere, e una
      fotocamera che non esisteva ancora viene segnalata rispetto alla data dell'osservazione
      stessa.</p>
    <p>Ed è lo strumento a decidere quanto debole potesse essere una cosa per essere registrata. Quella
      stessa Instamatic si ferma alla magnitudine 4,2 — due in meno dell'osservatore che la tiene, il
      che spiega metà del perché tanti resoconti di «il cielo era pieno di stelle» arrivino con una
      fotografia nera e vuota. Un 50 mm a f/2 per venti secondi arriva a 9,7, tre magnitudini
      <em>oltre</em> quell'osservatore. Diaframma, otturatore e focale lo stabiliscono rispetto alla
      luminosità del cielo stesso.</p>
    <p>Una posa più lunga smette di aiutare appena il cielo è scivolato più di quanto l'obiettivo
      possa risolvere, ed è per questo che un'ora su un treppiede non va più in profondità di cinque
      secondi — dà solo scie più lunghe.</p>
    <p>Si può anche tenere qualcosa <em>davanti</em> allo strumento. Un filtro solare — occhiali da eclissi, o la
      pellicola che si mette su un obiettivo — riduce tutto di centomila volte: il cielo diventa nero, nessuna
      stella è disegnata, e resta solo il Sole, che è l'unico modo di vedere la forma di un Sole parzialmente
      eclissato (<a href="/demos/sky/#eclipse">le fasi parziali del 1999, attraverso uno</a>).
      Non cambia alcun angolo, solo la luce, e si mette e si toglie lungo la registrazione: gli occhiali si tolgono per la totalità.</p>

    <h2 id="pictures">Una foto del luogo</h2>
    <p>Tutto ciò che precede è calcolato, e un lettore che guarda il risultato non ha modo di
      distinguere una ricostruzione fedele da una plausibile. Una fotografia dello stesso luogo sì.
      Una registrazione può portare foto del luogo in cui è accaduto — quella dell'osservatore stesso,
      quella di un investigatore, la scansione di una rivista, una ripresa a livello strada — ciascuna
      sovrapposta al rendering con un'opacità che il lettore fa scorrere fra tutta foto e tutto
      rendering, con il fenomeno disegnato sopra entrambi. Ogni albero che il rilievo a trenta metri
      aveva spianato, ogni cresta, la vera siepe, diventano allora un'unica immagine con la
      ricostruzione. <a href="/demos/sightings/#cussac">Cussac</a> porta la prima: la vista del 1968 dal luogo,
      con la sfera e la sua salita disegnate a mano.</p>
    <p>Una foto è un campo di direzioni da un punto, e si allinea come tale: rotta, beccheggio, rollio
      e il campo dell'obiettivo, angoli e nient'altro. Sta nella scena tridimensionale come un
      pannello piano con quel campo — che è ciò che produce un obiettivo — ed è disegnata attraverso
      ciò che lo strumento dichiara, quindi la stessa foto è corretta sotto la vista equidistante di un
      occhio e sotto quella rettilinea di un 50 mm, e resta al suo posto quando il lettore si gira.
      Niente nella scena la nasconde ed essa non nasconde niente.</p>
    <p>Allinearla è una misura, non un'impressione. Nomina un punto di riferimento sulla foto e lo
      stesso nel rendering — un campanile, la fine di una siepe, l'orizzonte sotto un albero — e due di
      essi ruotano la foto perché combaci; tre o più ne adattano anche il campo. Il residuo dice quanto
      bene combacia, punto per punto, in verde, arancione o rosso: uno che non scende sotto un grado ti
      sta dicendo che la foto non è stata scattata da quel punto, o che lì il rilievo è sbagliato. E una
      foto che combacia restituisce la rotta verso cui l'osservatore era davvero rivolto — adottata
      nella sua posa con la provenienza annotata, là dove una rotta digitata era solo la sua parola. Le
      foto a livello strada scattate nei dintorni (Panoramax, immagini aperte) arrivano già allineate in
      rotta, e un giro completo arriva come panorama.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <p class="small">Ogni fonte è nominata là dove i suoi dati sono riportati, con l'attribuzione che la
      sua licenza richiede — e può essere sostituita con un'altra. Il selettore <em>è</em> il credito.
      Ciò che manca ancora, e ciò che ogni elemento aspetta, è nella <a href="/roadmap/">tabella di marcia</a>.</p>
  </div>
</section>
`
  }
}
