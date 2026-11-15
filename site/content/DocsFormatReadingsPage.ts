import { DocsFormatSubpage } from "./DocsFormatSubpage.js"
import type { Said, SiteLanguage } from "../SitePage.js"

/**
 * What the phenomenon may have been, as an observation's file states it and as the player tests it, and the other observations that
 * readings are. A part of the observation's technical side (see DocsFormatSubpage).
 */
export class DocsFormatReadingsPage extends DocsFormatSubpage {

  static readonly TITLE: Said<string> = { en: "Readings", fr: "Les lectures", es: "Las lecturas", it: "Le letture" }

  constructor() {
    super("docs/format/readings", DocsFormatReadingsPage.TITLE, {
      en: "What the phenomenon may have been is not part of what was seen: it is a claim about it, written in the same file, stood in the scene and tested against the account. Somebody else's reading is another observation.",
      fr: "Ce que le phénomène a pu être ne fait pas partie de ce qui a été vu : c'est une affirmation à son sujet, écrite dans le même fichier, placée dans la scène et mise à l'épreuve du compte rendu. La lecture d'un autre est une autre observation.",
      es: "Lo que pudo ser el fenómeno no forma parte de lo que se vio: es una afirmación sobre ello, escrita en el mismo archivo, situada en la escena y puesta a prueba frente al relato. La lectura de otro es otra observación.",
      it: "Ciò che il fenomeno può essere stato non fa parte di ciò che è stato visto: è un'affermazione al riguardo, scritta nello stesso file, collocata nella scena e messa alla prova del resoconto. La lettura di un altro è un'altra osservazione."
    }, {
      en: "How a reading of what was seen is written in an observation's file and tested against the account, and why another reading is another observation.",
      fr: "Comment une lecture de ce qui a été vu s'écrit dans le fichier d'une observation et se met à l'épreuve du compte rendu, et pourquoi une autre lecture est une autre observation.",
      es: "Cómo se escribe una lectura de lo que se vio en el archivo de una observación y se pone a prueba frente al relato, y por qué otra lectura es otra observación.",
      it: "Come una lettura di ciò che è stato visto si scrive nel file di un'osservazione e si mette alla prova del resoconto, e perché un'altra lettura è un'altra osservazione."
    })
  }

