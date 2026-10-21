import { readFileSync } from "node:fs"
import { FALLBACK_LANGUAGE, type Said, type SiteLanguage } from "./SitePage.js"

/** One screenshot, and the place in a page it illustrates. */
export interface Shot {
  /** The page's slug (`PageMeta.slug`). */
  readonly page: string
  /** The id of the heading it follows (the fallback language's, which every translation shares: see Headings). */
  readonly after: string
  /** The file `scripts/site-shots` writes: `site/shots/<name>_<language>.webp`. */
  readonly name: string
  /** What it shows, in the words of the page it is on — also its alternative text. */
  readonly caption: Said<string>
}

/**
 * Where the pages are illustrated.
 *
 * Kept apart from the pages for the reason the anchors are (see Headings): there are four copies of every page, and a
 * picture added to each by hand is a picture that is missing from one of them next month. The picture goes where a
 * heading says, so it holds for every translation, and the picture itself is in the reader's language, since the
 * interface it shows is.
 *
 * What the pictures show, and how they are taken, is `scripts/site-shots/shots.mjs`.
 */
export class Shots {

  static readonly ALL: readonly Shot[] = [
    {
      page: "edit", after: "case", name: "edit-case",
      caption: {
        en: "The case at the top of the editor: its identifier, title and date, and the observations it holds.",
        fr: "Le dossier en haut de l'éditeur : son identifiant, son titre et sa date, et les observations qu'il contient.",
        es: "El caso en lo alto del editor: su identificador, su título y su fecha, y las observaciones que contiene.",
        it: "Il caso in cima all'editor: il suo identificatore, il suo titolo e la sua data, e le osservazioni che contiene."
      }
    },
    {
      page: "edit", after: "say-when-and-where", name: "edit-locate",
      caption: {
        en: "Typing a place name and pressing the locate button fills in the coordinates.",
        fr: "Saisir un nom de lieu et appuyer sur le bouton de localisation remplit les coordonnées.",
        es: "Escribir el nombre de un lugar y pulsar el botón de localización rellena las coordenadas.",
        it: "Digitare il nome di un luogo e premere il pulsante di localizzazione compila le coordinate."
      }
    },
    {
      page: "edit", after: "draw-it", name: "edit-draw",
      caption: {
        en: "The shape editor: an oval or a polygon, then its colour, halo, size and distance.",
        fr: "L'éditeur de forme : un ovale ou un polygone, puis sa couleur, son halo, sa taille et sa distance.",
        es: "El editor de formas: un óvalo o un polígono, y luego su color, su halo, su tamaño y su distancia.",
        it: "L'editor di forme: un ovale o un poligono, poi il suo colore, il suo alone, la sua dimensione e la sua distanza."
      }
    },
    {
      page: "edit", after: "give-it-a-movement", name: "edit-keyframes",
      caption: {
        en: "The playback bar: a tick for each keyframe of what is being edited, an amber one for each named moment.",
        fr: "La barre de lecture : un trait par keyframe de ce qu'on édite, un trait ambre par moment nommé.",
        es: "La barra de reproducción: una marca por cada keyframe de lo que se edita, una ámbar por cada momento con nombre.",
        it: "La barra di riproduzione: un segno per ogni keyframe di ciò che si modifica, uno ambra per ogni momento con nome."
      }
    },
    {
      page: "edit", after: "summary", name: "edit-summary",
      caption: {
        en: "Summary: the identifier, tags and description of the observation.",
        fr: "Résumé : l'identifiant, les mots-clés et la description de l'observation.",
        es: "Resumen: el identificador, las etiquetas y la descripción de la observación.",
        it: "Riepilogo: l'identificatore, le parole chiave e la descrizione dell'osservazione."
      }
    },
    {
      page: "edit", after: "witness", name: "edit-observer",
      caption: {
        en: "Witness: who looked, and with what.",
        fr: "Témoin : qui regardait, et avec quoi.",
        es: "Testigo: quién miraba, y con qué.",
        it: "Testimone: chi guardava, e con cosa."
      }
    },
    {
      page: "edit", after: "location", name: "edit-location",
      caption: {
        en: "Location: where the observer stood, and the sources of relief and imagery around.",
        fr: "Lieu : où se tenait l'observateur, et les sources du relief et des images autour.",
        es: "Lugar: dónde estaba el observador, y las fuentes del relieve y de las imágenes alrededor.",
        it: "Luogo: dove si trovava l'osservatore, e le fonti del rilievo e delle immagini intorno."
      }
    },
    {
      page: "edit", after: "environment", name: "edit-environment",
      caption: {
        en: "Environment: what surrounded the observer.",
        fr: "Environnement : ce qui entourait l'observateur.",
        es: "Entorno: lo que rodeaba al observador.",
        it: "Ambiente: ciò che circondava l'osservatore."
      }
    },
    {
      page: "edit", after: "date", name: "edit-moment",
      caption: {
        en: "Date: start, end, duration and time zone.",
        fr: "Date : début, fin, durée et fuseau horaire.",
        es: "Fecha: inicio, fin, duración y huso horario.",
        it: "Data: inizio, fine, durata e fuso orario."
      }
    },
    {
      page: "edit", after: "weather", name: "edit-weather",
      caption: {
        en: "Weather: precipitation, clouds and wind, read from records or stated.",
        fr: "Météo : précipitations, nuages et vent, relevés ou déclarés.",
        es: "Meteorología: precipitaciones, nubes y viento, consultados o declarados.",
        it: "Meteo: precipitazioni, nuvole e vento, ricavati o dichiarati."
      }
    },
    {
      page: "edit", after: "sound", name: "edit-sound",
      caption: {
        en: "Sound: what was heard, if anything.",
        fr: "Son : ce qui a été entendu, le cas échéant.",
        es: "Sonido: lo que se oyó, si algo.",
        it: "Suono: ciò che si è sentito, se qualcosa."
      }
    },
    {
      page: "edit", after: "pictures", name: "edit-pictures",
      caption: {
        en: "Pictures: photographs of the place, and the observer's drawings.",
        fr: "Photos : photographies du lieu, et dessins de l'observateur.",
        es: "Fotos: fotografías del lugar, y dibujos del observador.",
        it: "Foto: fotografie del luogo, e disegni dell'osservatore."
      }
    },
    {
      page: "edit", after: "phenomenon", name: "edit-phenomenon",
      caption: {
        en: "Phenomenon: the scene itself, with the map and the moments of the account.",
        fr: "Phénomène : la scène elle-même, avec la carte et les moments du récit.",
        es: "Fenómeno: la escena misma, con el mapa y los momentos del relato.",
        it: "Fenomeno: la scena stessa, con la mappa e i momenti del resoconto."
      }
    },
    {
      page: "edit", after: "files", name: "edit-file",
      caption: {
        en: "Files: loading a recording, or saving the one being edited.",
        fr: "Fichiers : charger un enregistrement, ou sauver celui qu'on édite.",
        es: "Archivos: cargar un registro, o guardar el que se edita.",
        it: "File: caricare una registrazione, o salvare quella che si modifica."
      }
    },
    {
      page: "play", after: "a-link-that-opens-a-sighting", name: "player-chips",
      caption: {
        en: "The player: the picture, and under it the chips stating what the recording says.",
        fr: "Le lecteur : l'image, et dessous les pastilles qui énoncent ce que dit l'enregistrement.",
        es: "El reproductor: la imagen, y debajo las pastillas que enuncian lo que dice el registro.",
        it: "Il lettore: l'immagine, e sotto le pastiglie che enunciano ciò che dice la registrazione."
      }
    },
    {
      page: "context/sky", after: "top", name: "scene-sky",
      caption: {
        en: "The Moon at the date and place stated, low over the horizon.",
        fr: "La Lune à la date et au lieu énoncés, bas sur l'horizon.",
        es: "La Luna en la fecha y el lugar indicados, baja sobre el horizonte.",
        it: "La Luna alla data e nel luogo indicati, bassa sull'orizzonte."
      }
    },
    {
      page: "context/light", after: "top", name: "scene-light",
      caption: {
        en: "The Milky Way and its glow, computed rather than painted.",
        fr: "La Voie lactée et sa lueur, calculées plutôt que peintes.",
        es: "La Vía Láctea y su resplandor, calculados y no pintados.",
        it: "La Via Lattea e il suo bagliore, calcolati e non dipinti."
      }
    },
    {
      page: "context/space", after: "top", name: "scene-space",
      caption: {
        en: "A comet on the night it was really in the sky, tail included.",
        fr: "Une comète la nuit où elle était vraiment dans le ciel, queue comprise.",
        es: "Un cometa la noche en que de verdad estaba en el cielo, con su cola.",
        it: "Una cometa la notte in cui era davvero nel cielo, coda compresa."
      }
    },
    {
      page: "context/ice", after: "top", name: "scene-ice",
      caption: {
        en: "Sundogs and cirrus: the angles come from the ice, none is stored.",
        fr: "Parhélies et cirrus : les angles viennent de la glace, aucun n'est enregistré.",
        es: "Parhelios y cirros: los ángulos vienen del hielo, ninguno está almacenado.",
        it: "Pareli e cirri: gli angoli vengono dal ghiaccio, nessuno è memorizzato."
      }
    },
    {
      page: "context/weather", after: "top", name: "scene-weather",
      caption: {
        en: "Rain and wind of the day, read from the weather records.",
        fr: "La pluie et le vent du jour, relevés dans les archives météo.",
        es: "La lluvia y el viento del día, consultados en los archivos meteorológicos.",
        it: "La pioggia e il vento del giorno, ricavati dagli archivi meteo."
      }
    },
    {
      page: "context/ground", after: "top", name: "scene-ground",
      caption: {
        en: "The ground and the decor around the observer, with the map of his walk.",
        fr: "Le sol et le décor autour de l'observateur, avec la carte de son trajet.",
        es: "El suelo y el decorado alrededor del observador, con el mapa de su recorrido.",
        it: "Il terreno e lo scenario intorno all'osservatore, con la mappa del suo percorso."
      }
    },
    {
      page: "context/instrument", after: "top", name: "scene-instrument",
      caption: {
        en: "The same sighting as a 126-film camera frames it: square, and its own field.",
        fr: "La même observation telle que la cadre un appareil à film 126 : carrée, et son propre champ.",
        es: "La misma observación tal como la encuadra una cámara de película 126: cuadrada, y con su propio campo.",
        it: "La stessa osservazione come la inquadra una macchina a pellicola 126: quadrata, e con il suo campo."
      }
    },
    {
      page: "context/pictures", after: "top", name: "scene-pictures",
      caption: {
        en: "Cussac: the 1968 photograph of the place, faded over the render, with the sphere drawn on by hand.",
        fr: "Cussac : la photo de 1968 du lieu, fondue dans le rendu, avec la sphère dessinée à la main.",
        es: "Cussac: la foto de 1968 del lugar, fundida con el render, con la esfera dibujada a mano.",
        it: "Cussac: la foto del 1968 del luogo, sfumata sul render, con la sfera disegnata a mano."
      }
    },
    {
      page: "docs/create", after: "1-in-the-editor", name: "edit-phenomenon",
      caption: {
        en: "The editor, here on the scene of a recording.",
        fr: "L'éditeur, ici sur la scène d'un enregistrement.",
        es: "El editor, aquí sobre la escena de un registro.",
        it: "L'editor, qui sulla scena di una registrazione."
      }
    }
,
    {
      page: "docs/case", after: "in-the-case-editor", name: "case-events",
      caption: {
        en: "The case editor: the picker of the case's events, and the + that adds one.",
        fr: "L'éditeur de dossier : le sélecteur des événements du dossier, et le + qui en ajoute un.",
        es: 'El editor de casos: el selector de los eventos del caso, y el + que añade uno.',
        it: "L'editor di casi: il selettore degli eventi del caso, e il + che ne aggiunge uno."
      }
    },
    {
      page: "docs/case", after: "in-the-case-editor", name: "case-file",
      caption: {
        en: 'The File group of the case editor: the case file as text, completed from its own schema.',
        fr: "Le groupe Fichier de l'éditeur de dossier : le fichier de dossier en texte, complété d'après son propre schéma.",
        es: 'El grupo Archivo del editor de casos: el archivo del caso como texto, completado según su propio esquema.',
        it: "Il gruppo File dell'editor di casi: il file del caso come testo, completato secondo il suo schema."
      }
    },
    {
      page: "docs/interview", after: "in-the-interview-editor", name: "interview-summary",
      caption: {
        en: 'Summary: the witnesses, the medium, the date, the interviewers and what the interview established.',
        fr: "Résumé : les témoins, le moyen, la date, les enquêteurs et ce que l'interview a établi.",
        es: 'Resumen: los testigos, el medio, la fecha, los entrevistadores y lo que estableció la entrevista.',
        it: "Riassunto: i testimoni, il mezzo, la data, gli intervistatori e ciò che l'intervista ha stabilito."
      }
    },
    {
      page: "docs/interview", after: "in-the-interview-editor", name: "interview-exchanges",
      caption: {
        en: 'Exchanges: the interview as a dialogue, a turn that tells of a moment of the observation with its link.',
        fr: "Échanges : l'interview comme un dialogue, un tour qui raconte un moment de l'observation avec son lien.",
        es: 'Intercambios: la entrevista como un diálogo, un turno que cuenta un momento de la observación con su enlace.',
        it: "Scambi: l'intervista come un dialogo, un turno che racconta un momento dell'osservazione con il suo link."
      }
    },
    {
      page: "docs/interview", after: "in-the-interview-editor", name: "interview-file",
      caption: {
        en: 'File: the transcript as text, completed from its schema, to load from a file and to save.',
        fr: "Fichier : la transcription en texte, complétée d'après son schéma, à charger depuis un fichier et à sauver.",
        es: 'Archivo: la transcripción como texto, completada según su esquema, para cargar desde un archivo y guardar.',
        it: 'File: la trascrizione come testo, completata secondo il suo schema, da caricare da un file e salvare.'
      }
    },
    {
      page: "docs/create/interpretation", after: "in-the-case-editor", name: "case-add-interpretation",
      caption: {
        en: 'The dialog of the + button: the observation the new one is an interpretation of is chosen.',
        fr: "La boîte du bouton + : on choisit l'observation dont la nouvelle est l'interprétation.",
        es: 'El cuadro del botón +: se elige la observación de la que la nueva es interpretación.',
        it: "La finestra del pulsante +: si sceglie l'osservazione di cui la nuova è l'interpretazione."
      }
    },
    {
      page: "docs/create/interview", after: "in-the-case-editor", name: "case-add-interview",
      caption: {
        en: 'The dialog of the + button for an interview: the witness, the medium, the title, the interviewer and the date.',
        fr: "La boîte du bouton + pour une interview : le témoin, le moyen, le titre, l'enquêteur et la date.",
        es: 'El cuadro del botón + para una entrevista: el testigo, el medio, el título, el entrevistador y la fecha.',
        it: "La finestra del pulsante + per un'intervista: il testimone, il mezzo, il titolo, l'intervistatore e la data."
      }
    }
  ]

