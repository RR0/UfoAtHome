import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "I have imagery, a relief, 3D models or a data service of my own. How do I use them in UFO@home?"
 *
 * A module: a manifest at an address, added in the editor or named by a recording, or a pull request into src/modules. What this page
 * says is what src/modules/ModuleManifest.ts, ModuleSession.ts and README.md do: it is to be changed with them.
 */
export class DocsModulesPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/modules",
    navLabel: { en: "Modules", fr: "Modules", es: "Módulos", it: "Moduli" },
    title: { en: "Extend UFO@home with modules", fr: "Étendre UFO@home avec des modules", es: "Ampliar UFO@home con módulos", it: "Estendere UFO@home con moduli" },
    description: {
      en: "Add your own imagery, relief, 3D models or data services: a manifest at an address, loaded in the editor or named by a recording.",
      fr: "Ajoutez votre imagerie, votre relief, vos modèles 3D ou vos services de données : un manifeste à une adresse, chargé dans l'éditeur ou nommé par un enregistrement.",
      es: "Añada sus propias imágenes, relieve, modelos 3D o servicios de datos: un manifiesto en una dirección, cargado en el editor o citado por una grabación.",
      it: "Aggiungi le tue immagini, il tuo rilievo, i tuoi modelli 3D o servizi di dati: un manifesto a un indirizzo, caricato nell'editor o citato da una registrazione."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "There is no account: a module is a file at an address of yours. The editor loads it, the recordings that need it name it.",
    fr: "Il n'y a pas de compte : un module est un fichier à une adresse qui est la vôtre. L'éditeur le charge, les enregistrements qui en ont besoin le nomment.",
    es: "No hay cuenta: un módulo es un archivo en una dirección suya. El editor lo carga, las grabaciones que lo necesitan lo citan.",
    it: "Non c'è un account: un modulo è un file a un tuo indirizzo. L'editor lo carica, le registrazioni che ne hanno bisogno lo citano."
  }

  private static readonly MANIFEST = `{
  "format": 1,
  "id": "acme",
  "name": "ACME surveys",
  "credit": "© ACME",
  "creditUrl": "https://acme.example",
  "contributes": {
    "imagery": [{
      "id": "acme-ortho", "name": "ACME ortho", "credit": "© ACME", "creditUrl": "https://acme.example/licence",
      "tiles": "https://tiles.acme.example/ortho/{z}/{x}/{y}.jpg"
    }],
    "elevation": [{
      "id": "acme-relief", "name": "ACME relief", "credit": "© ACME", "creditUrl": "https://acme.example/licence",
      "tiles": "relief/{z}/{x}/{y}.png"
    }],
    "models": [{
      "id": "acme-weather-balloon", "kind": "entity", "name": "Weather balloon",
      "file": "models/balloon.glb", "sizeM": { "widthM": 2, "lengthM": 2, "heightM": 2 },
      "credit": { "title": "Weather balloon", "author": "ACME", "license": "CC BY 4.0", "sourceUrl": "https://acme.example/models" }
    }]
  },
  "script": "module.js"
}`

  private static readonly SCRIPT = `// module.js: its default export returns more implementations, at any point.
export default ({ manifestUrl }) => ({
  weather: [{
    id: "acme-weather", name: "ACME weather", credit: "© ACME", creditUrl: "https://acme.example",
    create: () => ({ /* the methods of WeatherProvider */ })
  }]
})`

  private static readonly POINTS = "weather, place, timeZone, narrative, assessment, lightPollution, aircraft, upperAir, elevation, imagery, surroundings, decorModels, skyEvents"

  private static readonly SKY_EVENT = `// A kind of event of the sky: stated in recordings under skyEvents.ballLightning.
export default ({ three }) => ({
  skyEvents: [{
    id: "ballLightning", name: "Ball lightning", credit: "© ACME", creditUrl: "https://acme.example",
    create: () => ({
      key: "ballLightning",
      title: { en: "Ball lightning", fr: "Foudre en boule" },
      simulation: async () => () => {
        const object = new three.Group()
        return {
          object,
          drawnCount: 0,
          // Places and lights the events at t (ms), from frame.eye; draws nothing itself.
          update(events, t, frame) { /* … */ },
          dispose() { object.removeFromParent() }
        }
      },
      // Optional: the part of the Sky group that edits them.
      editor: async () => (container, host, language) => ({ sync() {}, refresh() {}, setTime(t) {}, async setLanguage(l) {} })
    })
  }]
})`

  render(language: SiteLanguage): string {
    const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const t = DocsModulesPage.TEXT[language]
    return this.hero(language, this.meta.title, this.lede) + `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${t.whatHeading}</h2>
    <p>${t.what}</p>
    <h2>${t.manifestHeading}</h2>
    <p>${t.manifest}</p>
    <pre><code>${escape(DocsModulesPage.MANIFEST)}</code></pre>
    <ul>
${t.fields.map(field => `      <li>${field}</li>`).join("\n")}
    </ul>
    <h2>${t.scriptHeading}</h2>
    <p>${t.script}</p>
    <pre><code>${escape(DocsModulesPage.SCRIPT)}</code></pre>
    <p>${t.points} <code>${DocsModulesPage.POINTS}</code>.</p>
    <p><strong>${t.trust}</strong></p>
    <h2>${t.skyHeading}</h2>
    <p>${t.sky}</p>
    <pre><code>${escape(DocsModulesPage.SKY_EVENT)}</code></pre>
    <h2>${t.editorHeading}</h2>
    <p>${t.editor}</p>
    <h2>${t.recordingHeading}</h2>
    <p>${t.recording}</p>
    <pre><code>${escape(`"modules": ["https://acme.example/ufo/ufoathome-module.json"]`)}</code></pre>
    <h2>${t.prHeading}</h2>
    <p>${t.pr}</p>
  </div>
</section>
`
  }

  private static readonly TEXT: Said<{
    whatHeading: string, what: string, manifestHeading: string, manifest: string, fields: string[], scriptHeading: string, script: string,
    points: string, trust: string, skyHeading: string, sky: string, editorHeading: string, editor: string, recordingHeading: string, recording: string, prHeading: string, pr: string
  }> = {
    en: {
      whatHeading: "What a module brings",
      what: "Sources of data (aerial imagery, ground relief, weather, air traffic…) and 3D models, each with the credit its licence requires. They join the built-in ones: in the editor's pickers after them, and in the scene wherever a recording names one of its models.",
      manifestHeading: "The manifest",
      manifest: "A JSON file, <code>ufoathome-module.json</code> by convention, readable from other sites (CORS). Its relative addresses are read from its own.",
      fields: [
        "<code>imagery</code>: tiles of ordinary images, <code>{z}</code>, <code>{x}</code> and <code>{y}</code> in the address in whatever order the service has them.",
        "<code>elevation</code>: tiles of relief encoded as Terrarium PNG (height = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: glTF or GLB files, each with its kind (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), its size and its credit, as in UFO@home's own catalogue.",
        "An <code>id</code> another module or UFO@home already gives at the same place is refused, for the whole module: give yours a prefix of your own."
      ],
      scriptHeading: "When it needs code",
      script: "A service whose answers have a shape of their own needs code: <code>script</code> names an ES module whose default export returns implementations of the interfaces of <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>.",
      points: "The places a module can add to:",
      trust: "A script runs with everything the page can do. It is run only for a module the person added themself, never for one a recording names.",
      skyHeading: "Simulating a kind of event of the sky",
      sky: "A kind of event of the sky (lightning, a rocket, a flare…) is what a recording states under <code>skyEvents.&lt;key&gt;</code>, drawn in the scene and edited in a part of the Sky group of its own. Its <code>simulation</code> gives the scene a three.js object and places it at every tick, from the instant and the frame the scene is in (where the eye is, the air, the ground, the wind); it never draws itself. Build it with the <code>three</code> the script is given, never a copy of your own. The beams of UFO@home are written this way, in <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\">src/modules/sky-events/beams</a>.",
      editorHeading: "Adding one in the editor",
      editor: "In the <strong>Files</strong> group, the <strong>Modules</strong> item: type the manifest's address and press <strong>Add</strong>. Your modules are kept in this browser, can be turned off or removed, and saved to a file (<strong>Save my modules</strong>) that loads them elsewhere (<strong>Load modules</strong>).",
      recordingHeading: "A recording that needs one",
      recording: "A recording that draws a model of a module names it, so that whoever opens it sees the same thing: tick <strong>Named by this recording</strong>, which writes its address in the file. A reader who did not add the module gets what its manifest states, without its script.",
      prHeading: "Into UFO@home itself",
      pr: "An implementation can also join UFO@home: each kind has its folder under <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>, whose README says what to write and where to list it. A pull request is welcome."
    },
    fr: {
      whatHeading: "Ce qu'un module apporte",
      what: "Des sources de données (imagerie aérienne, relief du sol, météo, trafic aérien…) et des modèles 3D, chacun avec le crédit que sa licence demande. Ils s'ajoutent à ceux d'UFO@home : dans les sélecteurs de l'éditeur, après eux, et dans la scène partout où un enregistrement nomme l'un de ses modèles.",
      manifestHeading: "Le manifeste",
      manifest: "Un fichier JSON, <code>ufoathome-module.json</code> par convention, lisible depuis d'autres sites (CORS). Ses adresses relatives se lisent depuis la sienne.",
      fields: [
        "<code>imagery</code> : des tuiles d'images ordinaires, <code>{z}</code>, <code>{x}</code> et <code>{y}</code> dans l'adresse dans l'ordre que le service leur donne.",
        "<code>elevation</code> : des tuiles de relief encodées en PNG Terrarium (hauteur = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code> : des fichiers glTF ou GLB, chacun avec sa sorte (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), sa taille et son crédit, comme dans le catalogue d'UFO@home.",
        "Un <code>id</code> qu'un autre module ou UFO@home donne déjà au même endroit est refusé, pour tout le module : donnez aux vôtres un préfixe à vous."
      ],
      scriptHeading: "Quand il faut du code",
      script: "Un service dont les réponses ont une forme à lui demande du code : <code>script</code> nomme un module ES dont l'export par défaut renvoie des implémentations des interfaces de <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>.",
      points: "Les endroits où un module peut ajouter :",
      trust: "Un script s'exécute avec tous les droits de la page. Il n'est exécuté que pour un module que la personne a ajouté elle-même, jamais pour un module qu'un enregistrement nomme.",
      skyHeading: "Simuler une sorte d'événement du ciel",
      sky: "Une sorte d'événement du ciel (un éclair, une fusée, une fusée éclairante…) est ce qu'un enregistrement énonce sous <code>skyEvents.&lt;clé&gt;</code>, dessiné dans la scène et édité dans une partie à elle du groupe Ciel. Sa <code>simulation</code> donne à la scène un objet three.js et le place à chaque image, d'après l'instant et le cadre où la scène se trouve (où est l'œil, l'air, le sol, le vent) ; elle ne dessine jamais elle-même. Construisez-la avec le <code>three</code> que reçoit le script, jamais une copie à vous. Les faisceaux d'UFO@home sont écrits ainsi, dans <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\">src/modules/sky-events/beams</a>.",
      editorHeading: "En ajouter un dans l'éditeur",
      editor: "Dans le groupe <strong>Fichiers</strong>, l'élément <strong>Modules</strong> : saisissez l'adresse du manifeste et appuyez sur <strong>Ajouter</strong>. Vos modules sont gardés dans ce navigateur, peuvent être désactivés ou retirés, et enregistrés dans un fichier (<strong>Enregistrer mes modules</strong>) qui les charge ailleurs (<strong>Charger des modules</strong>).",
      recordingHeading: "Un enregistrement qui en a besoin",
      recording: "Un enregistrement qui dessine un modèle d'un module le nomme, pour que qui l'ouvre voie la même chose : cochez <strong>Nommé par cet enregistrement</strong>, qui écrit son adresse dans le fichier. Un lecteur qui n'a pas ajouté le module en reçoit ce que son manifeste énonce, sans son script.",
      prHeading: "Dans UFO@home lui-même",
      pr: "Une implémentation peut aussi rejoindre UFO@home : chaque sorte a son dossier sous <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>, dont le README dit quoi écrire et où l'inscrire. Une pull request est la bienvenue."
    },
    es: {
      whatHeading: "Lo que aporta un módulo",
      what: "Fuentes de datos (imágenes aéreas, relieve del suelo, meteorología, tráfico aéreo…) y modelos 3D, cada uno con el crédito que pide su licencia. Se suman a los de UFO@home: en los selectores del editor, después de ellos, y en la escena allí donde una grabación cita uno de sus modelos.",
      manifestHeading: "El manifiesto",
      manifest: "Un archivo JSON, <code>ufoathome-module.json</code> por convención, legible desde otros sitios (CORS). Sus direcciones relativas se leen desde la suya.",
      fields: [
        "<code>imagery</code>: teselas de imágenes corrientes, con <code>{z}</code>, <code>{x}</code> e <code>{y}</code> en la dirección en el orden que el servicio les da.",
        "<code>elevation</code>: teselas de relieve codificadas en PNG Terrarium (altura = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: archivos glTF o GLB, cada uno con su tipo (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), su tamaño y su crédito, como en el catálogo de UFO@home.",
        "Un <code>id</code> que otro módulo o UFO@home ya da en el mismo lugar se rechaza, para todo el módulo: dé a los suyos un prefijo propio."
      ],
      scriptHeading: "Cuando hace falta código",
      script: "Un servicio cuyas respuestas tienen una forma propia necesita código: <code>script</code> cita un módulo ES cuya exportación por defecto devuelve implementaciones de las interfaces de <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>.",
      points: "Los lugares donde un módulo puede añadir:",
      trust: "Un script se ejecuta con todos los derechos de la página. Solo se ejecuta para un módulo que la persona añadió, nunca para uno que cita una grabación.",
      skyHeading: "Simular un tipo de evento del cielo",
      sky: "Un tipo de evento del cielo (un rayo, un cohete, una bengala…) es lo que una grabación declara en <code>skyEvents.&lt;clave&gt;</code>, dibujado en la escena y editado en una parte propia del grupo Cielo. Su <code>simulation</code> da a la escena un objeto three.js y lo coloca en cada imagen, según el instante y el marco en que está la escena (dónde está el ojo, el aire, el suelo, el viento); nunca dibuja por sí misma. Constrúyala con el <code>three</code> que recibe el script, nunca con una copia propia. Los haces de UFO@home están escritos así, en <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\">src/modules/sky-events/beams</a>.",
      editorHeading: "Añadir uno en el editor",
      editor: "En el grupo <strong>Archivos</strong>, el elemento <strong>Módulos</strong>: escriba la dirección del manifiesto y pulse <strong>Añadir</strong>. Sus módulos se guardan en este navegador, pueden desactivarse o quitarse, y guardarse en un archivo (<strong>Guardar mis módulos</strong>) que los carga en otro lugar (<strong>Cargar módulos</strong>).",
      recordingHeading: "Una grabación que lo necesita",
      recording: "Una grabación que dibuja un modelo de un módulo lo cita, para que quien la abra vea lo mismo: marque <strong>Citado por esta grabación</strong>, que escribe su dirección en el archivo. Un lector que no añadió el módulo recibe lo que su manifiesto declara, sin su script.",
      prHeading: "En el propio UFO@home",
      pr: "Una implementación también puede unirse a UFO@home: cada tipo tiene su carpeta en <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>, cuyo README dice qué escribir y dónde registrarlo. Una pull request es bienvenida."
    },
    it: {
      whatHeading: "Cosa porta un modulo",
      what: "Fonti di dati (immagini aeree, rilievo del suolo, meteo, traffico aereo…) e modelli 3D, ognuno con il credito che la sua licenza chiede. Si aggiungono a quelli di UFO@home: nei selettori dell'editor, dopo di essi, e nella scena ovunque una registrazione citi uno dei suoi modelli.",
      manifestHeading: "Il manifesto",
      manifest: "Un file JSON, <code>ufoathome-module.json</code> per convenzione, leggibile da altri siti (CORS). I suoi indirizzi relativi si leggono dal suo.",
      fields: [
        "<code>imagery</code>: tasselli di immagini comuni, con <code>{z}</code>, <code>{x}</code> e <code>{y}</code> nell'indirizzo nell'ordine che il servizio dà loro.",
        "<code>elevation</code>: tasselli di rilievo codificati in PNG Terrarium (altezza = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: file glTF o GLB, ognuno con il suo tipo (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), la sua misura e il suo credito, come nel catalogo di UFO@home.",
        "Un <code>id</code> che un altro modulo o UFO@home dà già nello stesso punto è rifiutato, per tutto il modulo: dai ai tuoi un prefisso tuo."
      ],
      scriptHeading: "Quando serve codice",
      script: "Un servizio le cui risposte hanno una forma propria richiede codice: <code>script</code> cita un modulo ES il cui export predefinito restituisce implementazioni delle interfacce di <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>.",
      points: "I punti a cui un modulo può aggiungere:",
      trust: "Uno script viene eseguito con tutti i diritti della pagina. Viene eseguito solo per un modulo che la persona ha aggiunto, mai per uno che una registrazione cita.",
      skyHeading: "Simulare un tipo di evento del cielo",
      sky: "Un tipo di evento del cielo (un fulmine, un razzo, un bengala…) è ciò che una registrazione dichiara sotto <code>skyEvents.&lt;chiave&gt;</code>, disegnato nella scena e modificato in una parte propria del gruppo Cielo. La sua <code>simulation</code> dà alla scena un oggetto three.js e lo colloca a ogni immagine, secondo l'istante e il quadro in cui si trova la scena (dov'è l'occhio, l'aria, il suolo, il vento); non disegna mai da sé. Costruiscila con il <code>three</code> che lo script riceve, mai con una copia tua. I fasci di UFO@home sono scritti così, in <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\">src/modules/sky-events/beams</a>.",
      editorHeading: "Aggiungerne uno nell'editor",
      editor: "Nel gruppo <strong>File</strong>, la voce <strong>Moduli</strong>: scrivi l'indirizzo del manifesto e premi <strong>Aggiungi</strong>. I tuoi moduli sono conservati in questo browser, possono essere disattivati o rimossi, e salvati in un file (<strong>Salva i miei moduli</strong>) che li carica altrove (<strong>Carica moduli</strong>).",
      recordingHeading: "Una registrazione che ne ha bisogno",
      recording: "Una registrazione che disegna un modello di un modulo lo cita, perché chi la apre veda la stessa cosa: spunta <strong>Citato da questa registrazione</strong>, che scrive il suo indirizzo nel file. Un lettore che non ha aggiunto il modulo riceve ciò che il suo manifesto dichiara, senza il suo script.",
      prHeading: "In UFO@home stesso",
      pr: "Un'implementazione può anche entrare in UFO@home: ogni tipo ha la sua cartella in <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\">src/modules</a>, il cui README dice cosa scrivere e dove registrarlo. Una pull request è benvenuta."
    }
  }
}
