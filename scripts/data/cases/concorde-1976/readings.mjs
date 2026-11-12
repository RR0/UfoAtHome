// The readings of the Concorde film: every explanation published for the orb, and the ones this case raised, each with what it was set
// against and what that gave. A reading that fails is kept: it shows the explanation was examined, and why it does not hold.
// The measures cited are on the 640 × 480 file (s4b.json and the slow motion, see the case's notes); "established" is what the film shows,
// "supposed" what the account assumed for want of a record (the date, the hour, the place, the height, the heading, hence the Sun).

const held = (text, against = 'established') => ({ text, outcome: 'holds', against })
const fails = (text, against = 'established') => ({ text, outcome: 'fails', against })
const untested = text => ({ text, outcome: 'untested' })

const SUN_SUPPOSED = {
  fr: "Avec le Soleil supposé (38° de haut, 130° à gauche du cap de la caméra), aucun reflet ne tombe dans le cadre : l'heure, le cap et la date sont supposés.",
  en: "With the supposed Sun (38° high, 130° left of the camera's heading), no ghost falls in the frame: the hour, the heading and the date are supposed.",
  es: "Con el Sol supuesto (38° de altura, 130° a la izquierda del rumbo de la cámara), ningún reflejo cae en el encuadre: la hora, el rumbo y la fecha son supuestos.",
  it: "Con il Sole supposto (38° di altezza, 130° a sinistra della rotta della camera), nessun riflesso cade nell'inquadratura: l'ora, la rotta e la data sono supposte."
}
const TIED_TO_CAMERA = {
  fr: "Liée à la caméra : l'orbe repart vers le haut à un dixième de seconde de la caméra.",
  en: "Tied to the camera: the orb turns back up within a tenth of a second of the camera.",
  es: "Ligado a la cámara: el orbe vuelve a subir a una décima de segundo de la cámara.",
  it: "Legata alla camera: la sfera risale a un decimo di secondo dalla camera."
}
const ADDS_LIGHT = {
  fr: "Elle ajoute de la lumière, à peu près autant sur tout fond (+99 sur un fond sous 100, +84 de 100 à 130), et passe devant la bande sombre sous l'aile.",
  en: "It adds light, about as much over any ground (+99 over a ground under 100, +84 from 100 to 130), and passes in front of the dark band under the wing.",
  es: "Añade luz, casi la misma sobre cualquier fondo (+99 sobre un fondo bajo 100, +84 de 100 a 130), y pasa por delante de la banda oscura bajo el ala.",
  it: "Aggiunge luce, più o meno la stessa su ogni sfondo (+99 su uno sfondo sotto 100, +84 da 100 a 130), e passa davanti alla banda scura sotto l'ala."
}
const BLURRED = {
  fr: "Floue, comme ce qui est tout près de l'objectif.",
  en: "Blurred, as what is right by the lens is.",
  es: "Borroso, como lo que está junto al objetivo.",
  it: "Sfocata, come ciò che è vicinissimo all'obiettivo."
}

