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
    navLabel: { en: "Sources and choices", fr: "Sources et choix", es: "Fuentes y decisiones", it: "Fonti e scelte" },
    title: { en: "Data sources and the choices behind them", fr: "Les sources de données et les choix faits", es: "Las fuentes de datos y las decisiones tomadas", it: "Le fonti dei dati e le scelte fatte" },
    description: {
      en: "Every catalogue, service and measurement UFO@home uses: what it provides, when it is read, "
        + "where it is served from, its credit, and why it was chosen over the alternatives.",
      fr: "Chaque catalogue, service et mesure qu'utilise UFO@home : ce qu'il fournit, quand il est "
        + "lu, d'où il est servi, son crédit, et pourquoi il a été préféré aux autres.",
      es: "Cada catálogo, servicio y medición que usa UFO@home: lo que proporciona, cuándo se lee, "
        + "desde dónde se sirve, su crédito, y por qué se eligió frente a las alternativas.",
      it: "Ogni catalogo, servizio e misura che UFO@home usa: cosa fornisce, quando viene letto, "
        + "da dove è servito, il suo credito, e perché è stato scelto rispetto alle alternative."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Nothing the tool draws is invented. Each value comes from a named source, read at a stated "
      + "moment, and where no record exists the interface says so instead of filling the gap.",
    fr: "Rien de ce que l'outil dessine n'est inventé. Chaque valeur vient d'une source nommée, lue à "
      + "un moment dit, et là où aucun relevé n'existe l'interface le dit au lieu de combler le vide.",
    es: "Nada de lo que dibuja la herramienta es inventado. Cada valor procede de una fuente con nombre, leída en un "
      + "momento declarado, y donde no existe ningún registro la interfaz lo dice en lugar de rellenar el hueco.",
    it: "Nulla di ciò che lo strumento disegna è inventato. Ogni valore viene da una fonte nominata, letta in un "
      + "momento dichiarato, e dove non esiste alcun dato l'interfaccia lo dice invece di colmare il vuoto."
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
    ],
    es: [
      "<strong>Una fuente solo se lee cuando se necesita.</strong> Los catálogos se construyen una vez en el "
        + "repositorio; los servicios solo se llaman para una grabación que los necesita (un lugar, una fecha dentro "
        + "de su periodo, un botón pulsado), y nunca para una fecha anterior al inicio de su registro.",
      "<strong>Lo que puede desaparecer se aloja aquí.</strong> Los datos que un tercero podría retirar o "
        + "que no pueden leerse desde un navegador (elementos orbitales, modelos 3D) se copian, se reducen y se sirven "
        + "desde ufoathome.org con su crédito, para que cualquier página que integre una escena los obtenga.",
      "<strong>Lo medido gana a lo modelado, y lo modelado gana a lo supuesto.</strong> Un brillo es una "
        + "observación publicada cuando existe; una fórmula solo completa lo que nadie midió, y "
        + "un objeto sin ninguna de las dos se calcula pero no se dibuja.",
      "<strong>Cada servicio es intercambiable.</strong> Meteorología, relieve, imágenes, lugar, zona horaria, "
        + "modelos y redacción pasan por un mismo registro: la fuente es una elección visible, con su "
        + "crédito al lado, y se puede añadir una segunda sin tocar el resto.",
      "<strong>Los límites se declaran.</strong> Cada fuente de abajo dice dónde se detiene: antes de 1940 "
        + "para la meteorología, antes de 1957 para los satélites, antes de febrero de 2021 para los pasos individuales."
    ],
    it: [
      "<strong>Una fonte è letta solo quando serve.</strong> I cataloghi sono costruiti una volta nel "
        + "repository; i servizi sono chiamati solo per una registrazione che ne ha bisogno (un luogo, una data nel "
        + "loro intervallo, un pulsante premuto), e mai per una data anteriore all'inizio del loro archivio.",
      "<strong>Ciò che può scomparire è ospitato qui.</strong> I dati che una terza parte potrebbe ritirare o "
        + "che non possono essere letti da un browser (elementi orbitali, modelli 3D) sono copiati, ridotti e serviti "
        + "da ufoathome.org con il loro credito, così che ogni pagina che incorpora una scena li ottenga.",
      "<strong>Il misurato batte il modellato, e il modellato batte il supposto.</strong> Una luminosità è "
        + "un'osservazione pubblicata dove ne esiste una; una formula completa solo ciò che nessuno ha misurato, e "
        + "un oggetto senza né l'una né l'altra è calcolato ma non disegnato.",
      "<strong>Ogni servizio è sostituibile.</strong> Meteo, rilievo, immagini, luogo, fuso orario, "
        + "modelli e redazione passano per uno stesso registro: la fonte è una scelta visibile, con il suo "
        + "credito accanto, e se ne può aggiungere una seconda senza toccare il resto.",
      "<strong>I limiti sono dichiarati.</strong> Ogni fonte qui sotto dice dove si ferma: prima del 1940 "
        + "per il meteo, prima del 1957 per i satelliti, prima del febbraio 2021 per i singoli passaggi."
    ]
  }

  private readonly groups: SourceGroup[] = [
    {
      id: "sky",
      heading: { en: "The sky", fr: "Le ciel", es: "El cielo", it: "Il cielo" },
      rows: [
        {
          name: "astronomy-engine", url: "https://github.com/cosinekitty/astronomy",
          provides: { en: "Positions and magnitudes of the Sun, Moon and planets; the Moon's phase; sky coordinates.", fr: "Positions et magnitudes du Soleil, de la Lune et des planètes ; phase de la Lune ; coordonnées célestes.", es: "Posiciones y magnitudes del Sol, la Luna y los planetas; la fase de la Luna; coordenadas celestes.", it: "Posizioni e magnitudini del Sole, della Luna e dei pianeti; la fase della Luna; coordinate celesti." },
          when: { en: "In the page, for every recording with a date.", fr: "Dans la page, pour tout enregistrement daté.", es: "En la página, para toda grabación con fecha.", it: "Nella pagina, per ogni registrazione datata." },
          hosting: { en: "Bundled library, MIT.", fr: "Bibliothèque embarquée, MIT.", es: "Biblioteca incluida, MIT.", it: "Libreria inclusa, MIT." },
          choices: { en: "A full ephemeris rather than approximate formulas: the reason to reconstruct a sky is to be right about it. Its precession also carries the year-2000 catalogues (stars, the Galaxy, meteor radiants, novae) to the date observed.", fr: "Une éphéméride complète plutôt que des formules approchées : reconstituer un ciel n'a d'intérêt que s'il est juste. Sa précession ramène aussi les catalogues de l'an 2000 (étoiles, Galaxie, radiants de météores, novae) à la date observée.", es: "Unas efemérides completas en lugar de fórmulas aproximadas: reconstruir un cielo solo tiene sentido si es correcto. Su precesión también lleva los catálogos del año 2000 (estrellas, la Galaxia, radiantes de meteoros, novas) a la fecha observada.", it: "Effemeridi complete anziché formule approssimate: ricostruire un cielo ha senso solo se è giusto. La sua precessione porta anche i cataloghi dell'anno 2000 (stelle, la Galassia, radianti delle meteore, novae) alla data osservata." }
        },
        {
          name: "HYG Database", url: "https://github.com/astronexus/HYG-Database",
          provides: { en: "Star positions, magnitudes and colours; names of stars down to magnitude 3.", fr: "Positions, magnitudes et couleurs des étoiles ; noms des étoiles jusqu'à la magnitude 3.", es: "Posiciones, magnitudes y colores de las estrellas; nombres de las estrellas hasta la magnitud 3.", it: "Posizioni, magnitudini e colori delle stelle; nomi delle stelle fino alla magnitudine 3." },
          when: { en: "Built once (build:stars). The page loads stars to magnitude 7.5, and to 9 only for an instrument that reaches that deep.", fr: "Construit une fois (build:stars). La page charge les étoiles jusqu'à la magnitude 7,5, et jusqu'à 9 seulement pour un instrument qui va aussi loin.", es: "Construido una vez (build:stars). La página carga las estrellas hasta la magnitud 7,5, y hasta 9 solo para un instrumento que llega tan lejos.", it: "Costruito una volta (build:stars). La pagina carica le stelle fino alla magnitudine 7,5, e fino a 9 solo per uno strumento che arriva così in profondità." },
          hosting: { en: "Served with the scene bundle. CC BY-SA.", fr: "Servi avec le bundle de la scène. CC BY-SA.", es: "Servido con el bundle de la escena. CC BY-SA.", it: "Servito con il bundle della scena. CC BY-SA." },
          choices: { en: "Cut at 9 because the catalogue itself thins out beyond: star counts stop growing as they should.", fr: "Coupé à 9 parce que le catalogue lui-même s'éclaircit au-delà : les comptes d'étoiles cessent de croître comme ils le devraient.", es: "Cortado en 9 porque el propio catálogo se vuelve incompleto más allá: los recuentos de estrellas dejan de crecer como deberían.", it: "Tagliato a 9 perché oltre il catalogo stesso si dirada: i conteggi di stelle smettono di crescere come dovrebbero." }
        },
        {
          name: "JPL Horizons", url: "https://ssd.jpl.nasa.gov/horizons/",
          provides: { en: "The orbit of each naked-eye comet since 1910, as it was at that apparition's perihelion.", fr: "L'orbite de chaque comète visible à l'œil nu depuis 1910, telle qu'elle était au périhélie de cette apparition.", es: "La órbita de cada cometa visible a simple vista desde 1910, tal como era en el perihelio de esa aparición.", it: "L'orbita di ogni cometa visibile a occhio nudo dal 1910, com'era al perielio di quel passaggio." },
          when: { en: "Built once (build:comets); the page propagates the orbit itself, no request.", fr: "Construit une fois (build:comets) ; la page propage l'orbite elle-même, sans requête.", es: "Construido una vez (build:comets); la página propaga la órbita por sí misma, sin petición.", it: "Costruito una volta (build:comets); la pagina propaga l'orbita da sé, senza richieste." },
          hosting: { en: "Generated into the code. NASA/JPL.", fr: "Engendré dans le code. NASA/JPL.", es: "Generado en el código. NASA/JPL.", it: "Generato nel codice. NASA/JPL." },
          choices: { en: "Brightness is NOT taken from JPL: its magnitude parameters put NEOWISE 4 magnitudes too faint. Peak magnitudes observed at the time are entered by hand, with their dates. A tail is drawn only where its length was recorded.", fr: "La brillance n'est PAS prise chez JPL : ses paramètres de magnitude rendent NEOWISE 4 magnitudes trop faible. Les magnitudes au pic observées à l'époque sont saisies à la main, avec leur date. Une queue n'est dessinée que si sa longueur a été relevée.", es: "El brillo NO se toma de JPL: sus parámetros de magnitud dejan a NEOWISE 4 magnitudes demasiado débil. Las magnitudes máximas observadas en su momento se introducen a mano, con sus fechas. Solo se dibuja una cola cuando se registró su longitud.", it: "La luminosità NON è presa dal JPL: i suoi parametri di magnitudine rendono NEOWISE 4 magnitudini troppo debole. Le magnitudini di picco osservate all'epoca sono inserite a mano, con le loro date. Una coda è disegnata solo dove ne è stata registrata la lunghezza." }
        },
        {
          name: "AAVSO, via Strope, Schaefer & Henden 2010", url: "https://cdsarc.cds.unistra.fr/ftp/J/AJ/140/34/",
          provides: { en: "The measured light curve of every nova since 1891 that reached magnitude 5, binned from the AAVSO's observations.", fr: "La courbe de lumière mesurée de chaque nova depuis 1891 ayant atteint la magnitude 5, regroupée à partir des observations de l'AAVSO.", es: "La curva de luz medida de cada nova desde 1891 que alcanzó la magnitud 5, agrupada a partir de las observaciones de la AAVSO.", it: "La curva di luce misurata di ogni nova dal 1891 che abbia raggiunto la magnitudine 5, raggruppata a partire dalle osservazioni dell'AAVSO." },
          when: { en: "Built once (build:novae) with the supernovae below; the page interpolates the curve, no request.", fr: "Construit une fois (build:novae) avec les supernovae ci-dessous ; la page interpole la courbe, sans requête.", es: "Construido una vez (build:novae) con las supernovas de abajo; la página interpola la curva, sin petición.", it: "Costruito una volta (build:novae) con le supernovae qui sotto; la pagina interpola la curva, senza richieste." },
          hosting: { en: "Generated into the code. VizieR catalogue J/AJ/140/34.", fr: "Engendré dans le code. Catalogue VizieR J/AJ/140/34.", es: "Generado en el código. Catálogo VizieR J/AJ/140/34.", it: "Generato nel codice. Catalogo VizieR J/AJ/140/34." },
          choices: { en: "A recorded curve rather than a decline formula: the standard laws miss most real novae, and would draw DQ Herculis bright for a year through the weeks dust had dimmed it ten magnitudes. Nothing is drawn before the first observation or after the last. RS Oph 2021 and T CrB 1866 reuse the curve of their own previous eruption, shifted onto their recorded peak.", fr: "Une courbe relevée plutôt qu'une formule de déclin : les lois usuelles ratent la plupart des vraies novae, et dessineraient DQ Herculis brillante pendant un an alors que la poussière l'avait éteinte de dix magnitudes en quelques semaines. Rien n'est dessiné avant la première observation ni après la dernière. RS Oph 2021 et T CrB 1866 reprennent la courbe de leur éruption précédente, recalée sur leur pic relevé.", es: "Una curva registrada en lugar de una fórmula de declive: las leyes habituales fallan con la mayoría de las novas reales, y dibujarían DQ Herculis brillante durante un año cuando el polvo la había atenuado diez magnitudes en pocas semanas. No se dibuja nada antes de la primera observación ni después de la última. RS Oph 2021 y T CrB 1866 reutilizan la curva de su propia erupción anterior, desplazada sobre su máximo registrado.", it: "Una curva registrata anziché una formula di declino: le leggi usuali mancano la maggior parte delle novae reali, e disegnerebbero DQ Herculis brillante per un anno mentre la polvere l'aveva attenuata di dieci magnitudini in poche settimane. Nulla è disegnato prima della prima osservazione né dopo l'ultima. RS Oph 2021 e T CrB 1866 riprendono la curva della loro eruzione precedente, spostata sul loro picco registrato." }
        },
        {
          name: "Historical supernovae", url: "https://arxiv.org/abs/1612.07399",
          provides: { en: "The supernovae of 1006, 1054, 1181, 1572, 1604 and 1987A: where they stood, and how bright on each night.", fr: "Les supernovae de 1006, 1054, 1181, 1572, 1604 et 1987A : où elles se tenaient, et quel était leur éclat chaque nuit.", es: "Las supernovas de 1006, 1054, 1181, 1572, 1604 y 1987A: dónde estaban y qué brillo tenían cada noche.", it: "Le supernovae del 1006, 1054, 1181, 1572, 1604 e 1987A: dove si trovavano, e quanto erano luminose ogni notte." },
          when: { en: "Built once (build:novae).", fr: "Construit une fois (build:novae).", es: "Construido una vez (build:novae).", it: "Costruito una volta (build:novae)." },
          hosting: { en: "Generated into the code. Positions from SIMBAD; 1572 and 1604 reduced by Ruiz-Lapuente (2004, 2017) from Tycho's, Kepler's and the Korean astronomers' own estimates; 1006, 1054 and 1181 from the chronicles (Stephenson & Green); 1987A from the Open Supernova Catalog.", fr: "Engendré dans le code. Positions de SIMBAD ; 1572 et 1604 réduites par Ruiz-Lapuente (2004, 2017) à partir des estimations de Tycho, de Kepler et des astronomes coréens ; 1006, 1054 et 1181 d'après les chroniques (Stephenson & Green) ; 1987A de l'Open Supernova Catalog.", es: "Generado en el código. Posiciones de SIMBAD; 1572 y 1604 reducidas por Ruiz-Lapuente (2004, 2017) a partir de las estimaciones de Tycho, de Kepler y de los astrónomos coreanos; 1006, 1054 y 1181 según las crónicas (Stephenson & Green); 1987A del Open Supernova Catalog.", it: "Generato nel codice. Posizioni da SIMBAD; 1572 e 1604 ridotte da Ruiz-Lapuente (2004, 2017) a partire dalle stime di Tycho, di Keplero e degli astronomi coreani; 1006, 1054 e 1181 dalle cronache (Stephenson & Green); 1987A dall'Open Supernova Catalog." },
          choices: { en: "Each curve says which kind it is, because they differ by two orders of magnitude in quality: 1054 and 1181 are a peak and the day they were last seen, and the decline of 1006 is borrowed from 1572, the same kind of explosion. Dates in the Julian calendar are read as such. V1369 Cen (2013), whose AAVSO record is not reachable by a script and has no published table, is read out of the vector markers of a published figure (Izzo 2017, arXiv:1704.07214), within the part that figure shows.", fr: "Chaque courbe dit de quelle sorte elle est, car leur qualité varie de deux ordres de grandeur : 1054 et 1181 se résument à un pic et au jour où on les a vues pour la dernière fois, et le déclin de 1006 est emprunté à 1572, le même genre d'explosion. Les dates du calendrier julien sont lues comme telles. V1369 Cen (2013), dont le relevé AAVSO n'est pas accessible à un script et dont aucune table n'est publiée, est lue dans les marqueurs vectoriels d'une figure publiée (Izzo 2017, arXiv:1704.07214), dans la partie que cette figure montre.", es: "Cada curva dice de qué tipo es, porque su calidad difiere en dos órdenes de magnitud: de 1054 y 1181 solo hay un máximo y el día en que se vieron por última vez, y el declive de 1006 se toma prestado de 1572, el mismo tipo de explosión. Las fechas del calendario juliano se leen como tales. V1369 Cen (2013), cuyo registro AAVSO no es accesible para un script y del que no se ha publicado ninguna tabla, se lee en los marcadores vectoriales de una figura publicada (Izzo 2017, arXiv:1704.07214), dentro de la parte que muestra esa figura.", it: "Ogni curva dice di che tipo è, perché la loro qualità varia di due ordini di grandezza: di 1054 e 1181 si hanno solo un picco e il giorno in cui furono viste per l'ultima volta, e il declino del 1006 è preso in prestito dal 1572, lo stesso tipo di esplosione. Le date del calendario giuliano sono lette come tali. V1369 Cen (2013), il cui archivio AAVSO non è raggiungibile da uno script e di cui non è pubblicata alcuna tabella, è letta dai marcatori vettoriali di una figura pubblicata (Izzo 2017, arXiv:1704.07214), entro la parte che quella figura mostra." }
        },
        {
          name: "IMO meteor shower list", url: "https://www.imo.net/",
          provides: { en: "Radiant, activity window, peak hourly rate and speed of the annual showers; a sporadic background.", fr: "Radiant, période d'activité, taux horaire au pic et vitesse des pluies annuelles ; un fond sporadique.", es: "Radiante, periodo de actividad, tasa horaria en el máximo y velocidad de las lluvias anuales; un fondo esporádico.", it: "Radiante, periodo di attività, tasso orario al picco e velocità degli sciami annuali; un fondo sporadico." },
          when: { en: "Table in the code, computed for any date.", fr: "Table dans le code, calculée pour toute date.", es: "Tabla en el código, calculada para cualquier fecha.", it: "Tabella nel codice, calcolata per qualsiasi data." },
          hosting: { en: "In the code. International Meteor Organization.", fr: "Dans le code. International Meteor Organization.", es: "En el código. International Meteor Organization.", it: "Nel codice. International Meteor Organization." },
          choices: { en: "The hourly rate is a multi-year average, not a forecast for one night: outbursts and storms are not in it.", fr: "Le taux horaire est une moyenne sur plusieurs années, pas une prévision pour une nuit : les sursauts et tempêtes n'y sont pas.", es: "La tasa horaria es una media de varios años, no una previsión para una noche: los estallidos y tormentas no están incluidos.", it: "Il tasso orario è una media su più anni, non una previsione per una notte: esplosioni e tempeste non vi sono comprese." }
        },
        {
          name: "Global Meteor Network, trajectories", url: "https://globalmeteornetwork.org/data/",
          provides: { en: "The fireballs its cameras triangulated since December 2018: where each began and ended, at what height, for how long, and how bright at its peak.", fr: "Les bolides que ses caméras ont triangulés depuis décembre 2018 : où chacun a commencé et fini, à quelle hauteur, combien de temps, et quel éclat au plus fort.", es: "Los bólidos que sus cámaras triangularon desde diciembre de 2018: dónde empezó y terminó cada uno, a qué altura, cuánto duró y con qué brillo en su máximo.", it: "I bolidi che le sue telecamere hanno triangolato dal dicembre 2018: dove ciascuno è iniziato e finito, a quale quota, per quanto tempo e quanto luminoso al massimo." },
          when: { en: "Reduced once (build:fireballs). A scene fetches the month of its recording only, and nothing for an earlier date.", fr: "Réduite une fois (build:fireballs). Une scène ne charge que le mois de son enregistrement, et rien pour une date antérieure.", es: "Reducido una vez (build:fireballs). Una escena solo descarga el mes de su grabación, y nada para una fecha anterior.", it: "Ridotto una volta (build:fireballs). Una scena scarica solo il mese della sua registrazione, e nulla per una data precedente." },
          hosting: { en: "Served from ufoathome.org/fireballs/, credited in the player's credits. CC BY 4.0.", fr: "Servie depuis ufoathome.org/fireballs/, créditée dans les crédits du lecteur. CC BY 4.0.", es: "Servido desde ufoathome.org/fireballs/, acreditado en los créditos del reproductor. CC BY 4.0.", it: "Servito da ufoathome.org/fireballs/, citato nei crediti del lettore. CC BY 4.0." },
          choices: { en: "Of three and a half million meteors, only absolute magnitude -3 and brighter are kept: the fainter are the sporadic background the scene computes. Brighter than -9 is dropped: past -8 the counts stop falling as meteors do and level into a tail reaching -45, the photometry of a saturated camera. One event solved twice is kept once. The brightness drawn is the peak all along the path, eased in and out, since the record gives the peak and not the light curve. FRIPON's detections are archived too but not used: its site asks to be contacted for any use.", fr: "Sur trois millions et demi de météores, seuls ceux de magnitude absolue -3 ou plus brillants sont gardés : les plus faibles sont le fond sporadique que la scène calcule. Au-delà de -9 ils sont écartés : passé -8, leur nombre cesse de baisser comme celui des météores et forme une traîne jusqu'à -45, la photométrie d'une caméra saturée. Un même événement résolu deux fois n'est gardé qu'une fois. L'éclat dessiné est celui du pic tout le long du chemin, adouci aux deux bouts, puisque le registre donne le pic et non la courbe de lumière. Les détections de FRIPON sont archivées aussi mais pas utilisées : son site demande d'être contacté pour tout usage.", es: "De tres millones y medio de meteoros, solo se conservan los de magnitud absoluta -3 o más brillantes: los más débiles son el fondo esporádico que calcula la escena. Más brillantes que -9 se descartan: pasado -8 su número deja de bajar como el de los meteoros y forma una cola hasta -45, la fotometría de una cámara saturada. Un mismo suceso resuelto dos veces se conserva una vez. El brillo dibujado es el del máximo a lo largo de todo el camino, suavizado en los extremos, ya que el registro da el máximo y no la curva de luz. Las detecciones de FRIPON también están archivadas pero no se usan: su sitio pide que se le contacte para cualquier uso.", it: "Su tre milioni e mezzo di meteore, si conservano solo quelle di magnitudine assoluta -3 o più luminose: le più deboli sono il fondo sporadico che la scena calcola. Più luminose di -9 vengono scartate: oltre -8 il loro numero smette di calare come quello delle meteore e forma una coda fino a -45, la fotometria di una telecamera saturata. Uno stesso evento risolto due volte è conservato una sola volta. La luminosità disegnata è quella del picco lungo tutto il percorso, addolcita alle estremità, poiché il registro dà il picco e non la curva di luce. Anche le rilevazioni di FRIPON sono archiviate ma non usate: il suo sito chiede di essere contattato per qualsiasi uso." }
        },
        {
          name: "Milky Way, zodiacal light, sky brightness", url: "https://ufoathome.org/context/",
          provides: { en: "The glow of the Galaxy and of the zodiacal dust, and the brightness of the sky by twilight and moonlight.", fr: "La lueur de la Galaxie et de la poussière zodiacale, et la brillance du ciel au crépuscule et au clair de lune.", es: "El resplandor de la Galaxia y del polvo zodiacal, y el brillo del cielo en el crepúsculo y a la luz de la Luna.", it: "Il bagliore della Galassia e della polvere zodiacale, e la luminosità del cielo al crepuscolo e al chiaro di luna." },
          when: { en: "Computed in the page, no data fetched.", fr: "Calculé dans la page, aucune donnée chargée.", es: "Calculado en la página, sin descargar datos.", it: "Calcolato nella pagina, nessun dato scaricato." },
          hosting: { en: "Models from the literature: Leinert et al. 1998 and Hong 1985 (zodiacal light), Patat et al. 2006 and Krisciunas & Schaefer 1991 (sky brightness against which the glows are judged; the light of the sky itself is under the air).", fr: "Modèles tirés de la littérature : Leinert et al. 1998 et Hong 1985 (lumière zodiacale), Patat et al. 2006 et Krisciunas & Schaefer 1991 (brillance du ciel à laquelle les lueurs sont comparées ; la lumière du ciel lui-même est sous l'air).", es: "Modelos de la literatura: Leinert et al. 1998 y Hong 1985 (luz zodiacal), Patat et al. 2006 y Krisciunas & Schaefer 1991 (brillo del cielo con el que se comparan los resplandores; la luz del propio cielo está en el apartado del aire).", it: "Modelli dalla letteratura: Leinert et al. 1998 e Hong 1985 (luce zodiacale), Patat et al. 2006 e Krisciunas & Schaefer 1991 (luminosità del cielo con cui si confrontano i bagliori; la luce del cielo stesso è sotto l'aria)." },
          choices: { en: "No photograph of the Milky Way: a model Galaxy integrated along the line of sight, checked against three measurements rather than fitted to one.", fr: "Aucune photographie de la Voie lactée : une Galaxie modèle intégrée le long de la ligne de visée, confrontée à trois mesures plutôt qu'ajustée sur une seule.", es: "Ninguna fotografía de la Vía Láctea: una Galaxia modelo integrada a lo largo de la línea de visión, contrastada con tres mediciones en lugar de ajustada a una sola.", it: "Nessuna fotografia della Via Lattea: una Galassia modello integrata lungo la linea di vista, confrontata con tre misure anziché adattata a una sola." }
        }
      ]
    },
    {
      id: "air",
      heading: { en: "The air", fr: "L'air", es: "El aire", it: "L'aria" },
      intro: {
        en: "The light of the sky is computed, not drawn: sunlight and moonlight traced through a spherical atmosphere of air, haze and ozone at fifteen wavelengths, then shown as an adapted eye or a camera would. Every input below is a published measurement or model; the two display anchors are the only choices.",
        fr: "La lumière du ciel est calculée, pas dessinée : lumière du Soleil et de la Lune suivie à travers une atmosphère sphérique d'air, de brume et d'ozone à quinze longueurs d'onde, puis montrée comme la verrait un œil adapté ou un appareil photo. Chaque entrée ci-dessous est une mesure ou un modèle publié ; les deux ancres d'affichage sont les seuls choix.",
        es: "La luz del cielo se calcula, no se dibuja: la luz del Sol y de la Luna se sigue a través de una atmósfera esférica de aire, bruma y ozono en quince longitudes de onda, y luego se muestra como la vería un ojo adaptado o una cámara. Cada dato de entrada de abajo es una medición o un modelo publicado; los dos anclajes de visualización son las únicas decisiones.",
        it: "La luce del cielo è calcolata, non disegnata: la luce del Sole e della Luna è seguita attraverso un'atmosfera sferica di aria, foschia e ozono a quindici lunghezze d'onda, poi mostrata come la vedrebbe un occhio adattato o una fotocamera. Ogni dato in ingresso qui sotto è una misura o un modello pubblicato; i due ancoraggi di visualizzazione sono le sole scelte."
      },
      rows: [
        {
          name: "Hillaire 2020; Bruneton & Neyret 2008", url: "https://sebh.github.io/publications/egsr2020.pdf",
          provides: { en: "The method: single scattering along each line of sight, and every higher order folded into a table of the light arriving at each height for each height of the Sun.", fr: "La méthode : diffusion simple le long de chaque ligne de visée, et tous les ordres supérieurs réunis dans une table de la lumière qui arrive à chaque altitude pour chaque hauteur du Soleil.", es: "El método: dispersión simple a lo largo de cada línea de visión, y todos los órdenes superiores reunidos en una tabla de la luz que llega a cada altura para cada altura del Sol.", it: "Il metodo: diffusione singola lungo ogni linea di vista, e tutti gli ordini superiori raccolti in una tabella della luce che arriva a ogni quota per ogni altezza del Sole." },
          when: { en: "Tables built on the graphics card once per page and per haze level (about a second of GPU, shared by every scene of the page); the sky view redrawn when the Sun, the Moon or the observer move.", fr: "Tables construites sur la carte graphique une fois par page et par niveau de brume (environ une seconde de GPU, partagée par toutes les scènes de la page) ; la vue du ciel redessinée quand le Soleil, la Lune ou l'observateur bougent.", es: "Tablas construidas en la tarjeta gráfica una vez por página y por nivel de bruma (alrededor de un segundo de GPU, compartido por todas las escenas de la página); la vista del cielo se redibuja cuando se mueven el Sol, la Luna o el observador.", it: "Tabelle costruite sulla scheda grafica una volta per pagina e per livello di foschia (circa un secondo di GPU, condiviso da tutte le scene della pagina); la vista del cielo è ridisegnata quando il Sole, la Luna o l'osservatore si muovono." },
          hosting: { en: "Implemented in the code, twice: a reference in TypeScript and its GPU twin.", fr: "Implémenté dans le code, deux fois : une référence en TypeScript et son jumeau GPU.", es: "Implementado en el código, dos veces: una referencia en TypeScript y su gemelo en GPU.", it: "Implementato nel codice, due volte: un riferimento in TypeScript e il suo gemello su GPU." },
          choices: { en: "Chosen for being fast enough for a web page. Checked against a Monte Carlo trace of the same atmosphere: within 0.25 magnitude and 0.012 in colour from a hazy noon to a Sun at -16°, except the Earth's shadow in nautical twilight, 0.7 magnitude too dark. The table resolution was measured, not picked: coarser tables put a -10° zenith more than half a magnitude off.", fr: "Choisie parce qu'assez rapide pour une page web. Confrontée à un calcul de Monte Carlo de la même atmosphère : à 0,25 magnitude et 0,012 de couleur près d'un midi brumeux à un Soleil à -16°, sauf l'ombre de la Terre au crépuscule nautique, trop sombre de 0,7 magnitude. La résolution des tables a été mesurée, pas choisie : des tables plus grossières faussaient un zénith à -10° de plus d'une demi-magnitude.", es: "Elegido por ser lo bastante rápido para una página web. Contrastado con un cálculo de Monte Carlo de la misma atmósfera: dentro de 0,25 magnitudes y 0,012 de color desde un mediodía brumoso hasta un Sol a -16°, salvo la sombra de la Tierra en el crepúsculo náutico, 0,7 magnitudes demasiado oscura. La resolución de las tablas se midió, no se eligió: tablas más gruesas desviaban un cenit a -10° en más de media magnitud.", it: "Scelto perché abbastanza veloce per una pagina web. Confrontato con un calcolo Monte Carlo della stessa atmosfera: entro 0,25 magnitudini e 0,012 di colore da un mezzogiorno nebbioso a un Sole a -16°, tranne l'ombra della Terra nel crepuscolo nautico, troppo scura di 0,7 magnitudini. La risoluzione delle tabelle è stata misurata, non scelta: tabelle più grossolane sbagliavano uno zenit a -10° di oltre mezza magnitudine." }
        },
        {
          name: "Bodhaine et al. 1999", url: "https://journals.ametsoc.org/view/journals/atot/16/11/1520-0426_1999_016_1854_orodc_2_0_co_2.xml",
          provides: { en: "How strongly air scatters light at each wavelength.", fr: "La force avec laquelle l'air diffuse la lumière à chaque longueur d'onde.", es: "Con qué intensidad dispersa el aire la luz en cada longitud de onda.", it: "Quanto fortemente l'aria diffonde la luce a ogni lunghezza d'onda." },
          when: { en: "Computed in the page.", fr: "Calculé dans la page.", es: "Calculado en la página.", it: "Calcolato nella pagina." },
          hosting: { en: "Formula from the paper.", fr: "Formule tirée de l'article.", es: "Fórmula del artículo.", it: "Formula dall'articolo." },
          choices: { en: "Derived from the refractive index of air, measured to many figures: nothing to adjust.", fr: "Déduite de l'indice de réfraction de l'air, mesuré avec de nombreux chiffres : rien à ajuster.", es: "Derivado del índice de refracción del aire, medido con muchas cifras: nada que ajustar.", it: "Derivato dall'indice di rifrazione dell'aria, misurato con molte cifre: niente da regolare." }
        },
        {
          name: "Serdyuchenko-Gorshelev ozone cross-sections", url: "https://zenodo.org/records/5793207",
          provides: { en: "Ozone's absorption across the visible (the Chappuis band), which makes a twilight zenith blue.", fr: "L'absorption de l'ozone dans le visible (la bande de Chappuis), qui rend bleu un zénith crépusculaire.", es: "La absorción del ozono en el visible (la banda de Chappuis), que hace azul un cenit crepuscular.", it: "L'assorbimento dell'ozono nel visibile (la banda di Chappuis), che rende blu uno zenit crepuscolare." },
          when: { en: "Averaged once into the code.", fr: "Moyennées une fois dans le code.", es: "Promediadas una vez en el código.", it: "Mediate una volta nel codice." },
          hosting: { en: "IUP Bremen, Gorshelev et al. 2014 and Serdyuchenko et al. 2014 (Atmos. Meas. Tech. 7).", fr: "IUP Brême, Gorshelev et al. 2014 et Serdyuchenko et al. 2014 (Atmos. Meas. Tech. 7).", es: "IUP Bremen, Gorshelev et al. 2014 y Serdyuchenko et al. 2014 (Atmos. Meas. Tech. 7).", it: "IUP Brema, Gorshelev et al. 2014 e Serdyuchenko et al. 2014 (Atmos. Meas. Tech. 7)." },
          choices: { en: "Taken at 223 K, the stratosphere's temperature; the band changes by 3 % at most between 193 and 293 K. Without it, a zenith six degrees after sunset comes out nearly white (Hulburt, 1953), and a test checks that it does.", fr: "Prises à 223 K, la température de la stratosphère ; la bande varie de 3 % au plus entre 193 et 293 K. Sans elle, un zénith six degrés après le coucher sort presque blanc (Hulburt, 1953), et un test vérifie que c'est le cas.", es: "Tomadas a 223 K, la temperatura de la estratosfera; la banda cambia un 3 % como máximo entre 193 y 293 K. Sin ella, un cenit seis grados después de la puesta del Sol sale casi blanco (Hulburt, 1953), y un test comprueba que así es.", it: "Prese a 223 K, la temperatura della stratosfera; la banda cambia al massimo del 3 % tra 193 e 293 K. Senza di essa, uno zenit sei gradi dopo il tramonto risulta quasi bianco (Hulburt, 1953), e un test verifica che sia così." }
        },
        {
          name: "ASTM E 490-00a", url: "https://www.astm.org/e0490-00ar19.html",
          provides: { en: "Sunlight above the atmosphere, wavelength by wavelength.", fr: "La lumière du Soleil au-dessus de l'atmosphère, longueur d'onde par longueur d'onde.", es: "La luz del Sol por encima de la atmósfera, longitud de onda a longitud de onda.", it: "La luce del Sole sopra l'atmosfera, lunghezza d'onda per lunghezza d'onda." },
          when: { en: "Averaged once into the code.", fr: "Moyenné une fois dans le code.", es: "Promediado una vez en el código.", it: "Mediato una volta nel codice." },
          hosting: { en: "The standard's table 3.", fr: "Le tableau 3 de la norme.", es: "La tabla 3 de la norma.", it: "La tabella 3 della norma." },
          choices: { en: "Averaged over 20 nm, which removes the Fraunhofer lines: right for a sky, wrong for a spectrograph. It adds up to the Sun's measured illuminance, 128 to 133 thousand lux, which a test checks. The Moon's sky uses the same spectrum, scaled by the Moon's magnitude.", fr: "Moyenné sur 20 nm, ce qui efface les raies de Fraunhofer : juste pour un ciel, faux pour un spectrographe. Il redonne l'éclairement mesuré du Soleil, 128 à 133 mille lux, ce qu'un test vérifie. Le ciel de la Lune utilise le même spectre, réduit selon la magnitude de la Lune.", es: "Promediado sobre 20 nm, lo que borra las líneas de Fraunhofer: correcto para un cielo, erróneo para un espectrógrafo. Suma la iluminancia medida del Sol, de 128 a 133 mil lux, lo que comprueba un test. El cielo de la Luna usa el mismo espectro, escalado según la magnitud de la Luna.", it: "Mediato su 20 nm, il che elimina le righe di Fraunhofer: giusto per un cielo, sbagliato per uno spettrografo. Restituisce l'illuminamento misurato del Sole, da 128 a 133 mila lux, cosa che un test verifica. Il cielo della Luna usa lo stesso spettro, scalato secondo la magnitudine della Luna." }
        },
        {
          name: "Kasten 1969; Hänel 1976", url: "https://doi.org/10.3402/tellusa.v21i5.10112",
          provides: { en: "How milky the clear sky is: the haze's optical depth, from the relative humidity of the weather record.", fr: "La blancheur du ciel clair : l'épaisseur optique de la brume, tirée de l'humidité relative du relevé météo.", es: "Lo lechoso que es el cielo despejado: el espesor óptico de la bruma, a partir de la humedad relativa del registro meteorológico.", it: "Quanto è lattiginoso il cielo sereno: lo spessore ottico della foschia, ricavato dall'umidità relativa del dato meteorologico." },
          when: { en: "With the weather: the humidity comes from ERA5's temperature and dew point (Magnus formula, Alduchov & Eskridge 1996).", fr: "Avec la météo : l'humidité vient de la température et du point de rosée d'ERA5 (formule de Magnus, Alduchov & Eskridge 1996).", es: "Con la meteorología: la humedad sale de la temperatura y el punto de rocío de ERA5 (fórmula de Magnus, Alduchov & Eskridge 1996).", it: "Con il meteo: l'umidità viene dalla temperatura e dal punto di rugiada di ERA5 (formula di Magnus, Alduchov & Eskridge 1996)." },
          hosting: { en: "Growth law from the literature.", fr: "Loi de croissance tirée de la littérature.", es: "Ley de crecimiento de la literatura.", it: "Legge di crescita dalla letteratura." },
          choices: { en: "Haze particles swell with water as the air nears saturation; a typical continental burden swells as (1 - humidity) to the power -0.3, giving the usual 0.1 at 50 %. How many particles there were (a town, a fire, the wind's history) is in no record, and is not guessed. Capped at 95 %: beyond, it is mist.", fr: "Les particules de brume gonflent d'eau à mesure que l'air approche de la saturation ; une charge continentale typique gonfle comme (1 - humidité) à la puissance -0,3, ce qui donne le 0,1 habituel à 50 %. Le nombre de particules (une ville, un feu, l'histoire du vent) n'est dans aucun relevé et n'est pas deviné. Plafonnée à 95 % : au-delà, c'est de la brume de rosée.", es: "Las partículas de bruma se hinchan de agua a medida que el aire se acerca a la saturación; una carga continental típica se hincha como (1 - humedad) elevado a -0,3, lo que da el 0,1 habitual al 50 %. Cuántas partículas había (una ciudad, un incendio, la historia del viento) no figura en ningún registro, y no se adivina. Limitada al 95 %: más allá, es neblina.", it: "Le particelle di foschia si gonfiano d'acqua man mano che l'aria si avvicina alla saturazione; un carico continentale tipico si gonfia come (1 - umidità) alla potenza -0,3, il che dà il consueto 0,1 al 50 %. Quante particelle ci fossero (una città, un incendio, la storia del vento) non è in alcun dato, e non viene indovinato. Limitata al 95 %: oltre, è nebbia." }
        },
        {
          name: "Patat et al. 2006 (Paranal)", url: "https://arxiv.org/abs/astro-ph/0604128",
          provides: { en: "The measured brightness of the zenith through twilight, the check a real sky gives the model.", fr: "La brillance mesurée du zénith pendant le crépuscule, la vérification qu'un vrai ciel apporte au modèle.", es: "El brillo medido del cenit durante el crepúsculo, la comprobación que un cielo real aporta al modelo.", it: "La luminosità misurata dello zenit durante il crepuscolo, la verifica che un cielo reale offre al modello." },
          when: { en: "In the tests, and in the page for whether the Milky Way and the zodiacal light could be seen.", fr: "Dans les tests, et dans la page pour savoir si la Voie lactée et la lumière zodiacale pouvaient être vues.", es: "En los tests, y en la página para saber si la Vía Láctea y la luz zodiacal podían verse.", it: "Nei test, e nella pagina per sapere se la Via Lattea e la luce zodiacale potevano essere viste." },
          hosting: { en: "The paper's V-band fit, table 1.", fr: "L'ajustement en bande V de l'article, tableau 1.", es: "El ajuste en banda V del artículo, tabla 1.", it: "L'adattamento in banda V dell'articolo, tabella 1." },
          choices: { en: "Never fitted to: the model meets it within half a magnitude from -6° to -16°. Reading the published fit also corrected a table in the tool that had civil twilight ten times too dark.", fr: "Jamais ajustée : le modèle la rejoint à une demi-magnitude près de -6° à -16°. Lire l'ajustement publié a aussi corrigé une table de l'outil qui rendait le crépuscule civil dix fois trop sombre.", es: "Nunca se ajusta a él: el modelo lo alcanza dentro de media magnitud de -6° a -16°. Leer el ajuste publicado también corrigió una tabla de la herramienta que dejaba el crepúsculo civil diez veces demasiado oscuro.", it: "Mai usata per adattare: il modello la raggiunge entro mezza magnitudine da -6° a -16°. Leggere l'adattamento pubblicato ha anche corretto una tabella dello strumento che rendeva il crepuscolo civile dieci volte troppo scuro." }
        },
        {
          name: "Krawczyk et al. 2005; Thompson et al. 2002", url: "https://doi.org/10.1145/1090122.1090154",
          provides: { en: "How an eye adapted to that sky shows it: a compressive response that follows the sky's own brightness, and the shift to a dim blue-grey as the rods take over.", fr: "Comment un œil adapté à ce ciel le montre : une réponse compressive qui suit la luminosité du ciel lui-même, et le passage à un gris-bleu sombre quand les bâtonnets prennent le relais.", es: "Cómo muestra ese cielo un ojo adaptado a él: una respuesta compresiva que sigue el propio brillo del cielo, y el paso a un gris azulado tenue cuando los bastones toman el relevo.", it: "Come lo mostra un occhio adattato a quel cielo: una risposta compressiva che segue la luminosità del cielo stesso, e il passaggio a un grigio-blu tenue quando i bastoncelli prendono il sopravvento." },
          when: { en: "In the page, for every pixel of the sky.", fr: "Dans la page, pour chaque pixel du ciel.", es: "En la página, para cada píxel del cielo.", it: "Nella pagina, per ogni pixel del cielo." },
          hosting: { en: "Blend of the rods from Krawczyk, Myszkowski & Seidel; night blue from Thompson, Shirley & Ferwerda, taken halfway toward white.", fr: "Mélange des bâtonnets d'après Krawczyk, Myszkowski et Seidel ; bleu nocturne d'après Thompson, Shirley et Ferwerda, pris à mi-chemin du blanc.", es: "Mezcla de los bastones según Krawczyk, Myszkowski y Seidel; azul nocturno según Thompson, Shirley y Ferwerda, tomado a medio camino hacia el blanco.", it: "Miscela dei bastoncelli secondo Krawczyk, Myszkowski e Seidel; blu notturno secondo Thompson, Shirley e Ferwerda, preso a metà strada verso il bianco." },
          choices: { en: "The only choices in the chain, stated as such: a clear day zenith and a moonless night zenith are pinned where the tool showed them before, and everything between follows. A camera (a recording medium) gets no rods, and its gain over an eye brightens what it records.", fr: "Les seuls choix de la chaîne, dits comme tels : le zénith d'un jour clair et celui d'une nuit sans Lune sont fixés là où l'outil les montrait avant, et tout le reste suit. Un appareil photo (un support d'enregistrement) n'a pas de bâtonnets, et son gain sur l'œil éclaircit ce qu'il enregistre.", es: "Las únicas decisiones de la cadena, declaradas como tales: el cenit de un día despejado y el de una noche sin Luna se fijan donde la herramienta los mostraba antes, y todo lo intermedio sigue. Una cámara (un soporte de grabación) no tiene bastones, y su ganancia sobre el ojo aclara lo que registra.", it: "Le uniche scelte della catena, dichiarate come tali: lo zenit di un giorno sereno e quello di una notte senza Luna sono fissati dove lo strumento li mostrava prima, e tutto ciò che sta in mezzo segue. Una fotocamera (un supporto di registrazione) non ha bastoncelli, e il suo guadagno rispetto all'occhio schiarisce ciò che registra." }
        }
      ]
    },
    {
      id: "satellites",
      heading: { en: "Satellites", fr: "Satellites", es: "Satélites", it: "Satelliti" },
      intro: {
        en: "Two levels. For every date since Sputnik, what the Earth's shadow allowed and how many objects were in orbit. From February 2021, which satellites really crossed the sky, where, and how bright.",
        fr: "Deux niveaux. Pour toute date depuis Spoutnik, ce que permettait l'ombre de la Terre et combien d'objets étaient en orbite. Depuis février 2021, quels satellites ont réellement traversé le ciel, où, et avec quelle brillance.",
        es: "Dos niveles. Para cualquier fecha desde el Sputnik, lo que permitía la sombra de la Tierra y cuántos objetos había en órbita. Desde febrero de 2021, qué satélites cruzaron realmente el cielo, dónde y con qué brillo.",
        it: "Due livelli. Per ogni data dallo Sputnik, ciò che l'ombra della Terra consentiva e quanti oggetti erano in orbita. Dal febbraio 2021, quali satelliti hanno davvero attraversato il cielo, dove e con quale luminosità."
      },
      rows: [
        {
          name: "CelesTrak SATCAT", url: "https://celestrak.org/pub/satcat.csv",
          provides: { en: "Launch and re-entry date of every tracked object: the number in orbit each month, and when each class existed (Echo, Iridium flares, ISS, Starlink).", fr: "Date de lancement et de rentrée de chaque objet suivi : le nombre en orbite chaque mois, et quand chaque classe a existé (Echo, flashs d'Iridium, ISS, Starlink).", es: "Fecha de lanzamiento y de reentrada de cada objeto seguido: el número en órbita cada mes, y cuándo existió cada clase (Echo, destellos de Iridium, ISS, Starlink).", it: "Data di lancio e di rientro di ogni oggetto tracciato: il numero in orbita ogni mese, e quando è esistita ogni classe (Echo, flare degli Iridium, ISS, Starlink)." },
          when: { en: "Built once (build:satellites); also gives launch dates to the orbital element archive.", fr: "Construit une fois (build:satellites) ; donne aussi les dates de lancement à l'archive d'éléments orbitaux.", es: "Construido una vez (build:satellites); también da las fechas de lanzamiento al archivo de elementos orbitales.", it: "Costruito una volta (build:satellites); fornisce anche le date di lancio all'archivio di elementi orbitali." },
          hosting: { en: "Generated into the code. CC BY 4.0.", fr: "Engendré dans le code. CC BY 4.0.", es: "Generado en el código. CC BY 4.0.", it: "Generato nel codice. CC BY 4.0." },
          choices: { en: "Only the two date columns are read here (the re-entry list below also reads the inclination). Its orbit columns describe each object's LAST state: Echo 1 appears at 400 km when it flew near 1,500. Debris is not counted.", fr: "Seules les deux colonnes de dates sont lues ici (la liste des rentrées ci-dessous lit aussi l'inclinaison). Ses colonnes d'orbite décrivent le DERNIER état de chaque objet : Echo 1 y figure à 400 km alors qu'il volait vers 1 500. Les débris ne sont pas comptés.", es: "Aquí solo se leen las dos columnas de fechas (la lista de reentradas de abajo lee también la inclinación). Sus columnas de órbita describen el ÚLTIMO estado de cada objeto: Echo 1 aparece a 400 km cuando volaba cerca de 1.500. Los desechos no se cuentan.", it: "Qui si leggono solo le due colonne delle date (l'elenco dei rientri qui sotto legge anche l'inclinazione). Le sue colonne d'orbita descrivono l'ULTIMO stato di ogni oggetto: Echo 1 compare a 400 km quando volava intorno ai 1.500. I detriti non sono contati." }
        },
        {
          name: "CORDS, The Aerospace Corporation", url: "https://aerospace.org/reentries",
          provides: { en: "Every re-entry it followed since 2000: its predicted time with the uncertainty stated for it, and for about a hundred the time it was seen coming down and where from.", fr: "Chaque rentrée qu'elle a suivie depuis 2000 : son heure prévue avec l'incertitude annoncée, et pour une centaine l'heure à laquelle on l'a vue retomber et d'où.", es: "Cada reentrada que siguió desde 2000: su hora prevista con la incertidumbre declarada, y para un centenar la hora a la que se la vio caer y desde dónde.", it: "Ogni rientro che ha seguito dal 2000: l'ora prevista con l'incertezza dichiarata, e per un centinaio l'ora in cui fu visto ricadere e da dove." },
          when: { en: "Reduced once (build:reentries), with the SATCAT's decay days for every year since 1957; the editor fetches the year of the recording only.", fr: "Réduite une fois (build:reentries), avec les jours de rentrée du SATCAT pour toutes les années depuis 1957 ; l'éditeur ne charge que l'année de l'enregistrement.", es: "Reducido una vez (build:reentries), con los días de reentrada del SATCAT para todos los años desde 1957; el editor solo descarga el año de la grabación.", it: "Ridotto una volta (build:reentries), con i giorni di rientro del SATCAT per tutti gli anni dal 1957; l'editor scarica solo l'anno della registrazione." },
          hosting: { en: "Served from ufoathome.org/reentries/.", fr: "Servie depuis ufoathome.org/reentries/.", es: "Servido desde ufoathome.org/reentries/.", it: "Servito da ufoathome.org/reentries/." },
          choices: { en: "Archived by hand, because the site cannot be read by a script. A re-entry is stated with its precision and nothing finer: a sighting on record within an hour and 1,500 km, a prediction whose window meets the observation, or a bare decay day. Only the first says it could have crossed this sky. An orbit whose inclination keeps it out of sight of the observer's latitude is never listed: drag lowers an orbit but leaves its plane, which is why this one SATCAT orbit column is read.", fr: "Archivée à la main, parce que le site n'est pas lisible par un script. Une rentrée est énoncée avec sa précision et rien de plus fin : une observation au registre à moins d'une heure et de 1 500 km, une prévision dont la fenêtre rencontre l'observation, ou un simple jour de rentrée. Seule la première dit qu'elle a pu traverser ce ciel. Une orbite dont l'inclinaison la tient hors de vue de la latitude de l'observateur n'est jamais listée : le freinage abaisse une orbite sans changer son plan, c'est pourquoi cette seule colonne d'orbite du SATCAT est lue.", es: "Archivado a mano, porque el sitio no puede leerse con un script. Una reentrada se enuncia con su precisión y nada más fino: una observación registrada a menos de una hora y 1.500 km, una predicción cuya ventana alcanza la observación, o un simple día de reentrada. Solo la primera dice que pudo cruzar este cielo. Una órbita cuya inclinación la mantiene fuera de la vista de la latitud del observador nunca se lista: el frenado baja una órbita pero no cambia su plano, por eso se lee esta única columna orbital del SATCAT.", it: "Archiviato a mano, perché il sito non è leggibile da uno script. Un rientro è enunciato con la sua precisione e nulla di più fine: un'osservazione registrata entro un'ora e 1.500 km, una previsione la cui finestra incontra l'osservazione, o un semplice giorno di rientro. Solo la prima dice che può aver attraversato questo cielo. Un'orbita la cui inclinazione la tiene fuori vista dalla latitudine dell'osservatore non è mai elencata: la frenata abbassa un'orbita ma ne lascia il piano, per questo si legge questa sola colonna orbitale del SATCAT." }
        },
        {
          name: "Orbital element archive, Laurent Chabin (SCEAU)", url: "https://ufowaves.org/gp/my_tles/",
          provides: { en: "The public element sets saved once or twice a day since 22 February 2021: the naked-eye list, every Starlink, and to January 2025 the full catalogue.", fr: "Les jeux d'éléments publics sauvegardés une ou deux fois par jour depuis le 22 février 2021 : la liste visible à l'œil nu, tous les Starlink, et jusqu'en janvier 2025 le catalogue complet.", es: "Los conjuntos de elementos públicos guardados una o dos veces al día desde el 22 de febrero de 2021: la lista de objetos visibles a simple vista, todos los Starlink y, hasta enero de 2025, el catálogo completo.", it: "I set di elementi pubblici salvati una o due volte al giorno dal 22 febbraio 2021: l'elenco degli oggetti visibili a occhio nudo, tutti gli Starlink e, fino a gennaio 2025, il catalogo completo." },
          when: { en: "Reduced once (build:tle). The page fetches only the two weeks around the observation, and only for a date the archive covers; the propagator itself is loaded only then.", fr: "Réduite une fois (build:tle). La page ne charge que les deux semaines autour de l'observation, et seulement pour une date couverte par l'archive ; le propagateur lui-même n'est chargé qu'alors.", es: "Reducido una vez (build:tle). La página solo descarga las dos semanas en torno a la observación, y solo para una fecha que cubre el archivo; el propio propagador solo se carga entonces.", it: "Ridotto una volta (build:tle). La pagina scarica solo le due settimane intorno all'osservazione, e solo per una data coperta dall'archivio; il propagatore stesso viene caricato solo allora." },
          hosting: { en: "Served from ufoathome.org/tle/, credited in the player's credits.", fr: "Servie depuis ufoathome.org/tle/, créditée dans les crédits du lecteur.", es: "Servido desde ufoathome.org/tle/, acreditado en los créditos del reproductor.", it: "Servito da ufoathome.org/tle/, citato nei crediti del lettore." },
          choices: { en: "Hosted here because the original server cannot be read from a browser. 2.8 GB of snapshots are kept as 113 MB: every day for naked-eye objects and for Starlinks in their first 60 days (the trains), one set a week otherwise. Debris and objects nobody measured are dropped. A set is never used more than 7 days from its epoch, so a hole in the archive (three months in late 2025) is reported as a hole rather than filled with a stale orbit.", fr: "Hébergée ici parce que le serveur d'origine n'est pas lisible depuis un navigateur. 2,8 Go de relevés sont gardés en 113 Mo : chaque jour pour les objets visibles et les Starlink dans leurs 60 premiers jours (les trains), un jeu par semaine sinon. Les débris et les objets que personne n'a mesurés sont écartés. Un jeu n'est jamais utilisé à plus de 7 jours de son époque : un trou dans l'archive (trois mois fin 2025) est signalé comme un trou plutôt que comblé par une orbite périmée.", es: "Alojado aquí porque el servidor original no puede leerse desde un navegador. 2,8 GB de instantáneas se conservan en 113 MB: cada día para los objetos visibles a simple vista y para los Starlink en sus primeros 60 días (los trenes), un conjunto por semana en los demás casos. Se descartan los desechos y los objetos que nadie midió. Un conjunto nunca se usa a más de 7 días de su época, así que un hueco en el archivo (tres meses a finales de 2025) se señala como hueco en lugar de rellenarse con una órbita caducada.", it: "Ospitato qui perché il server originale non è leggibile da un browser. 2,8 GB di istantanee sono conservati in 113 MB: ogni giorno per gli oggetti visibili a occhio nudo e per gli Starlink nei loro primi 60 giorni (i treni), un set a settimana altrimenti. Detriti e oggetti che nessuno ha misurato sono scartati. Un set non è mai usato a più di 7 giorni dalla sua epoca, quindi un buco nell'archivio (tre mesi a fine 2025) è segnalato come buco anziché riempito con un'orbita superata." }
        },
        {
          name: "satellite.js (SGP4)", url: "https://github.com/shashwatak/satellite-js",
          provides: { en: "The standard propagator for these element sets, and the Sun's position; the Earth's umbra and penumbra are computed on top.", fr: "Le propagateur standard de ces éléments, et la position du Soleil ; l'ombre et la pénombre de la Terre sont calculées par-dessus.", es: "El propagador estándar para estos conjuntos de elementos, y la posición del Sol; la umbra y la penumbra de la Tierra se calculan encima.", it: "Il propagatore standard per questi set di elementi, e la posizione del Sole; l'ombra e la penombra della Terra sono calcolate in aggiunta." },
          when: { en: "Loaded on demand, for covered dates only.", fr: "Chargé à la demande, pour les dates couvertes seulement.", es: "Cargado bajo demanda, solo para las fechas cubiertas.", it: "Caricato su richiesta, solo per le date coperte." },
          hosting: { en: "Bundled library, MIT.", fr: "Bibliothèque embarquée, MIT.", es: "Biblioteca incluida, MIT.", it: "Libreria inclusa, MIT." },
          choices: { en: "Held on the release before the one that ships a WebAssembly build that breaks the bundle, for no gain here.", fr: "Maintenu sur la version qui précède celle qui embarque une version WebAssembly qui casse le bundle, sans gain ici.", es: "Mantenido en la versión anterior a la que incluye una compilación WebAssembly que rompe el bundle, sin ninguna ganancia aquí.", it: "Fermo alla versione precedente a quella che include una build WebAssembly che rompe il bundle, senza alcun vantaggio qui." }
        },
        {
          name: "Satellite brightness: McCants, Stellarium, Mallama et al.", url: "https://www.mmccants.org/programs/qsmag.zip",
          provides: { en: "How bright each object looks: standard magnitudes (McCants, completed by Stellarium's list for recent objects), and published means for the constellations nobody catalogued (Starlink, OneWeb, BlueBird).", fr: "La brillance apparente de chaque objet : magnitudes standard (McCants, complétées par la liste de Stellarium pour les objets récents), et moyennes publiées pour les constellations absentes de ces catalogues (Starlink, OneWeb, BlueBird).", es: "Lo brillante que se ve cada objeto: magnitudes estándar (McCants, completadas con la lista de Stellarium para los objetos recientes), y medias publicadas para las constelaciones que nadie catalogó (Starlink, OneWeb, BlueBird).", it: "Quanto appare luminoso ogni oggetto: magnitudini standard (McCants, completate dall'elenco di Stellarium per gli oggetti recenti), e medie pubblicate per le costellazioni che nessuno ha catalogato (Starlink, OneWeb, BlueBird)." },
          when: { en: "Merged into the archive at build time; applied in the page.", fr: "Fusionnées dans l'archive à la construction ; appliquées dans la page.", es: "Fusionadas en el archivo al construirlo; aplicadas en la página.", it: "Fuse nell'archivio in fase di build; applicate nella pagina." },
          hosting: { en: "Starlink 5.93 then 7.21 (arXiv:2006.08422, 2101.00374), 4.58 below 357 km while raising orbit (2405.12007); OneWeb 7.18 (2012.05100); BlueBird 3.77 then 4.32 (2608.23668).", fr: "Starlink 5,93 puis 7,21 (arXiv:2006.08422, 2101.00374), 4,58 sous 357 km pendant la montée en orbite (2405.12007) ; OneWeb 7,18 (2012.05100) ; BlueBird 3,77 puis 4,32 (2608.23668).", es: "Starlink 5,93 y luego 7,21 (arXiv:2006.08422, 2101.00374), 4,58 por debajo de 357 km mientras eleva su órbita (2405.12007); OneWeb 7,18 (2012.05100); BlueBird 3,77 y luego 4,32 (2608.23668).", it: "Starlink 5,93 poi 7,21 (arXiv:2006.08422, 2101.00374), 4,58 sotto i 357 km durante l'innalzamento dell'orbita (2405.12007); OneWeb 7,18 (2012.05100); BlueBird 3,77 poi 4,32 (2608.23668)." },
          choices: { en: "Without the orbit-raising value no Starlink train would ever be drawn. An unmeasured rocket stage takes the median of at least three identical measured stages; any other unmeasured object is computed but not drawn. Glints and flares are not modelled: they can only make a satellite brighter.", fr: "Sans la valeur de montée en orbite, aucun train de Starlink ne serait jamais dessiné. Un étage de fusée non mesuré prend la médiane d'au moins trois étages identiques mesurés ; tout autre objet non mesuré est calculé mais pas dessiné. Les reflets et flashs ne sont pas modélisés : ils ne peuvent que rendre un satellite plus brillant.", es: "Sin el valor de elevación de órbita nunca se dibujaría ningún tren de Starlink. Una etapa de cohete no medida toma la mediana de al menos tres etapas idénticas medidas; cualquier otro objeto no medido se calcula pero no se dibuja. Los reflejos y destellos no se modelan: solo pueden hacer un satélite más brillante.", it: "Senza il valore di innalzamento dell'orbita nessun treno di Starlink verrebbe mai disegnato. Uno stadio di razzo non misurato prende la mediana di almeno tre stadi identici misurati; qualsiasi altro oggetto non misurato è calcolato ma non disegnato. Riflessi e flare non sono modellati: possono solo rendere un satellite più luminoso." }
        }
      ]
    },
    {
      id: "aircraft",
      heading: { en: "Aircraft and their trails", fr: "Avions et traînées", es: "Aviones y estelas", it: "Aerei e scie" },
      intro: {
        en: "From 2022, the aircraft that were in the observer's sky at the hour of a recording, the air they flew in, and the trail their engines left there. What is drawn is a compatible candidate, never an identification, and an empty sky in the record excludes nothing.",
        fr: "Depuis 2022, les avions qui étaient dans le ciel de l'observateur à l'heure d'un enregistrement, l'air dans lequel ils volaient, et la traînée que leurs moteurs y laissaient. Ce qui est dessiné est un candidat compatible, jamais une identification, et un ciel vide dans le relevé n'exclut rien.",
        es: "Desde 2022, los aviones que estaban en el cielo del observador a la hora de una grabación, el aire en el que volaban y la estela que sus motores dejaban en él. Lo que se dibuja es un candidato compatible, nunca una identificación, y un cielo vacío en el registro no excluye nada.",
        it: "Dal 2022, gli aerei che erano nel cielo dell'osservatore all'ora di una registrazione, l'aria in cui volavano e la scia che i loro motori vi lasciavano. Ciò che è disegnato è un candidato compatibile, mai un'identificazione, e un cielo vuoto nell'archivio non esclude nulla."
      },
      rows: [
        {
          name: "adsb.lol open history", url: "https://www.adsb.lol/docs/open-data/historical/",
          provides: {
            en: "Where every aircraft that broadcast its position was, from 2022: its track, and its type, registration and category. Each is drawn with its real size, lamps (from dusk, by kind of aircraft), the Sun that still lights it after the ground has lost it, the haze between, and the sound it makes if it can be heard.",
            fr: "Où était chaque avion qui a émis sa position, depuis 2022 : sa trace, son type, son immatriculation et sa catégorie. Chacun est dessiné à sa vraie taille, avec ses feux (à la nuit tombée, selon le type d'appareil), le Soleil qui l'éclaire encore quand le sol l'a perdu, la brume entre lui et l'observateur, et le son qu'il fait s'il peut être entendu.",
            es: "Dónde estaba cada avión que emitió su posición, desde 2022: su trayectoria, su tipo, su matrícula y su categoría. Cada uno se dibuja con su tamaño real, sus luces (desde el anochecer, según el tipo de aeronave), el Sol que aún lo ilumina cuando el suelo ya lo ha perdido, la bruma intermedia y el sonido que hace si puede oírse.",
            it: "Dove si trovava ogni aereo che ha trasmesso la propria posizione, dal 2022: la sua traccia, il tipo, la marca di registrazione e la categoria. Ognuno è disegnato con la sua vera dimensione, le sue luci (dal crepuscolo, secondo il tipo di velivolo), il Sole che lo illumina ancora quando il suolo l'ha perso, la foschia in mezzo e il suono che produce se può essere udito."
          },
          when: {
            en: "Reduced once per day (build:aircraft) into one packed file per hour and per 1-degree tile. The page reads only the tiles within 150 km of the observer, for the hour of the recording and the five minutes before it, and never for a date before 2022. The code that draws, labels and plays the aircraft is loaded only when a scene has some.",
            fr: "Réduit une fois par jour (build:aircraft) en un fichier compacté par heure et par tuile d'un degré. La page ne lit que les tuiles à moins de 150 km de l'observateur, pour l'heure de l'enregistrement et les cinq minutes qui la précèdent, et jamais pour une date antérieure à 2022. Le code qui dessine, étiquette et fait entendre les avions n'est chargé que si une scène en a.",
            es: "Reducido una vez al día (build:aircraft) a un archivo empaquetado por hora y por casilla de un grado. La página solo lee las casillas a menos de 150 km del observador, para la hora de la grabación y los cinco minutos anteriores, y nunca para una fecha anterior a 2022. El código que dibuja, etiqueta y reproduce los aviones solo se carga si una escena los tiene.",
            it: "Ridotto una volta al giorno (build:aircraft) in un file compattato per ora e per riquadro di un grado. La pagina legge solo i riquadri entro 150 km dall'osservatore, per l'ora della registrazione e i cinque minuti precedenti, e mai per una data anteriore al 2022. Il codice che disegna, etichetta e fa sentire gli aerei è caricato solo se una scena ne ha."
          },
          hosting: {
            en: "Built from the daily releases of the adsb.lol history (ODbL 1.0), credited in the player's credits. Not hosted yet: until the archive is served from ufoathome.org/aircraft/, aircraft show only from a local copy.",
            fr: "Construit à partir des publications quotidiennes de l'historique d'adsb.lol (ODbL 1.0), crédité dans les crédits du lecteur. Pas encore hébergé : tant que l'archive n'est pas servie depuis ufoathome.org/aircraft/, les avions ne s'affichent qu'à partir d'une copie locale.",
            es: "Construido a partir de las publicaciones diarias del historial de adsb.lol (ODbL 1.0), acreditado en los créditos del reproductor. Aún no alojado: hasta que el archivo se sirva desde ufoathome.org/aircraft/, los aviones solo se muestran desde una copia local.",
            it: "Costruito dalle pubblicazioni quotidiane della cronologia di adsb.lol (ODbL 1.0), citato nei crediti del lettore. Non ancora ospitato: finché l'archivio non è servito da ufoathome.org/aircraft/, gli aerei compaiono solo da una copia locale."
          },
          choices: {
            en: "One feeder instance is enough: prod-0, with staging-0 as a fallback, hold the same flights to 0.02 %. Only the positions of a release's own UTC day are kept, so the result does not depend on the order days were read in; airport vehicles are dropped. What no receiver heard is absent: light aircraft, gliders, balloons and military aircraft that switch their transponder off are under-represented, and about one aircraft in seven states no type, so it is drawn as a generic airliner.",
            fr: "Une seule instance suffit : prod-0, avec staging-0 en repli, contiennent les mêmes vols à 0,02 % près. Seules les positions du jour UTC propre à une publication sont gardées, pour que le résultat ne dépende pas de l'ordre dans lequel les jours ont été lus ; les véhicules d'aéroport sont écartés. Ce qu'aucun récepteur n'a entendu est absent : avions légers, planeurs, ballons et militaires qui coupent leur transpondeur sont sous-représentés, et un avion sur sept n'indique aucun type, donc il est dessiné comme un avion de ligne générique.",
            es: "Una sola instancia basta: prod-0, con staging-0 de respaldo, contienen los mismos vuelos con una diferencia del 0,02 %. Solo se conservan las posiciones del día UTC propio de cada publicación, para que el resultado no dependa del orden en que se leyeron los días; se descartan los vehículos de aeropuerto. Lo que ningún receptor oyó está ausente: aviones ligeros, planeadores, globos y militares que apagan su transpondedor están infrarrepresentados, y uno de cada siete aviones no indica tipo, así que se dibuja como un avión de línea genérico.",
            it: "Basta una sola istanza: prod-0, con staging-0 di riserva, contengono gli stessi voli con una differenza dello 0,02 %. Si conservano solo le posizioni del giorno UTC proprio di ogni pubblicazione, così che il risultato non dipenda dall'ordine in cui i giorni sono stati letti; i veicoli aeroportuali sono scartati. Ciò che nessun ricevitore ha sentito è assente: aerei leggeri, alianti, palloni e militari che spengono il transponder sono sottorappresentati, e un aereo su sette non dichiara alcun tipo, quindi è disegnato come un aereo di linea generico."
          }
        },
        {
          name: "Open-Meteo, historical forecast API", url: "https://open-meteo.com/en/docs/historical-forecast-api",
          provides: {
            en: "Temperature, humidity and wind at 500, 400, 300, 250, 200 and 150 hPa, hour by hour, from 2022: the air the aircraft fly in.",
            fr: "Température, humidité et vent à 500, 400, 300, 250, 200 et 150 hPa, heure par heure, depuis 2022 : l'air dans lequel les avions volent.",
            es: "Temperatura, humedad y viento a 500, 400, 300, 250, 200 y 150 hPa, hora a hora, desde 2022: el aire en el que vuelan los aviones.",
            it: "Temperatura, umidità e vento a 500, 400, 300, 250, 200 e 150 hPa, ora per ora, dal 2022: l'aria in cui volano gli aerei."
          },
          when: {
            en: "Fetched by the page, once per recording that has aircraft, for the observer's place and the hours of the window: never for a date before 2022, and never for a scene with no aircraft.",
            fr: "Chargé par la page, une fois par enregistrement qui a des avions, pour le lieu de l'observateur et les heures de la fenêtre : jamais pour une date antérieure à 2022, ni pour une scène sans avion.",
            es: "Cargado por la página, una vez por grabación que tiene aviones, para el lugar del observador y las horas de la ventana: nunca para una fecha anterior a 2022, ni para una escena sin aviones.",
            it: "Caricato dalla pagina, una volta per registrazione che ha aerei, per il luogo dell'osservatore e le ore della finestra: mai per una data anteriore al 2022, né per una scena senza aerei."
          },
          hosting: {
            en: "Open-Meteo.com, CC BY 4.0, no key, credited in the player's credits.",
            fr: "Open-Meteo.com, CC BY 4.0, sans clé, crédité dans les crédits du lecteur.",
            es: "Open-Meteo.com, CC BY 4.0, sin clave, acreditado en los créditos del reproductor.",
            it: "Open-Meteo.com, CC BY 4.0, senza chiave, citato nei crediti del lettore."
          },
          choices: {
            en: "Not the reanalysis the weather uses: its archive serves no pressure levels. These are the forecasting models' own analyses, which are known to underestimate how often the air at cruise level is supersaturated over ice, so a trail that lasts in the sky may be one the record says should not. Read at the observer's place only: an aircraft a hundred kilometres off flies in air the model may state differently. The humidity is relative to water (checked against the ceiling the data make at saturation over ice, near 60 % at -47 C).",
            fr: "Pas la réanalyse qu'utilise la météo : son archive ne sert aucun niveau de pression. Ce sont les analyses propres aux modèles de prévision, connues pour sous-estimer la fréquence à laquelle l'air est sursaturé en glace à l'altitude de croisière : une traînée qui dure dans le ciel peut donc être une traînée que le relevé dit ne pas devoir durer. Lu au lieu de l'observateur seulement : un avion à cent kilomètres vole dans un air que le modèle peut décrire autrement. L'humidité est relative à l'eau (vérifié sur le plafond que font les données à la saturation par rapport à la glace, près de 60 % à -47 C).",
            es: "No es la reanálisis que usa la meteorología: su archivo no sirve niveles de presión. Son los análisis propios de los modelos de predicción, que se sabe que subestiman la frecuencia con que el aire a altitud de crucero está sobresaturado respecto al hielo, de modo que una estela que dura en el cielo puede ser una que el registro dice que no debería. Se lee solo en el lugar del observador: un avión a cien kilómetros vuela en un aire que el modelo puede describir de otro modo. La humedad es relativa al agua (comprobado con el techo que dan los datos en la saturación respecto al hielo, cerca del 60 % a -47 C).",
            it: "Non è la rianalisi usata dal meteo: il suo archivio non fornisce livelli di pressione. Sono le analisi proprie dei modelli di previsione, note per sottostimare la frequenza con cui l'aria a quota di crociera è sovrasatura rispetto al ghiaccio, per cui una scia che dura nel cielo può essere una che l'archivio dice non dovrebbe. Letto solo nel luogo dell'osservatore: un aereo a cento chilometri vola in un'aria che il modello può descrivere diversamente. L'umidità è relativa all'acqua (verificato sul tetto che i dati fanno alla saturazione rispetto al ghiaccio, vicino al 60 % a -47 C)."
          }
        },
        {
          name: "Schmidt-Appleman criterion (Schumann 1996)", url: "https://doi.org/10.1127/metz/5/1996/4",
          provides: {
            en: "Whether an engine's exhaust leaves a trail in that air, and whether it lasts. The exhaust cools along a line fixed by the engine's efficiency and the pressure; a trail forms if that line crosses saturation over water, and it lasts only where the air is saturated over ice.",
            fr: "Si l'échappement d'un moteur laisse une traînée dans cet air, et si elle dure. L'échappement se refroidit le long d'une droite fixée par le rendement du moteur et la pression ; une traînée se forme si cette droite croise la saturation par rapport à l'eau, et elle ne dure que là où l'air est saturé par rapport à la glace.",
            es: "Si el escape de un motor deja una estela en ese aire, y si dura. El escape se enfría a lo largo de una recta fijada por el rendimiento del motor y la presión; se forma una estela si esa recta cruza la saturación respecto al agua, y solo dura donde el aire está saturado respecto al hielo.",
            it: "Se lo scarico di un motore lascia una scia in quell'aria, e se dura. Lo scarico si raffredda lungo una retta fissata dal rendimento del motore e dalla pressione; una scia si forma se quella retta incrocia la saturazione rispetto all'acqua, e dura solo dove l'aria è satura rispetto al ghiaccio."
          },
          when: {
            en: "Computed in the page for each position of each aircraft, at the pressure its barometric altitude is (a barometric altitude is a pressure), and carried by the wind at that level.",
            fr: "Calculé dans la page pour chaque position de chaque avion, à la pression que donne son altitude barométrique (une altitude barométrique est une pression), et emporté par le vent de ce niveau.",
            es: "Calculado en la página para cada posición de cada avión, a la presión que da su altitud barométrica (una altitud barométrica es una presión), y arrastrado por el viento de ese nivel.",
            it: "Calcolato nella pagina per ogni posizione di ogni aereo, alla pressione data dalla sua quota barometrica (una quota barometrica è una pressione), e trasportato dal vento di quel livello."
          },
          hosting: {
            en: "Formula and constants in the code, with the saturation pressures of Murphy and Koop (2005).",
            fr: "Formule et constantes dans le code, avec les pressions de saturation de Murphy et Koop (2005).",
            es: "Fórmula y constantes en el código, con las presiones de saturación de Murphy y Koop (2005).",
            it: "Formula e costanti nel codice, con le pressioni di saturazione di Murphy e Koop (2005)."
          },
          choices: {
            en: "The engine is a typical one for the kind of aircraft, not the one of that airframe: overall efficiency 0.38 for a wide-body, 0.34 for a narrow-body, 0.30 for a business jet, 0.22 for a fighter. Propellers, rotors, gliders and balloons are given no trail. How a trail ages (its width, how it fades, how long a short one lasts) is a parameterisation of observed orders of magnitude, not a simulation. A trail drawn is estimated, never a fact; and one left by an aircraft that had gone before the five minutes the record is asked for is missing.",
            fr: "Le moteur est un moteur typique du type d'appareil, pas celui de cette cellule : rendement global 0,38 pour un gros-porteur, 0,34 pour un monocouloir, 0,30 pour un jet d'affaires, 0,22 pour un chasseur. Hélices, rotors, planeurs et ballons n'ont aucune traînée. La façon dont une traînée vieillit (sa largeur, son estompage, la durée d'une traînée courte) est une paramétrisation d'ordres de grandeur observés, pas une simulation. Une traînée dessinée est estimée, jamais un fait ; et celle d'un avion déjà parti avant les cinq minutes demandées au relevé manque.",
            es: "El motor es uno típico del tipo de aeronave, no el de esa célula: rendimiento global 0,38 para un fuselaje ancho, 0,34 para un pasillo único, 0,30 para un jet ejecutivo, 0,22 para un caza. Hélices, rotores, planeadores y globos no tienen estela. Cómo envejece una estela (su anchura, cómo se desvanece, cuánto dura una corta) es una parametrización de órdenes de magnitud observados, no una simulación. Una estela dibujada es estimada, nunca un hecho; y falta la de un avión que ya se había ido antes de los cinco minutos que se piden al registro.",
            it: "Il motore è uno tipico del tipo di velivolo, non quello di quella cellula: rendimento globale 0,38 per un widebody, 0,34 per un single-aisle, 0,30 per un jet executive, 0,22 per un caccia. Eliche, rotori, alianti e palloni non hanno scia. Come invecchia una scia (la larghezza, come svanisce, quanto dura una breve) è una parametrizzazione di ordini di grandezza osservati, non una simulazione. Una scia disegnata è stimata, mai un fatto; e manca quella di un aereo già andato via prima dei cinque minuti richiesti all'archivio."
          }
        }
      ]
    },
    {
      id: "weather",
      heading: { en: "Weather", fr: "Météo", es: "Meteorología", it: "Meteo" },
      rows: [
        {
          name: "ERA5 (Copernicus/ECMWF) via Open-Meteo", url: "https://open-meteo.com/en/docs/historical-weather-api",
          provides: { en: "Hourly cloud cover by level, precipitation, snow, weather code, wind, temperature and dew point, at the place and hour of the observation.", fr: "Couverture nuageuse horaire par étage, précipitations, neige, code météo, vent, température et point de rosée, au lieu et à l'heure de l'observation.", es: "Nubosidad horaria por nivel, precipitación, nieve, código meteorológico, viento, temperatura y punto de rocío, en el lugar y la hora de la observación.", it: "Copertura nuvolosa oraria per livello, precipitazioni, neve, codice meteo, vento, temperatura e punto di rugiada, nel luogo e all'ora dell'osservazione." },
          when: { en: "Fetched by the editor once a date and a place are known, from 1940 only.", fr: "Chargé par l'éditeur dès qu'une date et un lieu sont connus, à partir de 1940 seulement.", es: "Descargado por el editor en cuanto se conocen una fecha y un lugar, solo desde 1940.", it: "Scaricato dall'editor non appena sono noti una data e un luogo, solo dal 1940." },
          hosting: { en: "Open-Meteo archive API, keyless. © Copernicus/ECMWF.", fr: "API d'archive Open-Meteo, sans clé. © Copernicus/ECMWF.", es: "API de archivo de Open-Meteo, sin clave. © Copernicus/ECMWF.", it: "API d'archivio di Open-Meteo, senza chiave. © Copernicus/ECMWF." },
          choices: { en: "A reanalysis on a ~28 km grid, not a station: a local shower can be missing. Cloud bases are derived (temperature and dew point for the low deck), not measured. Every field can be unlocked and replaced by the account. No vertical profile is available in archive mode, which is what radar propagation anomalies would need.", fr: "Une réanalyse sur une grille de ~28 km, pas une station : une averse locale peut manquer. Les bases des nuages sont déduites (température et point de rosée pour l'étage bas), pas mesurées. Chaque champ peut être déverrouillé et remplacé par le compte rendu. Aucun profil vertical n'est disponible en archive, ce qu'il faudrait pour les anomalies de propagation radar.", es: "Un reanálisis en una malla de ~28 km, no una estación: puede faltar un chubasco local. Las bases de las nubes se deducen (temperatura y punto de rocío para el nivel bajo), no se miden. Cada campo puede desbloquearse y sustituirse por el relato. No hay perfil vertical disponible en modo archivo, que es lo que necesitarían las anomalías de propagación de radar.", it: "Una rianalisi su una griglia di ~28 km, non una stazione: un rovescio locale può mancare. Le basi delle nubi sono dedotte (temperatura e punto di rugiada per lo strato basso), non misurate. Ogni campo può essere sbloccato e sostituito dal resoconto. In modalità archivio non è disponibile alcun profilo verticale, che è ciò che servirebbe per le anomalie di propagazione radar." }
        }
      ]
    },
    {
      id: "ground",
      heading: { en: "The ground", fr: "Le sol", es: "El suelo", it: "Il suolo" },
      rows: [
        {
          name: "AWS Terrain Tiles (SRTM, ETOPO1)", url: "https://registry.opendata.aws/terrain-tiles/",
          provides: { en: "Relief around the observer.", fr: "Le relief autour de l'observateur.", es: "El relieve alrededor del observador.", it: "Il rilievo intorno all'osservatore." },
          when: { en: "Fetched when a scene has a real place.", fr: "Chargé quand une scène a un lieu réel.", es: "Descargado cuando una escena tiene un lugar real.", it: "Scaricato quando una scena ha un luogo reale." },
          hosting: { en: "Amazon S3, keyless. © AWS Open Data.", fr: "Amazon S3, sans clé. © AWS Open Data.", es: "Amazon S3, sin clave. © AWS Open Data.", it: "Amazon S3, senza chiave. © AWS Open Data." },
          choices: { en: "No key and no rate limit, which an embeddable component needs. The relief model is too coarse for trees and buildings: a picture of the place lined up in the scene is the way to state those.", fr: "Ni clé ni limite de débit, ce qu'exige un composant intégrable. Le modèle de relief est trop grossier pour les arbres et bâtiments : une photo des lieux recalée dans la scène est le moyen de les énoncer.", es: "Sin clave y sin límite de peticiones, lo que necesita un componente integrable. El modelo de relieve es demasiado grueso para árboles y edificios: una foto del lugar alineada en la escena es la forma de declararlos.", it: "Nessuna chiave e nessun limite di richieste, cosa di cui ha bisogno un componente incorporabile. Il modello del rilievo è troppo grossolano per alberi ed edifici: una foto del luogo allineata nella scena è il modo di dichiararli." }
        },
        {
          name: "Esri World Imagery", url: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
          provides: { en: "Aerial imagery draped on the relief, and the observer map.", fr: "L'imagerie aérienne posée sur le relief, et la carte de l'observateur.", es: "Imágenes aéreas extendidas sobre el relieve, y el mapa del observador.", it: "Immagini aeree stese sul rilievo, e la mappa dell'osservatore." },
          when: { en: "Fetched with the relief, and when the map is opened.", fr: "Chargée avec le relief, et à l'ouverture de la carte.", es: "Descargadas con el relieve, y al abrir el mapa.", it: "Scaricate con il rilievo, e all'apertura della mappa." },
          hosting: { en: "Esri tiles, keyless. © Esri, Maxar, Earthstar Geographics.", fr: "Tuiles Esri, sans clé. © Esri, Maxar, Earthstar Geographics.", es: "Teselas de Esri, sin clave. © Esri, Maxar, Earthstar Geographics.", it: "Tile Esri, senza chiave. © Esri, Maxar, Earthstar Geographics." },
          choices: { en: "Today's photograph of the ground, whatever the year of the account; the scene darkens it to the hour. EOX Sentinel-2 cloudless can be picked instead.", fr: "Une photographie actuelle du sol, quelle que soit l'année du récit ; la scène l'assombrit selon l'heure. EOX Sentinel-2 sans nuages peut être choisi à la place.", es: "Una fotografía actual del suelo, sea cual sea el año del relato; la escena la oscurece según la hora. Se puede elegir en su lugar EOX Sentinel-2 cloudless.", it: "Una fotografia attuale del suolo, qualunque sia l'anno del resoconto; la scena la scurisce secondo l'ora. In alternativa si può scegliere EOX Sentinel-2 cloudless." }
        }
      ]
    },
    {
      id: "place-time",
      heading: { en: "Place and time", fr: "Lieu et heure", es: "Lugar y hora", it: "Luogo e ora" },
      rows: [
        {
          name: "Nominatim (OpenStreetMap)", url: "https://nominatim.openstreetmap.org/",
          provides: { en: "Searching a place by name, and naming a point.", fr: "Chercher un lieu par son nom, et nommer un point.", es: "Buscar un lugar por su nombre, y nombrar un punto.", it: "Cercare un luogo per nome, e dare un nome a un punto." },
          when: { en: "Only when the author presses Enter or the search button, never at each keystroke.", fr: "Seulement quand l'auteur valide ou presse le bouton de recherche, jamais à chaque frappe.", es: "Solo cuando el autor pulsa Intro o el botón de búsqueda, nunca con cada pulsación de tecla.", it: "Solo quando l'autore preme Invio o il pulsante di ricerca, mai a ogni tasto premuto." },
          hosting: { en: "© OpenStreetMap contributors.", fr: "© les contributeurs d'OpenStreetMap.", es: "© colaboradores de OpenStreetMap.", it: "© contributori di OpenStreetMap." },
          choices: { en: "It knows hamlets, farms, roads and airfields, where accounts happen; its usage policy is why nothing is sent while typing.", fr: "Il connaît hameaux, fermes, routes et aérodromes, là où les récits se passent ; sa politique d'usage explique que rien ne parte pendant la frappe.", es: "Conoce aldeas, granjas, carreteras y aeródromos, donde ocurren los relatos; su política de uso es la razón de que no se envíe nada mientras se escribe.", it: "Conosce frazioni, fattorie, strade e aeroporti minori, dove avvengono i resoconti; la sua politica d'uso è il motivo per cui nulla viene inviato durante la digitazione." }
        },
        {
          name: "Open-Meteo time zones and the IANA database", url: "https://open-meteo.com/",
          provides: { en: "The time zone of a place, then its legal offset on the date of the account.", fr: "Le fuseau horaire d'un lieu, puis son décalage légal à la date du récit.", es: "La zona horaria de un lugar, y luego su desfase legal en la fecha del relato.", it: "Il fuso orario di un luogo, poi il suo scarto legale alla data del resoconto." },
          when: { en: "Once a place is known; the historical offset comes from the browser.", fr: "Dès qu'un lieu est connu ; le décalage historique vient du navigateur.", es: "En cuanto se conoce un lugar; el desfase histórico lo da el navegador.", it: "Non appena un luogo è noto; lo scarto storico viene dal browser." },
          hosting: { en: "© Open-Meteo; tz database in the browser.", fr: "© Open-Meteo ; base tz du navigateur.", es: "© Open-Meteo; base de datos tz en el navegador.", it: "© Open-Meteo; database tz nel browser." },
          choices: { en: "Today's offset is never used for an old date: France was at UTC+1 all year in 1965.", fr: "Le décalage actuel n'est jamais utilisé pour une date ancienne : la France était à UTC+1 toute l'année en 1965.", es: "El desfase actual nunca se usa para una fecha antigua: Francia estaba en UTC+1 todo el año en 1965.", it: "Lo scarto attuale non è mai usato per una data antica: la Francia era a UTC+1 tutto l'anno nel 1965." }
        }
      ]
    },
    {
      id: "decor",
      heading: { en: "Decor, pictures and sound", fr: "Décor, photos et son", es: "Decorado, fotos y sonido", it: "Scenografia, foto e suono" },
      rows: [
        {
          name: "3D models (Kenney, Poly by Google)", url: "https://ufoathome.org/models/",
          provides: { en: "Cars, houses, trees, street lights, an airliner.", fr: "Voitures, maisons, arbres, lampadaires, un avion de ligne.", es: "Coches, casas, árboles, farolas, un avión de línea.", it: "Automobili, case, alberi, lampioni, un aereo di linea." },
          when: { en: "When a decor object names a model.", fr: "Quand un objet du décor nomme un modèle.", es: "Cuando un objeto del decorado nombra un modelo.", it: "Quando un oggetto della scenografia nomina un modello." },
          hosting: { en: "Re-hosted on ufoathome.org, each with its licence file (CC0, CC BY 3.0). The catalogue is read from /models/index.json beside the page first, then from ufoathome.org, so a site can serve its own copy.", fr: "Réhébergés sur ufoathome.org, chacun avec son fichier de licence (CC0, CC BY 3.0). Le catalogue est lu d'abord dans /models/index.json à côté de la page, puis sur ufoathome.org : un site peut en servir sa propre copie.", es: "Realojados en ufoathome.org, cada uno con su archivo de licencia (CC0, CC BY 3.0). El catálogo se lee primero de /models/index.json junto a la página, y luego de ufoathome.org, para que un sitio pueda servir su propia copia.", it: "Ri-ospitati su ufoathome.org, ciascuno con il suo file di licenza (CC0, CC BY 3.0). Il catalogo è letto prima da /models/index.json accanto alla pagina, poi da ufoathome.org, così che un sito possa servirne una propria copia." },
          choices: { en: "Hosted here because free kits sit on mirrors of uncertain permanence. A model whose credit is unknown is not drawn; Google Earth models were refused for their licence. Whenever a model cannot be had, and when the observer stands inside the object, the built-in shape is drawn instead.", fr: "Hébergés ici parce que les kits libres sont sur des miroirs à la pérennité incertaine. Un modèle au crédit inconnu n'est pas dessiné ; les modèles de Google Earth ont été écartés pour leur licence. Chaque fois qu'un modèle ne peut être obtenu, et quand l'observateur se tient dans l'objet, c'est la forme intégrée qui est dessinée.", es: "Alojados aquí porque los kits libres están en réplicas de permanencia incierta. Un modelo cuyo crédito se desconoce no se dibuja; los modelos de Google Earth se rechazaron por su licencia. Siempre que no se puede obtener un modelo, y cuando el observador está dentro del objeto, se dibuja en su lugar la forma integrada.", it: "Ospitati qui perché i kit liberi stanno su mirror di durata incerta. Un modello di cui non si conosce il credito non è disegnato; i modelli di Google Earth sono stati rifiutati per la loro licenza. Ogni volta che un modello non può essere ottenuto, e quando l'osservatore si trova dentro l'oggetto, viene disegnata al suo posto la forma integrata." }
        },
        {
          name: "Panoramax", url: "https://panoramax.fr/",
          provides: { en: "Street-level photographs and panoramas near the place, each with its position and direction.", fr: "Photos et panoramas au niveau de la rue près du lieu, chacun avec sa position et sa direction.", es: "Fotografías y panorámicas a pie de calle cerca del lugar, cada una con su posición y dirección.", it: "Fotografie e panorami a livello stradale vicino al luogo, ciascuno con la sua posizione e direzione." },
          when: { en: "Only when the author searches for pictures in the editor.", fr: "Seulement quand l'auteur cherche des photos dans l'éditeur.", es: "Solo cuando el autor busca fotos en el editor.", it: "Solo quando l'autore cerca foto nell'editor." },
          hosting: { en: "Panoramax API, credited with each picture's author and licence.", fr: "API Panoramax, créditée avec l'auteur et la licence de chaque photo.", es: "API de Panoramax, acreditada con el autor y la licencia de cada foto.", it: "API Panoramax, citata con l'autore e la licenza di ogni foto." },
          choices: { en: "Open and readable from any page. Google Street View was refused: its terms keep the pictures inside Google's viewers.", fr: "Ouverte et lisible depuis toute page. Google Street View a été écarté : ses conditions gardent les photos dans les visionneuses de Google.", es: "Abierta y legible desde cualquier página. Google Street View se rechazó: sus condiciones mantienen las fotos dentro de los visores de Google.", it: "Aperta e leggibile da qualsiasi pagina. Google Street View è stato rifiutato: le sue condizioni tengono le foto dentro i visualizzatori di Google." }
        },
        {
          name: "Weather sounds (OpenGameArt)", url: "https://opengameart.org/",
          provides: { en: "Rain, wind and thunder.", fr: "Pluie, vent et tonnerre.", es: "Lluvia, viento y trueno.", it: "Pioggia, vento e tuono." },
          when: { en: "Loaded when the weather of the scene needs them.", fr: "Chargés quand la météo de la scène en a besoin.", es: "Cargados cuando la meteorología de la escena los necesita.", it: "Caricati quando il meteo della scena ne ha bisogno." },
          hosting: { en: "Bundled. Rain and wind CC0; thunder by Jerimee, CC BY 3.0, credited in the player.", fr: "Embarqués. Pluie et vent CC0 ; tonnerre par Jerimee, CC BY 3.0, crédité dans le lecteur.", es: "Incluidos. Lluvia y viento CC0; trueno de Jerimee, CC BY 3.0, acreditado en el reproductor.", it: "Inclusi. Pioggia e vento CC0; tuono di Jerimee, CC BY 3.0, citato nel lettore." },
          choices: { en: "The phenomenon's own sound is synthesized from its description, not taken from a recording.", fr: "Le son du phénomène lui-même est synthétisé depuis sa description, pas tiré d'un enregistrement.", es: "El sonido propio del fenómeno se sintetiza a partir de su descripción, no se toma de una grabación.", it: "Il suono proprio del fenomeno è sintetizzato dalla sua descrizione, non preso da una registrazione." }
        }
      ]
    },
    {
      id: "drafting",
      heading: { en: "Drafting and assessment", fr: "Rédaction et évaluation", es: "Redacción y evaluación", it: "Redazione e valutazione" },
      rows: [
        {
          name: "Claude (Anthropic)", url: "https://www.anthropic.com/",
          provides: { en: "A first draft of a recording from a written account, each value marked as stated, derived or assumed.", fr: "Un premier jet d'enregistrement à partir d'un récit écrit, chaque valeur marquée comme dite, déduite ou supposée.", es: "Un primer borrador de grabación a partir de un relato escrito, con cada valor marcado como declarado, deducido o supuesto.", it: "Una prima bozza di registrazione a partire da un resoconto scritto, con ogni valore segnato come dichiarato, dedotto o supposto." },
          when: { en: "Only when the author opens the panel and gives their own API key.", fr: "Seulement quand l'auteur ouvre le panneau et fournit sa propre clé d'API.", es: "Solo cuando el autor abre el panel y proporciona su propia clave de API.", it: "Solo quando l'autore apre il pannello e fornisce la propria chiave API." },
          hosting: { en: "Called from the browser with the author's key; nothing passes through ufoathome.org.", fr: "Appelé depuis le navigateur avec la clé de l'auteur ; rien ne passe par ufoathome.org.", es: "Llamado desde el navegador con la clave del autor; nada pasa por ufoathome.org.", it: "Chiamato dal browser con la chiave dell'autore; nulla passa da ufoathome.org." },
          choices: { en: "No server of ours, so no account and no key held here. The draft is a proposal the author edits, never a result.", fr: "Aucun serveur de notre côté, donc ni compte ni clé conservés ici. Le jet est une proposition que l'auteur corrige, jamais un résultat.", es: "Ningún servidor nuestro, así que ninguna cuenta ni clave guardada aquí. El borrador es una propuesta que el autor corrige, nunca un resultado.", it: "Nessun server nostro, quindi nessun account né chiave conservati qui. La bozza è una proposta che l'autore corregge, mai un risultato." }
        },
        {
          name: "Hynek classification", url: "https://rr0.org/science/crypto/ufo/observation/classification/hynek/",
          provides: { en: "The close-encounter category a recording supports, beside the tool's own coverage questions.", fr: "La catégorie de rencontre rapprochée qu'un enregistrement soutient, à côté des questions de couverture propres à l'outil.", es: "La categoría de encuentro cercano que respalda una grabación, junto a las preguntas de cobertura propias de la herramienta.", it: "La categoria di incontro ravvicinato che una registrazione sostiene, accanto alle domande di copertura proprie dello strumento." },
          when: { en: "Computed in the page.", fr: "Calculé dans la page.", es: "Calculado en la página.", it: "Calcolato nella pagina." },
          hosting: { en: "After J. Allen Hynek.", fr: "D'après J. Allen Hynek.", es: "Según J. Allen Hynek.", it: "Secondo J. Allen Hynek." },
          choices: { en: "Categories the format cannot state (a physical trace, a radar return) are marked unsupported rather than guessed; tags are not taken as evidence.", fr: "Les catégories que le format ne peut pas énoncer (trace physique, écho radar) sont marquées non prises en charge plutôt que devinées ; les étiquettes ne valent pas preuve.", es: "Las categorías que el formato no puede expresar (una huella física, un eco de radar) se marcan como no admitidas en lugar de adivinarse; las etiquetas no se toman como prueba.", it: "Le categorie che il formato non può esprimere (una traccia fisica, un'eco radar) sono segnate come non supportate anziché indovinate; i tag non sono presi come prova." }
        }
      ]
    }
  ]

  render(language: SiteLanguage): string {
    const columns = ({
      en: ["Source", "What it provides", "When it is read", "Hosting and credit", "Choices and limits"],
      fr: ["Source", "Ce qu'elle fournit", "Quand elle est lue", "Hébergement et crédit", "Choix et limites"],
      es: ["Fuente", "Qué proporciona", "Cuándo se lee", "Alojamiento y crédito", "Decisiones y límites"],
      it: ["Fonte", "Cosa fornisce", "Quando viene letta", "Hosting e credito", "Scelte e limiti"]
    } satisfies Said<string[]>)[language]
    const principlesHeading = ({ en: "The principles", fr: "Les principes", es: "Los principios", it: "I principi" } satisfies Said<string>)[language]
    const details = ({
      en: "The detail of each choice, with the measurements that settled it, is in the code comments of each source in the <a href=\"https://github.com/RR0/UfoAtHome\">repository</a>, and the <a href=\"https://github.com/RR0/UfoAtHome#data\">README</a> says how to rebuild each catalogue.",
      fr: "Le détail de chaque choix, avec les mesures qui l'ont décidé, est dans les commentaires du <a href=\"https://github.com/RR0/UfoAtHome\">code</a> de chaque source, et le <a href=\"https://github.com/RR0/UfoAtHome#data\">README</a> dit comment reconstruire chaque catalogue.",
      es: "El detalle de cada decisión, con las mediciones que la zanjaron, está en los comentarios del código de cada fuente en el <a href=\"https://github.com/RR0/UfoAtHome\">repositorio</a>, y el <a href=\"https://github.com/RR0/UfoAtHome#data\">README</a> explica cómo reconstruir cada catálogo.",
      it: "Il dettaglio di ogni scelta, con le misure che l'hanno decisa, è nei commenti al codice di ogni fonte nel <a href=\"https://github.com/RR0/UfoAtHome\">repository</a>, e il <a href=\"https://github.com/RR0/UfoAtHome#data\">README</a> spiega come ricostruire ogni catalogo."
    } satisfies Said<string>)[language]
    const fileNote = ({
      en: "What a looked-up value becomes in the file (<code>weatherSource</code>, the <code>record-low</code>, <code>record-mid</code> and <code>record-high</code> layers) is described on <a href=\"/docs/format/\">the sighting file</a>'s page.",
      fr: "Ce qu'une valeur relevée devient dans le fichier (<code>weatherSource</code>, les couches <code>record-low</code>, <code>record-mid</code> et <code>record-high</code>) est décrit sur la page du <a href=\"/docs/format/\">fichier d'observation</a>.",
      es: "En qué se convierte en el archivo un valor consultado (<code>weatherSource</code>, las capas <code>record-low</code>, <code>record-mid</code> y <code>record-high</code>) se describe en la página del <a href=\"/docs/format/\">archivo de avistamiento</a>.",
      it: "Che cosa diventa nel file un valore consultato (<code>weatherSource</code>, gli strati <code>record-low</code>, <code>record-mid</code> e <code>record-high</code>) è descritto nella pagina del <a href=\"/docs/format/\">file di avvistamento</a>."
    } satisfies Said<string>)[language]
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
    <h2>${principlesHeading}</h2>
    <ul>
${this.principles[language].map(principle => `      <li>${principle}</li>`).join("\n")}
    </ul>
    <p>${toc}</p>
${sections}
    <p>${details}</p>
    <p>${fileNote}</p>
  </div>
</section>
`
  }

  private escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}
