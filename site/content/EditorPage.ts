import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** The editor itself, followed by its manual: what each of the eight groups is for. */
export class EditorPage implements SitePage {

  readonly meta: PageMeta = {
    slug: { en: "editor", fr: "editeur" },
    navLabel: { en: "Editor", fr: "Éditeur" },
    title: { en: "The editor, and how to use it", fr: "L'éditeur, et comment s'en servir" },
    description: {
      en: "Record a sighting: draw the shape, state the date, the place and the instrument, and let "
        + "the sky, the weather and the ground be looked up. The full manual of the UFO@home editor.",
      fr: "Enregistrer une observation : dessiner la forme, énoncer la date, le lieu et l'instrument, "
        + "et laisser le ciel, la météo et le sol être relevés. Le manuel complet de l'éditeur UFO@home."
    },
    modules: ["/lib/rr0-ufo-recorder.mjs"]
  }

  /**
   * `?sighting=` opens the editor on an existing recording — the parameter every "edit this
   * observation" link in a published reconstruction carries.
   *
   * A bare name with no slash is resolved against this site's own demo recordings first, then
   * against rr0.org's case directories, which is where the `ufoathome.org/Socorro` links that
   * predate this site pointed. Anything else is taken as a URL and loaded as given: this is a tool
   * meant to open recordings hosted anywhere, and the editor's own "load from URL" field would do
   * exactly the same thing by hand.
   */
  script(): string {
    return `const editor = document.getElementById("editor")
const requested = new URLSearchParams(location.search).get("sighting")
if (editor && requested) {
  const url = requested.includes("/")
    ? requested
    : \`/demo-data/witness-\${requested.toLowerCase()}.json\`
  const fallback = \`https://rr0.org/science/crypto/ufo/enquete/dossier/\${requested}/sighting.json\`
  const load = async () => {
    if (!requested.includes("/")) {
      const local = await fetch(url, { method: "HEAD" }).catch(() => null)
      editor.setAttribute("src", local && local.ok ? url : fallback)
    } else {
      editor.setAttribute("src", url)
    }
    editor.scrollIntoView({ block: "start" })
  }
  load()
}`
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">The editor</p>
    <h1>Record a sighting.</h1>
    <p class="lede">Everything below is live. Nothing you do here is uploaded anywhere — the
      recording exists in your browser until you press <strong>Save</strong>, which hands you a JSON
      file that is yours.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage">
      <rr0-ufo-recorder id="editor"></rr0-ufo-recorder>
    </div>
    <p class="small">Opening it on an existing recording: add <code>?sighting=</code> and a URL, or
      the name of one of <a href="/demos/">the demos</a> — for instance
      <a href="/editor/?sighting=Socorro"><code>/editor/?sighting=Socorro</code></a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Three gestures to a first recording</h2>
    <div class="cards">
      <div class="card">
        <h3>1. Draw it</h3>
        <p>Open the <strong>Shape</strong> group. Pick <em>Oval</em> or <em>Polygon</em>, set its
          colour, its transparency, its halo, how dazzling it was and how blurred its edges looked.
          Drag its handles on the canvas to size it; a polygon's vertices can be added, moved and
          deleted individually.</p>
      </div>
      <div class="card">
        <h3>2. Record the movement</h3>
        <p>Press <strong>Record</strong> and move the pointer over the canvas along the path the
          object took, then <strong>Stop</strong>. Playback replays it over the observation's own
          <em>real</em> duration — a five-minute sighting takes five minutes, not the second the
          drag took.</p>
      </div>
      <div class="card">
        <h3>3. Say when and where</h3>
        <p>Fill <strong>Date and time</strong> and <strong>Location</strong>. That is the moment the
          sky appears: the Sun, the Moon and its phase, the planets, the stars of that night — and
          the weather record for that hour is fetched on its own.</p>
      </div>
    </div>
    <p class="small">A row of chips under the render lists everything the recording actually
      asserts — and only that. Click one to jump to the field it came from. A value a data source
      supplied rather than you is marked as such.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>The eight groups</h2>
    <p class="lede prose-wide">One panel opens at a time, so the render stays on screen while you
      edit.</p>

    <div class="faq-item">
      <h3>Observation</h3>
      <p>Load an existing recording (from a file or a URL), and state what this one is about: a
        <strong>case ID</strong>, a <strong>description</strong>, <strong>tags</strong>. The case ID
        is the case's, not the witness's: every witness's own recording of the same sighting carries
        the same one, which is what lets a page group them into a single reconstruction with a
        witness picker.</p>
    </div>

    <div class="faq-item">
      <h3>Witness</h3>
      <p>Who gave the account — and, just as importantly, <strong>what they observed it
        through</strong>. An eye is not a lens: naked-eye vision maps an angle to an angle, a camera
        maps it to <code>f·tan θ</code>, and the two draw genuinely different frames. Pick a camera
        and its <strong>focal length</strong>, <strong>aperture</strong>, <strong>exposure</strong>
        and <strong>focus distance</strong> become available — each disabled where the device fixed
        it, because the owner of a fixed-focus snapshot camera had nothing to choose. Instruments
        outside the observation's own date are flagged.</p>
      <p><strong>Roll</strong> sits here rather than with the place, because it is how the device
        was <em>held</em> — a camera askew, a head leaned over — not where the witness stood.</p>
    </div>

    <div class="faq-item">
      <h3>Location</h3>
      <p>Testimony names a place, it does not give coordinates. So type the name and press
        <strong>Locate</strong>: latitude and longitude are filled from OpenStreetMap's own
        geocoder, every candidate stays listed, and picking another moves the witness. What is
        stored is the <em>qualified</em> name that was resolved, so a later reader lands on the same
        spot. Move a coordinate by hand and the name is re-derived, or cleared — a name describing
        somewhere the sighting is no longer at would be a written false statement.</p>
      <p><strong>Heading</strong> is the direction faced, <strong>Tilt</strong> how far up or down,
        and <strong>Altitude</strong> is above sea level, floored by the ground's own height at that
        location: a witness in the Alps is not at 0 m. Relief and imagery sources are chosen right
        here, under the coordinates whose ground they describe.</p>
    </div>

    <div class="faq-item">
      <h3>Decor</h3>
      <p>What stood around the witness, at a real distance east and north: buildings with their
        floors and windows, trees, streetlights, vehicles, other witnesses. Decor is the only thing
        that can put a number on a distance — if the object passed <em>behind</em> that hangar it
        was at least that far, if <em>in front of</em> that tree, at most. Each crossing narrows the
        object's real width from one side for the whole recording; the result appears under the
        apparent size, and reads “unknown” when nothing crosses its line of sight, which is the
        honest answer for most sightings.</p>
      <p>Decor can also <strong>move</strong> (an aircraft crossing the sky, a car driving past) and
        carry <strong>lights</strong> with real, regulated flash rates — anticollision beacons at
        40–100 a minute, hazard flashers at 60–120. On a long exposure that rate is drawn: steady
        lamps leave lines, flashing ones leave dots at regular intervals, which is exactly how a
        photograph of an airliner is told from a photograph of something that does not blink.</p>
    </div>

    <div class="faq-item">
      <h3>Date and time</h3>
      <p>A start, an end, a duration — and a <strong>time zone</strong>, which is the rule, not the
        number. Pick the witness's own zone and the offset is derived from that zone's rules
        <em>at the observation's date</em>: Valensole in July 1965 resolves to UTC+1, not today's
        UTC+2, because France only reintroduced summer time in 1976.</p>
      <p>The <strong>EDTF</strong> button switches both date fields to text, for everything a
        calendar picker cannot say: a bare year, a month, a time with no date, and the qualifiers
        <em>uncertain</em> (<code>?</code>) and <em>approximate</em> (<code>~</code>). Most archives
        need it — of 241 case files on rr0.org, 43% state a bare year and only 17% a date with a
        time.</p>
    </div>

    <div class="faq-item">
      <h3>Weather</h3>
      <p>The one group that is not testimony. Weather is a measurable fact about a place at an
        instant, and the two groups above already state both — so it is looked up from ERA5, the
        ECMWF reanalysis, and shown <em>read-only</em> above a line naming the dataset and the exact
        UTC instant described. A wrong time zone shows up there before it shows up in the sky.</p>
      <p>Unchecking <strong>From weather records</strong> hands the fields back to the witness: the
        looked-up values stay as a starting point, the source is dropped, and no later lookup may
        overwrite them. A recording that names a source is replayed exactly as authored and never
        looked up again, so a published case file reads identically offline.</p>
      <p>Two things here are not in any record. <strong>Ice cloud (cirrus)</strong> is kept apart
        from total cover because it is not about how much sky was hidden but about whether there
        were ice crystals in it — which is what refracts a halo or a pair of sundogs into being. And
        <strong>crystal alignment</strong> was never measured anywhere, so it is stated: tumbling
        crystals give a bare ring, level plates and rolling columns give sundogs, arcs and a pillar.</p>
      <p>Below sits the <strong>“Sky:”</strong> line — read-only, and not a lookup at all. A meteor
        shower is a position in Earth's orbit and a comet's orbit is a solved problem, so the date
        and the place alone decide both. It states what else was in that patch of sky: the shower
        and its rate over the sporadic background, the comet and its magnitude, whether low orbit
        was still sunlit, whether the Milky Way or the zodiacal light could have been seen at all.
        Whether any of it explains anything is the reader's conclusion, never the file's claim.</p>
    </div>

    <div class="faq-item">
      <h3>Sound</h3>
      <p>Half of what makes these accounts strange is the sound — most often its absence. A
        <strong>kind</strong> (hum, whistle, rumble, crackle, or none), a <strong>loudness</strong>
        and a <strong>pitch</strong>, keyframed on the same clock as the shape: a craft sitting
        silently on the ground and heard only as it lifts off is two keyframes.</p>
      <p>The sound is <em>synthesized</em> from that description, exactly as the shape is drawn from
        its own, at no cost in bundled audio. A recording that actually captured the sound can point
        at the audio file instead. Note the difference between the two silences: <em>none</em> means
        the witness reported hearing nothing; no sound track at all means nobody was asked.</p>
    </div>

    <div class="faq-item">
      <h3>Shape</h3>
      <p>The object itself. Oval or polygon, colour, transparency, halo, <strong>brilliance</strong>
        (how dazzling it was — a light you cannot look at washes out the field around it, throws the
        spikes its aperture makes, and clips to white, which no halo does) and <strong>blur</strong>
        (how indistinct its edges looked). Several shapes can share one timeline — a craft, a
        trailing flame, a second object — each with its own name, and grouped, reordered or deleted
        from the canvas's own context menu.</p>
      <p><strong>Try a size</strong> / <strong>at a distance of</strong> is an authoring aid and
        nothing more: type a hypothesis, read the angle it implies, and the metres are forgotten the
        moment they have been applied. Through an eye at 60° across a 360-pixel canvas, one degree
        is exactly 6 pixels and the full Moon about 3 — so an object 3.5 m wide at 90 m is 13 pixels
        across, not the 90 an author reaches for unaided. Getting this wrong is the single most
        common way a reconstruction ends up false.</p>
      <p><strong>Sampling rate</strong> is how often the pointer is read while recording.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Rules worth knowing</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>A keyframe is held, not faded.</strong> A shape left out of a later keyframe
          stays as it was; one whose first keyframe is at five seconds is already painted, in that
          state, from zero. To make something stop being visible, keyframe it at transparency 1.</li>
        <li><strong>Declared outranks deduced.</strong> “It went into a cloud” is stated by the
          witness, never worked out by geometry — this format describes an appearance on a field of
          view, not a position in space, so nothing in it <em>can</em> know whether cloud came
          between them.</li>
        <li><strong>Paused is paused.</strong> Falling rain, twinkling stars, lightning, lens flare,
          ambient sound — all stop with the player. A paused replay is one instant of a sighting;
          weather still going on over it would be your own room, not the witness's evening.</li>
        <li><strong>Nothing is invented.</strong> Where a record does not exist — before 1940 for
          the weather, before 1957 for satellites, historical orbital elements at all — the field
          stays editable and the interface says which of the two it is.</li>
      </ul>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Saving, and putting it somewhere</h2>
    <div class="prose-wide">
      <p><strong>Save</strong> gives you a JSON file. That file is the whole recording — there is no
        account, no database, and no copy kept here. Host it wherever you like, and put the
        reconstruction on any page with two lines:</p>
      <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://example.org/my-case/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
      <p>Every published reconstruction hands out those two lines itself, from the <q>?</q> button in
        its toolbar, with absolute URLs already filled in and a copy button. The only requirement is
        that your JSON be readable cross-origin — one <code>Access-Control-Allow-Origin</code>
        header — or that you serve it from the same site as the page.</p>
      <p>Four components are published, and a page should load only the one it needs:</p>
      <div class="table-scroll">
      <table>
        <tr><th>Element</th><th>What it is</th><th>Size (gzip)</th></tr>
        <tr><td><code>&lt;rr0-ufo&gt;</code></td><td>The 2D shape and its playback, no backdrop</td><td>16 KB</td></tr>
        <tr><td><code>&lt;rr0-scene&gt;</code></td><td>The 3D sky/ground decor for a real time and place</td><td>238 KB</td></tr>
        <tr><td><code>&lt;rr0-eyewitness&gt;</code></td><td>The standard sighting view: one or several witnesses, in their scene</td><td>249 KB</td></tr>
        <tr><td><code>&lt;rr0-ufo-recorder&gt;</code></td><td>This editor</td><td>293 KB</td></tr>
      </table>
      </div>
      <p class="small">The three heavier ones carry Three.js and a star catalogue; that is what the
        real sky costs. <a href="https://github.com/RR0/UfoAtHome#readme">The README</a> documents
        every attribute, property and method, and the recording format field by field.</p>
    </div>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">L'éditeur</p>
    <h1>Enregistrer une observation.</h1>
    <p class="lede">Tout ce qui suit est en état de marche. Rien de ce que vous faites ici n'est
      envoyé nulle part : l'enregistrement n'existe que dans votre navigateur jusqu'à ce que vous
      appuyiez sur <strong>Enregistrer</strong>, qui vous remet un fichier JSON qui est le vôtre.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage">
      <rr0-ufo-recorder id="editor"></rr0-ufo-recorder>
    </div>
    <p class="small">Pour l'ouvrir sur un enregistrement existant : ajoutez <code>?sighting=</code>
      suivi d'une URL, ou du nom d'une <a href="/fr/demos/">démo</a> — par exemple
      <a href="/fr/editeur/?sighting=Socorro"><code>/fr/editeur/?sighting=Socorro</code></a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Trois gestes pour un premier enregistrement</h2>
    <div class="cards">
      <div class="card">
        <h3>1. Dessiner</h3>
        <p>Ouvrez le groupe <strong>Forme</strong>. Choisissez <em>Ovale</em> ou <em>Polygone</em>,
          réglez couleur, transparence, halo, éclat et flou des contours. Les poignées sur le canevas
          en donnent la taille ; les sommets d'un polygone s'ajoutent, se déplacent et se
          suppriment un par un.</p>
      </div>
      <div class="card">
        <h3>2. Enregistrer le mouvement</h3>
        <p>Appuyez sur <strong>Enregistrer</strong> et déplacez le curseur sur le canevas le long du
          trajet suivi par l'objet, puis <strong>Arrêter</strong>. La lecture le rejoue sur la durée
          <em>réelle</em> de l'observation : une observation de cinq minutes prend cinq minutes, pas
          la seconde qu'a duré le geste.</p>
      </div>
      <div class="card">
        <h3>3. Dire quand et où</h3>
        <p>Remplissez <strong>Date et heure</strong> et <strong>Lieu</strong>. C'est là que le ciel
          apparaît : le Soleil, la Lune et sa phase, les planètes, les étoiles de cette nuit-là — et
          le relevé météo de cette heure-là est cherché tout seul.</p>
      </div>
    </div>
    <p class="small">Une bande d'étiquettes sous le rendu énumère tout ce que l'enregistrement
      affirme réellement — et rien d'autre. Cliquez-en une pour aller au champ dont elle vient. Une
      valeur fournie par une source de données plutôt que par vous est signalée comme telle.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Les huit groupes</h2>
    <p class="lede prose-wide">Un seul panneau s'ouvre à la fois, pour que le rendu reste à l'écran
      pendant que vous éditez.</p>

    <div class="faq-item">
      <h3>Observation</h3>
      <p>Charger un enregistrement existant (fichier ou URL), et énoncer ce dont il s'agit :
        <strong>identifiant de dossier</strong>, <strong>description</strong>,
        <strong>mots-clés</strong>. L'identifiant est celui du dossier, pas celui du témoin : chaque
        témoin d'une même observation porte le même dans son propre fichier, et c'est ce qui permet
        à une page de les réunir en une seule reconstitution avec un sélecteur de témoin.</p>
    </div>

    <div class="faq-item">
      <h3>Témoin</h3>
      <p>Qui a livré le récit — et, tout aussi important, <strong>à travers quoi il a
        observé</strong>. Un œil n'est pas un objectif : à l'œil nu un angle reste un angle, un
        appareil le projette en <code>f·tan θ</code>, et les deux dessinent des images réellement
        différentes. Choisissez un appareil et sa <strong>focale</strong>, son
        <strong>diaphragme</strong>, son <strong>temps de pose</strong> et sa <strong>mise au
        point</strong> deviennent accessibles — chacun désactivé là où l'appareil le fixait, car le
        propriétaire d'un appareil à mise au point fixe n'avait rien à choisir. Un instrument
        étranger à la date de l'observation est signalé.</p>
      <p>Le <strong>roulis</strong> est ici et non avec le lieu, parce qu'il dit comment l'appareil
        était <em>tenu</em> — un appareil de travers, une tête penchée — et non où se tenait le
        témoin.</p>
    </div>

    <div class="faq-item">
      <h3>Lieu</h3>
      <p>Un témoignage nomme un lieu, il ne donne pas de coordonnées. Tapez donc le nom et appuyez
        sur <strong>Localiser</strong> : latitude et longitude sont remplies par le géocodeur
        d'OpenStreetMap, tous les candidats restent listés, et en choisir un autre déplace le
        témoin. Ce qui est stocké est le nom <em>qualifié</em> qui a été résolu, pour qu'un lecteur
        ultérieur retombe au même endroit. Déplacez une coordonnée à la main et le nom est redérivé,
        ou effacé — un nom décrivant un endroit où l'observation n'a plus lieu serait une fausse
        déclaration écrite.</p>
      <p><strong>Cap</strong> est la direction regardée, <strong>Inclinaison</strong> de combien
        vers le haut ou le bas, et <strong>Altitude</strong> s'entend au-dessus du niveau de la mer,
        plancher fixé par la hauteur du sol à cet endroit : un témoin dans les Alpes n'est pas à
        0 m. Les sources de relief et d'imagerie se choisissent ici même, sous les coordonnées dont
        elles décrivent le sol.</p>
    </div>

    <div class="faq-item">
      <h3>Décor</h3>
      <p>Ce qui se tenait autour du témoin, à une distance réelle vers l'est et vers le nord :
        bâtiments avec leurs étages et leurs fenêtres, arbres, lampadaires, véhicules, autres
        témoins. Le décor est la seule chose qui puisse mettre un nombre sur une distance : si
        l'objet est passé <em>derrière</em> ce hangar il était au moins aussi loin, <em>devant</em>
        cet arbre, au plus. Chaque croisement resserre d'un côté la largeur réelle de l'objet, pour
        tout l'enregistrement ; le résultat s'affiche sous la taille apparente, et dit
        « inconnue » quand rien ne croise sa ligne de visée — la réponse honnête pour la plupart des
        observations.</p>
      <p>Un décor peut aussi <strong>se déplacer</strong> (un avion qui traverse le ciel, une
        voiture qui passe) et porter des <strong>feux</strong> aux cadences réelles et
        réglementaires : anticollision de 40 à 100 éclats par minute, feux de détresse de 60 à 120.
        Sur une pose longue, cette cadence est dessinée : les lampes fixes laissent des traits, les
        clignotantes des points à intervalles réguliers — c'est exactement ce qui distingue la photo
        d'un avion de ligne de celle d'un objet qui ne clignote pas.</p>
    </div>

    <div class="faq-item">
      <h3>Date et heure</h3>
      <p>Un début, une fin, une durée — et un <strong>fuseau horaire</strong>, qui est la règle et
        non le nombre. Choisissez le fuseau du témoin et le décalage est dérivé des règles de ce
        fuseau <em>à la date de l'observation</em> : Valensole en juillet 1965 donne UTC+1, pas
        l'UTC+2 d'aujourd'hui, la France n'ayant rétabli l'heure d'été qu'en 1976.</p>
      <p>Le bouton <strong>EDTF</strong> bascule les deux champs de date en texte, pour tout ce
        qu'un sélecteur de calendrier ne sait pas dire : une année seule, un mois, une heure sans
        date, et les qualificatifs <em>incertain</em> (<code>?</code>) et <em>approximatif</em>
        (<code>~</code>). La plupart des archives en ont besoin : sur 241 dossiers de rr0.org, 43 %
        n'énoncent qu'une année et 17 % seulement une date avec une heure.</p>
    </div>

    <div class="faq-item">
      <h3>Météo</h3>
      <p>Le seul groupe qui ne soit pas un témoignage. La météo est un fait mesurable en un lieu à
        un instant, et les deux groupes ci-dessus énoncent déjà les deux — elle est donc relevée
        dans ERA5, la réanalyse de l'ECMWF, et affichée <em>en lecture seule</em> au-dessus d'une
        ligne nommant le jeu de données et l'instant UTC exact décrit. Un mauvais fuseau horaire s'y
        voit avant de se voir dans le ciel.</p>
      <p>Décocher <strong>D'après les relevés</strong> rend les champs au témoin : les valeurs
        relevées restent comme point de départ, la source est retirée, et aucune consultation
        ultérieure ne peut les écraser. Un enregistrement qui nomme une source est rejoué tel qu'il
        a été composé et n'est jamais reconsulté : un dossier publié se lit à l'identique hors
        ligne.</p>
      <p>Deux réglages ici ne figurent dans aucun relevé. Les <strong>nuages de glace
        (cirrus)</strong> sont tenus à part de la couverture totale parce qu'il ne s'agit pas de
        savoir quelle part du ciel était masquée, mais s'il s'y trouvait des cristaux de glace — ce
        qui réfracte un halo ou une paire de parhélies. Et l'<strong>alignement des cristaux</strong>
        n'a jamais été mesuré nulle part : il est donc énoncé. Des cristaux culbutant donnent un
        anneau nu ; des plaquettes à plat et des colonnes roulantes donnent parhélies, arcs et
        pilier.</p>
      <p>Dessous se trouve la ligne <strong>« Ciel : »</strong> — en lecture seule, et qui n'est même
        pas un relevé. Une pluie de météores est une position sur l'orbite terrestre et l'orbite
        d'une comète est un problème résolu : la date et le lieu suffisent à décider des deux. Elle
        énonce ce qu'il y avait d'autre dans ce coin de ciel : la pluie et son taux au-dessus du fond
        sporadique, la comète et sa magnitude, si l'orbite basse était encore éclairée, si la Voie
        lactée ou la lumière zodiacale pouvaient seulement être vues. Que cela explique ou non
        quelque chose est la conclusion du lecteur, jamais l'affirmation du fichier.</p>
    </div>

    <div class="faq-item">
      <h3>Son</h3>
      <p>La moitié de ce qui rend ces récits étranges tient au son — le plus souvent à son absence.
        Un <strong>timbre</strong> (bourdonnement, sifflement, grondement, crépitement, ou aucun),
        une <strong>intensité</strong> et une <strong>hauteur</strong>, keyframés sur la même
        horloge que la forme : un engin posé silencieux au sol et entendu seulement au décollage,
        cela fait deux keyframes.</p>
      <p>Le son est <em>synthétisé</em> à partir de cette description, exactement comme la forme est
        dessinée à partir de la sienne, sans un octet d'audio embarqué. Un enregistrement qui a
        réellement capté le son peut pointer vers le fichier audio. Notez la différence entre les
        deux silences : <em>aucun</em> signifie que le témoin a déclaré n'avoir rien entendu ;
        l'absence totale de piste sonore signifie que personne ne le lui a demandé.</p>
    </div>

    <div class="faq-item">
      <h3>Forme</h3>
      <p>L'objet lui-même. Ovale ou polygone, couleur, transparence, halo, <strong>éclat</strong>
        (à quel point il éblouissait — une lumière qu'on ne peut pas regarder délave le champ autour
        d'elle, projette les aigrettes du diaphragme et sature au blanc, ce qu'aucun halo ne fait)
        et <strong>flou</strong> (à quel point ses contours paraissaient indistincts). Plusieurs
        formes peuvent partager une même chronologie — un engin, une flamme qui traîne, un second
        objet — chacune avec son nom, groupées, réordonnées ou supprimées depuis le menu contextuel
        du canevas.</p>
      <p><strong>Essayer une taille</strong> / <strong>à une distance de</strong> est une aide à la
        saisie et rien de plus : tapez une hypothèse, lisez l'angle qu'elle implique, et les mètres
        sont oubliés dès qu'ils ont été appliqués. À l'œil nu sur 60° répartis sur un canevas de
        360 pixels, un degré fait exactement 6 pixels et la pleine Lune environ 3 — un objet de
        3,5 m à 90 m fait donc 13 pixels de large, et non les 90 vers lesquels va la main. S'y
        tromper est la première cause de reconstitution fausse.</p>
      <p>La <strong>fréquence d'échantillonnage</strong> est la cadence à laquelle le curseur est lu
        pendant l'enregistrement.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Quelques règles à connaître</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>Un keyframe est tenu, pas fondu.</strong> Une forme absente d'un keyframe
          ultérieur reste dans son état ; une forme dont le premier keyframe est à cinq secondes est
          déjà peinte, dans cet état, dès zéro. Pour qu'une chose cesse d'être visible, posez-lui un
          keyframe à transparence 1.</li>
        <li><strong>L'énoncé l'emporte sur le déduit.</strong> « Il est entré dans un nuage » est
          énoncé par le témoin, jamais calculé par la géométrie : ce format décrit une apparence
          dans un champ de vision, pas une position dans l'espace, donc rien en lui <em>ne peut</em>
          savoir si un nuage s'est interposé.</li>
        <li><strong>En pause, tout est en pause.</strong> Pluie qui tombe, scintillement des étoiles,
          éclairs, reflets d'objectif, ambiances sonores — tout s'arrête avec le lecteur. Une lecture
          en pause est un instant d'observation ; une météo qui continuerait par-dessus serait votre
          pièce, pas la soirée du témoin.</li>
        <li><strong>Rien n'est inventé.</strong> Là où le relevé n'existe pas — avant 1940 pour la
          météo, avant 1957 pour les satellites, et les éléments orbitaux historiques en général —
          le champ reste modifiable et l'interface dit lequel des deux cas s'applique.</li>
      </ul>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Sauvegarder, et publier quelque part</h2>
    <div class="prose-wide">
      <p><strong>Enregistrer</strong> vous remet un fichier JSON. Ce fichier <em>est</em>
        l'enregistrement complet : il n'y a ni compte, ni base de données, ni copie conservée ici.
        Hébergez-le où vous voulez, et posez la reconstitution sur n'importe quelle page en deux
        lignes :</p>
      <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://exemple.org/mon-dossier/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
      <p>Chaque reconstitution publiée distribue elle-même ces deux lignes, depuis le bouton
        <q>?</q> de sa barre d'outils, URLs absolues déjà remplies et bouton de copie compris. La
        seule exigence est que votre JSON soit lisible d'une autre origine — un en-tête
        <code>Access-Control-Allow-Origin</code> — ou que vous le serviez depuis le même site que la
        page.</p>
      <p>Quatre composants sont publiés, et une page ne devrait charger que celui dont elle a
        besoin :</p>
      <div class="table-scroll">
      <table>
        <tr><th>Élément</th><th>Ce que c'est</th><th>Taille (gzip)</th></tr>
        <tr><td><code>&lt;rr0-ufo&gt;</code></td><td>La forme 2D et sa lecture, sans décor</td><td>16 Ko</td></tr>
        <tr><td><code>&lt;rr0-scene&gt;</code></td><td>Le décor 3D ciel/sol pour une date et un lieu réels</td><td>238 Ko</td></tr>
        <tr><td><code>&lt;rr0-eyewitness&gt;</code></td><td>La vue standard : un ou plusieurs témoins, dans leur décor</td><td>249 Ko</td></tr>
        <tr><td><code>&lt;rr0-ufo-recorder&gt;</code></td><td>Cet éditeur</td><td>293 Ko</td></tr>
      </table>
      </div>
      <p class="small">Les trois plus lourds embarquent Three.js et un catalogue d'étoiles ; c'est
        ce que coûte un vrai ciel. <a href="https://github.com/RR0/UfoAtHome#readme">Le README</a>
        documente chaque attribut, propriété et méthode, et le format d'enregistrement champ par
        champ.</p>
    </div>
  </div>
</section>
`
  }
}