  protected body(language: SiteLanguage): string {
    const sections = { en: () => this.en(), fr: () => this.fr(), es: () => this.es(), it: () => this.it() }[language]()
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p class="small">${this.excerptNote(language)}</p>
${sections}
  </div>
</section>
`
  }

  private en(): string {
    return `
    <h2 id="what-it-was-interpretations">What it was: readings</h2>
    <p>A recording states angles, and a body in metres is never part of what was seen. It is a
      claim about it, and it is tested by standing it in the scene and looking at it from where
      the witness stood: it casts its shadow, the ground can hide it, and its outline is measured
      against what the witness said at every instant. A reading is shown alone, as the
      world it claims; asked to compare (the ◌ button, or <code>compare-account</code> on
      <code>&lt;rr0-sighting&gt;</code>), the player draws everything the witness saw beside it as
      dashed outlines and lists how far off the direction is and how many times wider and taller
      each body looks, in red when a witness could not have been that far off.</p>
    <p>The witness's own reading goes in the recording, as <code>interpretation</code>. Someone else's reading is not part of the account: it is another sighting, listed in the case (see below). A account whose witness said what
      it was is drawn in the round, as they said; one that says nothing in metres is drawn as the
      angles it states. The player offers it and each analyst's reading, one at a time.</p>
    <pre data-json=""><code>{
  "interpretation": {
    "title": "A craft standing on its legs",
    "bodies": [{
      "id": "craft",
      "explains": ["ufo-1"],
      "model": { "id": "ellipsoid" },
      "track": [
        { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
          "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
          "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
        { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
      ]
    }]
  }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>explains</code></td><td>The <code>sourceId</code>s of the phenomena this body claims to be</td></tr>
      <tr><td><code>model</code></td><td>A shape built here (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), a model of the catalogue by <code>id</code>, or a glTF file at <code>url</code> with its <code>credit</code>; a relative <code>url</code> is read from the file that states it, not from the page. Stretched to <code>sizeM</code> whichever it is <code>headingOffsetDeg</code> and <code>credit</code> (<code>{ title, author, license, sourceUrl }</code>) are those of a decor object's model.</td></tr>
      <tr><td><code>track</code></td><td>Where it is and what it looks like at each <code>t</code>. A position is stated either in the world (<code>eastM</code>/<code>northM</code> from where the witness stood at the start, like the decor, with <code>onGround</code> or <code>altitudeAboveGroundM</code>) or from the witness at that instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). A body <code>onGround</code> stands on the relief; a direction with no distance then meets the ground where that line does. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) and <code>appearance</code> (<code>color</code>, <code>albedo</code>, <code>luminanceCdM2</code>, <code>transparency</code> from 0 to 1, <code>haloScale</code> as a multiple of the glare of its own light) hold until a later keyframe restates them, and are blended between two keyframes. <code>present: false</code> takes the body out of the scene from that keyframe on, and <code>present: true</code> brings it back. A <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> at the nozzle, <code>tipColor</code>, <code>luminanceCdM2</code>) is lit at the keyframe that states it, comes out of the model's node named <code>exhaust</code> (or the one its <code>node</code> names), lights what is around it, raises dust where it meets the ground when <code>raisesDust</code> says so, and is put out by a <code>luminanceCdM2</code> of 0</td></tr>
      <tr><td><code>motions</code></td><td>In a keyframe: how far along each of its model's own movements it is, by the movement's name — the glTF file's animations. <code>0</code> is a movement's start, <code>1</code> its end, and one that repeats goes on past 1: <code>{ "legs-turn": 7 }</code> is seven turns. The model says what moves and how; the track says when. Each movement blends between the keyframes that state it, whatever other keyframes move the body in between, holds after the last and stands at 0 before the first. Valensole's departure is written so: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>In a keyframe: the luminance, cd/m², of each of its model's own lights, by the name of the light's material in the glTF file — so that one body carries lights that each do their own thing, a steady white at each end and a red one flashing between. The model says where each light is, how big and what colour; the track says how bright and when. Each light blends between the keyframes that name it and holds after the last, so a switch is two keyframes a millisecond apart; a light no keyframe names glows at its share of <code>appearance.luminanceCdM2</code>. A light too small to show is seen by its glare, and whatever stands between it and the eye — the body's own hull, a bridge — hides it. Silly-le-Long's red light: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>The node of the model that is what the witness drew (<code>"hull"</code> for a craft whose legs are not in the drawing): what its outline is measured by</td></tr>
      <tr><td><code>groups</code></td><td>Parts of its model taken together, so that one event is about them all: <code>{ id, title, members }</code>, its members parts of the model (a light by its name) or other groups of the body's, their ids the body's own. Named in an event as a part is, <code>id/group</code>: the two rear lights of <a href="/demo-data/observer-silly-le-long.json"><code>observer-silly-le-long.json</code></a>'s craft, <code>engin/rear</code>, which blink together. Optional: a part is named alone as well</td></tr>
      <tr><td><code>modelParameters</code>, <code>flicker</code></td><td>The settings of its model, by the key its catalogue entry publishes each under (<code>{ "paperColor": "#ff0000" }</code> for a sky lantern's paper, which also filters what its paper gives out); and how much its light wavers, as a flame's does, as a share of it (<code>0.15</code>, some 15 % above and below, a few times a second, alike at every playing). Steady when absent</td></tr>
      <tr><td><code>smoke</code></td><td>On the reading itself: what it sets burning on the ground, as <code>{ eastM, northM, fromT, untilT? }</code>, seen by its smoke carried off by the recording's wind <code>halfLifeS</code> is how fast it dies down, in seconds to half its thickness (20 by default): a brush fire flares and smoulders. It never quite stops before <code>untilT</code>.</td></tr>
      <tr><td><code>lanterns</code></td><td>On the reading itself: sky lanterns let go from the ground, each computed into a glowing body. A launch states its <code>site</code> (<code>{ eastM, northM, altitudeM?, originElevationM? }</code>), the <code>wind</code> at the ground and optionally <code>windAloft</code> (<code>{ towardDeg, speedMS, atM }</code>), the <code>airTemperatureC</code>, and its lanterns: one by one in <code>releases</code> (<code>{ t, explains?, eastM?, northM?, altitudeM?, burnedS?, lantern? }</code>, where <code>altitudeM</code> and <code>burnedS</code> start one where it was first seen, already up and partly burnt), or as a <code>group</code> (<code>{ count, fromT, untilT, radiusM?, burnS?: { min, max }, insideExcessK?: { min, max }, burnedS?, explains?, seed? }</code>), whose lanterns are drawn at random within those bounds, the same for the same <code>seed</code>. Each climbs while its hot air lifts more than it weighs, goes with the wind of the height it has reached, each meeting its own gusts (<code>turbulence</code>: <code>{ horizontalMS, verticalMS, timescaleS }</code>, the spread of the air's speed about that wind and how long a gust lasts; 0.8, 0.3 and 30 s, a light breeze's, by default, all zero for a still air), so that a group let go together stretches and shifts as it climbs, and vanishes when its fuel is spent: 8 to 15 minutes by the sellers, 480 to 900 s drawn by default. <code>lantern</code> overrides the common 1 m lantern: <code>envelopeVolumeM3</code> (0.19), <code>massKg</code> (0.065), <code>fuelKg</code>, <code>burnS</code> (600), <code>insideExcessK</code> (150), <code>dragAreaM2</code>, <code>luminousIntensityCd</code> (10, assumed: a bright star at 2 km), <code>widthM</code>, <code>heightM</code>, <code>color</code> (its flame's light through white paper), <code>shape</code> (<code>"classic"</code>, round at its mouth and square at its flat top, or <code>"balloon"</code>, narrow at its mouth with a wide, lobed top) and <code>paperColor</code> (white by default: what it looks like by day, and what filters its light by night). Each leans the way the air going past pushes it, a few degrees in a gust.</td></tr>
      <tr><td><code>findings</code></td><td>On the reading itself: the tests the claim was put to and how each came out, so that a claim that fails is kept, showing it was examined and why it does not hold. Each is <code>{ text, outcome, against?, rationale? }</code>: <code>text</code> says what was tested and what it gave (one per language), <code>outcome</code> is <code>holds</code>, <code>fails</code> or <code>untested</code> (it could not be made with what is known), and <code>against</code> says what it was set against: <code>established</code> (a value stated or derived, a measure on the picture) or <code>supposed</code> (one the recording assumed, or one it fitted to a hypothesis). A reading that fails against what is established contradicts the observation head-on, and the case editor draws it red; one that fails only against a supposition, or could not be tested, is not settled, orange; one whose tests all hold is green. With no findings, nobody has tested it, and it has no colour.</td></tr>
      <tr><td><code>mechanism</code></td><td>On the reading itself, when the claim is that the instrument made the phenomenon: <code>{ kind, explains, of? }</code>, <code>explains</code> the id of the phenomenon's shapes in the account and <code>kind</code> one of <code>fixed-in-frame</code> (standing still in the frame: a speck on the lens or in the gate, a reflection on a pane fixed to the camera), <code>lens-ghost</code> (a ghost of the Sun in the instrument's own lens, at one of the factors its glass throws), <code>stated-ghost</code> (a ghost of the Sun in an optic set before the lens, at whatever factor and offset fit best) <code>driven-one-way</code> (something on the glass driven across the frame one way, never back), <code>ghost-of</code> (a ghost through the lens of a light the reading places itself, <code>of</code> the id of that body: a glint on an aircraft) and <code>real-object</code> (something really in the sky, at any distance along the line of sight). Its most favourable configuration is then searched for within what the account allows (the Sun's heights over the days it allows, the side the picture's light comes from) and measured against where the account shows the phenomenon, instant by instant: how far it stays from it is a finding computed for whoever reads it, which holds within the phenomenon's own size. The reading is always shown in it: the speck, the drop or the object is placed where the search puts it, whatever its file placed there (its distance, size and look are kept)</td></tr>
    </table>
    </div>

    <h2 id="another-reading-an-interpretation-is-another-sighting">Another reading is another sighting</h2>
    <p>Someone else's reading of an account (an analyst's, an investigator's, a comparison made to test it)
      is not part of the account: it is another observation, the one that took place as its author holds
      it. So it is listed in the case like the original, as an event of type <code>sighting</code>, marked as a
      reading by <code>interpretationOf</code>, and has a recording of its own at <code>url</code>:</p>
    <pre data-json="none"><code>{
  "id": "McMinnville1950",
  "events": [
    { "type": "event", "eventType": "sighting", "id": "trent", "title": "Paul Trent", "url": "observer-mcminnville.json" },
    { "type": "event", "eventType": "sighting",
      "interpretationOf": "trent",
      "time": "2013-06",
      "by": [{ "people": "CousynAntoine" }, { "people": "LouangeFrancois" }],
      "title": "A model on a thread under the line",
      "url": "interpretation-mcminnville-2.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>interpretationOf</code></td><td>The <code>id</code> of the case's event it is a reading of (<code>"trent"</code>), or a list of ids when one reading serves several accounts (the photographs and a close-up of them). What tells it from an account: the events <em>without</em> it are the case's witnesses</td></tr>
      <tr><td><code>sealed</code></td><td>Whether the event is frozen: <code>true</code> once someone has worked ON this reconstruction — an interview held to hear what the witness makes of it, a hypothesis set against it — so that a later edit cannot quietly invalidate that work. The editor then takes nothing typed into it and refuses to delete it or rename its <code>id</code>, until it is thawed; its clone, beside the padlock, is what the author carries on with. Never set by itself: a reconstruction is edited for as long as it is being built, and versions nobody asked for are noise</td></tr>
      <tr><td><code>time</code></td><td>When the reading was elaborated, as RR0 writes a time (<code>"2013-06"</code>): not when the sighting happened</td></tr>
      <tr><td><code>by</code></td><td>Who claims it: <code>{ "people": id }</code> or <code>{ "org": id }</code>, which name an entry that lives elsewhere (on RR0, a people or an org directory), or a person described in value. Absent for a comparison nobody claims</td></tr>
      <tr><td><code>title</code></td><td>What the reading is called in the player's menu and the editor's picker: a few words, one string or one per language</td></tr>
      <tr><td><code>url</code></td><td>Its recording, read relative to the case file's own address, like a witness's</td></tr>
    </table>
    </div>
    <p>The recording at <code>url</code> is a recording like any other. It shares the place, the time and the witness's
      pose of the account it reads, so that a body placed from the witness, or in metres from where they stood,
      means the same in both; it draws no shape of its own (an empty <code>timeline</code>); and it holds the bodies in
      its own <code>interpretation</code>, described above. A body's <code>explains</code> names the shapes of the account.</p>
    <pre data-json=""><code>{
  "version": 4,
  "id": "1950-05-11-TrentPaul-interpretation-2",
  "time": "1950-05-11T19:45",
  "utcOffsetHours": -7,
  "place": { "locations": [{ "lat": 45.104167, "lng": -123.330556 }] },
  "observerTrack": { "keyframes": [{ "t": 0, "pose": { "lat": 45.104167, "lng": -123.330556, "headingDeg": 41.3, "pitchDeg": 14.85, "fovDeg": 33.4 } }] },
  "tags": ["interpretation"],
  "timeline": { "keyframes": [], "order": [], "groups": [] },
  "interpretation": {
    "title": "A model on a thread under the line",
    "bodies": [{
      "id": "model",
      "explains": ["ufo-1"],
      "model": { "id": "disc" },
      "track": [
        { "t": 0, "eastM": -52, "northM": 118, "altitudeAboveGroundM": 7.5,
          "sizeM": { "widthM": 0.3, "lengthM": 0.3, "heightM": 0.1 } }
      ]
    }]
  }
}</code></pre>
    <p>The player lists the case's witnesses from the events with no <code>interpretationOf</code> and offers each
      reading beside the account it names, one at a time (the ◌ button measures it against the account). A recording
      standing alone has no reading but its own <code>interpretation</code>. The older form, an event of type
      <code>interpretation</code> naming the recording in <code>sighting</code> with its bodies inline or in a file at
      <code>url</code>, is still read. The editor opens a case: its picker above the render lists the accounts and
      the readings, each opening as the recording it is, with a button to add a reading (a new recording that shares the
      account's place, time and pose, and an event for it), one to delete it, and one to export the case and every
      recording added or changed as a zip. Try it with
      <a href="/demo-data/case-mcminnville.json"><code>case-mcminnville.json</code></a>
      (<a href="/play/?file=/demo-data/case-mcminnville.json">play it</a>,
      <a href="/edit/?file=/demo-data/case-mcminnville.json">edit it</a>).</p>
`
  }

  private fr(): string {
    return `
    <h2>Ce que c'était : les lectures</h2>
    <p>Un enregistrement énonce des angles, et un corps en mètres ne fait jamais partie de ce qui
      a été vu. C'est une affirmation à son sujet, et elle se met à l'épreuve en la posant dans la
      scène et en la regardant depuis l'endroit où se tenait le témoin : elle projette son ombre,
      le sol peut la cacher, et son contour est confronté à chaque instant à ce que le témoin a
      dit. Une lecture s'affiche seule, comme le monde qu'elle affirme ; quand on demande
      la comparaison (le bouton ◌, ou <code>compare-account</code> sur
      <code>&lt;rr0-sighting&gt;</code>), le lecteur dessine à côté tout ce que le témoin a vu, en
      contours pointillés, et indique l'écart de direction et combien de fois plus large et plus
      haut chaque corps paraît, en rouge quand un témoin n'aurait pas pu se tromper d'autant.</p>
    <p>La lecture du témoin lui-même va dans l'enregistrement, en <code>interpretation</code>.
      Celle d'un autre n'est pas dans le compte rendu : c'est une autre observation, listée dans le dossier (voir plus bas). Un
      compte rendu dont le témoin a dit ce que c'était se dessine en volume, comme il l'a dit ;
      celui qui ne dit rien en mètres se dessine avec les angles qu'il énonce. Le lecteur le
      propose, ainsi que chaque lecture d'analyste, une à la fois.</p>
    <pre data-json=""><code>{
  "interpretation": {
    "title": "Un engin posé sur ses pieds",
    "bodies": [{
      "id": "craft",
      "explains": ["ufo-1"],
      "model": { "id": "ellipsoid" },
      "track": [
        { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
          "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
          "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
        { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
      ]
    }]
  }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>explains</code></td><td>Les <code>sourceId</code> des phénomènes que ce corps prétend être</td></tr>
      <tr><td><code>model</code></td><td>Une forme construite ici (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modèle du catalogue par son <code>id</code>, ou un fichier glTF à <code>url</code> avec son <code>credit</code> ; une <code>url</code> relative se lit depuis le fichier qui la donne, pas depuis la page. Étiré à <code>sizeM</code> dans tous les cas <code>headingOffsetDeg</code> et <code>credit</code> (<code>{ title, author, license, sourceUrl }</code>) sont ceux du modèle d'un objet du décor.</td></tr>
      <tr><td><code>track</code></td><td>Où il est et à quoi il ressemble à chaque <code>t</code>. Une position s'énonce soit dans le monde (<code>eastM</code>/<code>northM</code> depuis l'endroit où se tenait le témoin au début, comme le décor, avec <code>onGround</code> ou <code>altitudeAboveGroundM</code>), soit depuis le témoin à cet instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un corps <code>onGround</code> est posé sur le relief ; une direction sans distance rencontre alors le sol là où cette ligne le rencontre. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) et <code>appearance</code> (<code>color</code>, <code>albedo</code>, <code>luminanceCdM2</code>, <code>transparency</code> de 0 à 1, <code>haloScale</code> en multiple de l'éblouissement de sa lumière propre) valent jusqu'à ce qu'une keyframe suivante les énonce à nouveau, et se mélangent entre deux keyframes. <code>present: false</code> retire le corps de la scène à partir de cette keyframe, et <code>present: true</code> l'y ramène. Une <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> à la sortie, <code>tipColor</code>, <code>luminanceCdM2</code>) s'allume à la keyframe qui l'énonce, sort du nœud du modèle nommé <code>exhaust</code> (ou de celui que nomme son <code>node</code>), éclaire ce qui l'entoure, soulève de la poussière là où elle touche le sol si <code>raisesDust</code> le dit, et s'éteint avec une <code>luminanceCdM2</code> de 0</td></tr>
      <tr><td><code>motions</code></td><td>Dans une keyframe : où en est chacun des mouvements propres de son modèle, par le nom du mouvement — les animations du fichier glTF. <code>0</code> est le début d'un mouvement, <code>1</code> sa fin, et un mouvement qui se répète continue au-delà de 1 : <code>{ "legs-turn": 7 }</code>, c'est sept tours. Le modèle dit ce qui bouge et comment ; la piste dit quand. Chaque mouvement se mélange entre les keyframes qui l'énoncent, quelles que soient les keyframes qui déplacent le corps entre-temps, se maintient après la dernière et vaut 0 avant la première. Le départ de Valensole s'écrit ainsi : <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>Dans une keyframe : la luminance, en cd/m², de chacun des feux propres de son modèle, par le nom du matériau du feu dans le fichier glTF, pour qu'un même corps porte des feux qui font chacun autre chose, un blanc fixe à chaque bout et un rouge qui clignote entre les deux. Le modèle dit où est chaque feu, sa taille et sa couleur ; la piste dit quelle luminance et quand. Chaque feu se mélange entre les keyframes qui le nomment et se maintient après la dernière : une bascule, ce sont donc deux keyframes à une milliseconde d'écart. Un feu qu'aucune keyframe ne nomme brille à sa part de <code>appearance.luminanceCdM2</code>. Un feu trop petit pour se voir se voit par son éblouissement, et ce qui se trouve entre lui et l'œil, la coque du corps lui-même ou un pont, le cache. Le feu rouge de Silly-le-Long : <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>Le nœud du modèle qui est ce que le témoin a dessiné (<code>"hull"</code> pour un engin dont les pieds ne figurent pas dans le dessin) : ce sur quoi son contour est mesuré</td></tr>
      <tr><td><code>groups</code></td><td>Des parties de son modèle prises ensemble, pour qu'un seul événement les concerne toutes : <code>{ id, title, members }</code>, ses membres des parties du modèle (un feu par son nom) ou d'autres groupes du corps, leurs ids propres au corps. Nommé dans un événement comme une partie, <code>id/groupe</code> : les deux feux arrière de l'engin de <a href="/demo-data/observer-silly-le-long.json"><code>observer-silly-le-long.json</code></a>, <code>engin/rear</code>, qui clignotent ensemble. Facultatif : une partie se nomme aussi seule</td></tr>
      <tr><td><code>modelParameters</code>, <code>flicker</code></td><td>Les réglages de son modèle, par la clé sous laquelle son entrée du catalogue publie chacun (<code>{ "paperColor": "#ff0000" }</code> pour le papier d'une lanterne céleste, qui filtre aussi ce que ce papier émet) ; et la part dont sa lumière vacille, comme celle d'une flamme (<code>0.15</code> : quelque 15 % au-dessus et en dessous, plusieurs fois par seconde, à l'identique à chaque lecture). Stable si absent</td></tr>
      <tr><td><code>smoke</code></td><td>Sur la lecture elle-même : ce qu'elle met à brûler au sol, en <code>{ eastM, northM, fromT, untilT? }</code>, vu par sa fumée qu'emporte le vent de l'enregistrement <code>halfLifeS</code> dit à quelle vitesse elle retombe, en secondes pour perdre la moitié de son épaisseur (20 par défaut) : un feu de broussailles flambe puis couve. Elle ne s'arrête jamais tout à fait avant <code>untilT</code>.</td></tr>
      <tr><td><code>lanterns</code></td><td>Sur la lecture elle-même : des lanternes célestes lâchées du sol, chacune calculée en un corps lumineux. Un lâcher indique son <code>site</code> (<code>{ eastM, northM, altitudeM?, originElevationM? }</code>), le vent au sol <code>wind</code> et, au besoin, <code>windAloft</code> (<code>{ towardDeg, speedMS, atM }</code>), la température <code>airTemperatureC</code>, et ses lanternes : une à une dans <code>releases</code> (<code>{ t, explains?, eastM?, northM?, altitudeM?, burnedS?, lantern? }</code>, où <code>altitudeM</code> et <code>burnedS</code> font partir une lanterne de là où elle a été vue la première fois, déjà en l'air et en partie consumée), ou en <code>group</code> (<code>{ count, fromT, untilT, radiusM?, burnS?: { min, max }, insideExcessK?: { min, max }, burnedS?, explains?, seed? }</code>), dont les lanternes sont tirées au hasard dans ces bornes, les mêmes pour la même <code>seed</code>. Chacune monte tant que son air chaud la porte plus qu'elle ne pèse, suit le vent de la hauteur atteinte, chacune prise dans ses propres rafales (<code>turbulence</code> : <code>{ horizontalMS, verticalMS, timescaleS }</code>, l'écart de la vitesse de l'air autour de ce vent et la durée d'une rafale ; 0,8, 0,3 et 30 s, ceux d'une brise légère, par défaut, tout à zéro pour un air immobile), si bien qu'un groupe lâché ensemble s'étire et se déforme en montant, et disparaît quand son combustible est épuisé : 8 à 15 minutes selon les vendeurs, 480 à 900 s tirées par défaut. <code>lantern</code> remplace la lanterne courante d'un mètre : <code>envelopeVolumeM3</code> (0,19), <code>massKg</code> (0,065), <code>fuelKg</code>, <code>burnS</code> (600), <code>insideExcessK</code> (150), <code>dragAreaM2</code>, <code>luminousIntensityCd</code> (10, supposé : une étoile brillante à 2 km), <code>widthM</code>, <code>heightM</code>, <code>color</code> (la lumière de sa flamme à travers un papier blanc), <code>shape</code> (<code>"classic"</code>, ronde à la base et carrée au sommet plat, ou <code>"balloon"</code>, étroite à la base et au sommet large en lobes) et <code>paperColor</code> (blanc par défaut : son aspect de jour, et ce qui filtre sa lumière de nuit). Chacune penche du côté où l'air qui la dépasse la pousse, de quelques degrés dans une rafale.</td></tr>
      <tr><td><code>findings</code></td><td>Sur la lecture elle-même : les tests auxquels l'hypothèse a été soumise et le résultat de chacun, pour qu'une hypothèse qui échoue reste là, montrant qu'elle a été examinée et pourquoi elle ne tient pas. Chacun est <code>{ text, outcome, against?, rationale? }</code> : <code>text</code> dit ce qui a été testé et ce que cela a donné (un par langue), <code>outcome</code> vaut <code>holds</code> (tient), <code>fails</code> (échoue) ou <code>untested</code> (impossible à faire avec ce qu'on sait), et <code>against</code> dit à quoi il a été confronté : <code>established</code> (une valeur indiquée ou déduite, une mesure sur l'image) ou <code>supposed</code> (une valeur que l'enregistrement a supposée, ou qu'il a ajustée à une hypothèse). Une lecture qui échoue contre un élément établi contredit l'observation de front, et l'éditeur de dossier la dessine en rouge ; celle qui n'échoue que contre une supposition, ou n'a pu être testée, n'est pas tranchée, en orange ; celle dont tous les tests tiennent est en vert. Sans constat, personne ne l'a testée, et elle n'a pas de couleur.</td></tr>
      <tr><td><code>mechanism</code></td><td>Sur la lecture elle-même, quand l'hypothèse est que l'instrument a produit le phénomène : <code>{ kind, explains, of? }</code>, <code>explains</code> l'id des formes du phénomène dans le compte rendu et <code>kind</code> l'un de <code>fixed-in-frame</code> (fixe dans le cadre : une poussière sur l'objectif ou dans le couloir, un reflet sur une vitre solidaire de la caméra), <code>lens-ghost</code> (un reflet du Soleil dans l'objectif même de l'instrument, à l'un des facteurs que son verre donne), <code>stated-ghost</code> (un reflet du Soleil dans une optique placée devant l'objectif, au facteur et au décalage qui vont le mieux) <code>driven-one-way</code> (quelque chose sur le verre poussé à travers le cadre dans un seul sens, sans retour), <code>ghost-of</code> (un reflet par l'objectif d'une lumière que la lecture place elle-même, <code>of</code> l'id de ce corps : un éclat sur un avion) et <code>real-object</code> (quelque chose de réellement dans le ciel, à n'importe quelle distance sur la ligne de visée). Sa configuration la plus favorable est alors cherchée dans ce que le compte rendu permet (les hauteurs du Soleil sur les jours qu'il permet, le côté d'où vient la lumière de l'image) et mesuré contre l'endroit où le compte rendu montre le phénomène, instant par instant : l'écart qui reste est un constat calculé pour qui le lit, qui tient dans la taille même du phénomène. La lecture est toujours montrée dans cette configuration : la tache, la goutte ou l'objet est placé là où la recherche le met, quoi que son fichier ait placé (sa distance, sa taille et son aspect sont gardés)</td></tr>
    </table>
    </div>

    <h2>Une autre lecture est une autre observation</h2>
    <p>La lecture qu'un autre fait d'un compte rendu (celle d'un analyste, d'un enquêteur, une comparaison faite pour
      la mettre à l'épreuve) n'est pas dans le compte rendu : c'est une autre observation, celle qui a eu lieu telle que
      son auteur la tient. Elle est donc listée dans le dossier comme l'original, en événement de type
      <code>sighting</code>, marqué comme lecture par <code>interpretationOf</code>, et a un enregistrement à elle à
      <code>url</code> :</p>
    <pre data-json="none"><code>{
  "id": "McMinnville1950",
  "events": [
    { "type": "event", "eventType": "sighting", "id": "trent", "title": "Paul Trent", "url": "observer-mcminnville.json" },
    { "type": "event", "eventType": "sighting",
      "interpretationOf": "trent",
      "time": "2013-06",
      "by": [{ "people": "CousynAntoine" }, { "people": "LouangeFrancois" }],
      "title": "A model on a thread under the line",
      "url": "interpretation-mcminnville-2.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>interpretationOf</code></td><td>L'<code>id</code> de l'événement du dossier dont c'est une lecture (<code>"trent"</code>), ou une liste d'ids quand une lecture sert plusieurs comptes rendus (les photographies et un gros plan). Ce qui la distingue d'un compte rendu : les événements <em>sans</em> ce champ sont les témoins du dossier</td></tr>
      <tr><td><code>sealed</code></td><td>Si l'événement est gelé : <code>true</code> dès que quelqu'un a travaillé SUR cette reconstitution (une interview tenue pour avoir le retour du témoin, une hypothèse confrontée à elle), afin qu'une modification ultérieure ne puisse pas invalider ce travail en silence. L'éditeur n'accepte alors plus rien de saisi, et refuse de la supprimer comme de renommer son <code>id</code>, jusqu'au dégel ; c'est son clone, à côté du cadenas, que l'auteur continue. Jamais posé tout seul : une reconstitution se modifie tant qu'elle se construit, et des versions que personne n'a demandées ne sont que du bruit</td></tr>
      <tr><td><code>time</code></td><td>Quand la lecture a été élaborée, comme RR0 écrit un temps (<code>"2013-06"</code>) : pas quand l'observation a eu lieu</td></tr>
      <tr><td><code>by</code></td><td>Qui l'avance : <code>{ "people": id }</code> ou <code>{ "org": id }</code>, qui désignent une entrée qui vit ailleurs (sur RR0, un répertoire de personnes ou d'organisations), ou une personne décrite en valeur. Absent pour une comparaison que personne n'avance</td></tr>
      <tr><td><code>title</code></td><td>Comment la lecture s'appelle dans le menu du lecteur et le sélecteur de l'éditeur : quelques mots, une chaîne ou une par langue</td></tr>
      <tr><td><code>url</code></td><td>Son enregistrement, lu relativement à l'adresse du fichier du dossier, comme celui d'un témoin</td></tr>
    </table>
    </div>
    <p>L'enregistrement à <code>url</code> est un enregistrement comme les autres. Il partage le lieu, l'heure et la pose
      du témoin du compte rendu qu'il lit, si bien qu'un corps placé depuis le témoin, ou en mètres depuis
      l'endroit où il se tenait, veut dire la même chose dans les deux ; il ne dessine aucune forme (une
      <code>timeline</code> vide) ; et il porte les corps dans son propre <code>interpretation</code>, décrit plus haut.
      Les <code>explains</code> d'un corps désignent les formes du compte rendu.</p>
    <pre data-json=""><code>{
  "version": 4,
  "id": "1950-05-11-TrentPaul-interpretation-2",
  "time": "1950-05-11T19:45",
  "utcOffsetHours": -7,
  "place": { "locations": [{ "lat": 45.104167, "lng": -123.330556 }] },
  "observerTrack": { "keyframes": [{ "t": 0, "pose": { "lat": 45.104167, "lng": -123.330556, "headingDeg": 41.3, "pitchDeg": 14.85, "fovDeg": 33.4 } }] },
  "tags": ["interpretation"],
  "timeline": { "keyframes": [], "order": [], "groups": [] },
  "interpretation": {
    "title": "A model on a thread under the line",
    "bodies": [{
      "id": "model",
      "explains": ["ufo-1"],
      "model": { "id": "disc" },
      "track": [
        { "t": 0, "eastM": -52, "northM": 118, "altitudeAboveGroundM": 7.5,
          "sizeM": { "widthM": 0.3, "lengthM": 0.3, "heightM": 0.1 } }
      ]
    }]
  }
}</code></pre>
    <p>Le lecteur liste les témoins du dossier d'après les événements sans <code>interpretationOf</code> et propose
      chaque lecture à côté du compte rendu qu'elle désigne, une à la fois (le bouton ◌ la mesure contre le compte
      rendu). Un enregistrement seul n'a d'autre lecture que son propre <code>interpretation</code>. L'ancienne forme, un
      événement de type <code>interpretation</code> qui désigne l'enregistrement dans <code>sighting</code> avec ses corps
      sur place ou dans un fichier à <code>url</code>, est encore lue. L'éditeur ouvre un dossier : son sélecteur
      au-dessus du rendu liste les comptes rendus et les lectures, chacun s'ouvrant comme l'enregistrement qu'il est, avec
      un bouton pour ajouter une lecture (un nouvel enregistrement qui partage le lieu, l'heure et la pose du compte
      rendu, et un événement pour lui), un pour la supprimer, et un pour exporter le dossier et chaque enregistrement
      ajouté ou modifié en zip. Essayez avec
      <a href="/demo-data/case-mcminnville.json"><code>case-mcminnville.json</code></a>
      (<a href="/play/?file=/demo-data/case-mcminnville.json">le jouer</a>,
      <a href="/edit/?file=/demo-data/case-mcminnville.json">l'éditer</a>).</p>
`
  }

  private es(): string {
    return `
    <h2>Lo que era: lecturas</h2>
    <p>Una grabación expresa ángulos, y un cuerpo en metros nunca forma parte de lo que se vio. Es una
      afirmación sobre ello, y se pone a prueba colocándola en la escena y mirándola desde donde
      estaba el testigo: proyecta su sombra, el suelo puede ocultarla, y su contorno se mide
      en cada instante frente a lo que dijo el testigo. Una lectura se muestra sola, como el
      mundo que afirma; si se pide comparar (el botón ◌, o <code>compare-account</code> en
      <code>&lt;rr0-sighting&gt;</code>), el reproductor dibuja a su lado todo lo que vio el testigo como
      contornos discontinuos e indica cuánto se desvía la dirección y cuántas veces más ancho y más alto
      parece cada cuerpo, en rojo cuando un testigo no podría haberse equivocado tanto.</p>
    <p>La lectura del propio testigo va en la grabación, como <code>interpretation</code>. La de otro no está en el relato: es otra observación, listada en el caso (véase abajo). Un relato cuyo testigo dijo lo que
      era se dibuja en volumen, como lo dijo; uno que no dice nada en metros se dibuja como los
      ángulos que expresa. El reproductor lo ofrece, junto con la lectura de cada analista, una cada vez.</p>
    <pre data-json=""><code>{
  "interpretation": {
    "title": "Una nave posada sobre sus patas",
    "bodies": [{
      "id": "craft",
      "explains": ["ufo-1"],
      "model": { "id": "ellipsoid" },
      "track": [
        { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
          "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
          "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
        { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
      ]
    }]
  }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>explains</code></td><td>Los <code>sourceId</code> de los fenómenos que este cuerpo afirma ser</td></tr>
      <tr><td><code>model</code></td><td>Una forma construida aquí (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modelo del catálogo por <code>id</code>, o un archivo glTF en <code>url</code> con su <code>credit</code>; una <code>url</code> relativa se lee desde el archivo que la indica, no desde la página. Estirado a <code>sizeM</code> sea cual sea <code>headingOffsetDeg</code> y <code>credit</code> (<code>{ title, author, license, sourceUrl }</code>) son los del modelo de un objeto del decorado.</td></tr>
      <tr><td><code>track</code></td><td>Dónde está y qué aspecto tiene en cada <code>t</code>. Una posición se expresa o bien en el mundo (<code>eastM</code>/<code>northM</code> desde donde estaba el testigo al inicio, como el decorado, con <code>onGround</code> o <code>altitudeAboveGroundM</code>) o bien desde el testigo en ese instante (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un cuerpo <code>onGround</code> se apoya en el relieve; una dirección sin distancia se encuentra entonces con el suelo donde lo hace esa línea. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) y <code>appearance</code> (<code>color</code>, <code>albedo</code>, <code>luminanceCdM2</code>, <code>transparency</code> de 0 a 1, <code>haloScale</code> como múltiplo del deslumbramiento de su luz propia) se mantienen hasta que un fotograma clave posterior los vuelve a indicar, y se mezclan entre dos fotogramas clave. <code>present: false</code> saca el cuerpo de la escena a partir de ese fotograma clave, y <code>present: true</code> lo devuelve. Una <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> en la tobera, <code>tipColor</code>, <code>luminanceCdM2</code>) se enciende en el fotograma clave que la indica, sale del nodo del modelo llamado <code>exhaust</code> (o del que nombre su <code>node</code>), ilumina lo que la rodea, levanta polvo donde toca el suelo cuando <code>raisesDust</code> lo indica, y se apaga con una <code>luminanceCdM2</code> de 0</td></tr>
      <tr><td><code>motions</code></td><td>En un fotograma clave: cuánto ha avanzado cada uno de los movimientos propios de su modelo, por el nombre del movimiento — las animaciones del archivo glTF. <code>0</code> es el inicio de un movimiento, <code>1</code> su final, y uno que se repite sigue más allá de 1: <code>{ "legs-turn": 7 }</code> son siete vueltas. El modelo dice qué se mueve y cómo; la pista dice cuándo. Cada movimiento se interpola entre los fotogramas clave que lo indican, sean cuales sean los demás fotogramas clave que muevan el cuerpo entretanto, se mantiene tras el último y vale 0 antes del primero. La partida de Valensole se escribe así: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>En un fotograma clave: la luminancia, en cd/m², de cada una de las luces propias de su modelo, por el nombre del material de la luz en el archivo glTF — para que un mismo cuerpo lleve luces que hacen cada una lo suyo, una blanca fija en cada extremo y una roja que destella entre ambas. El modelo dice dónde está cada luz, su tamaño y su color; la pista dice cuánto brilla y cuándo. Cada luz se interpola entre los fotogramas clave que la nombran y se mantiene tras el último, así que un encendido o apagado son dos fotogramas clave separados por un milisegundo; una luz que ningún fotograma clave nombra brilla con su parte de <code>appearance.luminanceCdM2</code>. Una luz demasiado pequeña para verse se ve por su deslumbramiento, y lo que se interponga entre ella y el ojo — el propio casco del cuerpo, un puente — la oculta. La luz roja de Silly-le-Long: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>El nodo del modelo que es lo que dibujó el testigo (<code>"hull"</code> para una nave cuyas patas no están en el dibujo): aquello por lo que se mide su contorno</td></tr>
      <tr><td><code>groups</code></td><td>Partes de su modelo tomadas juntas, para que un solo evento trate de todas: <code>{ id, title, members }</code>, sus miembros partes del modelo (una luz por su nombre) u otros grupos del cuerpo, sus ids propios del cuerpo. Nombrado en un evento como una parte, <code>id/grupo</code>: las dos luces traseras de la nave de <a href="/demo-data/observer-silly-le-long.json"><code>observer-silly-le-long.json</code></a>, <code>engin/rear</code>, que parpadean juntas. Opcional: una parte también se nombra sola</td></tr>
      <tr><td><code>modelParameters</code>, <code>flicker</code></td><td>Los ajustes de su modelo, por la clave con que su entrada del catálogo publica cada uno (<code>{ "paperColor": "#ff0000" }</code> para el papel de un farolillo, que también filtra lo que emite ese papel); y la parte en que vacila su luz, como la de una llama (<code>0.15</code>: un 15 % por encima y por debajo, varias veces por segundo, igual en cada reproducción). Estable si falta</td></tr>
      <tr><td><code>smoke</code></td><td>En la propia lectura: lo que hace arder en el suelo, como <code>{ eastM, northM, fromT, untilT? }</code>, visto por su humo arrastrado por el viento de la grabación <code>halfLifeS</code> dice a qué velocidad decae, en segundos hasta perder la mitad de su espesor (20 por defecto): un fuego de matorral llamea y luego arde sin llama. Nunca se detiene del todo antes de <code>untilT</code>.</td></tr>
      <tr><td><code>lanterns</code></td><td>En la propia lectura: farolillos voladores soltados desde el suelo, cada uno calculado como un cuerpo luminoso. Una suelta indica su <code>site</code> (<code>{ eastM, northM, altitudeM?, originElevationM? }</code>), el viento en el suelo <code>wind</code> y, si hace falta, <code>windAloft</code> (<code>{ towardDeg, speedMS, atM }</code>), la temperatura <code>airTemperatureC</code>, y sus farolillos: uno a uno en <code>releases</code> (<code>{ t, explains?, eastM?, northM?, altitudeM?, burnedS?, lantern? }</code>, donde <code>altitudeM</code> y <code>burnedS</code> hacen partir un farolillo de donde se vio por primera vez, ya en el aire y en parte consumido), o en <code>group</code> (<code>{ count, fromT, untilT, radiusM?, burnS?: { min, max }, insideExcessK?: { min, max }, burnedS?, explains?, seed? }</code>), cuyos farolillos se sortean dentro de esos límites, los mismos para la misma <code>seed</code>. Cada uno sube mientras su aire caliente lo sostiene más de lo que pesa, sigue el viento de la altura alcanzada, cada uno en sus propias ráfagas (<code>turbulence</code>: <code>{ horizontalMS, verticalMS, timescaleS }</code>, la dispersión de la velocidad del aire en torno a ese viento y lo que dura una ráfaga; 0,8, 0,3 y 30 s, los de una brisa ligera, por defecto, todo a cero para un aire quieto), de modo que un grupo soltado a la vez se estira y se deforma al subir, y desaparece cuando se agota su combustible: de 8 a 15 minutos según los vendedores, de 480 a 900 s sorteados por defecto. <code>lantern</code> sustituye al farolillo común de un metro: <code>envelopeVolumeM3</code> (0,19), <code>massKg</code> (0,065), <code>fuelKg</code>, <code>burnS</code> (600), <code>insideExcessK</code> (150), <code>dragAreaM2</code>, <code>luminousIntensityCd</code> (10, supuesto: una estrella brillante a 2 km), <code>widthM</code>, <code>heightM</code>, <code>color</code> (la luz de su llama a través de un papel blanco), <code>shape</code> (<code>"classic"</code>, redondo en la base y cuadrado en su cima plana, o <code>"balloon"</code>, estrecho en la base y con una cima ancha lobulada) y <code>paperColor</code> (blanco por defecto: su aspecto de día, y lo que filtra su luz de noche). Cada uno se inclina hacia donde lo empuja el aire que lo rebasa, unos grados en una ráfaga.</td></tr>
      <tr><td><code>findings</code></td><td>En la propia lectura: las pruebas a las que se sometió la hipótesis y el resultado de cada una, para que una hipótesis que falla se conserve, mostrando que se examinó y por qué no se sostiene. Cada una es <code>{ text, outcome, against?, rationale? }</code>: <code>text</code> dice qué se probó y qué dio (uno por idioma), <code>outcome</code> vale <code>holds</code> (se sostiene), <code>fails</code> (falla) o <code>untested</code> (no pudo hacerse con lo que se sabe), y <code>against</code> dice con qué se contrastó: <code>established</code> (un valor indicado o deducido, una medida en la imagen) o <code>supposed</code> (uno que la grabación supuso, o que ajustó a una hipótesis). Una lectura que falla contra lo establecido contradice de frente la observación, y el editor de casos la dibuja en rojo; la que solo falla contra una suposición, o no pudo probarse, queda sin resolver, en naranja; aquella cuyas pruebas se sostienen todas, en verde. Sin pruebas, nadie la ha probado, y no tiene color.</td></tr>
      <tr><td><code>mechanism</code></td><td>En la propia lectura, cuando la hipótesis es que el instrumento produjo el fenómeno: <code>{ kind, explains, of? }</code>, <code>explains</code> el id de las formas del fenómeno en el relato y <code>kind</code> uno de <code>fixed-in-frame</code> (fijo en el encuadre: una mota en el objetivo o en la ventanilla, un reflejo en un cristal solidario de la cámara), <code>lens-ghost</code> (un reflejo del Sol en el propio objetivo del instrumento, a uno de los factores que da su cristal), <code>stated-ghost</code> (un reflejo del Sol en una óptica colocada delante del objetivo, con el factor y el desplazamiento que mejor encajan) <code>driven-one-way</code> (algo sobre el cristal empujado a través del encuadre en un solo sentido, sin vuelta), <code>ghost-of</code> (un reflejo por el objetivo de una luz que la propia lectura coloca, <code>of</code> el id de ese cuerpo: un destello en un avión) y <code>real-object</code> (algo realmente en el cielo, a cualquier distancia en la línea de visión). Su configuración más favorable se busca entonces dentro de lo que el relato permite (las alturas del Sol en los días que permite, el lado del que viene la luz de la imagen) y se mide contra donde el relato muestra el fenómeno, instante a instante: la distancia que queda es una constatación calculada para quien la lee, que se cumple dentro del tamaño mismo del fenómeno. La lectura se muestra siempre en ella: la mota, la gota o el objeto se coloca donde la búsqueda lo pone, sea lo que sea lo que su archivo colocaba (se conservan su distancia, su tamaño y su aspecto)</td></tr>
    </table>
    </div>

    <h2>Otra lectura es otra observación</h2>
    <p>La lectura que otro hace de un relato (la de un analista, de un investigador, una comparación hecha para
      ponerla a prueba) no forma parte del relato: es otra observación, la que ocurrió tal como la sostiene su autor.
      Por eso se lista en el caso como el original, como un evento de tipo <code>sighting</code>, marcado como lectura
      con <code>interpretationOf</code>, y tiene una grabación propia en <code>url</code>:</p>
    <pre data-json="none"><code>{
  "id": "McMinnville1950",
  "events": [
    { "type": "event", "eventType": "sighting", "id": "trent", "title": "Paul Trent", "url": "observer-mcminnville.json" },
    { "type": "event", "eventType": "sighting",
      "interpretationOf": "trent",
      "time": "2013-06",
      "by": [{ "people": "CousynAntoine" }, { "people": "LouangeFrancois" }],
      "title": "A model on a thread under the line",
      "url": "interpretation-mcminnville-2.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>interpretationOf</code></td><td>El <code>id</code> del evento del caso del que es lectura (<code>"trent"</code>), o una lista de ids cuando una lectura sirve a varios relatos (las fotografías y un primer plano). Lo que la distingue de un relato: los eventos <em>sin</em> este campo son los testigos del caso</td></tr>
      <tr><td><code>sealed</code></td><td>Si el evento está congelado: <code>true</code> en cuanto alguien ha trabajado SOBRE esta reconstrucción (una entrevista para recoger la opinión del testigo, una hipótesis contrastada con ella), para que una modificación posterior no invalide ese trabajo en silencio. El editor ya no acepta nada escrito, y se niega a borrarla o a renombrar su <code>id</code>, hasta que se descongele; es su clon, junto al candado, lo que el autor continúa. Nunca se pone solo: una reconstrucción se edita mientras se construye, y las versiones que nadie pidió son ruido</td></tr>
      <tr><td><code>time</code></td><td>Cuándo se elaboró la lectura, como RR0 escribe un tiempo (<code>"2013-06"</code>): no cuándo ocurrió la observación</td></tr>
      <tr><td><code>by</code></td><td>Quién la sostiene: <code>{ "people": id }</code> o <code>{ "org": id }</code>, que nombran una entrada que vive en otro sitio (en RR0, un directorio de personas u organizaciones), o una persona descrita en el valor. Ausente en una comparación que nadie sostiene</td></tr>
      <tr><td><code>title</code></td><td>Cómo se llama la lectura en el menú del reproductor y el selector del editor: unas palabras, una cadena o una por idioma</td></tr>
      <tr><td><code>url</code></td><td>Su grabación, leída relativa a la dirección del archivo del caso, como la de un testigo</td></tr>
    </table>
    </div>
    <p>La grabación en <code>url</code> es una grabación como las demás. Comparte el lugar, la hora y la pose del testigo
      del relato que lee, de modo que un cuerpo situado desde el testigo, o en metros desde donde estaba, significa lo
      mismo en ambas; no dibuja ninguna forma (una <code>timeline</code> vacía); y guarda los cuerpos en su propia
      <code>interpretation</code>, descrita arriba. El <code>explains</code> de un cuerpo nombra las formas del relato.</p>
    <pre data-json=""><code>{
  "version": 4,
  "id": "1950-05-11-TrentPaul-interpretation-2",
  "time": "1950-05-11T19:45",
  "utcOffsetHours": -7,
  "place": { "locations": [{ "lat": 45.104167, "lng": -123.330556 }] },
  "observerTrack": { "keyframes": [{ "t": 0, "pose": { "lat": 45.104167, "lng": -123.330556, "headingDeg": 41.3, "pitchDeg": 14.85, "fovDeg": 33.4 } }] },
  "tags": ["interpretation"],
  "timeline": { "keyframes": [], "order": [], "groups": [] },
  "interpretation": {
    "title": "A model on a thread under the line",
    "bodies": [{
      "id": "model",
      "explains": ["ufo-1"],
      "model": { "id": "disc" },
      "track": [
        { "t": 0, "eastM": -52, "northM": 118, "altitudeAboveGroundM": 7.5,
          "sizeM": { "widthM": 0.3, "lengthM": 0.3, "heightM": 0.1 } }
      ]
    }]
  }
}</code></pre>
    <p>El reproductor lista los testigos del caso a partir de los eventos sin <code>interpretationOf</code> y ofrece
      cada lectura junto al relato que nombra, una cada vez (el botón ◌ la mide contra el relato). Una grabación sola no
      tiene más lectura que su propia <code>interpretation</code>. La forma antigua, un evento de tipo
      <code>interpretation</code> que nombra la grabación en <code>sighting</code> con sus cuerpos en línea o en un
      archivo en <code>url</code>, se sigue leyendo. El editor abre un caso: su selector sobre el render lista los
      relatos y las lecturas, cada uno abriéndose como la grabación que es, con un botón para añadir una lectura (una
      grabación nueva que comparte el lugar, la hora y la pose del relato, y un evento para ella), otro para eliminarla,
      y otro para exportar el caso y cada grabación añadida o modificada en un zip. Pruébalo con
      <a href="/demo-data/case-mcminnville.json"><code>case-mcminnville.json</code></a>
      (<a href="/play/?file=/demo-data/case-mcminnville.json">reproducirlo</a>,
      <a href="/edit/?file=/demo-data/case-mcminnville.json">editarlo</a>).</p>
`
  }

  private it(): string {
    return `
    <h2>Che cos'era: le letture</h2>
    <p>Una registrazione esprime angoli, e un corpo in metri non fa mai parte di ciò che è stato visto. È
      un'affermazione su di esso, e la si mette alla prova collocandola nella scena e guardandola da dove
      si trovava il testimone: proietta la sua ombra, il suolo può nasconderla, e il suo contorno viene misurato
      in ogni istante rispetto a ciò che il testimone ha detto. Una lettura viene mostrata da sola, come il
      mondo che afferma; se si chiede il confronto (il pulsante ◌, o <code>compare-account</code> su
      <code>&lt;rr0-sighting&gt;</code>), il lettore disegna accanto tutto ciò che il testimone ha visto come
      contorni tratteggiati e indica di quanto si discosta la direzione e quante volte più largo e più alto
      appare ciascun corpo, in rosso quando un testimone non avrebbe potuto sbagliarsi di tanto.</p>
    <p>La lettura del testimone stesso va nella registrazione, come <code>interpretation</code>. Quella di un altro non è nel resoconto: è un'altra osservazione, elencata nel caso (vedi sotto). Un resoconto il cui testimone ha detto che cosa
      fosse viene disegnato a tutto tondo, come l'ha detto; uno che non dice nulla in metri viene disegnato come gli
      angoli che esprime. Il lettore lo propone, insieme alla lettura di ciascun analista, una alla volta.</p>
    <pre data-json=""><code>{
  "interpretation": {
    "title": "Un velivolo posato sulle sue zampe",
    "bodies": [{
      "id": "craft",
      "explains": ["ufo-1"],
      "model": { "id": "ellipsoid" },
      "track": [
        { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
          "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
          "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
        { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
      ]
    }]
  }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>explains</code></td><td>I <code>sourceId</code> dei fenomeni che questo corpo afferma di essere</td></tr>
      <tr><td><code>model</code></td><td>Una forma costruita qui (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modello del catalogo tramite <code>id</code>, o un file glTF a <code>url</code> con il suo <code>credit</code>; un <code>url</code> relativo si legge dal file che lo indica, non dalla pagina. Stirato a <code>sizeM</code> in ogni caso <code>headingOffsetDeg</code> e <code>credit</code> (<code>{ title, author, license, sourceUrl }</code>) sono quelli del modello di un oggetto dello scenario.</td></tr>
      <tr><td><code>track</code></td><td>Dove si trova e che aspetto ha a ogni <code>t</code>. Una posizione si esprime o nel mondo (<code>eastM</code>/<code>northM</code> da dove si trovava il testimone all'inizio, come lo scenario, con <code>onGround</code> o <code>altitudeAboveGroundM</code>) o dal testimone in quell'istante (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un corpo <code>onGround</code> poggia sul rilievo; una direzione senza distanza incontra allora il suolo dove lo incontra quella linea. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) e <code>appearance</code> (<code>color</code>, <code>albedo</code>, <code>luminanceCdM2</code>, <code>transparency</code> da 0 a 1, <code>haloScale</code> come multiplo dell'abbagliamento della sua luce propria) valgono finché un fotogramma chiave successivo non li indica di nuovo, e si mescolano tra due fotogrammi chiave. <code>present: false</code> toglie il corpo dalla scena a partire da quel fotogramma chiave, e <code>present: true</code> lo riporta. Una <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> all'ugello, <code>tipColor</code>, <code>luminanceCdM2</code>) si accende al fotogramma chiave che la indica, esce dal nodo del modello chiamato <code>exhaust</code> (o da quello che nomina il suo <code>node</code>), illumina ciò che la circonda, solleva polvere dove tocca il suolo quando <code>raisesDust</code> lo dice, e si spegne con una <code>luminanceCdM2</code> pari a 0</td></tr>
      <tr><td><code>motions</code></td><td>In un fotogramma chiave: a che punto è ciascuno dei movimenti propri del suo modello, con il nome del movimento — le animazioni del file glTF. <code>0</code> è l'inizio di un movimento, <code>1</code> la sua fine, e uno che si ripete prosegue oltre 1: <code>{ "legs-turn": 7 }</code> sono sette giri. Il modello dice che cosa si muove e come; la traccia dice quando. Ogni movimento si interpola fra i fotogrammi chiave che lo indicano, qualunque altro fotogramma chiave sposti il corpo nel frattempo, si mantiene dopo l'ultimo e vale 0 prima del primo. La partenza di Valensole si scrive così: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>In un fotogramma chiave: la luminanza, in cd/m², di ciascuna delle luci proprie del suo modello, con il nome del materiale della luce nel file glTF — così che uno stesso corpo porti luci che fanno ciascuna la propria cosa, una bianca fissa a ogni estremità e una rossa che lampeggia fra le due. Il modello dice dove si trova ogni luce, quanto è grande e di che colore; la traccia dice quanto brilla e quando. Ogni luce si interpola fra i fotogrammi chiave che la nominano e si mantiene dopo l'ultimo, quindi un'accensione o uno spegnimento sono due fotogrammi chiave a un millisecondo di distanza; una luce che nessun fotogramma chiave nomina brilla con la sua parte di <code>appearance.luminanceCdM2</code>. Una luce troppo piccola per vedersi si vede dal suo abbagliamento, e ciò che si trova fra essa e l'occhio — lo scafo del corpo stesso, un ponte — la nasconde. La luce rossa di Silly-le-Long: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>Il nodo del modello che è ciò che il testimone ha disegnato (<code>"hull"</code> per un velivolo le cui zampe non sono nel disegno): ciò su cui si misura il suo contorno</td></tr>
      <tr><td><code>groups</code></td><td>Parti del suo modello prese insieme, perché un solo evento le riguardi tutte: <code>{ id, title, members }</code>, i suoi membri parti del modello (una luce con il suo nome) o altri gruppi del corpo, i loro id propri del corpo. Nominato in un evento come una parte, <code>id/gruppo</code>: le due luci posteriori del velivolo di <a href="/demo-data/observer-silly-le-long.json"><code>observer-silly-le-long.json</code></a>, <code>engin/rear</code>, che lampeggiano insieme. Facoltativo: una parte si nomina anche da sola</td></tr>
      <tr><td><code>modelParameters</code>, <code>flicker</code></td><td>Le impostazioni del suo modello, per la chiave con cui la sua voce del catalogo pubblica ciascuna (<code>{ "paperColor": "#ff0000" }</code> per la carta di una lanterna volante, che filtra anche ciò che quella carta emette); e la parte di cui la sua luce vacilla, come quella di una fiamma (<code>0.15</code>: un 15 % sopra e sotto, più volte al secondo, uguale a ogni riproduzione). Stabile se assente</td></tr>
      <tr><td><code>smoke</code></td><td>Sulla lettura stessa: ciò che fa bruciare al suolo, come <code>{ eastM, northM, fromT, untilT? }</code>, visto dal suo fumo portato via dal vento della registrazione <code>halfLifeS</code> dice quanto in fretta si spegne, in secondi per perdere metà del suo spessore (20 per default): un fuoco di sterpaglia divampa e poi cova. Non si ferma mai del tutto prima di <code>untilT</code>.</td></tr>
      <tr><td><code>lanterns</code></td><td>Sulla lettura stessa: lanterne volanti lasciate andare da terra, ciascuna calcolata come un corpo luminoso. Un lancio indica il suo <code>site</code> (<code>{ eastM, northM, altitudeM?, originElevationM? }</code>), il vento al suolo <code>wind</code> e, se serve, <code>windAloft</code> (<code>{ towardDeg, speedMS, atM }</code>), la temperatura <code>airTemperatureC</code>, e le sue lanterne: una per una in <code>releases</code> (<code>{ t, explains?, eastM?, northM?, altitudeM?, burnedS?, lantern? }</code>, dove <code>altitudeM</code> e <code>burnedS</code> fanno partire una lanterna da dove è stata vista per la prima volta, già in aria e in parte consumata), oppure in <code>group</code> (<code>{ count, fromT, untilT, radiusM?, burnS?: { min, max }, insideExcessK?: { min, max }, burnedS?, explains?, seed? }</code>), le cui lanterne sono estratte a caso entro quei limiti, le stesse per lo stesso <code>seed</code>. Ognuna sale finché la sua aria calda la sostiene più di quanto pesi, segue il vento della quota raggiunta, ciascuna nelle proprie raffiche (<code>turbulence</code>: <code>{ horizontalMS, verticalMS, timescaleS }</code>, lo scarto della velocità dell'aria attorno a quel vento e quanto dura una raffica; 0,8, 0,3 e 30 s, quelli di una brezza leggera, per impostazione predefinita, tutto a zero per un'aria ferma), così che un gruppo lasciato andare insieme si allunga e si deforma salendo, e scompare quando il combustibile è finito: da 8 a 15 minuti secondo i venditori, da 480 a 900 s estratti per impostazione predefinita. <code>lantern</code> sostituisce la lanterna comune di un metro: <code>envelopeVolumeM3</code> (0,19), <code>massKg</code> (0,065), <code>fuelKg</code>, <code>burnS</code> (600), <code>insideExcessK</code> (150), <code>dragAreaM2</code>, <code>luminousIntensityCd</code> (10, ipotizzato: una stella brillante a 2 km), <code>widthM</code>, <code>heightM</code>, <code>color</code> (la luce della sua fiamma attraverso una carta bianca), <code>shape</code> (<code>"classic"</code>, rotonda alla base e quadrata in cima, piatta, o <code>"balloon"</code>, stretta alla base con una cima larga a lobi) e <code>paperColor</code> (bianco per impostazione predefinita: il suo aspetto di giorno, e ciò che filtra la sua luce di notte). Ognuna si inclina dalla parte in cui la spinge l'aria che la supera, di qualche grado in una raffica.</td></tr>
      <tr><td><code>findings</code></td><td>Sulla lettura stessa: le verifiche a cui l'ipotesi è stata sottoposta e l'esito di ciascuna, perché un'ipotesi che fallisce resti, a mostrare che è stata esaminata e perché non regge. Ciascuna è <code>{ text, outcome, against?, rationale? }</code>: <code>text</code> dice che cosa è stato verificato e che cosa ha dato (uno per lingua), <code>outcome</code> vale <code>holds</code> (regge), <code>fails</code> (fallisce) o <code>untested</code> (non si è potuta fare con ciò che si sa), e <code>against</code> dice con che cosa è stata confrontata: <code>established</code> (un valore indicato o dedotto, una misura sull'immagine) o <code>supposed</code> (uno che la registrazione ha supposto, o che ha adattato a un'ipotesi). Una lettura che fallisce contro ciò che è accertato contraddice di petto l'osservazione, e l'editor dei casi la disegna in rosso; quella che fallisce solo contro una supposizione, o non si è potuta verificare, non è decisa, in arancione; quella le cui verifiche reggono tutte, in verde. Senza verifiche, nessuno l'ha verificata, e non ha colore.</td></tr>
      <tr><td><code>mechanism</code></td><td>Sulla lettura stessa, quando l'ipotesi è che lo strumento abbia prodotto il fenomeno: <code>{ kind, explains, of? }</code>, <code>explains</code> l'id delle forme del fenomeno nel resoconto e <code>kind</code> uno tra <code>fixed-in-frame</code> (fermo nell'inquadratura: un granello sull'obiettivo o nel quadruccio, un riflesso su un vetro solidale con la camera), <code>lens-ghost</code> (un riflesso del Sole nell'obiettivo stesso dello strumento, a uno dei fattori che dà il suo vetro), <code>stated-ghost</code> (un riflesso del Sole in un'ottica posta davanti all'obiettivo, con il fattore e lo spostamento che meglio si adattano) <code>driven-one-way</code> (qualcosa sul vetro spinto attraverso l'inquadratura in un solo senso, senza ritorno), <code>ghost-of</code> (un riflesso attraverso l'obiettivo di una luce che la lettura stessa colloca, <code>of</code> l'id di quel corpo: un bagliore su un aereo) e <code>real-object</code> (qualcosa davvero nel cielo, a qualsiasi distanza sulla linea di vista). La sua configurazione più favorevole viene allora cercata in ciò che il resoconto consente (le altezze del Sole nei giorni che consente, il lato da cui viene la luce dell'immagine) e misurato contro dove il resoconto mostra il fenomeno, istante per istante: la distanza che resta è una constatazione calcolata per chi la legge, che regge entro la grandezza stessa del fenomeno. La lettura è sempre mostrata in essa: il granello, la goccia o l'oggetto è posto dove la ricerca lo mette, qualunque cosa il suo file vi ponesse (distanza, grandezza e aspetto sono conservati)</td></tr>
    </table>
    </div>

    <h2>Un'altra lettura è un'altra osservazione</h2>
    <p>La lettura che un altro fa di un resoconto (quella di un analista, di un investigatore, un confronto fatto per
      metterla alla prova) non fa parte del resoconto: è un'altra osservazione, quella che c'è stata come la sostiene il
      suo autore. Perciò è elencata nel caso come l'originale, come evento di tipo <code>sighting</code>, contrassegnato
      come lettura da <code>interpretationOf</code>, e ha una registrazione propria a <code>url</code>:</p>
    <pre data-json="none"><code>{
  "id": "McMinnville1950",
  "events": [
    { "type": "event", "eventType": "sighting", "id": "trent", "title": "Paul Trent", "url": "observer-mcminnville.json" },
    { "type": "event", "eventType": "sighting",
      "interpretationOf": "trent",
      "time": "2013-06",
      "by": [{ "people": "CousynAntoine" }, { "people": "LouangeFrancois" }],
      "title": "A model on a thread under the line",
      "url": "interpretation-mcminnville-2.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>interpretationOf</code></td><td>L'<code>id</code> dell'evento del caso di cui è una lettura (<code>"trent"</code>), o un elenco di id quando una lettura serve più resoconti (le fotografie e un primo piano). Ciò che la distingue da un resoconto: gli eventi <em>senza</em> questo campo sono i testimoni del caso</td></tr>
      <tr><td><code>sealed</code></td><td>Se l'evento è congelato: <code>true</code> non appena qualcuno ha lavorato SU questa ricostruzione (un'intervista tenuta per avere il parere del testimone, un'ipotesi messa a confronto con essa), perché una modifica successiva non invalidi quel lavoro in silenzio. L'editor non accetta più nulla di digitato, e rifiuta di cancellarla o di rinominare il suo <code>id</code>, fino allo scongelamento; è il suo clone, accanto al lucchetto, che l'autore prosegue. Mai impostato da solo: una ricostruzione si modifica finché viene costruita, e versioni che nessuno ha chiesto sono rumore</td></tr>
      <tr><td><code>time</code></td><td>Quando la lettura è stata elaborata, come RR0 scrive un tempo (<code>"2013-06"</code>): non quando l'osservazione è avvenuta</td></tr>
      <tr><td><code>by</code></td><td>Chi la sostiene: <code>{ "people": id }</code> o <code>{ "org": id }</code>, che designano una voce che vive altrove (su RR0, una directory di persone o di organizzazioni), o una persona descritta nel valore. Assente per un confronto che nessuno sostiene</td></tr>
      <tr><td><code>title</code></td><td>Come si chiama la lettura nel menu del lettore e nel selettore dell'editor: poche parole, una stringa o una per lingua</td></tr>
      <tr><td><code>url</code></td><td>La sua registrazione, letta relativamente all'indirizzo del file del caso, come quella di un testimone</td></tr>
    </table>
    </div>
    <p>La registrazione a <code>url</code> è una registrazione come le altre. Condivide il luogo, l'ora e la posa
      del testimone del resoconto che legge, così che un corpo collocato dal testimone, o in metri da dove si
      trovava, significa la stessa cosa in entrambe; non disegna alcuna forma (una <code>timeline</code> vuota); e tiene i
      corpi nella propria <code>interpretation</code>, descritta sopra. L'<code>explains</code> di un corpo designa le
      forme del resoconto.</p>
    <pre data-json=""><code>{
  "version": 4,
  "id": "1950-05-11-TrentPaul-interpretation-2",
  "time": "1950-05-11T19:45",
  "utcOffsetHours": -7,
  "place": { "locations": [{ "lat": 45.104167, "lng": -123.330556 }] },
  "observerTrack": { "keyframes": [{ "t": 0, "pose": { "lat": 45.104167, "lng": -123.330556, "headingDeg": 41.3, "pitchDeg": 14.85, "fovDeg": 33.4 } }] },
  "tags": ["interpretation"],
  "timeline": { "keyframes": [], "order": [], "groups": [] },
  "interpretation": {
    "title": "A model on a thread under the line",
    "bodies": [{
      "id": "model",
      "explains": ["ufo-1"],
      "model": { "id": "disc" },
      "track": [
        { "t": 0, "eastM": -52, "northM": 118, "altitudeAboveGroundM": 7.5,
          "sizeM": { "widthM": 0.3, "lengthM": 0.3, "heightM": 0.1 } }
      ]
    }]
  }
}</code></pre>
    <p>Il lettore elenca i testimoni del caso dagli eventi senza <code>interpretationOf</code> e propone ogni lettura
      accanto al resoconto che designa, una alla volta (il pulsante ◌ la misura contro il resoconto). Una registrazione
      da sola non ha altra lettura che la propria <code>interpretation</code>. La forma più vecchia, un evento di tipo
      <code>interpretation</code> che designa la registrazione in <code>sighting</code> con i corpi in linea o in un file
      a <code>url</code>, si legge ancora. L'editor apre un caso: il suo selettore sopra il rendering elenca i resoconti e
      le letture, ciascuno aprendosi come la registrazione che è, con un pulsante per aggiungere una lettura (una nuova
      registrazione che condivide luogo, ora e posa del resoconto, e un evento per essa), uno per eliminarla, e uno per
      esportare il caso e ogni registrazione aggiunta o modificata in uno zip. Provalo con
      <a href="/demo-data/case-mcminnville.json"><code>case-mcminnville.json</code></a>
      (<a href="/play/?file=/demo-data/case-mcminnville.json">riprodurlo</a>,
      <a href="/edit/?file=/demo-data/case-mcminnville.json">modificarlo</a>).</p>
`
  }
}