export const READINGS = [
  {
    id: 'lens-ghost',
    // Its best case: the Sun where the film's light allows it nearest the front of the camera, and the lens taking light that far out.
    sun: { fromViewDeg: 284.5, altitudeDeg: 15.5 },
    lens: { reachDeg: 90 },
    by: [{ title: 'UFO@home' }],
    time: '2026-11-08',
    title: {
      fr: "Reflet du Soleil hors cadre dans un objectif simple",
      en: "A ghost of the Sun, out of the frame, in a plain lens",
      es: "Un reflejo del Sol, fuera del encuadre, en un objetivo simple",
      it: "Un riflesso del Sole, fuori inquadratura, in un obiettivo semplice"
    },
    findings: [
      held(TIED_TO_CAMERA), held(ADDS_LIGHT),
      fails({
        fr: "Un reflet d'objectif se déplace d'un facteur fixe fois le mouvement de sa source ; l'orbe suit la caméra d'un facteur qui va de 1,1 à 8,3 selon le tronçon.",
        en: "A lens ghost moves by a fixed factor times its source's motion; the orb follows the camera by a factor running from 1.1 to 8.3 from one stretch to the next.",
        es: "Un reflejo de objetivo se mueve un factor fijo por el movimiento de su fuente; el orbe sigue a la cámara con un factor que va de 1,1 a 8,3 según el tramo.",
        it: "Un riflesso d'obiettivo si sposta di un fattore fisso per il moto della sua sorgente; la sfera segue la camera con un fattore che va da 1,1 a 8,3 secondo il tratto."
      }),
      fails({
        fr: "Sa descente demanderait un facteur d'environ +4,4 ; ceux d'un objectif de caméra vont de −1,4 à +0,65.",
        en: "Its descent would need a factor of about +4.4; a camera lens's run from −1.4 to +0.65.",
        es: "Su descenso requeriría un factor de unos +4,4; los de un objetivo de cámara van de −1,4 a +0,65.",
        it: "La sua discesa richiederebbe un fattore di circa +4,4; quelli di un obiettivo da camera vanno da −1,4 a +0,65."
      }),
      fails({
        fr: "Simulé dans son meilleur cas (le Soleil au plus près que l'éclairage du film permet, à 285° de la visée et 15,5° de haut, 85° de l'axe ; un objectif qui en reçoit la lumière jusque-là) : le plus proche de ses reflets (facteur +0,3) tombe à 3 600 px à gauche du cadre, plus de cinq largeurs d'image. Aucun n'entre dans le cadre.",
        en: "Simulated at its best (the Sun as near the front as the film's light allows, 285° from where the camera looks and 15.5° high, 85° off the axis; a lens taking its light that far out): the nearest of its ghosts (factor +0.3) falls 3,600 px left of the frame, more than five widths of the picture. None comes into the frame.",
        es: "Simulado en su mejor caso (el Sol tan cerca del frente como permite la iluminación de la película, a 285° de la mira y 15,5° de altura, a 85° del eje; un objetivo que recibe su luz hasta ahí): el más cercano de sus reflejos (factor +0,3) cae a 3.600 px a la izquierda del encuadre, más de cinco anchos de la imagen. Ninguno entra en el encuadre.",
        it: "Simulato nel caso migliore (il Sole il più vicino al fronte che l'illuminazione del film consenta, a 285° dalla mira e 15,5° di altezza, a 85° dall'asse; un obiettivo che ne riceve la luce fin lì): il più vicino dei suoi riflessi (fattore +0,3) cade a 3.600 px a sinistra dell'inquadratura, più di cinque larghezze dell'immagine. Nessuno entra nell'inquadratura."
      })
    ]
  },
  {
    id: 'periscope',
    // Its best case: the Sun where the film's light allows it nearest the front of the camera (285° from where it looks, at the least
    // height the light allows), a periscope head taking light that far out, and the ghost that lays it on the orb at the first instant.
    sun: { fromViewDeg: 284.5, altitudeDeg: 15.5 },
    periscope: { reachDeg: 90, share: 2e-3, blur: 0.009 },
    by: [{ firstNames: ['Alan'], lastName: 'Tanner' }],
    title: {
      fr: "Reflet interne dans le périscope Astrovision : le Soleil, hors champ à gauche, frappe l'élément frontal",
      en: "An internal reflection in the Astrovision periscope: the Sun, out of the field to the left, strikes the front element",
      es: "Un reflejo interno en el periscopio Astrovision: el Sol, fuera de campo a la izquierda, incide en el elemento frontal",
      it: "Un riflesso interno nel periscopio Astrovision: il Sole, fuori campo a sinistra, colpisce l'elemento frontale"
    },
    findings: [
      held(TIED_TO_CAMERA), held(ADDS_LIGHT),
      untested({
        fr: "Les prismes et la stabilisation d'un périscope n'obéissent pas au facteur fixe d'un objectif simple ; leur géométrie n'est pas connue, et Patrick Gross attribue à la stabilisation le trajet propre du reflet.",
        en: "A periscope's prisms and stabiliser need not keep a plain lens's fixed factor; their geometry is not known, and Patrick Gross puts the ghost's own path down to the stabiliser.",
        es: "Los prismas y la estabilización de un periscopio no tienen por qué respetar el factor fijo de un objetivo simple; su geometría no se conoce, y Patrick Gross atribuye a la estabilización el recorrido propio del reflejo.",
        it: "I prismi e lo stabilizzatore di un periscopio non rispettano per forza il fattore fisso di un obiettivo semplice; la loro geometria non è nota, e Patrick Gross attribuisce allo stabilizzatore il percorso proprio del riflesso."
      }),
      fails({
        fr: "Pour éclairer l'avion comme le film (du côté de la caméra), le Soleil devait être à 105°-285° de la direction de visée, soit au moins 75° de l'axe, quelles que soient la date, l'heure, le lieu ou le cap : le périscope devrait recevoir une lumière aussi oblique sur son élément frontal. La portée supposée par le moteur s'arrête à 43° de l'axe (30° au-delà du cadre) ; celle d'un Astrovision n'est pas connue.",
        en: "To light the aircraft as the film does (on the camera's side), the Sun had to be 105° to 285° from the way the camera looked, at least 75° off its axis, whatever the date, the hour, the place or the heading: the periscope would have to take light that oblique on its front element. The reach the engine supposes stops at 43° off the axis (30° beyond the frame); an Astrovision's is not known.",
        es: "Para iluminar el avión como la película (del lado de la cámara), el Sol tenía que estar a 105°-285° de la dirección de mira, al menos a 75° del eje, cualesquiera que sean la fecha, la hora, el lugar o el rumbo: el periscopio tendría que recibir una luz tan oblicua en su elemento frontal. El alcance que supone el motor se detiene a 43° del eje (30° más allá del encuadre); el de un Astrovision no se conoce.",
        it: "Per illuminare l'aereo come il film (dal lato della camera), il Sole doveva essere a 105°-285° dalla direzione di mira, almeno a 75° dall'asse, qualunque siano la data, l'ora, il luogo o la rotta: il periscopio dovrebbe ricevere una luce così obliqua sul suo elemento frontale. La portata che il motore suppone si ferma a 43° dall'asse (30° oltre l'inquadratura); quella di un Astrovision non è nota."
      }, 'supposed'),
      fails({
        fr: "Simulé dans son meilleur cas (le Soleil au plus près que l'éclairage permet, à 285° de la visée et 15,5° de haut, 85° de l'axe ; un périscope qui reçoit la lumière jusque-là ; le reflet posé sur l'orbe au premier instant, facteur −0,008) : le reflet ne bouge que de 7 px dans le cadre, quand l'orbe en parcourt 333. Il reste à 257 px d'elle en médiane, 339 au plus. Un reflet de facteur fixe ne le peut pas ; reste un périscope dont les prismes ne gardent pas de facteur fixe.",
        en: "Simulated at its best (the Sun as near the front as the light allows, 285° from where the camera looks and 15.5° high, 85° off the axis; a periscope taking light that far out; the ghost laid on the orb at the first instant, factor −0.008): the ghost moves no more than 7 px in the frame, where the orb travels 333. It stays 257 px from it at the median, 339 at most. A ghost of a fixed factor cannot do it; what is left is a periscope whose prisms keep no fixed factor.",
        es: "Simulado en su mejor caso (el Sol tan cerca del frente como permite la iluminación, a 285° de la mira y 15,5° de altura, a 85° del eje; un periscopio que recibe la luz hasta ahí; el reflejo puesto sobre el orbe en el primer instante, factor −0,008): el reflejo no se mueve más de 7 px en el encuadre, cuando el orbe recorre 333. Queda a 257 px de él en la mediana, 339 como mucho. Un reflejo de factor fijo no puede; queda un periscopio cuyos prismas no guardan un factor fijo.",
        it: "Simulato nel caso migliore (il Sole il più vicino al fronte che l'illuminazione consenta, a 285° dalla mira e 15,5° di altezza, a 85° dall'asse; un periscopio che riceve la luce fin lì; il riflesso posto sulla sfera al primo istante, fattore −0,008): il riflesso non si sposta più di 7 px nell'inquadratura, mentre la sfera ne percorre 333. Resta a 257 px da essa in mediana, 339 al massimo. Un riflesso a fattore fisso non può; resta un periscopio i cui prismi non mantengono un fattore fisso."
      // What fails is the fixed factor the simulation supposes, not what Tanner says: his prisms need not keep one (see the finding above).
      }, 'supposed')
    ]
  },
  {
    id: 'window',
    inFrame: { title: { fr: 'Le reflet sur la vitre (meilleur cas)', en: 'The reflection on the pane (best case)', es: 'El reflejo en el cristal (mejor caso)', it: 'Il riflesso sul vetro (caso migliore)' }, distanceM: 1000, luminanceCdM2: 3e4 },
    by: [{ people: 'BeauJerome' }],
    time: '2026-11-08',
    lens: { glass: 'window' },
    title: {
      fr: "Reflet sur une vitre : celle du Learjet, ou la fenêtre extérieure du périscope",
      en: "A reflection on a pane: the Learjet's, or the periscope's outer window",
      es: "Un reflejo en un cristal: el del Learjet, o la ventana exterior del periscopio",
      it: "Un riflesso su un vetro: quello del Learjet, o la finestra esterna del periscopio"
    },
    findings: [
      held({
        fr: "Un reflet sur une vitre suit la rotation de la caméra par rapport au porteur, pas par rapport au sol : un trajet sans lien avec la scène est attendu, comme celui de l'orbe.",
        en: "A reflection on a pane follows the camera's turn against the carrier, not against the ground: a path unrelated to the scene is to be expected, as the orb's is.",
        es: "Un reflejo en un cristal sigue el giro de la cámara respecto al portador, no respecto al suelo: cabe esperar un recorrido sin relación con la escena, como el del orbe.",
        it: "Un riflesso su un vetro segue la rotazione della camera rispetto al vettore, non rispetto al suolo: è atteso un percorso senza legame con la scena, come quello della sfera."
      }),
      held(ADDS_LIGHT),
      untested({
        fr: "Le tester demanderait l'attitude du Learjet, que le film ne donne pas ; ces mesures ne le distinguent pas d'un reflet dans le périscope.",
        en: "Testing it would take the Learjet's attitude, which the film does not give; these measures cannot tell it from a reflection in the periscope.",
        es: "Probarlo requeriría la actitud del Learjet, que la película no da; estas medidas no lo distinguen de un reflejo en el periscopio.",
        it: "Verificarlo richiederebbe l'assetto del Learjet, che il film non dà; queste misure non lo distinguono da un riflesso nel periscopio."
      }),
      fails({
        fr: "Simulé dans son meilleur cas (le reflet fixe dans le cadre, la vitre solidaire de la caméra, posé sur l'orbe au premier instant, aussi lumineux qu'elle) : il reste à 251 px de l'orbe en médiane, 333 au plus, quand elle parcourt 333 px dans le cadre.",
        en: "Simulated at its best (the reflection standing still in the frame, the pane fixed to the camera, laid on the orb at the first instant, as bright as it): it stays 251 px from the orb at the median, 333 at most, where the orb travels 333 px in the frame.",
        es: "Simulado en su mejor caso (el reflejo fijo en el encuadre, el cristal solidario de la cámara, puesto sobre el orbe en el primer instante, tan luminoso como él): queda a 251 px del orbe en la mediana, 333 como mucho, cuando el orbe recorre 333 px en el encuadre.",
        it: "Simulato nel caso migliore (il riflesso fermo nell'inquadratura, il vetro solidale con la camera, posto sulla sfera al primo istante, luminoso quanto lei): resta a 251 px dalla sfera in mediana, 333 al massimo, mentre la sfera percorre 333 px nell'inquadratura."
      }, 'supposed')
    ]
  },
  {
    id: 'glint',
    // Its best case: the glint there all along, as bright as the Sun's disc (1.6e9 cd/m²) in glass reflecting 5 % of it, the image of the
    // Sun in a curved pane some 0.3 m across at 155 m (a few pixels).
    glint: { luminanceCdM2: 8e7, sizeM: 0.3 },
    by: [{ title: 'Peter_Morris (Straight Dope)' }],
    time: '2008-08',
    title: {
      fr: "Reflet d'un éclat du Soleil sur le Concorde, sa carrosserie blanche ou son pare-brise",
      en: "A ghost of a glint of the Sun on Concorde, its white body or its windscreen",
      es: "Un reflejo de un destello del Sol en el Concorde, su fuselaje blanco o su parabrisas",
      it: "Un riflesso di un bagliore del Sole sul Concorde, la sua fusoliera bianca o il parabrezza"
    },
    findings: [
      fails({
        fr: "Un reflet suit sa source d'un même facteur dans les deux directions ; sur 83 images, l'orbe suit l'avion de −0,39 en largeur et de +1,59 en hauteur.",
        en: "A ghost follows its source by one factor both ways; over 83 frames the orb follows the aircraft by −0.39 across and +1.59 up.",
        es: "Un reflejo sigue a su fuente con un mismo factor en ambas direcciones; en 83 imágenes, el orbe sigue al avión con −0,39 a lo ancho y +1,59 a lo alto.",
        it: "Un riflesso segue la sua sorgente con uno stesso fattore nelle due direzioni; su 83 fotogrammi la sfera segue l'aereo di −0,39 in larghezza e +1,59 in altezza."
      }),
      fails({
        fr: "L'orbe repart vers le haut vers 6,15 s du fichier, quand l'avion descend encore dans l'image jusqu'à 6,4 s.",
        en: "The orb turns back up at about 6.15 s of the file, while the aircraft goes on down the picture until 6.4 s.",
        es: "El orbe vuelve a subir hacia 6,15 s del archivo, cuando el avión sigue bajando en la imagen hasta 6,4 s.",
        it: "La sfera risale verso 6,15 s del file, mentre l'aereo continua a scendere nell'immagine fino a 6,4 s."
      }),
      fails({
        fr: "Aucun éclat sur le pare-brise dans les images examinées : le poste de pilotage reste sombre, et le reste de l'avion est saturé en blanc.",
        en: "No glint on the windscreen in the frames examined: the flight deck stays dark, and the rest of the aircraft is saturated white.",
        es: "Ningún destello en el parabrisas en las imágenes examinadas: la cabina sigue oscura, y el resto del avión está saturado de blanco.",
        it: "Nessun bagliore sul parabrezza nei fotogrammi esaminati: la cabina resta scura, e il resto dell'aereo è saturo di bianco."
      }),
      fails({
        fr: "Simulé dans son meilleur cas, un éclat au pare-brise tout le plan : ses reflets par l'objectif (facteurs de −1,4 à +0,65) restent à 90 px de l'orbe en médiane (de 21 à 160 px), et ne parcourent pas plus de 75 px, quand l'orbe en parcourt 377.",
        en: "Simulated at its best, a glint on the windscreen all through the shot: its ghosts through the lens (factors −1.4 to +0.65) stay 90 px from the orb at the median (21 to 160 px), and travel no more than 75 px, where the orb travels 377.",
        es: "Simulado en su mejor caso, un destello en el parabrisas durante todo el plano: sus reflejos por el objetivo (factores de −1,4 a +0,65) quedan a 90 px del orbe en la mediana (de 21 a 160 px), y no recorren más de 75 px, cuando el orbe recorre 377.",
        it: "Simulato nel caso migliore, un bagliore sul parabrezza per tutta la ripresa: i suoi riflessi attraverso l'obiettivo (fattori da −1,4 a +0,65) restano a 90 px dalla sfera in mediana (da 21 a 160 px), e non percorrono più di 75 px, mentre la sfera ne percorre 377."
      })
    ]
  },
  {
    id: 'drop',
    by: [{ title: 'GuanoLad (Straight Dope)' }],
    time: '2008-08',
    lens: { glass: 'window', drops: 0.05 },
    title: {
      fr: "Goutte d'eau sur la vitre, poussée par le vent ou les vibrations",
      en: "A drop of water on the pane, driven by the wind or the vibration",
      es: "Una gota de agua en el cristal, empujada por el viento o las vibraciones",
      it: "Una goccia d'acqua sul vetro, spinta dal vento o dalle vibrazioni"
    },
    findings: [
      held(BLURRED),
      fails({
        fr: "Le vent relatif pousse une goutte dans un sens ; l'orbe descend puis remonte sur la même colonne, à 0,6 px près sur 377 px.",
        en: "The airflow drives a drop one way; the orb goes down then back up the same column, to 0.6 px over 377 px.",
        es: "El viento relativo empuja una gota en un sentido; el orbe baja y vuelve a subir por la misma columna, con 0,6 px de diferencia en 377 px.",
        it: "Il vento relativo spinge una goccia in un senso; la sfera scende e risale sulla stessa colonna, a 0,6 px su 377 px."
      }),
      untested({
        fr: "Une goutte qui remonterait sous l'effet des vibrations reste à décrire : personne n'a dit comment.",
        en: "A drop the vibration would carry back up is still to be described: nobody has said how.",
        es: "Una gota que las vibraciones harían subir queda por describir: nadie ha dicho cómo.",
        it: "Una goccia che le vibrazioni farebbero risalire resta da descrivere: nessuno ha detto come."
      })
    ]
  },
  {
    id: 'dust',
    inFrame: { title: { fr: "La poussière sur l'objectif (meilleur cas)", en: 'The speck on the lens (best case)', es: 'La mota en el objetivo (mejor caso)', it: "Il granello sull'obiettivo (caso migliore)" }, distanceM: 2, luminanceCdM2: 3e4 },
    by: [{ title: 'Manduck (Straight Dope)' }, { title: 'Telemark (Straight Dope)' }],
    time: '2008-08',
    title: {
      fr: "Poussière ou insecte près de l'objectif",
      en: "Dust or an insect close to the lens",
      es: "Polvo o un insecto cerca del objetivo",
      it: "Polvere o un insetto vicino all'obiettivo"
    },
    findings: [
      held(BLURRED), held(TIED_TO_CAMERA),
      untested({
        fr: "Elle ajoute de la lumière sur fond sombre (+99) : une particule ne le peut qu'éclairée par le Soleil, à l'ombre elle assombrirait ; où était le Soleil n'est pas connu.",
        en: "It adds light over a dark ground (+99): a particle can only do so lit by the Sun, in shadow it would darken; where the Sun was is not known.",
        es: "Añade luz sobre fondo oscuro (+99): una partícula solo puede hacerlo iluminada por el Sol, a la sombra oscurecería; no se sabe dónde estaba el Sol.",
        it: "Aggiunge luce su uno sfondo scuro (+99): una particella può farlo solo illuminata dal Sole, all'ombra scurirebbe; dove fosse il Sole non è noto."
      }),
      fails({
        fr: "Simulé dans son meilleur cas (une poussière posée sur l'objectif, fixe dans le cadre, posé sur l'orbe au premier instant, aussi lumineux qu'elle) : il reste à 251 px de l'orbe en médiane, 333 au plus, quand elle parcourt 333 px dans le cadre.",
        en: "Simulated at its best (a speck sitting on the lens, standing still in the frame, laid on the orb at the first instant, as bright as it): it stays 251 px from the orb at the median, 333 at most, where the orb travels 333 px in the frame.",
        es: "Simulado en su mejor caso (una mota posada en el objetivo, fija en el encuadre, puesto sobre el orbe en el primer instante, tan luminoso como él): queda a 251 px del orbe en la mediana, 333 como mucho, cuando el orbe recorre 333 px en el encuadre.",
        it: "Simulato nel caso migliore (un granello posato sull'obiettivo, fermo nell'inquadratura, posto sulla sfera al primo istante, luminoso quanto lei): resta a 251 px dalla sfera in mediana, 333 al massimo, mentre la sfera percorre 333 px nell'inquadratura."
      }, 'supposed')
    ]
  },
  {
    id: 'film-defect',
    inFrame: { title: { fr: 'Le cheveu dans le couloir (meilleur cas)', en: 'The hair in the gate (best case)', es: 'El pelo en la ventanilla (mejor caso)', it: 'Il pelo nel quadruccio (caso migliore)' }, distanceM: 2, luminanceCdM2: 3e4 },
    by: [{ title: 'beowulff (Straight Dope)' }],
    time: '2008-08',
    title: {
      fr: "Défaut de la pellicule : poussière dans le couloir, rayure",
      en: "A flaw of the film: dust in the gate, a scratch",
      es: "Un defecto de la película: polvo en la ventanilla, una raya",
      it: "Un difetto della pellicola: polvere nel quadruccio, un graffio"
    },
    findings: [
      fails({
        fr: "Les poussières de cette copie ne durent qu'une image (1,15 par image) ; l'orbe suit un trajet continu pendant environ 80 images.",
        en: "This copy's dust lasts one frame (1.15 a frame); the orb follows one continuous path for some 80 frames.",
        es: "El polvo de esta copia dura una imagen (1,15 por imagen); el orbe sigue un recorrido continuo durante unas 80 imágenes.",
        it: "La polvere di questa copia dura un fotogramma (1,15 per fotogramma); la sfera segue un percorso continuo per circa 80 fotogrammi."
      }),
      fails({
        fr: "Un cheveu ou une poussière du couloir reste fixe dans le cadre ; l'orbe le parcourt sur 377 px.",
        en: "A hair or a speck in the gate stays put in the frame; the orb travels 377 px across it.",
        es: "Un pelo o una mota en la ventanilla queda fijo en el encuadre; el orbe lo recorre en 377 px.",
        it: "Un pelo o un granello nel quadruccio resta fisso nell'inquadratura; la sfera lo percorre per 377 px."
      }),
      fails({
        fr: "Simulé dans son meilleur cas (un cheveu coincé dans le couloir tout le plan, fixe dans le cadre, posé sur l'orbe au premier instant, aussi lumineux qu'elle) : il reste à 251 px de l'orbe en médiane, 333 au plus, quand elle parcourt 333 px dans le cadre.",
        en: "Simulated at its best (a hair caught in the gate all through the shot, standing still in the frame, laid on the orb at the first instant, as bright as it): it stays 251 px from the orb at the median, 333 at most, where the orb travels 333 px in the frame.",
        es: "Simulado en su mejor caso (un pelo atrapado en la ventanilla todo el plano, fijo en el encuadre, puesto sobre el orbe en el primer instante, tan luminoso como él): queda a 251 px del orbe en la mediana, 333 como mucho, cuando el orbe recorre 333 px en el encuadre.",
        it: "Simulato nel caso migliore (un pelo incastrato nel quadruccio per tutta la ripresa, fermo nell'inquadratura, posto sulla sfera al primo istante, luminoso quanto lei): resta a 251 px dalla sfera in mediana, 333 al massimo, mentre la sfera percorre 333 px nell'inquadratura."
      })
    ]
  },
  {
    id: 'object',
    by: [{ title: 'UFO video channels' }],
    title: {
      fr: "Un objet réel près du Concorde, une « sonde »",
      en: "A real object near Concorde, a \"probe\"",
      es: "Un objeto real cerca del Concorde, una «sonda»",
      it: "Un oggetto reale vicino al Concorde, una «sonda»"
    },
    distanceM: 100,
    findings: [
      held({
        fr: "Elle passe devant la bande sombre sous l'aile : devant le Concorde, pas derrière comme certains le voient.",
        en: "It passes in front of the dark band under the wing: in front of Concorde, not behind it as some see it.",
        es: "Pasa por delante de la banda oscura bajo el ala: delante del Concorde, no detrás como algunos lo ven.",
        it: "Passa davanti alla banda scura sotto l'ala: davanti al Concorde, non dietro come alcuni la vedono."
      }),
      untested({
        fr: "Sa distance ne se mesure pas sur le film : placée ici à 100 m (supposé), elle mesurerait 0,6 m.",
        en: "Its distance cannot be measured on the film: placed here at 100 m (supposed), it would be 0.6 m across.",
        es: "Su distancia no se mide en la película: situado aquí a 100 m (supuesto), mediría 0,6 m.",
        it: "La sua distanza non si misura sul film: posta qui a 100 m (supposto), misurerebbe 0,6 m."
      }),
      untested({
        fr: "Ses demi-tours tombent à un dixième de seconde de ceux de la caméra : une coïncidence qu'un objet indépendant laisse à expliquer.",
        en: "Its turns fall within a tenth of a second of the camera's: a coincidence an independent object leaves to be explained.",
        es: "Sus cambios de sentido caen a una décima de segundo de los de la cámara: una coincidencia que un objeto independiente deja por explicar.",
        it: "Le sue inversioni cadono a un decimo di secondo da quelle della camera: una coincidenza che un oggetto indipendente lascia da spiegare."
      })
    ]
  }
]
