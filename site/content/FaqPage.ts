import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** The page that answers the questions people actually hesitate on before adopting the thing. */
export class FaqPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "faq",
    navLabel: { en: "FAQ", fr: "FAQ" },
    title: { en: "Frequently asked", fr: "Questions fréquentes" },
    description: {
      en: "Who made UFO@home, what you are allowed to do with it, what it sends over the network, "
        + "how it compares with Sitrec, SIMOVNI and Stellarium, and how to ask for a change.",
      fr: "Qui a fait UFO@home, ce que vous avez le droit d'en faire, ce qu'il envoie sur le réseau, "
        + "ce qui le distingue de Sitrec, SIMOVNI et Stellarium, et comment demander une évolution."
    }
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h1>Frequently asked.</h1>
    <p class="lede">What the tool is, what it allows, and how it differs from the others.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Who made it, and what it allows</h2>

    <div class="faq-item">
      <h3>Who is behind UFO@home?</h3>
      <p>It is developed and maintained by <a href="https://rr0.org">RR0</a>, a French encyclopaedia
        of unexplained phenomena, which uses it for its own case files.</p>
      <p>It does not need RR0 to run. The components are published on npm as
        <code>@rr0/ufoathome</code> and served from this domain; install them or copy the built
        <code>.mjs</code> files onto your own server, and they work with no runtime dependency on
        rr0.org. Recordings are your own files, on your own host.</p>
      <p>A reconstruction asserts what its recording states and nothing more — no conclusion, no
        branding, and no case number other than one you put there yourself.</p>
    </div>

    <div class="faq-item">
      <h3>What does the licence allow?</h3>
      <p>UFO@home is under the <a href="https://github.com/RR0/UfoAtHome/blob/main/LICENSE">MIT
        licence</a>. That allows you to:</p>
      <ul class="plain">
        <li>use it on any site, including a commercial one;</li>
        <li>modify it, and keep your modifications private;</li>
        <li>redistribute it, bundle it into your own product, and charge for that product;</li>
        <li>fork it, and continue it in your own direction.</li>
      </ul>
      <p>The one obligation is to keep the copyright notice and the licence text with the copies you
        distribute. There is no contributor licence agreement and no registration.</p>
      <p>The source is on <a href="https://github.com/RR0/UfoAtHome">GitHub</a>, including the
        scripts that generate its star, comet and satellite catalogues from public sources — so the
        data is reproducible as well as readable.</p>
    </div>

    <div class="faq-item">
      <h3>What does it send over the network?</h3>
      <p>Recordings stay in your browser: there is no account and no server-side storage.
        <strong>Export</strong> writes a file to your disk, and that file is the whole recording.</p>
      <p>What the editor fetches, and when:</p>
      <div class="table-scroll">
      <table>
        <tr><th>Service</th><th>What for</th><th>When</th></tr>
        <tr><td>Nominatim (OpenStreetMap)</td><td>Turning a place name into coordinates, and back</td><td>Only when you press <strong>Locate</strong> or move a coordinate — never per keystroke</td></tr>
        <tr><td>Open-Meteo (ERA5, ECMWF)</td><td>The weather record for that date, hour and place; and the time zone at a location</td><td>Once a full date and a place are known</td></tr>
        <tr><td>AWS Terrain Tiles</td><td>The ground's real relief around the witness</td><td>When a location is set</td></tr>
        <tr><td>Esri World Imagery, or EOX Sentinel-2 cloudless</td><td>The aerial imagery draped over that relief</td><td>Same</td></tr>
      </table>
      </div>
      <p>Each is a picker in the interface, sitting where its data is reported and carrying the
        attribution its licence requires, so you can see what answered and choose another. The star,
        comet and satellite catalogues are generated ahead of time and shipped inside the bundle,
        so nothing is fetched for those.</p>
      <p>A page that only <em>replays</em> a finished recording (<code>&lt;rr0-ufo&gt;</code>,
        <code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-eyewitness&gt;</code>) makes no lookup at all
        beyond the terrain and imagery tiles — a published recording carries its own weather and is
        never looked up again, which is also why it reads identically years later.</p>
    </div>

    <div class="faq-item">
      <h3>Can I host it entirely myself, with no external service?</h3>
      <p>Yes. Copy the <code>.mjs</code> bundles onto your server and the reconstructions will play.
        Skip the terrain and imagery providers (or point them at your own tile server) and the scene
        falls back to a plain horizon. The lookups exist for <em>authoring</em>; playback of a
        finished recording does not need them.</p>
    </div>

    <h2>Why it exists</h2>

    <div class="faq-item">
      <h3>Why build this at all?</h3>
      <p>Because a testimony written down loses almost everything about it. In 1968, at the AAAS
        symposium, the psychologist Roger Shepard argued that a visual reconstruction of a testimony
        is more faithful than a written or spoken one — witnesses are much better at recognising and
        adjusting a picture than at generating a description. UFO@home is that idea, built as
        software: draw it, move it, and let the witness correct it until it matches.</p>
      <p>The project began in 2003 as a Java applet. It was rewritten from scratch in TypeScript in
        2026, as web components, because the applet had become unrunnable and because the missing
        half had always been the sky: a reconstruction without the real sky of that night cannot be
        checked against anything.</p>
    </div>

    <div class="faq-item">
      <h3>Why is the object a flat shape rather than a 3D model?</h3>
      <p>Because a 3D object placed in the scene is already a conclusion. It asserts a size, a
        distance and a solidity that no witness could perceive — and, worse, it silently rules out
        every explanation in which there was no object there at all: a halo, a planet, a satellite,
        an aircraft's landing light, a lenticular cloud, a reflection on a windscreen.</p>
      <p>A flat shape on the witness's own field of view asserts exactly what they claimed: this is
        what reached my eye, this big, moving this way. Everything else stays open — which is the
        only way a reconstruction can be used to <em>test</em> a misperception rather than to rule
        one out by construction.</p>
      <p>It also means the tool is honest about size. A recording stores an angle, never metres.
        Metres come back only as an inequality, and only where the object crossed something whose
        position is known.</p>
    </div>

    <div class="faq-item">
      <h3>Is a reconstruction evidence?</h3>
      <p>No. It is a way of stating a testimony precisely enough that it can be laid beside the
        record — and the record is what does the work: the Moon's phase
        that night, whether the sky was overcast, whether a comet was up, whether low orbit was even
        sunlit. The tool states what the witness said and what the records say, side by side, and
        stops there. Whether the two explain each other is the reader's conclusion, never the file's
        claim.</p>
    </div>

    <h2>Compared with other tools</h2>

    <div class="faq-item">
      <h3>How is this different from Sitrec?</h3>
      <p><a href="https://github.com/MickWest/sitrec">Sitrec</a> (“situation recreation”, Mick West,
        from 2022) is an excellent tool and it does a different job. It starts from
        <em>instrument data</em> — a video, an ADS-B track, a sensor's own metadata, orbital
        elements — and reconstructs the geometry that could have produced that footage. It is the
        right tool when there is footage.</p>
      <p>UFO@home starts where there is none: a person, an account, and a date. It reconstructs what
        a <em>witness</em> described, and it is built around what a testimony can and cannot say —
        angles rather than metres, a stated appearance rather than a placed object, and an explicit
        record of who supplied every non-testimonial fact.</p>
      <p>Their licences differ too. Sitrec was MIT-licensed; it was archived in March 2026 in
        favour of <a href="https://github.com/MickWest/Sitrec2">Sitrec2</a>, whose licence permits
        personal or non-commercial academic use only, and neither redistribution nor modification.
        UFO@home is MIT.</p>
    </div>

    <div class="faq-item">
      <h3>Isn't this what SIMOVNI did?</h3>
      <p>It is the same idea, fifty years earlier and in hardware. <strong>SIMOVNI</strong> was an
        optical simulator built in 1976 within France's GEPAN (the CNES's own UFO study group) by
        Jean-Jacques Velasco: the witness looked through a viewfinder at the real landscape with a
        virtual UFO superimposed, whose shape (on slides), colour, brightness and size could be
        adjusted until it matched. It is, as far as we know, the first serious attempt at visual
        rather than written testimony. It was also a single physical bench in Toulouse, it was used
        on only one or two occasions, and Dominique Caudron — who had built his own simulators
        earlier — thought its results unreliable.</p>
      <p><strong>SimOvni 2</strong>, presented by Laurent Chabin at CAIPAN 2 in 2022, revives the
        idea with a head-mounted display and real calibration work behind it.</p>
      <p>What UFO@home adds is not a better optical bench: it is that a reconstruction becomes a
        small file anyone can open, replay, embed, check and disagree with — instead of a session
        that happened once in a room, in front of one investigator, and left a written summary.</p>
    </div>

    <div class="faq-item">
      <h3>Why not just use Stellarium?</h3>
      <p>Stellarium is a planetarium, and a very good one — we have read its source to learn how it
        does things. But it answers “what was in the sky?”, not “what did this person see, and could
        the sky account for it?”. It has no testimony format, no witness object, no weather, no
        decor around the observer, no long-exposure instrument, and nothing to embed in a page.</p>
      <p>Where the two overlap, UFO@home sometimes takes the harder road on purpose: the Milky Way
        is a texture in Stellarium and a line-of-sight integral here, which is why its dark rift
        comes out of a dust model rather than out of an image. Where Stellarium renders something we
        do not, the working rule of this project is to go and find out how they do it.</p>
    </div>

    <h2>Using it, and changing it</h2>

    <div class="faq-item">
      <h3>How do I ask for a feature, or report something wrong?</h3>
      <p>Open an issue: <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        A GitHub account is free and takes a minute.</p>
      <p>What makes a request easy to act on:</p>
      <ul class="plain">
        <li><strong>A real case, if there is one.</strong> “Witnesses often say it was behind a
          hill” is a feature; “here is a sighting where that matters, dated, placed and sourced” is
          a feature that gets built right.</li>
        <li><strong>What the record says.</strong> If the thing you want reconstructed is measured
          somewhere — a dataset, a catalogue, a published measurement — say where. This project's
          rule is that nothing gets invented: something reproducible needs data or physics behind
          it, and knowing which one it is settles most of the design.</li>
        <li><strong>What you would conclude from it.</strong> A feature that cannot change anyone's
          reading of a case is decoration.</li>
      </ul>
      <p>Pull requests are welcome on the same terms as any MIT project. If you would rather not use
        GitHub, the maintainer's contact is on <a href="https://rr0.org/Contact.html">rr0.org</a>.</p>
    </div>

    <div class="faq-item">
      <h3>Can I put a reconstruction in a forum post?</h3>
      <p>If the forum allows raw HTML and a module script, yes — the two lines are on
        <a href="/editor/">the editor page</a>, and every published reconstruction hands them out
        itself. Most forums do not allow that, for good reasons. Two things that usually work
        instead: an <code>&lt;iframe&gt;</code> pointing at a page of your own that holds the
        component, or simply a link to <code>ufoathome.org/editor/?sighting=</code> followed by the
        URL of your recording, which opens it here for anyone.</p>
    </div>

    <div class="faq-item">
      <h3>What if I don't know the exact date, or the exact time?</h3>
      <p>Say so, and the tool will say so too. Dates are stored in EDTF, so “1954”, “June 2025”,
        “around 05:00” and “uncertain” are all things the format can state. What you lose is only
        what genuinely depends on the missing part: with no full date and place there is no sky to
        compute, and the interface says that rather than drawing a plausible one.</p>
    </div>

    <div class="faq-item">
      <h3>What languages does it speak?</h3>
      <p>The components and this site are in English and French, picked from your browser's own
        preferences with English as the fallback. Adding a language means adding one typed messages
        module per component — no markup changes, no build configuration. It is one of the easiest
        contributions to make.</p>
    </div>

    <div class="faq-item">
      <h3>What does it cost?</h3>
      <p>Nothing: no price, no account, no quota and no paid tier. The external services it uses
        while authoring are public ones whose usage policies it respects — which is why place search
        runs only when you ask for it.</p>
    </div>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h1>Questions fréquentes.</h1>
    <p class="lede">Ce qu'est l'outil, ce qu'il autorise, et ce qui le distingue des autres.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Qui l'a fait, et ce qu'il autorise</h2>

    <div class="faq-item">
      <h3>Qui est derrière UFO@home ?</h3>
      <p>Il est développé et maintenu par <a href="https://rr0.org">RR0</a>, une encyclopédie
        française des phénomènes inexpliqués, qui s'en sert pour ses propres dossiers.</p>
      <p>Il n'a pas besoin de RR0 pour fonctionner. Les composants sont publiés sur npm sous le nom
        <code>@rr0/ufoathome</code> et servis depuis ce domaine ; installez-les ou recopiez les
        fichiers <code>.mjs</code> construits sur votre serveur, et ils marchent sans aucune
        dépendance d'exécution à rr0.org. Les enregistrements sont vos fichiers, sur votre
        hébergement.</p>
      <p>Une reconstitution affirme ce que son enregistrement énonce, et rien de plus : aucune
        conclusion, aucune marque, et aucun numéro de dossier autre que celui que vous y mettez.</p>
    </div>

    <div class="faq-item">
      <h3>Qu'autorise la licence ?</h3>
      <p>UFO@home est sous <a href="https://github.com/RR0/UfoAtHome/blob/main/LICENSE">licence
        MIT</a>. Elle vous permet de :</p>
      <ul class="plain">
        <li>l'utiliser sur n'importe quel site, y compris commercial ;</li>
        <li>le modifier, et garder vos modifications privées ;</li>
        <li>le redistribuer, l'intégrer à votre produit, et faire payer ce produit ;</li>
        <li>le forker, et le poursuivre dans votre propre direction.</li>
      </ul>
      <p>La seule obligation est de conserver la mention de copyright et le texte de la licence avec
        les copies que vous distribuez. Il n'y a ni <i lang="en">contributor licence agreement</i>,
        ni inscription.</p>
      <p>Le code est sur <a href="https://github.com/RR0/UfoAtHome">GitHub</a>, y compris les
        scripts qui engendrent ses catalogues d'étoiles, de comètes et de satellites à partir de
        sources publiques : les données sont donc reproductibles autant que lisibles.</p>
    </div>

    <div class="faq-item">
      <h3>Qu'est-ce qui passe sur le réseau ?</h3>
      <p>Les enregistrements restent dans votre navigateur : il n'y a ni compte ni stockage côté
        serveur. <strong>Exporter</strong> écrit un fichier sur votre disque, et ce fichier est
        l'enregistrement complet.</p>
      <p>Ce que va chercher l'éditeur, et quand :</p>
      <div class="table-scroll">
      <table>
        <tr><th>Service</th><th>Pour quoi</th><th>Quand</th></tr>
        <tr><td>Nominatim (OpenStreetMap)</td><td>Transformer un nom de lieu en coordonnées, et l'inverse</td><td>Seulement quand vous appuyez sur <strong>Localiser</strong> ou déplacez une coordonnée — jamais à chaque frappe</td></tr>
        <tr><td>Open-Meteo (ERA5, ECMWF)</td><td>Le relevé météo de cette date, heure et lieu ; et le fuseau horaire d'un point</td><td>Dès qu'une date complète et un lieu sont connus</td></tr>
        <tr><td>AWS Terrain Tiles</td><td>Le relief réel du sol autour du témoin</td><td>Dès qu'un lieu est posé</td></tr>
        <tr><td>Esri World Imagery, ou EOX Sentinel-2 cloudless</td><td>L'imagerie aérienne drapée sur ce relief</td><td>De même</td></tr>
      </table>
      </div>
      <p>Chacun est un sélecteur dans l'interface, placé là où sa donnée est rapportée et portant
        l'attribution qu'exige sa licence : vous voyez qui a répondu et pouvez en choisir un autre.
        Les catalogues d'étoiles, de comètes et de satellites sont engendrés à l'avance et embarqués
        dans le <i lang="en">bundle</i>, donc rien n'est appelé pour eux.</p>
      <p>Une page qui ne fait que <em>rejouer</em> un enregistrement terminé
        (<code>&lt;rr0-ufo&gt;</code>, <code>&lt;rr0-scene&gt;</code>,
        <code>&lt;rr0-eyewitness&gt;</code>) ne fait aucune consultation, hors les tuiles de relief
        et d'imagerie : un enregistrement publié porte sa propre météo et n'est jamais reconsulté —
        c'est aussi pourquoi il se lit à l'identique des années plus tard.</p>
    </div>

    <div class="faq-item">
      <h3>Puis-je l'héberger entièrement moi-même, sans service externe ?</h3>
      <p>Oui. Recopiez les <i lang="en">bundles</i> <code>.mjs</code> sur votre serveur et les
        reconstitutions se joueront. Sans fournisseur de relief ni d'imagerie (ou en les pointant
        vers votre propre serveur de tuiles), la scène retombe sur un horizon nu. Les consultations
        existent pour la <em>saisie</em> ; la lecture d'un enregistrement terminé n'en a pas
        besoin.</p>
    </div>

    <h2>Pourquoi il existe</h2>

    <div class="faq-item">
      <h3>Pourquoi construire ça ?</h3>
      <p>Parce qu'un témoignage mis par écrit en perd presque tout. En 1968, au symposium de l'AAAS,
        le psychologue Roger Shepard a soutenu qu'une reconstitution visuelle d'un témoignage est
        plus fidèle qu'une reconstitution écrite ou orale : un témoin est bien meilleur pour
        reconnaître et corriger une image que pour engendrer une description. UFO@home, c'est cette
        idée mise en logiciel : dessinez, faites bouger, et laissez le témoin corriger jusqu'à ce
        que ça corresponde.</p>
      <p>Le projet est né en 2003 sous forme d'applet Java. Il a été réécrit intégralement en
        TypeScript en 2026, en composants web, parce que l'applet était devenue inexécutable et
        parce que la moitié manquante avait toujours été le ciel : une reconstitution sans le ciel
        réel de cette nuit-là ne peut être confrontée à rien.</p>
    </div>

    <div class="faq-item">
      <h3>Pourquoi l'objet est-il une forme plate plutôt qu'un modèle 3D ?</h3>
      <p>Parce qu'un objet 3D placé dans la scène est déjà une conclusion. Il affirme une taille,
        une distance et une solidité qu'aucun témoin ne pouvait percevoir — et, pire, il écarte en
        silence toutes les explications où il n'y avait aucun objet : un halo, une planète, un
        satellite, le phare d'atterrissage d'un avion, un nuage lenticulaire, un reflet sur un
        pare-brise.</p>
      <p>Une forme plate dans le champ de vision du témoin affirme exactement ce qu'il a affirmé :
        voilà ce qui est parvenu à mon œil, de cette taille, se déplaçant ainsi. Tout le reste reste
        ouvert — c'est la seule façon qu'une reconstitution ait de <em>tester</em> une méprise au
        lieu de l'exclure par construction.</p>
      <p>Cela rend aussi l'outil honnête sur la taille. Un enregistrement stocke un angle, jamais des
        mètres. Les mètres ne reviennent que sous forme d'inégalité, et seulement là où l'objet a
        croisé quelque chose dont la position est connue.</p>
    </div>

    <div class="faq-item">
      <h3>Une reconstitution est-elle une preuve ?</h3>
      <p>Non. C'est une façon d'énoncer un témoignage assez précisément pour pouvoir le poser à
        côté des relevés — et ce sont les relevés qui font le
        travail : la phase de la Lune cette nuit-là, si le ciel était couvert, si une comète était
        levée, si l'orbite basse était seulement éclairée. L'outil énonce côte à côte ce qu'a dit le
        témoin et ce que disent les relevés, et s'arrête là. Que les deux s'expliquent l'un l'autre
        est la conclusion du lecteur, jamais l'affirmation du fichier.</p>
    </div>

    <h2>Face aux autres outils</h2>

    <div class="faq-item">
      <h3>En quoi est-ce différent de Sitrec ?</h3>
      <p><a href="https://github.com/MickWest/sitrec">Sitrec</a> (« <i lang="en">situation
        recreation</i> », Mick West, depuis 2022) est un excellent outil, et il fait un autre
        travail. Il part de <em>données d'instrument</em> — une vidéo, une trace ADS-B, les
        métadonnées d'un capteur, des éléments orbitaux — et reconstitue la géométrie qui a pu
        produire ces images. C'est le bon outil quand il y a des images.</p>
      <p>UFO@home commence là où il n'y en a pas : une personne, un récit, une date. Il reconstitue
        ce qu'un <em>témoin</em> a décrit, et il est bâti autour de ce qu'un témoignage peut et ne
        peut pas dire — des angles plutôt que des mètres, une apparence énoncée plutôt qu'un objet
        placé, et la trace explicite de qui a fourni chaque fait non testimonial.</p>
      <p>Leurs licences diffèrent aussi. Sitrec était sous licence MIT ; il a été archivé en mars
        2026 au profit de <a href="https://github.com/MickWest/Sitrec2">Sitrec2</a>, dont la licence
        n'autorise qu'un usage personnel ou académique non commercial, à l'exclusion de toute
        redistribution ou modification. UFO@home est en MIT.</p>
    </div>

    <div class="faq-item">
      <h3>N'est-ce pas ce que faisait SIMOVNI ?</h3>
      <p>C'est la même idée, cinquante ans plus tôt et en matériel. <strong>SIMOVNI</strong> était un
        simulateur optique réalisé en 1976 au sein du GEPAN (le groupe d'étude du CNES) par
        Jean-Jacques Velasco : le témoin regardait le paysage réel dans un viseur, avec l'image
        virtuelle d'un ovni surimposée, dont on ajustait la forme (par diapositives), la couleur, la
        luminosité et la taille jusqu'à ce que cela corresponde. C'est, à notre connaissance, la
        première tentative sérieuse de témoignage visuel plutôt qu'écrit. C'était aussi un unique
        banc physique à Toulouse, il n'a servi qu'à une ou deux occasions, et Dominique Caudron —
        qui avait construit ses propres simulateurs auparavant — en jugeait les résultats peu
        fiables.</p>
      <p><strong>SimOvni 2</strong>, présenté par Laurent Chabin au CAIPAN 2 en 2022, reprend l'idée
        avec un casque de réalité virtuelle et un vrai travail de calibration derrière.</p>
      <p>Ce qu'ajoute UFO@home n'est pas un meilleur banc optique : c'est qu'une reconstitution
        devient un petit fichier que n'importe qui peut ouvrir, rejouer, intégrer, vérifier et
        contester — au lieu d'une séance qui a eu lieu une fois, dans une pièce, devant un seul
        enquêteur, et n'a laissé qu'un compte rendu écrit.</p>
    </div>

    <div class="faq-item">
      <h3>Pourquoi ne pas simplement utiliser Stellarium ?</h3>
      <p>Stellarium est un planétarium, et un très bon — nous en avons lu le code source pour
        apprendre comment il s'y prend. Mais il répond à « qu'y avait-il dans le ciel ? », pas à
        « qu'a vu cette personne, et le ciel peut-il en rendre compte ? ». Il n'a pas de format de
        témoignage, pas d'objet témoigné, pas de météo, pas de décor autour de l'observateur, pas
        d'instrument à pose longue, et rien à intégrer dans une page.</p>
      <p>Là où les deux se recoupent, UFO@home prend parfois le chemin le plus dur exprès : la Voie
        lactée est une texture chez Stellarium et une intégrale le long de la ligne de visée ici,
        d'où un rift sombre qui sort d'un modèle de poussière au lieu de sortir d'une image. Et là où
        Stellarium rend quelque chose que nous ne rendons pas, la règle de travail de ce projet est
        d'aller chercher comment ils font.</p>
    </div>

    <h2>S'en servir, et le faire évoluer</h2>

    <div class="faq-item">
      <h3>Comment demander une fonctionnalité, ou signaler un problème ?</h3>
      <p>Ouvrez un ticket : <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        Un compte GitHub est gratuit et prend une minute.</p>
      <p>Ce qui rend une demande facile à traiter :</p>
      <ul class="plain">
        <li><strong>Un cas réel, s'il y en a un.</strong> « Les témoins disent souvent que c'était
          derrière une colline » est une fonctionnalité ; « voici une observation où cela compte,
          datée, située et sourcée » est une fonctionnalité qui sera bien faite.</li>
        <li><strong>Ce que dit le relevé.</strong> Si ce que vous voulez voir reconstitué est mesuré
          quelque part — un jeu de données, un catalogue, une mesure publiée — dites où. La règle de
          ce projet est que rien ne s'invente : quelque chose de reproductible demande une donnée ou
          une physique derrière, et savoir laquelle des deux règle l'essentiel de la conception.</li>
        <li><strong>Ce que vous en concluriez.</strong> Une fonctionnalité qui ne peut changer la
          lecture d'aucun dossier est un ornement.</li>
      </ul>
      <p>Les <i lang="en">pull requests</i> sont les bienvenues, aux conditions habituelles d'un
        projet MIT. Si vous préférez ne pas passer par GitHub, le contact du mainteneur est sur
        <a href="https://rr0.org/Contact.html">rr0.org</a>.</p>
    </div>

    <div class="faq-item">
      <h3>Puis-je mettre une reconstitution dans un message de forum ?</h3>
      <p>Si le forum accepte du HTML brut et un script de module, oui — les deux lignes sont sur
        <a href="/editor/">la page de l'éditeur</a>, et chaque reconstitution publiée les
        distribue elle-même. La plupart des forums ne l'acceptent pas, pour de bonnes raisons. Deux
        solutions qui marchent en général : une <code>&lt;iframe&gt;</code> pointant vers une page à
        vous qui porte le composant, ou tout simplement un lien vers
        <code>ufoathome.org/editor/?sighting=</code> suivi de l'URL de votre enregistrement, qui
        l'ouvre ici pour tout le monde.</p>
    </div>

    <div class="faq-item">
      <h3>Et si je ne connais pas la date exacte, ou l'heure exacte ?</h3>
      <p>Dites-le, et l'outil le dira aussi. Les dates sont stockées en EDTF : « 1954 », « juin
        2025 », « vers 05:00 » et « incertain » sont des choses que le format sait énoncer. Vous ne
        perdez que ce qui dépend réellement de la partie manquante : sans date complète ni lieu, il
        n'y a pas de ciel à calculer, et l'interface le dit au lieu d'en dessiner un vraisemblable.</p>
    </div>

    <div class="faq-item">
      <h3>Quelles langues parle-t-il ?</h3>
      <p>Les composants et ce site sont en anglais et en français, choisis d'après les préférences de
        votre navigateur, avec l'anglais en repli. Ajouter une langue consiste à ajouter un module de
        messages typé par composant — sans toucher au balisage ni à la configuration de compilation.
        C'est l'une des contributions les plus faciles à apporter.</p>
    </div>

    <div class="faq-item">
      <h3>Combien ça coûte ?</h3>
      <p>Rien : pas de prix, pas de compte, pas de quota, pas de palier payant. Les services
        externes utilisés pendant la saisie sont des services publics dont l'outil respecte les
        conditions d'usage — c'est pourquoi la recherche de lieu ne part que lorsque vous la
        demandez.</p>
    </div>
  </div>
</section>
`
  }
}