  /** The shots of one page, in the order the page lists them. */
  static of(slug: string): readonly Shot[] {
    return Shots.ALL.filter(shot => shot.page === slug)
  }

  /** The size of a shot's file, read from its WebP header (a lossy one: what cwebp writes), so that the page can
   * reserve the room before the picture arrives. Undefined when the file is not there. */
  static dimensions(url: string): { width: number, height: number } | undefined {
    try {
      const head = readFileSync(new URL(`.${url}`, import.meta.url)).subarray(0, 32)
      if (head.toString("ascii", 12, 16) !== "VP8 ") {
        return undefined
      }
      return { width: head.readUInt16LE(26) & 0x3fff, height: head.readUInt16LE(28) & 0x3fff }
    } catch {
      return undefined
    }
  }

  /** Where a shot is served from. */
  static url(shot: Shot, language: SiteLanguage): string {
    return `/shots/${shot.name}_${language}.webp`
  }

  /**
   * Puts each of a page's shots in front of the first paragraph after its heading, floated to the right and to the
   * left in turn so that a page does not read as a column of pictures down one side.
   *
   * A shot whose heading is not on the page fails the build, naming both: a picture quietly left out is a page
   * that is less illustrated than its translations, which nothing would ever show.
   */
  insert(html: string, slug: string, language: SiteLanguage): string {
    let result = html
    Shots.of(slug).forEach((shot, index) => {
      // "top" is a page with no heading to follow: the shot goes in front of its first paragraph.
      const heading = shot.after === "top" ? { index: result.indexOf("prose-wide"), 0: "prose-wide" } : new RegExp(`<(h[23])[^>]*\\sid="${shot.after}"[^>]*>[\\s\\S]*?</\\1>`).exec(result)
      if (!heading || heading.index < 0) {
        throw new Error(`/${slug}/ (${language}) has no heading #${shot.after} for the shot ${shot.name}`)
      }
      let file = Shots.url(shot, language)
      let dimensions = Shots.dimensions(file)
      if (!dimensions) {
        file = Shots.url(shot, FALLBACK_LANGUAGE)
        dimensions = Shots.dimensions(file)
      }
      if (!dimensions) {
        throw new Error(`site/shots/${shot.name}_${FALLBACK_LANGUAGE}.webp is missing: run scripts/site-shots/capture.mjs`)
      }
      const from = heading.index + heading[0].length
      const paragraph = result.indexOf("<p", from)
      if (paragraph < 0) {
        throw new Error(`/${slug}/ (${language}): no paragraph after #${shot.after} for the shot ${shot.name}`)
      }
      const side = index % 2 === 0 ? "right" : "left"
      const caption = shot.caption[language].replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
      const figure = `<figure class="shot shot-${side}"><img src="${file}" width="${dimensions.width}" height="${dimensions.height}" alt="${caption}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>\n`
      result = result.slice(0, paragraph) + figure + result.slice(paragraph)
    })
    return result
  }
}
