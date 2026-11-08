import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** One place a module can add to: its id, what it brings in each language, and the file that says what an implementation of it gives. */
interface ExtensionPointRow {
  point: string
  what: Said<string>
  interfacePath: string
}

/**
 * "I have a weather service, or a phenomenon to draw in the sky. How do I add it?"
 *
 * A guide that shows how, through two worked examples, and ends on the pull request. Its excerpts are public so that
 * test/modules/DocsModulesPage.test.ts runs them against ModuleManifest, WeatherProvider and SkyEventKind: what this page shows has to work.
 */
export class DocsModulesPage extends DocsSection {

  private static readonly SOURCE = "https://github.com/RR0/UfoAtHome/blob/master/"

  readonly meta: PageMeta = {
    slug: "docs/modules",
    navLabel: { en: "Modules", fr: "Modules", es: "Módulos", it: "Moduli" },
    title: { en: "Add your own modules", fr: "Ajouter vos propres modules", es: "Añadir sus propios módulos", it: "Aggiungere i tuoi moduli" },
    description: {
      en: "How to add a weather source, draw a phenomenon in the sky or bring your own imagery, relief and 3D models, step by step and with code that works.",
      fr: "Comment ajouter une source météo, dessiner un phénomène dans le ciel ou apporter votre imagerie, votre relief et vos modèles 3D, pas à pas et avec du code qui marche.",
      es: "Cómo añadir una fuente meteorológica, dibujar un fenómeno en el cielo o aportar sus imágenes, su relieve y sus modelos 3D, paso a paso y con código que funciona.",
      it: "Come aggiungere una fonte meteo, disegnare un fenomeno nel cielo o portare le tue immagini, il tuo rilievo e i tuoi modelli 3D, passo dopo passo e con codice che funziona."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "A weather service, something to draw in the sky, a relief, 3D models: you can add them without an account and without touching this project's code. All it takes is a folder at an address of yours.",
    fr: "Un service météo, quelque chose à dessiner dans le ciel, un relief, des modèles 3D : vous pouvez les ajouter sans compte et sans toucher au code du projet. Il suffit d'un dossier à une adresse qui est la vôtre.",
    es: "Un servicio meteorológico, algo que dibujar en el cielo, un relieve, modelos 3D: puede añadirlos sin cuenta y sin tocar el código del proyecto. Basta con una carpeta en una dirección suya.",
    it: "Un servizio meteo, qualcosa da disegnare nel cielo, un rilievo, modelli 3D: puoi aggiungerli senza account e senza toccare il codice del progetto. Basta una cartella a un tuo indirizzo."
  }

  static readonly WEATHER_MANIFEST = `{
  "format": 1,
  "id": "acme",
  "name": "ACME Weather",
  "credit": "© ACME",
  "creditUrl": "https://acme.example",
  "script": "module.js"
}`

  static readonly WEATHER_SCRIPT = `class AcmeWeather {
  // UFO@home gives the instants to describe, with where the witness was.
  async getWeather({ points }) {
    const samples = []
    let url
    for (const { lat, lng, time } of points) {
      const at = time.toISOString()
      url = \`https://api.acme.example/history?lat=\${lat}&lon=\${lng}&at=\${at}\`
      const response = await fetch(url)
      // No record there, a normal answer; not to be confused with a failure.
      if (response.status === 404) return undefined
      if (!response.ok) throw new Error(\`ACME: HTTP \${response.status}\`)
      const record = await response.json()
      samples.push({
        time,
        weather: {
          cloudCover: record.cloudPercent / 100, // 0 to 1
          cloudDarkness: record.cloudPercent / 200, // 0 to 1
          precipitationType: record.rainMm > 0 ? "rain" : "none",
          precipitationIntensity: Math.min(record.rainMm / 8, 1), // 0 to 1
          windSpeed: record.windKmh / 3.6, // metres a second
          windDirectionDeg: (record.windFromDeg + 180) % 360, // blowing TOWARDS
          storm: record.thunder
        }
      })
    }
    return { samples, source: { id: "acme-weather", name: "ACME Weather", url } }
  }
}

// The default export: what this module adds, by the place it adds it to.
export default () => ({
  weather: [{
    id: "acme-weather",
    name: "ACME Weather",
    credit: "© ACME",
    creditUrl: "https://acme.example/terms",
    create: () => new AcmeWeather()
  }]
})`

  static readonly SKY_SCRIPT = `const METRES_PER_DEGREE = 111320
const LUMINANCE = 20000 // candelas per square metre

class BallLightning {
  constructor(three) {
    this.three = three
    this.geometry = new three.SphereGeometry(1, 24, 16)
    this.object = new three.Group() // What the scene holds. It draws it itself.
    this.drawnCount = 0
  }

  // Called at every tick: places and lights the events as they are at t (ms).
  update(events, t, frame) {
    const lit = events.filter(event => t >= event.startMs && t <= event.endMs)
    while (this.object.children.length < lit.length) {
      const material = new this.three.MeshBasicMaterial({ fog: false })
      this.object.add(new this.three.Mesh(this.geometry, material))
    }
    this.object.children.forEach((ball, i) => {
      const event = lit[i]
      ball.visible = event !== undefined
      if (!event) return
      const along = (t - event.startMs) / (event.endMs - event.startMs)
      const between = key =>
        event.from[key] + (event.to[key] - event.from[key]) * along
      // From the Earth to the scene, in metres: x east, y up, z south.
      const { reference } = frame
      const degreeEast = METRES_PER_DEGREE * Math.cos(reference.lat * Math.PI / 180)
      const eastM = (between("lng") - reference.lng) * degreeEast
      const northM = (between("lat") - reference.lat) * METRES_PER_DEGREE
      const x = frame.origin.x + eastM * frame.eastScale
      const y = between("altitudeM") - frame.siteElevationM
      const z = frame.origin.z - northM
      ball.position.set(x, y, z)
      ball.scale.setScalar(event.radiusM)
      // Its light in the scene's units, as much as the air lets through.
      const [r, g, b] = frame.transmittanceTo(x, y, z)
      const light = LUMINANCE * frame.relativeScale
      ball.material.color.setRGB(light * r, light * g * 0.9, light * b * 0.6)
    })
    this.drawnCount = lit.length
  }

  dispose() {
    this.geometry.dispose()
    for (const ball of this.object.children) ball.material.dispose()
    this.object.removeFromParent()
  }
}

export default ({ three }) => ({
  skyEvents: [{
    id: "ballLightning", // The same as the key below.
    name: "Ball lightning",
    credit: "© ACME",
    creditUrl: "https://acme.example/terms",
    create: () => ({
      key: "ballLightning", // Where a recording states them: skyEvents.<key>.
      messages: {
        load: async language => {
          const file = language.startsWith("fr") ? "fr" : "en"
          return (await import(\`./messages/\${file}.js\`)).default
        }
      },
      simulation: async () => () => new BallLightning(three)
    })
  }]
})`

  static readonly SKY_MESSAGES = `// messages/en.js, and one such file per language
export default { title: "Ball lightning", name: "Ball lightning" }`

  static readonly SKY_RECORDING = `{
  "modules": ["https://acme.example/ufo/ufoathome-module.json"],
  "skyEvents": {
    "ballLightning": [{
      "id": "ball-1",
      "from": { "lat": 48.8062, "lng": 2.2355, "altitudeM": 230 },
      "to": { "lat": 48.8068, "lng": 2.2385, "altitudeM": 210 },
      "startMs": 2000,
      "endMs": 18000,
      "radiusM": 3
    }]
  }
}`

  static readonly NO_CODE_MANIFEST = `{
  "format": 1,
  "id": "acme",
  "name": "ACME surveys",
  "credit": "© ACME",
  "creditUrl": "https://acme.example",
  "contributes": {
    "imagery": [
      {
        "id": "acme-ortho",
        "name": "ACME ortho",
        "credit": "© ACME",
        "creditUrl": "https://acme.example/licence",
        "tiles": "https://tiles.acme.example/ortho/{z}/{x}/{y}.jpg"
      }
    ],
    "elevation": [
      {
        "id": "acme-relief",
        "name": "ACME relief",
        "credit": "© ACME",
        "creditUrl": "https://acme.example/licence",
        "tiles": "relief/{z}/{x}/{y}.png"
      }
    ],
    "models": [
      {
        "id": "acme-weather-balloon",
        "kind": "entity",
        "name": "Weather balloon",
        "file": "models/balloon.glb",
        "sizeM": {
          "widthM": 2,
          "lengthM": 2,
          "heightM": 2
        },
        "credit": {
          "title": "Weather balloon",
          "author": "ACME",
          "license": "CC BY 4.0",
          "sourceUrl": "https://acme.example/models"
        }
      }
    ]
  }
}`

  private static readonly SERVE = "npx http-server --cors -c-1 -p 8000"

  /** Every place a module can add to, in the order of ModuleRegistry's ExtensionPointTypes. */
  static readonly POINTS: readonly ExtensionPointRow[] = [
    { point: "weather", interfacePath: "src/engine/weather/WeatherProvider.ts", what: { en: "The weather of a place and a date", fr: "La météo d'un lieu à une date", es: "El tiempo de un lugar en una fecha", it: "Il meteo di un luogo a una data" } },
    { point: "place", interfacePath: "src/engine/place/PlaceProvider.ts", what: { en: "Place names and their coordinates", fr: "Les noms de lieux et leurs coordonnées", es: "Los nombres de lugares y sus coordenadas", it: "I nomi dei luoghi e le loro coordinate" } },
    { point: "timeZone", interfacePath: "src/engine/time/TimeZoneProvider.ts", what: { en: "The time zone of a place at a date", fr: "Le fuseau horaire d'un lieu à une date", es: "La zona horaria de un lugar en una fecha", it: "Il fuso orario di un luogo a una data" } },
    { point: "narrative", interfacePath: "src/engine/narrative/NarrativeProvider.ts", what: { en: "Drafting a recording from an account in prose", fr: "La rédaction d'un enregistrement d'après un récit", es: "La redacción de una grabación a partir de un relato", it: "La stesura di una registrazione da un racconto" } },
    { point: "assessment", interfacePath: "src/engine/assessment/Assessor.ts", what: { en: "A scheme to assess a recording by", fr: "Une méthode d'évaluation d'un enregistrement", es: "Un método de evaluación de una grabación", it: "Un metodo di valutazione di una registrazione" } },
    { point: "lightPollution", interfacePath: "src/engine/atmosphere/LightPollutionProvider.ts", what: { en: "The artificial brightness of the night sky", fr: "La luminosité artificielle du ciel nocturne", es: "El brillo artificial del cielo nocturno", it: "La luminosità artificiale del cielo notturno" } },
    { point: "aircraft", interfacePath: "src/engine/traffic/AircraftProvider.ts", what: { en: "The aircraft that were flying round a place", fr: "Les avions qui volaient autour d'un lieu", es: "Los aviones que volaban alrededor de un lugar", it: "Gli aerei che volavano intorno a un luogo" } },
    { point: "upperAir", interfacePath: "src/engine/traffic/UpperAirProvider.ts", what: { en: "The profile of the air aloft, for contrails", fr: "Le profil de l'air en altitude, pour les traînées", es: "El perfil del aire en altura, para las estelas", it: "Il profilo dell'aria in quota, per le scie" } },
    { point: "elevation", interfacePath: "src/render3d/terrain/ElevationProvider.ts", what: { en: "The relief of the ground", fr: "Le relief du sol", es: "El relieve del suelo", it: "Il rilievo del suolo" } },
    { point: "imagery", interfacePath: "src/render3d/terrain/ImageryProvider.ts", what: { en: "The aerial imagery over the relief", fr: "L'imagerie aérienne posée sur le relief", es: "Las imágenes aéreas sobre el relieve", it: "Le immagini aeree sul rilievo" } },
    { point: "surroundings", interfacePath: "src/render3d/terrain/SurroundingsProvider.ts", what: { en: "The trees, buildings and lines round a place", fr: "Les arbres, bâtiments et lignes autour d'un lieu", es: "Los árboles, edificios y líneas alrededor de un lugar", it: "Gli alberi, gli edifici e le linee intorno a un luogo" } },
    { point: "decorModels", interfacePath: "src/render3d/decor/DecorModelProvider.ts", what: { en: "A catalogue of 3D models", fr: "Un catalogue de modèles 3D", es: "Un catálogo de modelos 3D", it: "Un catalogo di modelli 3D" } },
    { point: "skyEvents", interfacePath: "src/modules/sky-events/SkyEventKind.ts", what: { en: "A type of event of the sky, drawn and edited", fr: "Un type d'événement du ciel, dessiné et édité", es: "Un tipo de evento del cielo, dibujado y editado", it: "Un tipo di evento del cielo, disegnato e modificato" } },
    { point: "interpretations", interfacePath: "src/modules/interpretations/InterpretationKind.ts", what: { en: "A type of interpretation, computed into bodies", fr: "Un type d'interprétation, calculé en corps", es: "Un tipo de interpretación, calculado en cuerpos", it: "Un tipo di interpretazione, calcolato in corpi" } },
    { point: "perception", interfacePath: "src/engine/observer/ObserverProvider.ts", what: { en: "What bends a witness's perception", fr: "Ce qui modifie la perception d'un témoin", es: "Lo que altera la percepción de un testigo", it: "Ciò che altera la percezione di un testimone" } }
  ]

  script(): string {
    return this.excerptsScript()
  }

  render(language: SiteLanguage): string {
    const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const javascript = (code: string): string => `<pre data-code="javascript"><code>${escape(code)}</code></pre>`
    const list = (items: readonly string[]): string => `<ul>\n${items.map(item => `      <li>${item}</li>`).join("\n")}\n    </ul>`
    const steps = (items: readonly string[]): string => `<ol>\n${items.map(item => `      <li>${item}</li>`).join("\n")}\n    </ol>`
    const t = DocsModulesPage.TEXT[language]
    return this.hero(language, this.meta.title, this.lede) + `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${t.howHeading}</h2>
    <p>${t.how}</p>
    ${list(t.wants)}

    <h2 id="weather">${t.weatherHeading}</h2>
    <p>${t.weather}</p>
    <h3>${t.manifestStep}</h3>
    <p>${t.manifest}</p>
    <pre data-json="" data-schema="module"><code>${escape(DocsModulesPage.WEATHER_MANIFEST)}</code></pre>
    <h3>${t.codeStep}</h3>
    <p>${t.weatherCode}</p>
    ${javascript(DocsModulesPage.WEATHER_SCRIPT)}
    <p>${t.weatherRulesIntro}</p>
    ${list(t.weatherRules)}
    <h3>${t.tryStep}</h3>
    <p>${t.serve}</p>
    <pre><code>${DocsModulesPage.SERVE}</code></pre>
    ${steps(t.tryWeather)}
    <p>${t.tryTrouble}</p>
    <h3>${t.publishStep}</h3>
    <p>${t.publish}</p>

    <h2 id="sky">${t.skyHeading}</h2>
    <p>${t.sky}</p>
    <h3>${t.codeStep}</h3>
    <p>${t.skyCode}</p>
    ${javascript(DocsModulesPage.SKY_SCRIPT)}
    <p>${t.skyMessages}</p>
    ${javascript(DocsModulesPage.SKY_MESSAGES)}
    <h3>${t.skyStateStep}</h3>
    <p>${t.skyState}</p>
    <pre data-json=""><code>${escape(DocsModulesPage.SKY_RECORDING)}</code></pre>
    <h3>${t.tryStep}</h3>
    ${steps(t.trySky)}
    <h3>${t.skyFurtherStep}</h3>
    <p>${t.skyFurtherIntro}</p>
    ${list(t.skyFurther)}
    <p>${t.reading}</p>

    <h2 id="no-code">${t.noCodeHeading}</h2>
    <p>${t.noCode}</p>
    <pre data-json="" data-schema="module"><code>${escape(DocsModulesPage.NO_CODE_MANIFEST)}</code></pre>
    ${list(t.noCodeFields)}

    <h2 id="sharing">${t.shareHeading}</h2>
    <p>${t.share}</p>
    ${list(t.shareCases)}

    <h2 id="points">${t.pointsHeading}</h2>
    <p>${t.points}</p>
    <div class="table-scroll"><table>
      <thead><tr><th>${t.pointsKey}</th><th>${t.pointsWhat}</th><th>${t.pointsInterface}</th></tr></thead>
      <tbody>
${DocsModulesPage.POINTS.map(row => `        <tr><td><code>${row.point}</code></td><td>${row.what[language]}</td><td><a href="${DocsModulesPage.SOURCE}${row.interfacePath}"><code>${row.interfacePath.split("/").pop()}</code></a></td></tr>`).join("\n")}
      </tbody>
    </table></div>

    <h2 id="pull-request">${t.prHeading}</h2>
    <p>${t.pr}</p>
    ${steps(t.prSteps)}
    <p>${t.prEnd}</p>
  </div>
</section>
`
  }

  private static readonly TEXT: Said<{
    howHeading: string, how: string, wants: string[],
    weatherHeading: string, weather: string, manifestStep: string, manifest: string, codeStep: string, weatherCode: string,
    weatherRulesIntro: string, weatherRules: string[], tryStep: string, serve: string, tryWeather: string[], tryTrouble: string, publishStep: string, publish: string,
    skyHeading: string, sky: string, skyCode: string, skyMessages: string, skyStateStep: string, skyState: string, trySky: string[],
    skyFurtherStep: string, skyFurtherIntro: string, skyFurther: string[], reading: string,
    noCodeHeading: string, noCode: string, noCodeFields: string[],
    shareHeading: string, share: string, shareCases: string[],
    pointsHeading: string, points: string, pointsKey: string, pointsWhat: string, pointsInterface: string,
    prHeading: string, pr: string, prSteps: string[], prEnd: string
  }> = {
    en: {
      howHeading: "What you need",
      how: "A module is a folder you publish on the web. It holds a small file, <code>ufoathome-module.json</code>, which says what the module is, and, when code is needed, a JavaScript file. Anyone who pastes the address of that JSON file into the editor gets what it brings. What you write depends on what you want to add:",
      wants: [
        "<strong>A source of data that answers in its own way</strong> (weather, place names, air traffic…): a little code that asks it and translates its answers. <a href=\"#weather\">See the weather example.</a>",
        "<strong>Something to draw in the sky</strong>: a little code with three.js, which the scene calls at every tick. <a href=\"#sky\">See the ball lightning example.</a>",
        "<strong>Map tiles, a relief or 3D models</strong>: no code, the JSON file is enough. <a href=\"#no-code\">See below.</a>"
      ],
      weatherHeading: "Example: add a weather source",
      weather: "Say a service called ACME knows the weather of the past, and answers <code>https://api.acme.example/history?lat=…&amp;lon=…&amp;at=…</code> with <code>{ \"cloudPercent\": 70, \"rainMm\": 0, \"windKmh\": 36, \"windFromDeg\": 270, \"thunder\": false }</code>. Once this is done, it will appear in the editor's weather picker, beside the record UFO@home offers.",
      manifestStep: "1. Describe the module",
      manifest: "In an empty folder, create <code>ufoathome-module.json</code>. Choose an <code>id</code> of your own, in lowercase. <code>script</code> names the code, relative to this file.",
      codeStep: "2. Write the code",
      weatherCode: "Next to it, create <code>module.js</code>. It holds a class that translates ACME's answers into what UFO@home expects, and a default export that declares it, with the credit that ACME's licence asks for.",
      weatherRulesIntro: "This is where a mistake would go unnoticed, so read what you translate with care:",
      weatherRules: [
        "<strong>Units.</strong> Cover and intensity go from 0 to 1, and the wind is in metres a second.",
        "<strong>The wind's direction is reversed.</strong> <code>windDirectionDeg</code> is where the wind blows <em>towards</em>, in degrees clockwise from north, while most services give where it comes from. Hence the 180° above.",
        "<strong>One sample per point, in the same order.</strong> There is one per hour of the observation, up to 25. If your service can answer several instants in a single request, use that rather than this loop.",
        "<strong>No record is not a failure.</strong> Return <code>undefined</code> when the service has nothing for that place and date (the editor says so, and the fields stay editable), and throw when it could not be asked.",
        "<strong><code>source</code> is what the recording will keep.</strong> Its <code>id</code> is the one you declared, and its <code>url</code> the exact request, so that the value can be checked years later.",
        "<strong>The other fields are optional.</strong> Cloud layers, cloud base, humidity: see <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/engine/model/Weather.ts\"><code>Weather.ts</code></a>."
      ],
      tryStep: "3. Try it",
      serve: "Serve the folder locally. <code>--cors</code> lets other sites read it, and <code>-c-1</code> turns off the cache, so that a reload picks up your changes:",
      tryWeather: [
        "Open <a href=\"/edit/\">the editor</a>, in Chrome or Firefox (Safari refuses a local address from a secure page), and state a place and a date: the weather is only asked for once it knows both.",
        "In the <strong>Files</strong> group, choose <strong>Modules</strong>, paste <code>http://localhost:8000/ufoathome-module.json</code> and press <strong>Add</strong>. Your module is listed with what it brings: “weather (1)”.",
        "In the <strong>Sky</strong> group, choose <strong>ACME Weather</strong> in the weather picker. The values change, and the link beside them is your request."
      ],
      tryTrouble: "If it does not work: a module that cannot be read says why in its line of the list, and for the rest the browser's console tells what your code threw. The usual cause is CORS: <strong>the requests are made by the reader's browser</strong>, so your service must allow other sites to call it. For the same reason, never put a private key in <code>module.js</code>: anyone can read it.",
      publishStep: "4. Publish it",
      publish: "Put the folder on any host that lets other sites read it (GitHub Pages does) and give out the address of its <code>ufoathome-module.json</code>. Those who add it keep it in their browser, can turn it off or remove it, and can save their list of modules to a file to load it elsewhere. <strong>A script runs with everything the page can do</strong>, so the editor warns them to add only what comes from an author they know: say who you are.",
      skyHeading: "Example: draw a phenomenon in the sky",
      sky: "Here, a ball of light that crosses the sky. What was really there, whether or not anybody saw it (lightning, a rocket, a laser), is called an <em>event of the sky</em> in UFO@home, and a recording states it under <code>skyEvents</code>. You give the type of event its key and the code that draws it.",
      skyCode: "The manifest is the same as before. In <code>module.js</code>, the simulation is an object that UFO@home builds once, the first time a recording holds such an event, then calls at every tick. <code>three</code> is given to the script: use it rather than your own copy of three.js, whose objects the scene's renderer would not recognise.",
      skyMessages: "Its texts live in one file per language, loaded only in the reader's: <code>title</code> is what its part of the editor is called, <code>name</code> what one with no title of its own is called.",
      skyStateStep: "State it in a recording",
      skyState: "Each event has an <code>id</code>, then whatever your code reads: you decide what the rest is. <code>modules</code> names the module, so that the recording finds it.",
      trySky: [
        "Serve the folder and add the module to the editor, as for the weather.",
        "Open a recording that has a place and a date. In <strong>Files</strong>, <strong>Recording</strong>, add the excerpt above to its text, with coordinates in front of the witness.",
        "Move the playhead between 2 and 18 seconds: the ball crosses the picture, in front of whatever is further away."
      ],
      skyFurtherStep: "Going further",
      skyFurtherIntro: "This kind of event is drawn but has no form in the editor, and the pointer does not pick it. All of that is optional, and is added to the same object:",
      skyFurther: [
        "<code>editor</code>: a part of its own in the <strong>Sky</strong> group, to edit the events without writing JSON.",
        "<code>pick</code> on the simulation and <code>describe</code> on the type: what the tooltip says when the pointer is over it.",
        "<code>reachM</code>: how far it goes, for an event far from the witness, so that the ground and the scene are built that far.",
        "<code>frame.lightFrom</code> and <code>frame.glareFrom</code>: light the ground and dazzle the eye. <code>frame</code> also gives the real instant, the true position of the witness, the wind, the ground under a point and the faintest magnitude seen.",
        "<code>inSky</code> on the simulation: drawn on the sky's shell round the eye, like the stars, rather than in the scene's metres."
      ],
      reading: "All of it is in <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/sky-events/SkyEventKind.ts\"><code>SkyEventKind.ts</code></a>, and the beams, launches and fireballs of UFO@home are written this way: <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\"><code>sky-events/beams</code></a> makes a good model. If what you are drawing is not a fact but what somebody claims the witness saw (sky lanterns let go from a garden, flares dropped by an aircraft), it is rather an interpretation: see <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/interpretations/InterpretationKind.ts\"><code>InterpretationKind.ts</code></a>, stated under <code>interpretation.&lt;key&gt;</code>, whose <code>bodiesOf(item)</code> computes the bodies to show from a few parameters.",
      noCodeHeading: "Without code: imagery, relief, 3D models",
      noCode: "Tiles and models need nothing more than the manifest, under <code>contributes</code>. Its addresses can be relative to the manifest's own. The manifest below knows its format: put the caret inside an object and press <kbd>Ctrl</kbd>+<kbd>Space</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> on a Mac) to list every key that could go there, with what each means.",
      noCodeFields: [
        "<code>imagery</code>: tiles of ordinary images. The address holds <code>{z}</code>, <code>{x}</code> and <code>{y}</code>, in the order the service has them.",
        "<code>elevation</code>: tiles of relief as Terrarium PNG (height = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: glTF or GLB files, each with its type (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), its size and its credit.",
        "An <code>id</code> that UFO@home or another module already gives at the same place is refused, for the whole module: give yours a prefix of your own."
      ],
      shareHeading: "Sharing a recording that needs your module",
      share: "A recording names the modules it needs under <code>modules</code>, by their addresses. Opening someone's file must not run someone's code, so a reader gets what the manifest states, and <strong>the script only if they added the module themselves</strong>. What this means, depending on what you brought:",
      shareCases: [
        "<strong>A data source</strong>: nothing to do. The values are written in the recording, with where they came from.",
        "<strong>Tiles and 3D models</strong>: they work for everyone, since they are in the manifest. The editor names the module as soon as one of its models is used, relative to the recording when both are on the same site, and <strong>Named by this recording</strong> takes it back.",
        "<strong>An event of the sky</strong>: you write <code>modules</code> yourself, and the reader has to add your module to see it. Without it nothing is drawn, and the file keeps what it states. The editor shows them <strong>Add to my modules</strong> beside the module the recording names."
      ],
      pointsHeading: "Everything a module can add to",
      points: "The weather and the sky are two of the fifteen places. The others work the same way: a key in what the script returns, the same entry (<code>id</code>, <code>name</code>, <code>credit</code>, <code>creditUrl</code>, <code>create</code>), and a class that gives what the interface asks for.",
      pointsKey: "Key",
      pointsWhat: "What it adds",
      pointsInterface: "What to give",
      prHeading: "Or propose it to the project",
      pr: "If your source or your simulation can serve everyone, it can also join UFO@home itself, with a pull request on <a href=\"https://github.com/RR0/UfoAtHome\">the repository</a>. The code hardly changes:",
      prSteps: [
        "Put the class in the folder of its type under <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\"><code>src/modules</code></a>.",
        "Add its entry to that folder's <code>*Sources.ts</code>, with its credit and the link its licence asks for.",
        "Take its texts from a <code>MessageCatalog</code>, in all four languages. Add a row to the privacy page if it sends anything anywhere.",
        "Run <code>npm test</code>."
      ],
      prEnd: "The <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/README.md\">README of that folder</a> gives the details. <a href=\"https://github.com/RR0/UfoAtHome/pulls\">Pull requests</a> are welcome, and so is a question beforehand if you are not sure where something goes."
    },
    fr: {
      howHeading: "Ce qu'il vous faut",
      how: "Un module est un dossier que vous publiez sur le web. Il contient un petit fichier, <code>ufoathome-module.json</code>, qui dit ce qu'est le module, et, quand il faut du code, un fichier JavaScript. Quiconque colle l'adresse de ce fichier JSON dans l'éditeur reçoit ce qu'il apporte. Ce que vous écrivez dépend de ce que vous voulez ajouter :",
      wants: [
        "<strong>Une source de données qui répond à sa façon</strong> (météo, noms de lieux, trafic aérien…) : un peu de code qui l'interroge et traduit ses réponses. <a href=\"#weather\">Voir l'exemple de la météo.</a>",
        "<strong>Quelque chose à dessiner dans le ciel</strong> : un peu de code avec three.js, que la scène appelle à chaque image. <a href=\"#sky\">Voir l'exemple de la boule de foudre.</a>",
        "<strong>Des tuiles de carte, un relief ou des modèles 3D</strong> : pas de code, le fichier JSON suffit. <a href=\"#no-code\">Voir plus bas.</a>"
      ],
      weatherHeading: "Exemple : ajouter une source météo",
      weather: "Disons qu'un service nommé ACME connaît la météo du passé et répond à <code>https://api.acme.example/history?lat=…&amp;lon=…&amp;at=…</code> par <code>{ \"cloudPercent\": 70, \"rainMm\": 0, \"windKmh\": 36, \"windFromDeg\": 270, \"thunder\": false }</code>. Une fois ceci fait, il apparaîtra dans le sélecteur de météo de l'éditeur, à côté de celle qu'UFO@home propose.",
      manifestStep: "1. Décrire le module",
      manifest: "Dans un dossier vide, créez <code>ufoathome-module.json</code>. Choisissez un <code>id</code> à vous, en minuscules. <code>script</code> nomme le code, relativement à ce fichier.",
      codeStep: "2. Écrire le code",
      weatherCode: "À côté, créez <code>module.js</code>. Il contient une classe qui traduit les réponses d'ACME en ce qu'UFO@home attend, et un export par défaut qui la déclare, avec le crédit que demande la licence d'ACME.",
      weatherRulesIntro: "C'est ici qu'une erreur passerait inaperçue, alors traduisez avec soin :",
      weatherRules: [
        "<strong>Les unités.</strong> La couverture et l'intensité vont de 0 à 1, et le vent est en mètres par seconde.",
        "<strong>La direction du vent est inversée.</strong> <code>windDirectionDeg</code> dit vers où le vent souffle, en degrés depuis le nord dans le sens horaire, alors que la plupart des services disent d'où il vient. D'où les 180° ci-dessus.",
        "<strong>Un échantillon par point, dans le même ordre.</strong> Il y en a un par heure d'observation, jusqu'à 25. Si votre service peut répondre à plusieurs instants en une seule requête, utilisez cela plutôt que cette boucle.",
        "<strong>Pas de relevé n'est pas un échec.</strong> Renvoyez <code>undefined</code> quand le service n'a rien pour ce lieu et cette date (l'éditeur le dit, et les champs restent modifiables), et levez une erreur quand il n'a pas pu être interrogé.",
        "<strong><code>source</code> est ce que l'enregistrement gardera.</strong> Son <code>id</code> est celui que vous avez déclaré, et son <code>url</code> la requête exacte, pour que la valeur reste vérifiable des années plus tard.",
        "<strong>Les autres champs sont facultatifs.</strong> Couches de nuages, base des nuages, humidité : voir <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/engine/model/Weather.ts\"><code>Weather.ts</code></a>."
      ],
      tryStep: "3. Essayer",
      serve: "Servez le dossier en local. <code>--cors</code> permet aux autres sites de le lire, et <code>-c-1</code> désactive le cache, pour qu'un rechargement prenne vos modifications :",
      tryWeather: [
        "Ouvrez <a href=\"/edit/\">l'éditeur</a>, dans Chrome ou Firefox (Safari refuse une adresse locale depuis une page sécurisée), et indiquez un lieu et une date : la météo n'est demandée qu'une fois les deux connus.",
        "Dans le groupe <strong>Fichiers</strong>, choisissez <strong>Modules</strong>, collez <code>http://localhost:8000/ufoathome-module.json</code> et appuyez sur <strong>Ajouter</strong>. Votre module s'affiche avec ce qu'il apporte : « météo (1) ».",
        "Dans le groupe <strong>Ciel</strong>, choisissez <strong>ACME Weather</strong> dans le sélecteur de météo. Les valeurs changent, et le lien à côté d'elles est votre requête."
      ],
      tryTrouble: "Si ça ne marche pas : un module illisible dit pourquoi sur sa ligne de la liste, et pour le reste, la console du navigateur dit ce que votre code a levé. La cause habituelle est CORS : <strong>les requêtes sont faites par le navigateur du lecteur</strong>, donc votre service doit autoriser les autres sites à l'appeler. Pour la même raison, ne mettez jamais de clé privée dans <code>module.js</code> : tout le monde peut la lire.",
      publishStep: "4. Publier",
      publish: "Déposez le dossier chez n'importe quel hébergeur qui laisse les autres sites le lire (GitHub Pages le fait) et donnez l'adresse de son <code>ufoathome-module.json</code>. Ceux qui l'ajoutent le gardent dans leur navigateur, peuvent le désactiver ou le retirer, et peuvent enregistrer leur liste de modules dans un fichier pour la charger ailleurs. <strong>Un script s'exécute avec tous les droits de la page</strong>, aussi l'éditeur les prévient de n'ajouter que ce qui vient d'un auteur qu'ils connaissent : dites qui vous êtes.",
      skyHeading: "Exemple : dessiner un phénomène dans le ciel",
      sky: "Ici, une boule de lumière qui traverse le ciel. Ce qui était réellement là, que quelqu'un l'ait vu ou non (la foudre, une fusée, un laser), s'appelle dans UFO@home un <em>événement du ciel</em>, et un enregistrement l'énonce sous <code>skyEvents</code>. Vous donnez au type d'événement sa clé et le code qui le dessine.",
      skyCode: "Le manifeste est le même que précédemment. Dans <code>module.js</code>, la simulation est un objet qu'UFO@home construit une fois, la première fois qu'un enregistrement contient un tel événement, puis appelle à chaque image. <code>three</code> est donné au script : utilisez-le plutôt qu'une copie à vous de three.js, dont le moteur de rendu de la scène ne reconnaîtrait pas les objets.",
      skyMessages: "Ses textes sont dans un fichier par langue, chargé seulement dans celle du lecteur : <code>title</code> est le nom de sa partie dans l'éditeur, <code>name</code> celui d'un événement sans titre.",
      skyStateStep: "L'énoncer dans un enregistrement",
      skyState: "Chaque événement a un <code>id</code>, puis ce que votre code lit : c'est vous qui décidez du reste. <code>modules</code> nomme le module, pour que l'enregistrement le trouve.",
      trySky: [
        "Servez le dossier et ajoutez le module à l'éditeur, comme pour la météo.",
        "Ouvrez un enregistrement qui a un lieu et une date. Dans <strong>Fichiers</strong>, <strong>Enregistrement</strong>, ajoutez l'extrait ci-dessus à son texte, avec des coordonnées devant le témoin.",
        "Déplacez la tête de lecture entre 2 et 18 secondes : la boule traverse l'image, devant ce qui est plus loin."
      ],
      skyFurtherStep: "Aller plus loin",
      skyFurtherIntro: "Ce type d'événement est dessiné mais n'a pas de formulaire dans l'éditeur, et le pointeur ne le sélectionne pas. Tout cela est facultatif et s'ajoute au même objet :",
      skyFurther: [
        "<code>editor</code> : une partie à lui dans le groupe <strong>Ciel</strong>, pour modifier les événements sans écrire de JSON.",
        "<code>pick</code> sur la simulation et <code>describe</code> sur le type : ce que dit l'infobulle quand le pointeur est dessus.",
        "<code>reachM</code> : jusqu'où il va, pour un événement loin du témoin, afin que le sol et la scène soient construits jusque-là.",
        "<code>frame.lightFrom</code> et <code>frame.glareFrom</code> : éclairer le sol et éblouir l'œil. <code>frame</code> donne aussi l'instant réel, la vraie position du témoin, le vent, le sol sous un point et la magnitude la plus faible vue.",
        "<code>inSky</code> sur la simulation : dessiné sur la sphère du ciel autour de l'œil, comme les étoiles, plutôt que dans les mètres de la scène."
      ],
      reading: "Tout est dans <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/sky-events/SkyEventKind.ts\"><code>SkyEventKind.ts</code></a>, et les faisceaux, les lancements et les bolides d'UFO@home sont écrits ainsi : <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\"><code>sky-events/beams</code></a> fait un bon modèle. Si ce que vous dessinez n'est pas un fait mais ce que quelqu'un affirme que le témoin a vu (des lanternes célestes lâchées d'un jardin, des leurres largués par un avion), c'est plutôt une interprétation : voir <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/interpretations/InterpretationKind.ts\"><code>InterpretationKind.ts</code></a>, énoncée sous <code>interpretation.&lt;clé&gt;</code>, dont <code>bodiesOf(item)</code> calcule les corps à montrer d'après quelques paramètres.",
      noCodeHeading: "Sans code : imagerie, relief, modèles 3D",
      noCode: "Les tuiles et les modèles ne demandent rien de plus que le manifeste, sous <code>contributes</code>. Ses adresses peuvent être relatives à la sienne. Le manifeste ci-dessous connaît son format : placez le curseur dans un objet et faites <kbd>Ctrl</kbd>+<kbd>Espace</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> sur Mac) pour lister toutes les clés qui pourraient y figurer, avec ce que chacune veut dire.",
      noCodeFields: [
        "<code>imagery</code> : des tuiles d'images ordinaires. L'adresse contient <code>{z}</code>, <code>{x}</code> et <code>{y}</code>, dans l'ordre que le service leur donne.",
        "<code>elevation</code> : des tuiles de relief en PNG Terrarium (hauteur = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code> : des fichiers glTF ou GLB, chacun avec son type (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), sa taille et son crédit.",
        "Un <code>id</code> qu'UFO@home ou un autre module donne déjà au même endroit est refusé, pour tout le module : donnez aux vôtres un préfixe à vous."
      ],
      shareHeading: "Partager un enregistrement qui a besoin de votre module",
      share: "Un enregistrement nomme les modules dont il a besoin sous <code>modules</code>, par leurs adresses. Ouvrir le fichier de quelqu'un ne doit pas exécuter le code de quelqu'un : un lecteur reçoit donc ce que le manifeste énonce, et <strong>le script seulement s'il a ajouté le module lui-même</strong>. Ce que cela veut dire selon ce que vous avez apporté :",
      shareCases: [
        "<strong>Une source de données</strong> : rien à faire. Les valeurs sont écrites dans l'enregistrement, avec leur provenance.",
        "<strong>Des tuiles et des modèles 3D</strong> : ils marchent pour tout le monde, puisqu'ils sont dans le manifeste. L'éditeur nomme le module dès qu'un de ses modèles est utilisé, relativement à l'enregistrement quand les deux sont sur le même site, et <strong>Nommé par cet enregistrement</strong> le retire.",
        "<strong>Un événement du ciel</strong> : vous écrivez <code>modules</code> vous-même, et le lecteur doit ajouter votre module pour le voir. Sans lui rien n'est dessiné, et le fichier garde ce qu'il énonce. L'éditeur lui propose <strong>Ajouter à mes modules</strong> à côté du module que l'enregistrement nomme."
      ],
      pointsHeading: "Tout ce à quoi un module peut ajouter",
      points: "La météo et le ciel sont deux des quinze endroits. Les autres marchent de la même façon : une clé dans ce que renvoie le script, la même entrée (<code>id</code>, <code>name</code>, <code>credit</code>, <code>creditUrl</code>, <code>create</code>), et une classe qui donne ce que l'interface demande.",
      pointsKey: "Clé",
      pointsWhat: "Ce que ça ajoute",
      pointsInterface: "Ce qu'il faut donner",
      prHeading: "Ou le proposer au projet",
      pr: "Si votre source ou votre simulation peut servir à tous, elle peut aussi rejoindre UFO@home lui-même, par une pull request sur <a href=\"https://github.com/RR0/UfoAtHome\">le dépôt</a>. Le code change à peine :",
      prSteps: [
        "Placez la classe dans le dossier de son type sous <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\"><code>src/modules</code></a>.",
        "Ajoutez son entrée au <code>*Sources.ts</code> de ce dossier, avec son crédit et le lien que sa licence demande.",
        "Prenez ses textes dans un <code>MessageCatalog</code>, dans les quatre langues. Ajoutez une ligne à la page de confidentialité si elle envoie quoi que ce soit quelque part.",
        "Lancez <code>npm test</code>."
      ],
      prEnd: "Le <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/README.md\">README de ce dossier</a> donne le détail. Les <a href=\"https://github.com/RR0/UfoAtHome/pulls\">pull requests</a> sont les bienvenues, et une question avant aussi si vous ne savez pas trop où mettre quelque chose."
    },
    es: {
      howHeading: "Lo que necesita",
      how: "Un módulo es una carpeta que usted publica en la web. Contiene un pequeño archivo, <code>ufoathome-module.json</code>, que dice qué es el módulo, y, cuando hace falta código, un archivo JavaScript. Quien pegue la dirección de ese archivo JSON en el editor recibe lo que aporta. Lo que escriba depende de lo que quiera añadir:",
      wants: [
        "<strong>Una fuente de datos que responde a su manera</strong> (tiempo, nombres de lugares, tráfico aéreo…): un poco de código que la consulta y traduce sus respuestas. <a href=\"#weather\">Vea el ejemplo del tiempo.</a>",
        "<strong>Algo que dibujar en el cielo</strong>: un poco de código con three.js, al que la escena llama en cada imagen. <a href=\"#sky\">Vea el ejemplo del rayo en bola.</a>",
        "<strong>Teselas de mapa, un relieve o modelos 3D</strong>: sin código, basta con el archivo JSON. <a href=\"#no-code\">Vea más abajo.</a>"
      ],
      weatherHeading: "Ejemplo: añadir una fuente meteorológica",
      weather: "Digamos que un servicio llamado ACME conoce el tiempo del pasado y responde a <code>https://api.acme.example/history?lat=…&amp;lon=…&amp;at=…</code> con <code>{ \"cloudPercent\": 70, \"rainMm\": 0, \"windKmh\": 36, \"windFromDeg\": 270, \"thunder\": false }</code>. Una vez hecho esto, aparecerá en el selector de tiempo del editor, junto al que ofrece UFO@home.",
      manifestStep: "1. Describir el módulo",
      manifest: "En una carpeta vacía, cree <code>ufoathome-module.json</code>. Elija un <code>id</code> propio, en minúsculas. <code>script</code> indica el código, relativo a este archivo.",
      codeStep: "2. Escribir el código",
      weatherCode: "Al lado, cree <code>module.js</code>. Contiene una clase que traduce las respuestas de ACME a lo que espera UFO@home, y una exportación por defecto que la declara, con el crédito que pide la licencia de ACME.",
      weatherRulesIntro: "Aquí es donde un error pasaría inadvertido, así que traduzca con cuidado:",
      weatherRules: [
        "<strong>Las unidades.</strong> La cobertura y la intensidad van de 0 a 1, y el viento está en metros por segundo.",
        "<strong>La dirección del viento está invertida.</strong> <code>windDirectionDeg</code> indica hacia dónde sopla el viento, en grados desde el norte en sentido horario, mientras que la mayoría de los servicios indican de dónde viene. De ahí los 180° de arriba.",
        "<strong>Una muestra por punto, en el mismo orden.</strong> Hay una por hora de observación, hasta 25. Si su servicio puede responder a varios instantes en una sola petición, úselo en lugar de este bucle.",
        "<strong>No tener registro no es un fallo.</strong> Devuelva <code>undefined</code> cuando el servicio no tenga nada para ese lugar y esa fecha (el editor lo dice, y los campos siguen siendo editables), y lance un error cuando no se haya podido consultar.",
        "<strong><code>source</code> es lo que guardará la grabación.</strong> Su <code>id</code> es el que usted declaró, y su <code>url</code> la petición exacta, para que el valor pueda comprobarse años después.",
        "<strong>Los demás campos son opcionales.</strong> Capas de nubes, base de las nubes, humedad: vea <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/engine/model/Weather.ts\"><code>Weather.ts</code></a>."
      ],
      tryStep: "3. Probar",
      serve: "Sirva la carpeta en local. <code>--cors</code> permite que otros sitios la lean, y <code>-c-1</code> desactiva la caché, para que una recarga tome sus cambios:",
      tryWeather: [
        "Abra <a href=\"/edit/\">el editor</a>, en Chrome o Firefox (Safari rechaza una dirección local desde una página segura), e indique un lugar y una fecha: el tiempo solo se pide cuando se conocen ambos.",
        "En el grupo <strong>Archivos</strong>, elija <strong>Módulos</strong>, pegue <code>http://localhost:8000/ufoathome-module.json</code> y pulse <strong>Añadir</strong>. Su módulo aparece con lo que aporta.",
        "En el grupo <strong>Cielo</strong>, elija <strong>ACME Weather</strong> en el selector de tiempo. Los valores cambian, y el enlace junto a ellos es su petición."
      ],
      tryTrouble: "Si no funciona: un módulo ilegible dice por qué en su línea de la lista, y para lo demás, la consola del navegador dice qué lanzó su código. La causa habitual es CORS: <strong>las peticiones las hace el navegador del lector</strong>, así que su servicio debe permitir que otros sitios lo llamen. Por la misma razón, nunca ponga una clave privada en <code>module.js</code>: cualquiera puede leerla.",
      publishStep: "4. Publicar",
      publish: "Coloque la carpeta en cualquier alojamiento que permita a otros sitios leerla (GitHub Pages lo hace) y dé la dirección de su <code>ufoathome-module.json</code>. Quienes lo añadan lo guardan en su navegador, pueden desactivarlo o quitarlo, y pueden guardar su lista de módulos en un archivo para cargarla en otro lugar. <strong>Un script se ejecuta con todos los derechos de la página</strong>, por lo que el editor les advierte que solo añadan lo que venga de un autor que conozcan: diga quién es usted.",
      skyHeading: "Ejemplo: dibujar un fenómeno en el cielo",
      sky: "Aquí, una bola de luz que cruza el cielo. Lo que estuvo realmente ahí, lo viera alguien o no (un rayo, un cohete, un láser), se llama en UFO@home un <em>evento del cielo</em>, y una grabación lo declara en <code>skyEvents</code>. Usted da al tipo de evento su clave y el código que lo dibuja.",
      skyCode: "El manifiesto es el mismo que antes. En <code>module.js</code>, la simulación es un objeto que UFO@home construye una vez, la primera vez que una grabación contiene un evento así, y al que luego llama en cada imagen. <code>three</code> se da al script: úselo en lugar de una copia propia de three.js, cuyos objetos el motor de la escena no reconocería.",
      skyMessages: "Sus textos están en un archivo por idioma, cargado solo en el del lector: <code>title</code> es el nombre de su parte en el editor, <code>name</code> el de un evento sin título.",
      skyStateStep: "Declararlo en una grabación",
      skyState: "Cada evento tiene un <code>id</code>, y luego lo que lea su código: el resto lo decide usted. <code>modules</code> indica el módulo, para que la grabación lo encuentre.",
      trySky: [
        "Sirva la carpeta y añada el módulo al editor, como para el tiempo.",
        "Abra una grabación que tenga un lugar y una fecha. En <strong>Archivos</strong>, <strong>Registro</strong>, añada el extracto de arriba a su texto, con coordenadas delante del testigo.",
        "Mueva el cabezal entre 2 y 18 segundos: la bola cruza la imagen, delante de lo que está más lejos."
      ],
      skyFurtherStep: "Ir más lejos",
      skyFurtherIntro: "Este tipo de evento se dibuja pero no tiene formulario en el editor, y el puntero no lo selecciona. Todo eso es opcional y se añade al mismo objeto:",
      skyFurther: [
        "<code>editor</code>: una parte propia en el grupo <strong>Cielo</strong>, para modificar los eventos sin escribir JSON.",
        "<code>pick</code> en la simulación y <code>describe</code> en el tipo: lo que dice la descripción emergente cuando el puntero está encima.",
        "<code>reachM</code>: hasta dónde llega, para un evento lejos del testigo, de modo que el suelo y la escena se construyan hasta ahí.",
        "<code>frame.lightFrom</code> y <code>frame.glareFrom</code>: iluminar el suelo y deslumbrar al ojo. <code>frame</code> da también el instante real, la posición real del testigo, el viento, el suelo bajo un punto y la magnitud más débil visible.",
        "<code>inSky</code> en la simulación: dibujado en la esfera del cielo alrededor del ojo, como las estrellas, en lugar de en los metros de la escena."
      ],
      reading: "Todo está en <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/sky-events/SkyEventKind.ts\"><code>SkyEventKind.ts</code></a>, y los haces, los lanzamientos y los bólidos de UFO@home están escritos así: <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\"><code>sky-events/beams</code></a> es un buen modelo. Si lo que dibuja no es un hecho sino lo que alguien afirma que vio el testigo (farolillos soltados desde un jardín, señuelos lanzados por un avión), es más bien una interpretación: vea <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/interpretations/InterpretationKind.ts\"><code>InterpretationKind.ts</code></a>, declarada en <code>interpretation.&lt;clave&gt;</code>, cuyo <code>bodiesOf(item)</code> calcula los cuerpos que mostrar a partir de unos pocos parámetros.",
      noCodeHeading: "Sin código: imágenes, relieve, modelos 3D",
      noCode: "Las teselas y los modelos no piden más que el manifiesto, en <code>contributes</code>. Sus direcciones pueden ser relativas a la suya. El manifiesto de abajo conoce su formato: ponga el cursor dentro de un objeto y pulse <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> en Mac) para listar todas las claves que podrían ir ahí, con lo que significa cada una.",
      noCodeFields: [
        "<code>imagery</code>: teselas de imágenes corrientes. La dirección contiene <code>{z}</code>, <code>{x}</code> e <code>{y}</code>, en el orden que el servicio les da.",
        "<code>elevation</code>: teselas de relieve en PNG Terrarium (altura = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: archivos glTF o GLB, cada uno con su tipo (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), su tamaño y su crédito.",
        "Un <code>id</code> que UFO@home u otro módulo ya da en el mismo lugar se rechaza, para todo el módulo: dé a los suyos un prefijo propio."
      ],
      shareHeading: "Compartir una grabación que necesita su módulo",
      share: "Una grabación indica los módulos que necesita en <code>modules</code>, por sus direcciones. Abrir el archivo de alguien no debe ejecutar el código de alguien: un lector recibe por tanto lo que declara el manifiesto, y <strong>el script solo si añadió el módulo por sí mismo</strong>. Lo que esto significa según lo que haya aportado:",
      shareCases: [
        "<strong>Una fuente de datos</strong>: nada que hacer. Los valores están escritos en la grabación, con su procedencia.",
        "<strong>Teselas y modelos 3D</strong>: funcionan para todos, ya que están en el manifiesto. El editor cita el módulo en cuanto se usa uno de sus modelos, de forma relativa a la grabación cuando ambos están en el mismo sitio, y <strong>Citado por esta grabación</strong> lo retira.",
        "<strong>Un evento del cielo</strong>: usted escribe <code>modules</code>, y el lector debe añadir su módulo para verlo. Sin él no se dibuja nada, y el archivo conserva lo que declara. El editor le propone <strong>Añadir a mis módulos</strong> junto al módulo que cita la grabación."
      ],
      pointsHeading: "Todo aquello a lo que un módulo puede añadir",
      points: "El tiempo y el cielo son dos de los quince lugares. Los demás funcionan igual: una clave en lo que devuelve el script, la misma entrada (<code>id</code>, <code>name</code>, <code>credit</code>, <code>creditUrl</code>, <code>create</code>), y una clase que da lo que pide la interfaz.",
      pointsKey: "Clave",
      pointsWhat: "Lo que añade",
      pointsInterface: "Lo que hay que dar",
      prHeading: "O proponerlo al proyecto",
      pr: "Si su fuente o su simulación puede servir a todos, también puede unirse a UFO@home, con una pull request en <a href=\"https://github.com/RR0/UfoAtHome\">el repositorio</a>. El código apenas cambia:",
      prSteps: [
        "Coloque la clase en la carpeta de su tipo en <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\"><code>src/modules</code></a>.",
        "Añada su entrada al <code>*Sources.ts</code> de esa carpeta, con su crédito y el enlace que pide su licencia.",
        "Tome sus textos de un <code>MessageCatalog</code>, en los cuatro idiomas. Añada una fila a la página de privacidad si envía algo a alguna parte.",
        "Ejecute <code>npm test</code>."
      ],
      prEnd: "El <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/README.md\">README de esa carpeta</a> da los detalles. Las <a href=\"https://github.com/RR0/UfoAtHome/pulls\">pull requests</a> son bienvenidas, y también una pregunta antes si no sabe bien dónde poner algo."
    },
    it: {
      howHeading: "Cosa ti serve",
      how: "Un modulo è una cartella che pubblichi sul web. Contiene un piccolo file, <code>ufoathome-module.json</code>, che dice cos'è il modulo, e, quando serve codice, un file JavaScript. Chiunque incolli l'indirizzo di quel file JSON nell'editor riceve ciò che porta. Ciò che scrivi dipende da ciò che vuoi aggiungere:",
      wants: [
        "<strong>Una fonte di dati che risponde a modo suo</strong> (meteo, nomi di luoghi, traffico aereo…): un po' di codice che la interroga e traduce le sue risposte. <a href=\"#weather\">Vedi l'esempio del meteo.</a>",
        "<strong>Qualcosa da disegnare nel cielo</strong>: un po' di codice con three.js, che la scena chiama a ogni immagine. <a href=\"#sky\">Vedi l'esempio del fulmine globulare.</a>",
        "<strong>Tasselli di mappa, un rilievo o modelli 3D</strong>: niente codice, basta il file JSON. <a href=\"#no-code\">Vedi più sotto.</a>"
      ],
      weatherHeading: "Esempio: aggiungere una fonte meteo",
      weather: "Diciamo che un servizio chiamato ACME conosce il meteo del passato e risponde a <code>https://api.acme.example/history?lat=…&amp;lon=…&amp;at=…</code> con <code>{ \"cloudPercent\": 70, \"rainMm\": 0, \"windKmh\": 36, \"windFromDeg\": 270, \"thunder\": false }</code>. Fatto questo, apparirà nel selettore del meteo dell'editor, accanto a quello che UFO@home propone.",
      manifestStep: "1. Descrivere il modulo",
      manifest: "In una cartella vuota, crea <code>ufoathome-module.json</code>. Scegli un <code>id</code> tuo, in minuscolo. <code>script</code> indica il codice, relativamente a questo file.",
      codeStep: "2. Scrivere il codice",
      weatherCode: "Accanto, crea <code>module.js</code>. Contiene una classe che traduce le risposte di ACME in ciò che UFO@home si aspetta, e un export predefinito che la dichiara, con il credito che la licenza di ACME chiede.",
      weatherRulesIntro: "È qui che un errore passerebbe inosservato, quindi traduci con cura:",
      weatherRules: [
        "<strong>Le unità.</strong> La copertura e l'intensità vanno da 0 a 1, e il vento è in metri al secondo.",
        "<strong>La direzione del vento è invertita.</strong> <code>windDirectionDeg</code> dice verso dove soffia il vento, in gradi dal nord in senso orario, mentre la maggior parte dei servizi dice da dove viene. Da qui i 180° sopra.",
        "<strong>Un campione per punto, nello stesso ordine.</strong> Ce n'è uno per ora di osservazione, fino a 25. Se il tuo servizio può rispondere a più istanti in una sola richiesta, usa quello invece di questo ciclo.",
        "<strong>Nessun dato non è un errore.</strong> Restituisci <code>undefined</code> quando il servizio non ha nulla per quel luogo e quella data (l'editor lo dice, e i campi restano modificabili), e lancia un errore quando non è stato possibile interrogarlo.",
        "<strong><code>source</code> è ciò che la registrazione conserverà.</strong> Il suo <code>id</code> è quello che hai dichiarato, e il suo <code>url</code> la richiesta esatta, perché il valore resti verificabile anni dopo.",
        "<strong>Gli altri campi sono facoltativi.</strong> Strati di nubi, base delle nubi, umidità: vedi <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/engine/model/Weather.ts\"><code>Weather.ts</code></a>."
      ],
      tryStep: "3. Provare",
      serve: "Servi la cartella in locale. <code>--cors</code> permette agli altri siti di leggerla, e <code>-c-1</code> disattiva la cache, perché un ricaricamento prenda le tue modifiche:",
      tryWeather: [
        "Apri <a href=\"/edit/\">l'editor</a>, in Chrome o Firefox (Safari rifiuta un indirizzo locale da una pagina sicura), e indica un luogo e una data: il meteo viene chiesto solo quando sono noti entrambi.",
        "Nel gruppo <strong>File</strong>, scegli <strong>Moduli</strong>, incolla <code>http://localhost:8000/ufoathome-module.json</code> e premi <strong>Aggiungi</strong>. Il tuo modulo appare con ciò che porta.",
        "Nel gruppo <strong>Cielo</strong>, scegli <strong>ACME Weather</strong> nel selettore del meteo. I valori cambiano, e il link accanto a essi è la tua richiesta."
      ],
      tryTrouble: "Se non funziona: un modulo illeggibile dice perché sulla sua riga dell'elenco, e per il resto la console del browser dice cosa ha lanciato il tuo codice. La causa abituale è CORS: <strong>le richieste sono fatte dal browser del lettore</strong>, quindi il tuo servizio deve permettere agli altri siti di chiamarlo. Per lo stesso motivo, non mettere mai una chiave privata in <code>module.js</code>: chiunque può leggerla.",
      publishStep: "4. Pubblicare",
      publish: "Metti la cartella su un qualsiasi hosting che lasci leggerla agli altri siti (GitHub Pages lo fa) e dai l'indirizzo del suo <code>ufoathome-module.json</code>. Chi lo aggiunge lo conserva nel proprio browser, può disattivarlo o rimuoverlo, e può salvare il proprio elenco di moduli in un file per caricarlo altrove. <strong>Uno script viene eseguito con tutti i diritti della pagina</strong>, perciò l'editor avverte di aggiungere solo ciò che viene da un autore che si conosce: di' chi sei.",
      skyHeading: "Esempio: disegnare un fenomeno nel cielo",
      sky: "Qui, una palla di luce che attraversa il cielo. Ciò che era davvero lì, che qualcuno l'abbia visto o no (un fulmine, un razzo, un laser), si chiama in UFO@home un <em>evento del cielo</em>, e una registrazione lo dichiara sotto <code>skyEvents</code>. Dai al tipo di evento la sua chiave e il codice che lo disegna.",
      skyCode: "Il manifesto è lo stesso di prima. In <code>module.js</code>, la simulazione è un oggetto che UFO@home costruisce una volta, la prima volta che una registrazione contiene un evento del genere, e poi chiama a ogni immagine. <code>three</code> viene dato allo script: usalo invece di una tua copia di three.js, i cui oggetti il motore della scena non riconoscerebbe.",
      skyMessages: "I suoi testi sono in un file per lingua, caricato solo in quella del lettore: <code>title</code> è il nome della sua parte nell'editor, <code>name</code> quello di un evento senza titolo.",
      skyStateStep: "Dichiararlo in una registrazione",
      skyState: "Ogni evento ha un <code>id</code>, poi ciò che il tuo codice legge: il resto lo decidi tu. <code>modules</code> indica il modulo, perché la registrazione lo trovi.",
      trySky: [
        "Servi la cartella e aggiungi il modulo all'editor, come per il meteo.",
        "Apri una registrazione che abbia un luogo e una data. In <strong>File</strong>, <strong>Registrazione</strong>, aggiungi l'estratto qui sopra al suo testo, con coordinate davanti al testimone.",
        "Sposta la testina tra 2 e 18 secondi: la palla attraversa l'immagine, davanti a ciò che è più lontano."
      ],
      skyFurtherStep: "Andare oltre",
      skyFurtherIntro: "Questo tipo di evento è disegnato ma non ha un modulo nell'editor, e il puntatore non lo seleziona. Tutto ciò è facoltativo e si aggiunge allo stesso oggetto:",
      skyFurther: [
        "<code>editor</code>: una parte propria nel gruppo <strong>Cielo</strong>, per modificare gli eventi senza scrivere JSON.",
        "<code>pick</code> sulla simulazione e <code>describe</code> sul tipo: ciò che dice il suggerimento quando il puntatore è sopra.",
        "<code>reachM</code>: fin dove arriva, per un evento lontano dal testimone, perché il suolo e la scena siano costruiti fin lì.",
        "<code>frame.lightFrom</code> e <code>frame.glareFrom</code>: illuminare il suolo e abbagliare l'occhio. <code>frame</code> dà anche l'istante reale, la vera posizione del testimone, il vento, il suolo sotto un punto e la magnitudine più debole visibile.",
        "<code>inSky</code> sulla simulazione: disegnato sulla sfera del cielo intorno all'occhio, come le stelle, invece che nei metri della scena."
      ],
      reading: "Tutto è in <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/sky-events/SkyEventKind.ts\"><code>SkyEventKind.ts</code></a>, e i fasci, i lanci e i bolidi di UFO@home sono scritti così: <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules/sky-events/beams\"><code>sky-events/beams</code></a> è un buon modello. Se ciò che disegni non è un fatto ma ciò che qualcuno afferma che il testimone abbia visto (lanterne volanti lasciate da un giardino, esche sganciate da un aereo), è piuttosto un'interpretazione: vedi <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/interpretations/InterpretationKind.ts\"><code>InterpretationKind.ts</code></a>, dichiarata sotto <code>interpretation.&lt;chiave&gt;</code>, il cui <code>bodiesOf(item)</code> calcola i corpi da mostrare da pochi parametri.",
      noCodeHeading: "Senza codice: immagini, rilievo, modelli 3D",
      noCode: "I tasselli e i modelli non chiedono altro che il manifesto, sotto <code>contributes</code>. I suoi indirizzi possono essere relativi al suo. Il manifesto qui sotto conosce il suo formato: metti il cursore dentro un oggetto e premi <kbd>Ctrl</kbd>+<kbd>Spazio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> su Mac) per elencare tutte le chiavi che potrebbero andarci, con ciò che significa ciascuna.",
      noCodeFields: [
        "<code>imagery</code>: tasselli di immagini comuni. L'indirizzo contiene <code>{z}</code>, <code>{x}</code> e <code>{y}</code>, nell'ordine che il servizio dà loro.",
        "<code>elevation</code>: tasselli di rilievo in PNG Terrarium (altezza = R × 256 + G + B / 256 − 32768 m).",
        "<code>models</code>: file glTF o GLB, ognuno con il suo tipo (<code>vehicle</code>, <code>aircraft</code>, <code>building</code>, <code>entity</code>…), la sua misura e il suo credito.",
        "Un <code>id</code> che UFO@home o un altro modulo dà già nello stesso punto è rifiutato, per tutto il modulo: dai ai tuoi un prefisso tuo."
      ],
      shareHeading: "Condividere una registrazione che ha bisogno del tuo modulo",
      share: "Una registrazione indica i moduli di cui ha bisogno sotto <code>modules</code>, con i loro indirizzi. Aprire il file di qualcuno non deve eseguire il codice di qualcuno: un lettore riceve quindi ciò che il manifesto dichiara, e <strong>lo script solo se ha aggiunto il modulo lui stesso</strong>. Ciò che significa secondo ciò che hai portato:",
      shareCases: [
        "<strong>Una fonte di dati</strong>: niente da fare. I valori sono scritti nella registrazione, con la loro provenienza.",
        "<strong>Tasselli e modelli 3D</strong>: funzionano per tutti, poiché sono nel manifesto. L'editor cita il modulo appena uno dei suoi modelli viene usato, relativamente alla registrazione quando entrambi sono sullo stesso sito, e <strong>Citato da questa registrazione</strong> lo toglie.",
        "<strong>Un evento del cielo</strong>: scrivi <code>modules</code> tu stesso, e il lettore deve aggiungere il tuo modulo per vederlo. Senza di esso non viene disegnato nulla, e il file conserva ciò che dichiara. L'editor gli propone <strong>Aggiungi ai miei moduli</strong> accanto al modulo che la registrazione cita."
      ],
      pointsHeading: "Tutto ciò a cui un modulo può aggiungere",
      points: "Il meteo e il cielo sono due dei quindici punti. Gli altri funzionano allo stesso modo: una chiave in ciò che lo script restituisce, la stessa voce (<code>id</code>, <code>name</code>, <code>credit</code>, <code>creditUrl</code>, <code>create</code>), e una classe che dà ciò che l'interfaccia chiede.",
      pointsKey: "Chiave",
      pointsWhat: "Cosa aggiunge",
      pointsInterface: "Cosa bisogna dare",
      prHeading: "Oppure proporlo al progetto",
      pr: "Se la tua fonte o la tua simulazione può servire a tutti, può anche entrare in UFO@home stesso, con una pull request sul <a href=\"https://github.com/RR0/UfoAtHome\">repository</a>. Il codice cambia appena:",
      prSteps: [
        "Metti la classe nella cartella del suo tipo in <a href=\"https://github.com/RR0/UfoAtHome/tree/master/src/modules\"><code>src/modules</code></a>.",
        "Aggiungi la sua voce al <code>*Sources.ts</code> di quella cartella, con il suo credito e il link che la sua licenza chiede.",
        "Prendi i suoi testi da un <code>MessageCatalog</code>, nelle quattro lingue. Aggiungi una riga alla pagina sulla privacy se invia qualcosa da qualche parte.",
        "Esegui <code>npm test</code>."
      ],
      prEnd: "Il <a href=\"https://github.com/RR0/UfoAtHome/blob/master/src/modules/README.md\">README di quella cartella</a> dà i dettagli. Le <a href=\"https://github.com/RR0/UfoAtHome/pulls\">pull request</a> sono benvenute, e anche una domanda prima se non sai bene dove mettere qualcosa."
    }
  }
}
