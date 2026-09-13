import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** One source, as the table states it. Every cell is said in both languages. */
interface SourceRow {
  name: string
  url: string
  provides: Said<string>
  /** When it is read: at build time into the repository, or fetched by the page, and on what condition. */
  when: Said<string>
  /** Where the page gets it from, and the credit or licence it is used under. */
  hosting: Said<string>
  /** Why this source, what was turned down, and the limits that are kept in view. */
  choices: Said<string>
}

interface SourceGroup {
  id: string
  heading: Said<string>
  intro?: Said<string>
  rows: SourceRow[]
}

/**
 * "Where does this come from, and why that source?"
 *
 * Every piece of data the tool draws or states, with the moment it is read, where it is served
 * from, its credit, and the choices made about it: what was kept, what was refused and why. The
 * rest of the site says what the tool does; this is the page to check before trusting it, and the
 * one to update whenever a source is added or changed.
 */
export class DocsSourcesPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/sources",
    navLabel: { en: "Sources and choices", fr: "Sources et choix" },
    title: { en: "Data sources and the choices behind them", fr: "Les sources de données et les choix faits" },
    description: {
      en: "Every catalogue, service and measurement UFO@home uses: what it provides, when it is read, "
        + "where it is served from, its credit, and why it was chosen over the alternatives.",
      fr: "Chaque catalogue, service et mesure qu'utilise UFO@home : ce qu'il fournit, quand il est "
        + "lu, d'où il est servi, son crédit, et pourquoi il a été préféré aux autres."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Nothing the tool draws is invented. Each value comes from a named source, read at a stated "
      + "moment, and where no record exists the interface says so instead of filling the gap.",
    fr: "Rien de ce que l'outil dessine n'est inventé. Chaque valeur vient d'une source nommée, lue à "
      + "un moment dit, et là où aucun relevé n'existe l'interface le dit au lieu de combler le vide."
  }

  private readonly principles: Said<string[]> = {
    en: [
      "<strong>A source is read only when it is needed.</strong> Catalogues are built once into the "
        + "repository; services are called only for a recording that needs them (a place, a date in "
        + "their span, a button pressed), and never for a date before their record begins.",
      "<strong>What may disappear is hosted here.</strong> Data that a third party could take down or "
        + "that cannot be read from a browser (orbital elements, 3D models) is copied, reduced, and served "
        + "from ufoathome.org with its credit, so any page embedding a scene gets it.",
      "<strong>Measured beats modelled, and modelled beats assumed.</strong> A brightness is a "
        + "published observation where one exists; a formula fills in only what nobody measured, and "
        + "an object with neither is computed but not drawn.",
      "<strong>Every service is swappable.</strong> Weather, elevation, imagery, place, time zone, "
        + "models and drafting go through one registry: the source is a visible choice, with its "
        + "credit next to it, and a second one can be added without touching the rest.",
      "<strong>The limits are stated.</strong> Each source below says where it stops: before 1940 "
        + "for the weather, before 1957 for satellites, before February 2021 for individual passes."
    ],
    fr: [
      "<strong>Une source n'est lue que quand on en a besoin.</strong> Les catalogues sont construits "
        + "une fois dans le dépôt ; les services ne sont appelés que pour un enregistrement qui en a "
        + "besoin (un lieu, une date dans leur période, un bouton pressé), et jamais pour une date "
        + "antérieure au début de leur relevé.",
      "<strong>Ce qui peut disparaître est hébergé ici.</strong> Les données qu'un tiers pourrait "
        + "retirer ou qu'un navigateur ne peut pas lire (éléments orbitaux, modèles 3D) sont copiées, "
        + "réduites, et servies depuis ufoathome.org avec leur crédit, pour toute page qui intègre une scène.",
      "<strong>Le mesuré passe avant le modélisé, et le modélisé avant le supposé.</strong> Une "
        + "brillance est une observation publiée quand il en existe une ; une formule ne comble que ce "
        + "que personne n'a mesuré, et un objet sans l'un ni l'autre est calculé mais pas dessiné.",
      "<strong>Chaque service est remplaçable.</strong> Météo, relief, imagerie, lieu, fuseau, "
        + "modèles et rédaction passent par un même registre : la source est un choix visible, avec son "
        + "crédit à côté, et une seconde peut s'ajouter sans toucher au reste.",
      "<strong>Les limites sont dites.</strong> Chaque source ci-dessous dit où elle s'arrête : avant "
        + "1940 pour la météo, avant 1957 pour les satellites, avant février 2021 pour les passages individuels."
    ]
  }

  private readonly groups: SourceGroup[] = [
    {
      id: "sky",
      heading: { en: "The sky", fr: "Le ciel" },
      rows: [
        {
          name: "astronomy-engine", url: "https://github.com/cosinekitty/astronomy",
          provides: { en: "Positions and magnitudes of the Sun, Moon and planets; the Moon's phase; sky coordinates.", fr: "Positions et magnitudes du Soleil, de la Lune et des planètes ; phase de la Lune ; coordonnées célestes." },
          when: { en: "In the page, for every recording with a date.", fr: "Dans la page, pour tout enregistrement daté." },
          hosting: { en: "Bundled library, MIT.", fr: "Bibliothèque embarquée, MIT." },
          choices: { en: "A full ephemeris rather than approximate formulas: the reason to reconstruct a sky is to be right about it. Its precession also carries the year-2000 catalogues (stars, the Galaxy, meteor radiants, novae) to the date observed.", fr: "Une éphéméride complète plutôt que des formules approchées : reconstituer un ciel n'a d'intérêt que s'il est juste. Sa précession ramène aussi les catalogues de l'an 2000 (étoiles, Galaxie, radiants de météores, novae) à la date observée." }
        },
        {
          name: "HYG Database", url: "https://github.com/astronexus/HYG-Database",
          provides: { en: "Star positions, magnitudes and colours; names of stars down to magnitude 3.", fr: "Positions, magnitudes et couleurs des étoiles ; noms des étoiles jusqu'à la magnitude 3." },
          when: { en: "Built once (build:stars). The page loads stars to magnitude 7.5, and to 9 only for an instrument that reaches that deep.", fr: "Construit une fois (build:stars). La page charge les étoiles jusqu'à la magnitude 7,5, et jusqu'à 9 seulement pour un instrument qui va aussi loin." },
          hosting: { en: "Served with the scene bundle. CC BY-SA.", fr: "Servi avec le bundle de la scène. CC BY-SA." },
          choices: { en: "Cut at 9 because the catalogue itself thins out beyond: star counts stop growing as they should.", fr: "Coupé à 9 parce que le catalogue lui-même s'éclaircit au-delà : les comptes d'étoiles cessent de croître comme ils le devraient." }
        },
        {
          name: "JPL Horizons", url: "https://ssd.jpl.nasa.gov/horizons/",
          provides: { en: "The orbit of each naked-eye comet since 1910, as it was at that apparition's perihelion.", fr: "L'orbite de chaque comète visible à l'œil nu depuis 1910, telle qu'elle était au périhélie de cette apparition." },
          when: { en: "Built once (build:comets); the page propagates the orbit itself, no request.", fr: "Construit une fois (build:comets) ; la page propage l'orbite elle-même, sans requête." },
          hosting: { en: "Generated into the code. NASA/JPL.", fr: "Engendré dans le code. NASA/JPL." },
          choices: { en: "Brightness is NOT taken from JPL: its magnitude parameters put NEOWISE 4 magnitudes too faint. Peak magnitudes observed at the time are entered by hand, with their dates. A tail is drawn only where its length was recorded.", fr: "La brillance n'est PAS prise chez JPL : ses paramètres de magnitude rendent NEOWISE 4 magnitudes trop faible. Les magnitudes au pic observées à l'époque sont saisies à la main, avec leur date. Une queue n'est dessinée que si sa longueur a été relevée." }
        },
        {
          name: "AAVSO, via Strope, Schaefer & Henden 2010", url: "https://cdsarc.cds.unistra.fr/ftp/J/AJ/140/34/",
          provides: { en: "The measured light curve of every nova since 1891 that reached magnitude 5, binned from the AAVSO's observations.", fr: "La courbe de lumière mesurée de chaque nova depuis 1891 ayant atteint la magnitude 5, regroupée à partir des observations de l'AAVSO." },
          when: { en: "Built once (build:novae) with the supernovae below; the page interpolates the curve, no request.", fr: "Construit une fois (build:novae) avec les supernovae ci-dessous ; la page interpole la courbe, sans requête." },
          hosting: { en: "Generated into the code. VizieR catalogue J/AJ/140/34.", fr: "Engendré dans le code. Catalogue VizieR J/AJ/140/34." },
          choices: { en: "A recorded curve rather than a decline formula: the standard laws miss most real novae, and would draw DQ Herculis bright for a year through the weeks dust had dimmed it ten magnitudes. Nothing is drawn before the first observation or after the last. RS Oph 2021 and T CrB 1866 reuse the curve of their own previous eruption, shifted onto their recorded peak.", fr: "Une courbe relevée plutôt qu'une formule de déclin : les lois usuelles ratent la plupart des vraies novae, et dessineraient DQ Herculis brillante pendant un an alors que la poussière l'avait éteinte de dix magnitudes en quelques semaines. Rien n'est dessiné avant la première observation ni après la dernière. RS Oph 2021 et T CrB 1866 reprennent la courbe de leur éruption précédente, recalée sur leur pic relevé." }
        },
        {
          name: "Historical supernovae", url: "https://arxiv.org/abs/1612.07399",
          provides: { en: "The supernovae of 1006, 1054, 1181, 1572, 1604 and 1987A: where they stood, and how bright on each night.", fr: "Les supernovae de 1006, 1054, 1181, 1572, 1604 et 1987A : où elles se tenaient, et quel était leur éclat chaque nuit." },
          when: { en: "Built once (build:novae).", fr: "Construit une fois (build:novae)." },
          hosting: { en: "Generated into the code. Positions from SIMBAD; 1572 and 1604 reduced by Ruiz-Lapuente (2004, 2017) from Tycho's, Kepler's and the Korean astronomers' own estimates; 1006, 1054 and 1181 from the chronicles (Stephenson & Green); 1987A from the Open Supernova Catalog.", fr: "Engendré dans le code. Positions de SIMBAD ; 1572 et 1604 réduites par Ruiz-Lapuente (2004, 2017) à partir des estimations de Tycho, de Kepler et des astronomes coréens ; 1006, 1054 et 1181 d'après les chroniques (Stephenson & Green) ; 1987A de l'Open Supernova Catalog." },
          choices: { en: "Each curve says which kind it is, because they differ by two orders of magnitude in quality: 1054 and 1181 are a peak and the day they were last seen, and the decline of 1006 is borrowed from 1572, the same kind of explosion. Dates in the Julian calendar are read as such. V1369 Cen (2013), whose AAVSO record is not reachable by a script and has no published table, is read out of the vector markers of a published figure (Izzo 2017, arXiv:1704.07214), within the part that figure shows.", fr: "Chaque courbe dit de quelle sorte elle est, car leur qualité varie de deux ordres de grandeur : 1054 et 1181 se résument à un pic et au jour où on les a vues pour la dernière fois, et le déclin de 1006 est emprunté à 1572, le même genre d'explosion. Les dates du calendrier julien sont lues comme telles. V1369 Cen (2013), dont le relevé AAVSO n'est pas accessible à un script et dont aucune table n'est publiée, est lue dans les marqueurs vectoriels d'une figure publiée (Izzo 2017, arXiv:1704.07214), dans la partie que cette figure montre." }
        },
        {
          name: "IMO meteor shower list", url: "https://www.imo.net/",
          provides: { en: "Radiant, activity window, peak hourly rate and speed of the annual showers; a sporadic background.", fr: "Radiant, période d'activité, taux horaire au pic et vitesse des pluies annuelles ; un fond sporadique." },
          when: { en: "Table in the code, computed for any date.", fr: "Table dans le code, calculée pour toute date." },
          hosting: { en: "In the code. International Meteor Organization.", fr: "Dans le code. International Meteor Organization." },
          choices: { en: "The hourly rate is a multi-year average, not a forecast for one night: outbursts and storms are not in it.", fr: "Le taux horaire est une moyenne sur plusieurs années, pas une prévision pour une nuit : les sursauts et tempêtes n'y sont pas." }
        },
        {
          name: "Milky Way, zodiacal light, sky brightness", url: "https://ufoathome.org/context/",
          provides: { en: "The glow of the Galaxy and of the zodiacal dust, and the brightness of the sky by twilight and moonlight.", fr: "La lueur de la Galaxie et de la poussière zodiacale, et la brillance du ciel au crépuscule et au clair de lune." },
          when: { en: "Computed in the page, no data fetched.", fr: "Calculé dans la page, aucune donnée chargée." },
          hosting: { en: "Models from the literature: Leinert et al. 1998 and Hong 1985 (zodiacal light), Patat et al. 2006 and Krisciunas & Schaefer 1991 (sky brightness).", fr: "Modèles tirés de la littérature : Leinert et al. 1998 et Hong 1985 (lumière zodiacale), Patat et al. 2006 et Krisciunas & Schaefer 1991 (brillance du ciel)." },
          choices: { en: "No photograph of the Milky Way: a model Galaxy integrated along the line of sight, checked against three measurements rather than fitted to one.", fr: "Aucune photographie de la Voie lactée : une Galaxie modèle intégrée le long de la ligne de visée, confrontée à trois mesures plutôt qu'ajustée sur une seule." }
        }
      ]
    },
    {
      id: "satellites",
      heading: { en: "Satellites", fr: "Satellites" },
      intro: {
        en: "Two levels. For every date since Sputnik, what the Earth's shadow allowed and how many objects were in orbit. From February 2021, which satellites really crossed the sky, where, and how bright.",
        fr: "Deux niveaux. Pour toute date depuis Spoutnik, ce que permettait l'ombre de la Terre et combien d'objets étaient en orbite. Depuis février 2021, quels satellites ont réellement traversé le ciel, où, et avec quelle brillance."
      },
      rows: [
        {
          name: "CelesTrak SATCAT", url: "https://celestrak.org/pub/satcat.csv",
          provides: { en: "Launch and re-entry date of every tracked object: the number in orbit each month, and when each class existed (Echo, Iridium flares, ISS, Starlink).", fr: "Date de lancement et de rentrée de chaque objet suivi : le nombre en orbite chaque mois, et quand chaque classe a existé (Echo, flashs d'Iridium, ISS, Starlink)." },
          when: { en: "Built once (build:satellites); also gives launch dates to the orbital element archive.", fr: "Construit une fois (build:satellites) ; donne aussi les dates de lancement à l'archive d'éléments orbitaux." },
          hosting: { en: "Generated into the code. CC BY 4.0.", fr: "Engendré dans le code. CC BY 4.0." },
          choices: { en: "Only the two date columns are read. Its orbit columns describe each object's LAST state: Echo 1 appears at 400 km when it flew near 1,500. Debris is not counted.", fr: "Seules les deux colonnes de dates sont lues. Ses colonnes d'orbite décrivent le DERNIER état de chaque objet : Echo 1 y figure à 400 km alors qu'il volait vers 1 500. Les débris ne sont pas comptés." }
        },
        {
          name: "Orbital element archive, Laurent Chabin (SCEAU)", url: "https://ufowaves.org/gp/my_tles/",
          provides: { en: "The public element sets saved once or twice a day since 22 February 2021: the naked-eye list, every Starlink, and to January 2025 the full catalogue.", fr: "Les jeux d'éléments publics sauvegardés une ou deux fois par jour depuis le 22 février 2021 : la liste visible à l'œil nu, tous les Starlink, et jusqu'en janvier 2025 le catalogue complet." },
          when: { en: "Reduced once (build:tle). The page fetches only the two weeks around the observation, and only for a date the archive covers; the propagator itself is loaded only then.", fr: "Réduite une fois (build:tle). La page ne charge que les deux semaines autour de l'observation, et seulement pour une date couverte par l'archive ; le propagateur lui-même n'est chargé qu'alors." },
          hosting: { en: "Served from ufoathome.org/tle/, credited in the player's credits.", fr: "Servie depuis ufoathome.org/tle/, créditée dans les crédits du lecteur." },
          choices: { en: "Hosted here because the original server cannot be read from a browser. 2.8 GB of snapshots are kept as 113 MB: every day for naked-eye objects and for Starlinks in their first 60 days (the trains), one set a week otherwise. Debris and objects nobody measured are dropped. A set is never used more than 7 days from its epoch, so a hole in the archive (three months in late 2025) is reported as a hole rather than filled with a stale orbit.", fr: "Hébergée ici parce que le serveur d'origine n'est pas lisible depuis un navigateur. 2,8 Go de relevés sont gardés en 113 Mo : chaque jour pour les objets visibles et les Starlink dans leurs 60 premiers jours (les trains), un jeu par semaine sinon. Les débris et les objets que personne n'a mesurés sont écartés. Un jeu n'est jamais utilisé à plus de 7 jours de son époque : un trou dans l'archive (trois mois fin 2025) est signalé comme un trou plutôt que comblé par une orbite périmée." }
        },
        {
          name: "satellite.js (SGP4)", url: "https://github.com/shashwatak/satellite-js",
          provides: { en: "The standard propagator for these element sets, and the Sun's position; the Earth's umbra and penumbra are computed on top.", fr: "Le propagateur standard de ces éléments, et la position du Soleil ; l'ombre et la pénombre de la Terre sont calculées par-dessus." },
          when: { en: "Loaded on demand, for covered dates only.", fr: "Chargé à la demande, pour les dates couvertes seulement." },
          hosting: { en: "Bundled library, MIT.", fr: "Bibliothèque embarquée, MIT." },
          choices: { en: "Held on the release before the one that ships a WebAssembly build that breaks the bundle, for no gain here.", fr: "Maintenu sur la version qui précède celle qui embarque une version WebAssembly qui casse le bundle, sans gain ici." }
        },
        {
          name: "Satellite brightness: McCants, Stellarium, Mallama et al.", url: "https://www.mmccants.org/programs/qsmag.zip",
          provides: { en: "How bright each object looks: standard magnitudes (McCants, completed by Stellarium's list for recent objects), and published means for the constellations nobody catalogued (Starlink, OneWeb, BlueBird).", fr: "La brillance apparente de chaque objet : magnitudes standard (McCants, complétées par la liste de Stellarium pour les objets récents), et moyennes publiées pour les constellations absentes de ces catalogues (Starlink, OneWeb, BlueBird)." },
          when: { en: "Merged into the archive at build time; applied in the page.", fr: "Fusionnées dans l'archive à la construction ; appliquées dans la page." },
          hosting: { en: "Starlink 5.93 then 7.21 (arXiv:2006.08422, 2101.00374), 4.58 below 357 km while raising orbit (2405.12007); OneWeb 7.18 (2012.05100); BlueBird 3.77 then 4.32 (2608.23668).", fr: "Starlink 5,93 puis 7,21 (arXiv:2006.08422, 2101.00374), 4,58 sous 357 km pendant la montée en orbite (2405.12007) ; OneWeb 7,18 (2012.05100) ; BlueBird 3,77 puis 4,32 (2608.23668)." },
          choices: { en: "Without the orbit-raising value no Starlink train would ever be drawn. An unmeasured rocket stage takes the median of at least three identical measured stages; any other unmeasured object is computed but not drawn. Glints and flares are not modelled: they can only make a satellite brighter.", fr: "Sans la valeur de montée en orbite, aucun train de Starlink ne serait jamais dessiné. Un étage de fusée non mesuré prend la médiane d'au moins trois étages identiques mesurés ; tout autre objet non mesuré est calculé mais pas dessiné. Les reflets et flashs ne sont pas modélisés : ils ne peuvent que rendre un satellite plus brillant." }
        }
      ]
    },
    {
      id: "weather",
      heading: { en: "Weather", fr: "Météo" },
      rows: [
        {
          name: "ERA5 (Copernicus/ECMWF) via Open-Meteo", url: "https://open-meteo.com/en/docs/historical-weather-api",
          provides: { en: "Hourly cloud cover by level, precipitation, snow, weather code, wind, temperature and dew point, at the place and hour of the observation.", fr: "Couverture nuageuse horaire par étage, précipitations, neige, code météo, vent, température et point de rosée, au lieu et à l'heure de l'observation." },
          when: { en: "Fetched by the editor once a date and a place are known, from 1940 only.", fr: "Chargé par l'éditeur dès qu'une date et un lieu sont connus, à partir de 1940 seulement." },
          hosting: { en: "Open-Meteo archive API, keyless. © Copernicus/ECMWF.", fr: "API d'archive Open-Meteo, sans clé. © Copernicus/ECMWF." },
          choices: { en: "A reanalysis on a ~28 km grid, not a station: a local shower can be missing. Cloud bases are derived (temperature and dew point for the low deck), not measured. Every field can be unlocked and replaced by the testimony. No vertical profile is available in archive mode, which is what radar propagation anomalies would need.", fr: "Une réanalyse sur une grille de ~28 km, pas une station : une averse locale peut manquer. Les bases des nuages sont déduites (température et point de rosée pour l'étage bas), pas mesurées. Chaque champ peut être déverrouillé et remplacé par le témoignage. Aucun profil vertical n'est disponible en archive, ce qu'il faudrait pour les anomalies de propagation radar." }
        }
      ]
    },
    {
      id: "ground",
      heading: { en: "The ground", fr: "Le sol" },
      rows: [
        {
          name: "AWS Terrain Tiles (SRTM, ETOPO1)", url: "https://registry.opendata.aws/terrain-tiles/",
          provides: { en: "Relief around the witness.", fr: "Le relief autour du témoin." },
          when: { en: "Fetched when a scene has a real place.", fr: "Chargé quand une scène a un lieu réel." },
          hosting: { en: "Amazon S3, keyless. © AWS Open Data.", fr: "Amazon S3, sans clé. © AWS Open Data." },
          choices: { en: "No key and no rate limit, which an embeddable component needs. The relief model is too coarse for trees and buildings: a picture of the place lined up in the scene is the way to state those.", fr: "Ni clé ni limite de débit, ce qu'exige un composant intégrable. Le modèle de relief est trop grossier pour les arbres et bâtiments : une photo des lieux recalée dans la scène est le moyen de les énoncer." }
        },
        {
          name: "Esri World Imagery", url: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
          provides: { en: "Aerial imagery draped on the relief, and the witness map.", fr: "L'imagerie aérienne posée sur le relief, et la carte du témoin." },
          when: { en: "Fetched with the relief, and when the map is opened.", fr: "Chargée avec le relief, et à l'ouverture de la carte." },
          hosting: { en: "Esri tiles, keyless. © Esri, Maxar, Earthstar Geographics.", fr: "Tuiles Esri, sans clé. © Esri, Maxar, Earthstar Geographics." },
          choices: { en: "Today's photograph of the ground, whatever the year of the account; the scene darkens it to the hour. EOX Sentinel-2 cloudless can be picked instead.", fr: "Une photographie actuelle du sol, quelle que soit l'année du récit ; la scène l'assombrit selon l'heure. EOX Sentinel-2 sans nuages peut être choisi à la place." }
        }
      ]
    },
    {
      id: "place-time",
      heading: { en: "Place and time", fr: "Lieu et heure" },
      rows: [
        {
          name: "Nominatim (OpenStreetMap)", url: "https://nominatim.openstreetmap.org/",
          provides: { en: "Searching a place by name, and naming a point.", fr: "Chercher un lieu par son nom, et nommer un point." },
          when: { en: "Only when the author presses Enter or the search button, never at each keystroke.", fr: "Seulement quand l'auteur valide ou presse le bouton de recherche, jamais à chaque frappe." },
          hosting: { en: "© OpenStreetMap contributors.", fr: "© les contributeurs d'OpenStreetMap." },
          choices: { en: "It knows hamlets, farms, roads and airfields, where accounts happen; its usage policy is why nothing is sent while typing.", fr: "Il connaît hameaux, fermes, routes et aérodromes, là où les récits se passent ; sa politique d'usage explique que rien ne parte pendant la frappe." }
        },
        {
          name: "Open-Meteo time zones and the IANA database", url: "https://open-meteo.com/",
          provides: { en: "The time zone of a place, then its legal offset on the date of the account.", fr: "Le fuseau horaire d'un lieu, puis son décalage légal à la date du récit." },
          when: { en: "Once a place is known; the historical offset comes from the browser.", fr: "Dès qu'un lieu est connu ; le décalage historique vient du navigateur." },
          hosting: { en: "© Open-Meteo; tz database in the browser.", fr: "© Open-Meteo ; base tz du navigateur." },
          choices: { en: "Today's offset is never used for an old date: France was at UTC+1 all year in 1965.", fr: "Le décalage actuel n'est jamais utilisé pour une date ancienne : la France était à UTC+1 toute l'année en 1965." }
        }
      ]
    },
    {
      id: "decor",
      heading: { en: "Decor, pictures and sound", fr: "Décor, photos et son" },
      rows: [
        {
          name: "3D models (Kenney, Poly by Google)", url: "https://ufoathome.org/models/",
          provides: { en: "Cars, houses, trees, street lights, an airliner.", fr: "Voitures, maisons, arbres, lampadaires, un avion de ligne." },
          when: { en: "When a decor object names a model.", fr: "Quand un objet du décor nomme un modèle." },
          hosting: { en: "Re-hosted on ufoathome.org, each with its licence file (CC0, CC BY 3.0).", fr: "Réhébergés sur ufoathome.org, chacun avec son fichier de licence (CC0, CC BY 3.0)." },
          choices: { en: "Hosted here because free kits sit on mirrors of uncertain permanence. A model whose credit is unknown is not drawn; Google Earth models were refused for their licence.", fr: "Hébergés ici parce que les kits libres sont sur des miroirs à la pérennité incertaine. Un modèle au crédit inconnu n'est pas dessiné ; les modèles de Google Earth ont été écartés pour leur licence." }
        },
        {
          name: "Panoramax", url: "https://panoramax.fr/",
          provides: { en: "Street-level photographs and panoramas near the place, each with its position and direction.", fr: "Photos et panoramas au niveau de la rue près du lieu, chacun avec sa position et sa direction." },
          when: { en: "Only when the author searches for pictures in the editor.", fr: "Seulement quand l'auteur cherche des photos dans l'éditeur." },
          hosting: { en: "Panoramax API, credited with each picture's author and licence.", fr: "API Panoramax, créditée avec l'auteur et la licence de chaque photo." },
          choices: { en: "Open and readable from any page. Google Street View was refused: its terms keep the pictures inside Google's viewers.", fr: "Ouverte et lisible depuis toute page. Google Street View a été écarté : ses conditions gardent les photos dans les visionneuses de Google." }
        },
        {
          name: "Weather sounds (OpenGameArt)", url: "https://opengameart.org/",
          provides: { en: "Rain, wind and thunder.", fr: "Pluie, vent et tonnerre." },
          when: { en: "Loaded when the weather of the scene needs them.", fr: "Chargés quand la météo de la scène en a besoin." },
          hosting: { en: "Bundled. Rain and wind CC0; thunder by Jerimee, CC BY 3.0, credited in the player.", fr: "Embarqués. Pluie et vent CC0 ; tonnerre par Jerimee, CC BY 3.0, crédité dans le lecteur." },
          choices: { en: "The phenomenon's own sound is synthesized from its description, not taken from a recording.", fr: "Le son du phénomène lui-même est synthétisé depuis sa description, pas tiré d'un enregistrement." }
        }
      ]
    },
    {
      id: "drafting",
      heading: { en: "Drafting and assessment", fr: "Rédaction et évaluation" },
      rows: [
        {
          name: "Claude (Anthropic)", url: "https://www.anthropic.com/",
          provides: { en: "A first draft of a recording from a written account, each value marked as stated, derived or assumed.", fr: "Un premier jet d'enregistrement à partir d'un récit écrit, chaque valeur marquée comme dite, déduite ou supposée." },
          when: { en: "Only when the author opens the panel and gives their own API key.", fr: "Seulement quand l'auteur ouvre le panneau et fournit sa propre clé d'API." },
          hosting: { en: "Called from the browser with the author's key; nothing passes through ufoathome.org.", fr: "Appelé depuis le navigateur avec la clé de l'auteur ; rien ne passe par ufoathome.org." },
          choices: { en: "No server of ours, so no account and no key held here. The draft is a proposal the author edits, never a result.", fr: "Aucun serveur de notre côté, donc ni compte ni clé conservés ici. Le jet est une proposition que l'auteur corrige, jamais un résultat." }
        },
        {
          name: "Hynek classification", url: "https://rr0.org/science/crypto/ufo/observation/classification/hynek/",
          provides: { en: "The close-encounter category a recording supports, beside the tool's own coverage questions.", fr: "La catégorie de rencontre rapprochée qu'un enregistrement soutient, à côté des questions de couverture propres à l'outil." },
          when: { en: "Computed in the page.", fr: "Calculé dans la page." },
          hosting: { en: "After J. Allen Hynek.", fr: "D'après J. Allen Hynek." },
          choices: { en: "Categories the format cannot state (a physical trace, a radar return) are marked unsupported rather than guessed; tags are not taken as evidence.", fr: "Les catégories que le format ne peut pas énoncer (trace physique, écho radar) sont marquées non prises en charge plutôt que devinées ; les étiquettes ne valent pas preuve." }
        }
      ]
    }
  ]

  render(language: SiteLanguage): string {
    const fr = language === "fr"
    const columns = fr
      ? ["Source", "Ce qu'elle fournit", "Quand elle est lue", "Hébergement et crédit", "Choix et limites"]
      : ["Source", "What it provides", "When it is read", "Hosting and credit", "Choices and limits"]
    const toc = this.groups.map(group => `<a href="#${group.id}">${group.heading[language]}</a>`).join(" · ")
    const sections = this.groups.map(group => {
      const rows = group.rows.map(row => `      <tr>
        <td><a href="${row.url}">${this.escape(row.name)}</a></td>
        <td>${this.escape(row.provides[language])}</td>
        <td>${this.escape(row.when[language])}</td>
        <td>${this.escape(row.hosting[language])}</td>
        <td>${this.escape(row.choices[language])}</td>
      </tr>`).join("\n")
      return `
    <h2 id="${group.id}">${group.heading[language]}</h2>
    ${group.intro ? `<p>${this.escape(group.intro[language])}</p>` : ""}
    <div class="table-scroll">
    <table>
      <tr>${columns.map(column => `<th>${column}</th>`).join("")}</tr>
${rows}
    </table>
    </div>`
    }).join("\n")
    return `${this.hero(language, this.meta.title, this.lede)}

<section class="band">
  <div class="wrap prose-wide">
    <h2>${fr ? "Les principes" : "The principles"}</h2>
    <ul>
${this.principles[language].map(principle => `      <li>${principle}</li>`).join("\n")}
    </ul>
    <p>${toc}</p>
${sections}
    <p>${fr
      ? "Le détail de chaque choix, avec les mesures qui l'ont décidé, est dans le <a href=\"https://github.com/RR0/UfoAtHome#readme\">README</a> et dans les commentaires du code de chaque source."
      : "The detail of each choice, with the measurements that settled it, is in the <a href=\"https://github.com/RR0/UfoAtHome#readme\">README</a> and in the code comments of each source."}</p>
  </div>
</section>
`
  }

  private escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}
