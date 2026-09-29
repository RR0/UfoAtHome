import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** The page that answers the questions people actually hesitate on before adopting the thing. */
export class FaqPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "faq",
    navLabel: { en: "FAQ", fr: "FAQ", es: "FAQ", it: "FAQ" },
    title: { en: "Frequently asked", fr: "Questions fréquentes", es: "Preguntas frecuentes", it: "Domande frequenti" },
    description: {
      en: "Who made UFO@home, what you are allowed to do with it, what it sends over the network, "
        + "how it compares with Sitrec, SIMOVNI and Stellarium, and how to ask for a change.",
      fr: "Qui a fait UFO@home, ce que vous avez le droit d'en faire, ce qu'il envoie sur le réseau, "
        + "ce qui le distingue de Sitrec, SIMOVNI et Stellarium, et comment demander une évolution.",
      es: "Quién hizo UFO@home, qué se le permite hacer con él, qué envía por la red, "
        + "en qué se diferencia de Sitrec, SIMOVNI y Stellarium, y cómo pedir un cambio.",
      it: "Chi ha realizzato UFO@home, che cosa vi è permesso farne, che cosa invia in rete, "
        + "in che cosa si distingue da Sitrec, SIMOVNI e Stellarium, e come chiedere una modifica."
    }
  }

  render(language: SiteLanguage): string {
    switch (language) {
      case "fr":
        return this.fr()
      case "es":
        return this.es()
      case "it":
        return this.it()
      default:
        return this.en()
    }
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
      <h3>Who wrote UFO@home?</h3>
      <p>It is developed by <a href="https://github.com/RR0">RR0</a>, which among other things
        built <a href="https://rr0.org">rr0.org</a>, a French encyclopaedia of unexplained
        phenomena. That site uses UFO@home to illustrate its own case files — and RR0 has taken care
        to keep the tool usable by anybody.</p>
    </div>

    <div class="faq-item">
      <h3>What does the licence allow?</h3>
      <p>UFO@home is under the <a href="https://github.com/RR0/UfoAtHome/blob/master/LICENSE">MIT
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
        scripts that generate its star, comet, nova and satellite catalogues from public sources — so the
        data is reproducible as well as readable.</p>
    </div>

    <div class="faq-item">
      <h3>What does it send over the network?</h3>
      <p>Recordings stay in your browser: there is no account and no server-side storage.
        <strong>Export</strong> writes a file to your disk, and that file is the whole recording.</p>
      <p>Everything that is fetched — from where, when, and under which licence — is listed source by
        source on <a href="/docs/sources/">Sources and choices</a>, the one list there is, so that
        this answer does not have to keep a second copy of it. In short:</p>
      <ul>
        <li><strong>While you author</strong>, the editor looks things up for you: a place's
          coordinates when you press <strong>Locate</strong>, the weather record once a full date and
          a place are known, the relief and aerial imagery around the observer. Each lookup is a picker
          in the interface, where its data is reported, with the attribution its licence requires.
          Drafting a recording from its description sends that text to the model you chose, with your
          own key, and only when you ask.</li>
        <li><strong>A page that only replays</strong> a finished recording (<code>&lt;rr0-scene&gt;</code>,
          <code>&lt;rr0-sighting&gt;</code>) asks for the relief and imagery tiles, what this site serves
          itself (satellite elements, 3D models), and what the recording itself points at (a photo of the
          place, a sound). A published recording carries its own weather and is never looked up again,
          which is also why it reads identically years later.</li>
      </ul>
    </div>

    <div class="faq-item">
      <h3>Can I host it entirely myself, with no external service?</h3>
      <p>Yes, and nothing about it depends on RR0. The components are published on npm as
        <code>@rr0/ufoathome</code> and served from this domain; install them or copy the built
        <code>.mjs</code> bundles onto your own server and the reconstructions will play, with no
        runtime dependency on rr0.org. Recordings are your own files, on your own host, and a
        reconstruction asserts what its recording states and nothing more — no conclusion, no
        branding, no case number other than one you put there yourself.</p>
      <p>Copy the <code>.mjs</code> bundles onto your server and the reconstructions will play.
        Skip the terrain and imagery providers (or point them at your own tile server) and the scene
        falls back to a plain horizon. The lookups exist for <em>authoring</em>; playback of a
        finished recording does not need them.</p>
    </div>

    <h2>Why it exists</h2>

    <div class="faq-item">
      <h3>Why build this at all?</h3>
      <p>The idea came out of conversations with the sociologist
        <a href="https://rr0.org/people/l/LagrangePierre/">Pierre Lagrange</a>, who would cite Roger
        Shepard's work to its author.</p>
      <p>Because an account written down loses almost everything about it. In 1968, at the AAAS
        symposium, the psychologist <a href="https://rr0.org/people/s/ShepardRogerN/">Roger Shepard</a> argued, in
        <a href="https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index.html">the paper he gave there</a>, that a visual reconstruction of an account
        is more faithful than a written or spoken one — observers are much better at recognising and
        adjusting a picture than at generating a description. UFO@home is that idea, built as
        software: draw it, move it, and let the observer correct it until it matches.</p>
      <p>The project began in 2003 as a Java applet. It was rewritten from scratch in TypeScript in
        2026, as web components, because the applet had become unrunnable and because the missing
        half had always been the sky: a reconstruction without the real sky of that night cannot be
        checked against anything.</p>
    </div>

    <div class="faq-item">
      <h3>Why is an account drawn flat, and when does 3D come in?</h3>
      <p>The account itself is drawn as it reached the observer's eye: a shape in their field of view,
        this big, moving this way. Because a 3D object placed in the scene is already a conclusion. It asserts a size, a
        distance and a solidity that no observer could perceive — and, worse, it silently rules out
        every explanation in which there was no object there at all:
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">a halo</a>,
        <a href="https://rr0.org/place/systeme/solaire/planete/venus/">a planet</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/Satellites.html">a satellite</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">an aircraft's landing light</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/nuage/">a lenticular cloud</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/lens/">a reflection on a windscreen</a>. Those links go to rr0.org's own
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/">catalogue of misperceptions</a>, which is the reason this tool is built the
        way it is.</p>
      <p>A flat shape on the observer's own field of view asserts exactly what they claimed: this is
        what reached my eye, this big, moving this way. Everything else stays open — which is the
        only way a reconstruction can be used to <em>test</em> a misperception rather than to rule
        one out by construction.</p>
      <p>3D comes in as an <em>interpretation</em>, kept apart from the account: what the observer
        believes they saw (at Silly-le-Long, T1 describes one flat grey triangle, seen from the front
        and then from behind), or an analyst's explanation stated in a case file (there, the GEIPAN's
        light aircraft on final). Each is one choice of the player's <strong>Interpretation</strong>
        selector, shown one at a time, with a model, a size and a track in metres. The
        <strong>Compare with the account</strong> button then lays the account's own outlines over it
        and states, instant by instant, how far apart they are in direction, width and height. The
        account never changes to fit an interpretation: the interpretation answers to it.</p>
      <p>It also means the tool is honest about size. A recording stores an angle, never metres —
        but it does NOT mean distance is given up on. Where the observer saw the phenomenon cross
        something whose position is known, that crossing is stated in the recording (it passed
        <em>behind</em> that hangar, <em>in front of</em> that tree) and the scene raycasts the exact
        line of sight to measure it. Each crossing bounds its real width from one side, an
        angle plus a distance is a size, and a size does not change as it moves — so every
        other instant of the recording reads back as a distance too. The editor prints the range
        under the apparent size, reports a contradiction where the stated crossings cannot all be
        true, and says “unknown” where nothing crosses the line of sight at all, which is the honest
        answer for a light in an empty sky.</p>
    </div>

    <div class="faq-item">
      <h3>Is a reconstruction evidence?</h3>
      <p>No. It is a way of stating an account precisely enough that it can be laid beside the
        record — and the record is what does the work: the Moon's phase that night, whether the sky
        was overcast, whether a comet was up, whether low orbit was even sunlit.</p>
      <p><strong>What a reconstruction is trying to do is agree with the observer.</strong> Not to
        illustrate their account, and not to correct it: to converge on it, one correction at a
        time, until they say that is what they saw. Every step of that convergence adds something
        that can be checked, so the closer it gets, the more there is to explain the sighting
        with — or to fail to.</p>
      <p>And that is where it earns its keep. Suppose the reconstruction can put a known
        phenomenon — <a href="https://rr0.org/place/systeme/solaire/planete/venus/">a planet</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">a halo</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">an aircraft</a> —
        in the exact place the observer saw something, at the right size, at the right hour. Show it
        to them and ask the only question that matters: <em>does that look like what you saw?</em>
        If the answer is yes, investigator and observer have converged on the facts rather than
        argued about the conclusion, and the explanation stands on something firmer than anyone's
        opinion of the other.</p>
      <p>If the answer is no, that is a result too, and a better one than a written note saying the
        observer disagreed — because the thing they are rejecting is on screen, at the right place
        and the right size, and the next person can look at it.</p>
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
        an <em>observer</em> described, and it is built around what an account can and cannot say —
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
        Jean-Jacques Velasco: the observer looked through a viewfinder at the real landscape with a
        virtual UFO superimposed, whose shape (on slides), colour, brightness and size could be
        adjusted until it matched. It is, as far as we know, the first serious attempt at visual
        rather than written account. It was also a single physical bench in Toulouse, it was used
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
        the sky account for it?”. It has no account format, no observered phenomenon, no weather, no
        decor around the observer, no long-exposure instrument, and nothing to embed in a page.</p>
      <p>Where the two overlap, UFO@home sometimes takes the harder road on purpose: the Milky Way
        is a texture in Stellarium and a line-of-sight integral here, which is why its dark rift
        comes out of a dust model rather than out of an image. Where Stellarium renders something we
        do not, the working rule of this project is to go and find out how they do it.</p>
    </div>

    <div class="faq-item">
      <h3>Why not ask an AI to build the simulation from scratch?</h3>
      <p>Because what it built would be an illustration. Asked for “a scene of what this witness
        saw”, a model writes a 3D scene or paints a video that looks right: a sky, a field, a
        light. Whether the Moon was really up, where the Sun really was, what the cloud cover was
        that morning, how big the thing really looked from where the observer stood: each of those is
        something it may have got right, and nothing in the result says which. It is also a one-off:
        a thousand lines of code nobody has checked, written differently for the next case, which
        cannot be laid beside the next case.</p>
      <p>A UFO@home recording splits the work the other way. What the AI writes is only the
        account: a date, a place, directions and apparent sizes over time, each value marked as
        stated, worked out or assumed. The sky, the weather records, the ground, the optics of the
        eye or the camera are computed from that by the same engine for every case, tested, and
        public. The format's limits are part of the point: it has no field for a real size or a
        distance, so an assistant cannot slip a conclusion in among the facts, and what it does write
        is a short file anyone can read, replay, correct, and show the observer.</p>
      <p>That is also why the two are not in competition. An AI assistant is a good way to
        <a href="/docs/create/">write a recording</a> from a case file: on a GEIPAN case, one given
        only the public file and these pages produced a recording whose phenomenon matched the one
        made by hand to within a tenth of a degree. What it cannot do on its own is make the result
        checkable, and that is the part this project is.</p>
    </div>

    <h2>Using it, and changing it</h2>

    <div class="faq-item">
      <h3>How do I ask for a feature, or report something wrong?</h3>
      <p>Open an issue: <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        A GitHub account is free and takes a minute.</p>
      <p>What makes a request easy to act on:</p>
      <ul class="plain">
        <li><strong>A real case, if there is one.</strong> “Observers often say it was behind a
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
        <a href="/edit/">the editor page</a>, and every published reconstruction hands them out
        itself. Most forums do not allow that, for good reasons. Two things that usually work
        instead: an <code>&lt;iframe&gt;</code> pointing at a page of your own that holds the
        component, or simply a link to <code>ufoathome.org/edit/?sighting=</code> followed by the
        URL of your recording, which opens it here for anyone.</p>
    </div>

    <div class="faq-item">
      <h3>What if I don't know the exact date, or the exact time?</h3>
      <p>Say so, and the tool will say so too. Dates are stored in EDTF, so “1954”, “June 2025”,
        “around 05:00” and “uncertain” are all things <a href="/docs/format/">the format</a> can state. What you lose is only
        what genuinely depends on the missing part: with no full date and place there is no sky to
        compute, and the interface says that rather than drawing a plausible one.</p>
    </div>

    <div class="faq-item">
      <h3>What languages does it speak?</h3>
      <p>The components are in English and French, and this site in English, French, Spanish and
        Italian, picked from your browser's own preferences with English as the fallback. Adding a
        language to the components means adding one typed messages
        module per component — no markup changes, no build configuration. It is one of the easiest
        contributions to make.</p>
      <p>There is no language picker, and that is the point: an address carries no language, so a
        link you send is read by whoever opens it in <em>theirs</em>. Send someone in Lyon a section
        of this page and they arrive at that same section, in French.</p>
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
      <h3>Qui est l'auteur de UFO@home ?</h3>
      <p>Le projet est développé par l'organisation <a href="https://github.com/RR0">RR0</a>, qui a
        notamment développé <a href="https://rr0.org">rr0.org</a>, une encyclopédie française des
        phénomènes inexpliqués. Ce site utilise UFO@home pour illustrer ses propres dossiers, mais
        RR0 a pris soin de garder l'outil utilisable par quiconque.</p>
    </div>

    <div class="faq-item">
      <h3>Qu'autorise la licence ?</h3>
      <p>UFO@home est sous <a href="https://github.com/RR0/UfoAtHome/blob/master/LICENSE">licence
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
        scripts qui engendrent ses catalogues d'étoiles, de comètes, de novae et de satellites à partir de
        sources publiques : les données sont donc reproductibles autant que lisibles.</p>
    </div>

    <div class="faq-item">
      <h3>Qu'est-ce qui passe sur le réseau ?</h3>
      <p>Les enregistrements restent dans votre navigateur : il n'y a ni compte ni stockage côté
        serveur. <strong>Exporter</strong> écrit un fichier sur votre disque, et ce fichier est
        l'enregistrement complet.</p>
      <p>Tout ce qui est appelé — d'où, quand, et sous quelle licence — est listé source par source
        sur <a href="/docs/sources/">Les sources et les choix</a>, la seule liste qui existe, pour que
        cette réponse n'ait pas à en tenir une seconde copie. En bref :</p>
      <ul>
        <li><strong>Pendant la saisie</strong>, l'éditeur relève les choses pour vous : les
          coordonnées d'un lieu quand vous appuyez sur <strong>Localiser</strong>, le relevé météo dès
          qu'une date complète et un lieu sont connus, le relief et l'imagerie aérienne autour du
          observateur. Chaque consultation est un sélecteur dans l'interface, là où sa donnée est
          rapportée, avec l'attribution qu'exige sa licence. Rédiger un enregistrement depuis sa
          description envoie ce texte au modèle que vous avez choisi, avec votre propre clé, et
          seulement quand vous le demandez.</li>
        <li><strong>Une page qui ne fait que rejouer</strong> un enregistrement terminé
          (<code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-sighting&gt;</code>) demande les tuiles de relief
          et d'imagerie, ce que ce site sert lui-même (éléments orbitaux des satellites, modèles 3D), et
          ce vers quoi l'enregistrement pointe (une photo du lieu, un son). Un enregistrement publié
          porte sa propre météo et n'est jamais reconsulté — c'est aussi pourquoi il se lit à
          l'identique des années plus tard.</li>
      </ul>
    </div>

    <div class="faq-item">
      <h3>Puis-je l'héberger entièrement moi-même, sans service externe ?</h3>
      <p>Oui, et rien là-dedans ne dépend de RR0. Les composants sont publiés sur npm sous le nom
        <code>@rr0/ufoathome</code> et servis depuis ce domaine ; installez-les ou recopiez les
        <i lang="en">bundles</i> <code>.mjs</code> construits sur votre serveur, et les
        reconstitutions se joueront sans aucune dépendance d'exécution à rr0.org. Les
        enregistrements sont vos fichiers, sur votre hébergement, et une reconstitution affirme ce
        que son enregistrement énonce, et rien de plus : aucune conclusion, aucune marque, aucun
        numéro de dossier autre que celui que vous y mettez.</p>
      <p>Recopiez les <i lang="en">bundles</i> <code>.mjs</code> sur votre serveur et les
        reconstitutions se joueront. Sans fournisseur de relief ni d'imagerie (ou en les pointant
        vers votre propre serveur de tuiles), la scène retombe sur un horizon nu. Les consultations
        existent pour la <em>saisie</em> ; la lecture d'un enregistrement terminé n'en a pas
        besoin.</p>
    </div>

    <h2>Pourquoi il existe</h2>

    <div class="faq-item">
      <h3>Pourquoi construire ça ?</h3>
      <p>L'idée est née de discussions avec le sociologue
        <a href="https://rr0.org/people/l/LagrangePierre/">Pierre Lagrange</a>, qui citait à son
        auteur les travaux de Roger Shepard.</p>
      <p>Parce qu'un compte rendu mis par écrit en perd presque tout. En 1968, au symposium de l'AAAS,
        le psychologue <a href="https://rr0.org/people/s/ShepardRogerN/">Roger Shepard</a> a soutenu, dans
        <a href="https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index_fr.html">la communication qu'il y a donnée</a>, qu'une reconstitution visuelle
        d'un compte rendu est plus fidèle qu'une reconstitution écrite ou orale : un observateur est bien
        meilleur pour reconnaître et corriger une image que pour engendrer une description.
        UFO@home, c'est cette idée mise en logiciel : dessinez, faites bouger, et laissez l'observateur
        corriger jusqu'à ce que ça corresponde.</p>
      <p>Le projet est né en 2003 sous forme d'applet Java. Il a été réécrit intégralement en
        TypeScript en 2026, en composants web, parce que l'applet était devenue inexécutable et
        parce que la moitié manquante avait toujours été le ciel : une reconstitution sans le ciel
        réel de cette nuit-là ne peut être confrontée à rien.</p>
    </div>

    <div class="faq-item">
      <h3>Pourquoi un compte rendu est-il dessiné à plat, et quand la 3D intervient-elle ?</h3>
      <p>Le compte rendu lui-même est dessiné tel qu'il est parvenu à l'œil de l'observateur : une
        forme dans son champ de vision, de cette taille, se déplaçant ainsi. Parce qu'un objet 3D placé
        dans la scène est déjà une conclusion. Il affirme une taille,
        une distance et une solidité qu'aucun observateur ne pouvait percevoir — et, pire, il écarte en
        silence toutes les explications où il n'y avait aucun objet :
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un halo</a>,
        <a href="https://rr0.org/place/systeme/solaire/planete/venus/">une planète</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/Satellites.html">un satellite</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">le phare d'atterrissage d'un avion</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/nuage/">un nuage lenticulaire</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/lens/">un reflet sur un pare-brise</a>. Ces liens mènent au
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/">catalogue des méprises</a> de rr0.org, qui est la raison pour laquelle cet
        outil est bâti ainsi.</p>
      <p>Une forme plate dans le champ de vision de l'observateur affirme exactement ce qu'il a affirmé :
        voilà ce qui est parvenu à mon œil, de cette taille, se déplaçant ainsi. Tout le reste reste
        ouvert — c'est la seule façon qu'une reconstitution ait de <em>tester</em> une méprise au
        lieu de l'exclure par construction.</p>
      <p>La 3D intervient comme <em>interprétation</em>, tenue à part du compte rendu : ce que
        l'observateur croit avoir vu (à Silly-le-Long, T1 décrit un seul triangle plat et gris, vu de
        face puis de derrière), ou l'explication d'un analyste énoncée dans un dossier (là, l'avion
        léger en finale du GEIPAN). Chacune est un choix du sélecteur <strong>Interprétation</strong>
        du lecteur, montrée une à la fois, avec un modèle, une taille et une trajectoire en mètres. Le
        bouton <strong>Comparer au compte rendu</strong> superpose alors les contours du compte rendu
        et chiffre, instant après instant, l'écart de direction, de largeur et de hauteur. Le compte
        rendu ne change jamais pour coller à une interprétation : c'est l'interprétation qui doit lui
        répondre.</p>
      <p>Cela rend aussi l'outil honnête sur la taille. Un enregistrement stocke un angle, jamais
        des mètres — mais on ne renonce pas pour autant à la distance. Là où l'observateur a vu le phénomène
        croiser quelque chose dont la position est connue, ce croisement est énoncé dans
        l'enregistrement (il est passé <em>derrière</em> ce hangar, <em>devant</em> cet arbre) et la
        scène lance un rayon sur la ligne de visée exacte pour le mesurer. Chaque croisement borne
        d'un côté sa largeur réelle ; or un angle plus une distance font une taille, et
        une taille ne change pas pendant qu'il se déplace — chaque autre instant de l'enregistrement
        se relit donc en distance. L'éditeur imprime la plage sous la taille apparente, signale une
        contradiction quand les croisements énoncés ne peuvent pas tous être vrais, et dit
        « inconnue » quand rien ne croise la ligne de visée — la réponse honnête pour une lumière
        dans un ciel vide.</p>
    </div>

    <div class="faq-item">
      <h3>Une reconstitution est-elle une preuve ?</h3>
      <p>Non. C'est une façon d'énoncer un compte rendu assez précisément pour pouvoir le poser à côté
        des relevés — et ce sont les relevés qui font le travail : la phase de la Lune cette
        nuit-là, si le ciel était couvert, si une comète était levée, si l'orbite basse était
        seulement éclairée.</p>
      <p><strong>Ce que cherche une reconstitution, c'est à s'accorder avec l'observateur.</strong> Ni
        illustrer son récit, ni le corriger : converger vers lui, correction après correction,
        jusqu'à ce qu'il dise que c'est bien ce qu'il a vu. Chaque pas de cette convergence ajoute
        quelque chose de vérifiable — plus on s'approche, plus on a de quoi expliquer
        l'observation. Ou de quoi échouer à l'expliquer.</p>
      <p>Et c'est là qu'elle vaut son prix. Supposons que la reconstitution parvienne à placer un
        phénomène connu — <a href="https://rr0.org/place/systeme/solaire/planete/venus/">une
        planète</a>, <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un
        halo</a>, <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">un
        avion</a> — à l'endroit exact où l'observateur a vu quelque chose, à la bonne taille, à la bonne
        heure. Montrez-le-lui et posez la seule question qui compte : <em>est-ce que cela ressemble
        à ce que vous avez vu ?</em> Si la réponse est oui, l'enquêteur et l'observateur ont convergé sur
        les faits au lieu de se disputer la conclusion, et l'hypothèse d'explication repose sur
        quelque chose de plus solide que l'opinion que l'un a de l'autre.</p>
      <p>Si la réponse est non, c'est un résultat aussi, et meilleur qu'une note écrite disant que le
        observateur n'était pas d'accord : ce qu'il rejette est à l'écran, au bon endroit et à la bonne
        taille, et le suivant pourra le regarder.</p>
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
        ce qu'un <em>observateur</em> a décrit, et il est bâti autour de ce qu'un compte rendu peut et ne
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
        Jean-Jacques Velasco : l'observateur regardait le paysage réel dans un viseur, avec l'image
        virtuelle d'un ovni surimposée, dont on ajustait la forme (par diapositives), la couleur, la
        luminosité et la taille jusqu'à ce que cela corresponde. C'est, à notre connaissance, la
        première tentative sérieuse de compte rendu visuel plutôt qu'écrit. C'était aussi un unique
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
        compte rendu, pas de phénomène témoigné, pas de météo, pas de décor autour de l'observateur, pas
        d'instrument à pose longue, et rien à intégrer dans une page.</p>
      <p>Là où les deux se recoupent, UFO@home prend parfois le chemin le plus dur exprès : la Voie
        lactée est une texture chez Stellarium et une intégrale le long de la ligne de visée ici,
        d'où un rift sombre qui sort d'un modèle de poussière au lieu de sortir d'une image. Et là où
        Stellarium rend quelque chose que nous ne rendons pas, la règle de travail de ce projet est
        d'aller chercher comment ils font.</p>
    </div>

    <div class="faq-item">
      <h3>Pourquoi ne pas demander à une IA de construire la simulation de toutes pièces ?</h3>
      <p>Parce que ce qu'elle construirait serait une illustration. À qui demande « une scène de ce
        qu'a vu ce témoin », un modèle écrit une scène 3D ou peint une vidéo qui a l'air juste : un
        ciel, un champ, une lumière. La Lune était-elle vraiment levée, où était vraiment le Soleil,
        quelle était la couverture nuageuse ce matin-là, quelle taille la chose avait-elle vraiment
        depuis l'endroit où se tenait l'observateur : chacun de ces points, il a pu le réussir, et
        rien dans le résultat ne dit lesquels. C'est aussi un exemplaire unique : un millier de
        lignes de code que personne n'a vérifiées, écrites autrement pour le cas suivant, et qu'on ne
        peut pas mettre à côté du cas suivant.</p>
      <p>Un enregistrement UFO@home répartit le travail dans l'autre sens. Ce que l'IA écrit n'est
        que le compte rendu : une date, un lieu, des directions et des tailles apparentes au fil du
        temps, chaque valeur marquée comme énoncée, calculée ou supposée. Le ciel, les relevés météo,
        le sol, l'optique de l'œil ou de l'appareil en sont calculés par le même moteur pour tous les
        cas, testé, et public. Les limites du format font partie du propos : il n'a pas de champ pour
        une taille réelle ni une distance, si bien qu'un assistant ne peut pas glisser une conclusion
        parmi les faits, et ce qu'il écrit est un fichier court que chacun peut lire, rejouer,
        corriger, et montrer à l'observateur.</p>
      <p>C'est aussi pourquoi les deux ne sont pas en concurrence. Un assistant IA est un bon moyen
        d'<a href="/docs/create/">écrire un enregistrement</a> à partir d'un dossier : sur un cas du
        GEIPAN, un assistant qui n'avait que le dossier public et ces pages a produit un
        enregistrement dont le phénomène rejoignait celui fait à la main à un dixième de degré près.
        Ce qu'il ne peut pas faire seul, c'est rendre le résultat vérifiable, et c'est cette partie
        qu'est ce projet.</p>
    </div>

    <h2>S'en servir, et le faire évoluer</h2>

    <div class="faq-item">
      <h3>Comment demander une fonctionnalité, ou signaler un problème ?</h3>
      <p>Ouvrez un ticket : <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        Un compte GitHub est gratuit et prend une minute.</p>
      <p>Ce qui rend une demande facile à traiter :</p>
      <ul class="plain">
        <li><strong>Un cas réel, s'il y en a un.</strong> « Les observateurs disent souvent que c'était
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
        <a href="/edit/">la page de l'éditeur</a>, et chaque reconstitution publiée les
        distribue elle-même. La plupart des forums ne l'acceptent pas, pour de bonnes raisons. Deux
        solutions qui marchent en général : une <code>&lt;iframe&gt;</code> pointant vers une page à
        vous qui porte le composant, ou tout simplement un lien vers
        <code>ufoathome.org/edit/?sighting=</code> suivi de l'URL de votre enregistrement, qui
        l'ouvre ici pour tout le monde.</p>
    </div>

    <div class="faq-item">
      <h3>Et si je ne connais pas la date exacte, ou l'heure exacte ?</h3>
      <p>Dites-le, et l'outil le dira aussi. Les dates sont stockées en EDTF : « 1954 », « juin
        2025 », « vers 05:00 » et « incertain » sont des choses que <a href="/docs/format/">le format</a> sait énoncer. Vous ne
        perdez que ce qui dépend réellement de la partie manquante : sans date complète ni lieu, il
        n'y a pas de ciel à calculer, et l'interface le dit au lieu d'en dessiner un vraisemblable.</p>
    </div>

    <div class="faq-item">
      <h3>Quelles langues parle-t-il ?</h3>
      <p>Les composants sont en anglais et en français, et ce site en anglais, français, espagnol et
        italien, choisis d'après les préférences de votre navigateur, avec l'anglais en repli. Ajouter
        une langue aux composants consiste à ajouter un module de
        messages typé par composant — sans toucher au balisage ni à la configuration de compilation.
        C'est l'une des contributions les plus faciles à apporter.</p>
      <p>Il n'y a pas de sélecteur de langue, et c'est tout l'intérêt : une adresse ne porte aucune
        langue, si bien qu'un lien que vous envoyez se lit dans celle de <em>qui l'ouvre</em>.
        Envoyez une section de cette page à quelqu'un à Londres : il arrive à cette même section,
        en anglais.</p>
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

  private es(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h1>Preguntas frecuentes.</h1>
    <p class="lede">Qué es la herramienta, qué permite y en qué se diferencia de las demás.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Quién la hizo, y qué permite</h2>

    <div class="faq-item">
      <h3>¿Quién escribió UFO@home?</h3>
      <p>La desarrolla <a href="https://github.com/RR0">RR0</a>, que entre otras cosas
        construyó <a href="https://rr0.org">rr0.org</a>, una enciclopedia francesa de fenómenos
        inexplicados. Ese sitio usa UFO@home para ilustrar sus propios expedientes — y RR0 se ha
        preocupado de que la herramienta siga siendo utilizable por cualquiera.</p>
    </div>

    <div class="faq-item">
      <h3>¿Qué permite la licencia?</h3>
      <p>UFO@home está bajo la <a href="https://github.com/RR0/UfoAtHome/blob/master/LICENSE">licencia
        MIT</a>. Esta te permite:</p>
      <ul class="plain">
        <li>usarla en cualquier sitio, incluido uno comercial;</li>
        <li>modificarla, y mantener tus modificaciones en privado;</li>
        <li>redistribuirla, integrarla en tu propio producto y cobrar por ese producto;</li>
        <li>hacer un fork, y continuarla en tu propia dirección.</li>
      </ul>
      <p>La única obligación es conservar el aviso de copyright y el texto de la licencia con las
        copias que distribuyas. No hay <i lang="en">contributor licence agreement</i> ni registro.</p>
      <p>El código fuente está en <a href="https://github.com/RR0/UfoAtHome">GitHub</a>, incluidos los
        scripts que generan sus catálogos de estrellas, cometas, novas y satélites a partir de fuentes
        públicas — así que los datos son reproducibles además de legibles.</p>
    </div>

    <div class="faq-item">
      <h3>¿Qué envía por la red?</h3>
      <p>Las grabaciones se quedan en tu navegador: no hay cuenta ni almacenamiento en el servidor.
        <strong>Export</strong> escribe un archivo en tu disco, y ese archivo es la grabación completa.</p>
      <p>Todo lo que se descarga — de dónde, cuándo y bajo qué licencia — figura fuente por fuente en
        <a href="/docs/sources/">Fuentes y decisiones</a>, la única lista que existe, para que esta
        respuesta no tenga que mantener una segunda copia. En resumen:</p>
      <ul>
        <li><strong>Mientras redactas</strong>, el editor te busca las cosas: las coordenadas de un
          lugar cuando pulsas <strong>Locate</strong>, el registro meteorológico en cuanto se conocen una
          fecha completa y un lugar, el relieve y las imágenes aéreas alrededor del observador. Cada
          consulta es un selector de la interfaz, donde se indica su dato, con la atribución que exige
          su licencia. Redactar una grabación a partir de su descripción envía ese texto al modelo que
          elegiste, con tu propia clave, y solo cuando lo pides.</li>
        <li><strong>Una página que solo reproduce</strong> una grabación terminada (<code>&lt;rr0-scene&gt;</code>,
          <code>&lt;rr0-sighting&gt;</code>) pide las teselas de relieve e imágenes, lo que este sitio sirve
          por sí mismo (elementos orbitales de los satélites, modelos 3D) y aquello a lo que apunta la propia
          grabación (una foto del lugar, un sonido). Una grabación publicada lleva su propia meteorología y
          nunca se vuelve a consultar, que es también por lo que se lee igual años después.</li>
      </ul>
    </div>

    <div class="faq-item">
      <h3>¿Puedo alojarla yo mismo por completo, sin ningún servicio externo?</h3>
      <p>Sí, y nada de ello depende de RR0. Los componentes están publicados en npm como
        <code>@rr0/ufoathome</code> y se sirven desde este dominio; instálalos o copia los <i lang="en">bundles</i>
        <code>.mjs</code> compilados en tu propio servidor y las reconstrucciones se reproducirán, sin
        ninguna dependencia de ejecución de rr0.org. Las grabaciones son tus propios archivos, en tu
        propio alojamiento, y una reconstrucción afirma lo que su grabación declara y nada más — ninguna
        conclusión, ninguna marca, ningún número de expediente salvo el que tú mismo pongas.</p>
      <p>Copia los <i lang="en">bundles</i> <code>.mjs</code> en tu servidor y las reconstrucciones se reproducirán.
        Prescinde de los proveedores de relieve e imágenes (o apúntalos a tu propio servidor de teselas)
        y la escena recurre a un horizonte liso. Las consultas existen para la <em>redacción</em>; la
        reproducción de una grabación terminada no las necesita.</p>
    </div>

    <h2>Por qué existe</h2>

    <div class="faq-item">
      <h3>¿Para qué construir esto?</h3>
      <p>La idea surgió de conversaciones con el sociólogo
        <a href="https://rr0.org/people/l/LagrangePierre/">Pierre Lagrange</a>, que citaba a su autor la
        obra de Roger Shepard.</p>
      <p>Porque un relato puesto por escrito lo pierde casi todo. En 1968, en el simposio de la AAAS,
        el psicólogo <a href="https://rr0.org/people/s/ShepardRogerN/">Roger Shepard</a> sostuvo, en
        <a href="https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index.html">la ponencia que presentó allí</a>, que una reconstrucción visual de un relato
        es más fiel que una escrita u oral — los observadores son mucho mejores reconociendo y
        ajustando una imagen que generando una descripción. UFO@home es esa idea, hecha
        software: dibújalo, muévelo, y deja que el observador lo corrija hasta que coincida.</p>
      <p>El proyecto empezó en 2003 como un applet Java. Se reescribió desde cero en TypeScript en
        2026, como componentes web, porque el applet se había vuelto imposible de ejecutar y porque la
        mitad que faltaba siempre había sido el cielo: una reconstrucción sin el cielo real de aquella
        noche no puede contrastarse con nada.</p>
    </div>

    <div class="faq-item">
      <h3>¿Por qué un relato se dibuja plano, y cuándo entra el 3D?</h3>
      <p>El relato en sí se dibuja tal como llegó al ojo del observador: una forma en su campo de visión,
        de este tamaño, moviéndose de esta manera. Porque un objeto 3D colocado en la escena ya es una conclusión. Afirma un tamaño, una
        distancia y una solidez que ningún observador podía percibir — y, peor aún, descarta en silencio
        toda explicación en la que no hubiera ningún objeto allí:
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un halo</a>,
        <a href="https://rr0.org/place/systeme/solaire/planete/venus/">un planeta</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/Satellites.html">un satélite</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">el faro de aterrizaje de un avión</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/nuage/">una nube lenticular</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/lens/">un reflejo en un parabrisas</a>. Esos enlaces llevan al propio
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/">catálogo de confusiones</a> de rr0.org, que es la razón por la que esta herramienta está construida
        como está.</p>
      <p>Una forma plana en el propio campo de visión del observador afirma exactamente lo que este declaró:
        esto es lo que llegó a mi ojo, de este tamaño, moviéndose de esta manera. Todo lo demás queda
        abierto — que es la única forma de que una reconstrucción sirva para <em>poner a prueba</em> una
        confusión en lugar de descartarla por construcción.</p>
      <p>El 3D entra como <em>interpretación</em>, separada del relato: lo que el observador
        cree haber visto (en Silly-le-Long, T1 describe un único triángulo plano y gris, visto de frente
        y luego por detrás), o la explicación de un analista expuesta en un expediente (allí, la avioneta
        en final del GEIPAN). Cada una es una opción del selector <strong>Interpretation</strong> del
        reproductor, mostrada de una en una, con un modelo, un tamaño y una trayectoria en metros. El
        botón <strong>Compare with the account</strong> superpone entonces los contornos del propio relato
        y cifra, instante a instante, cuánto se separan en dirección, anchura y altura. El
        relato nunca cambia para ajustarse a una interpretación: es la interpretación la que debe responderle.</p>
      <p>También hace que la herramienta sea honesta con el tamaño. Una grabación guarda un ángulo, nunca metros —
        pero eso NO significa renunciar a la distancia. Donde el observador vio el fenómeno cruzar
        algo cuya posición se conoce, ese cruce se declara en la grabación (pasó
        <em>detrás</em> de aquel hangar, <em>delante</em> de aquel árbol) y la escena lanza un rayo por la línea
        de visión exacta para medirlo. Cada cruce acota su anchura real por un lado; un
        ángulo más una distancia dan un tamaño, y un tamaño no cambia mientras se mueve — así que cada
        otro instante de la grabación se lee también como una distancia. El editor muestra el intervalo
        bajo el tamaño aparente, señala una contradicción cuando los cruces declarados no pueden ser todos
        ciertos, y dice «desconocida» donde nada cruza la línea de visión, que es la respuesta honesta
        para una luz en un cielo vacío.</p>
    </div>

    <div class="faq-item">
      <h3>¿Es una reconstrucción una prueba?</h3>
      <p>No. Es una manera de exponer un relato con la precisión suficiente para poder ponerlo junto a los
        registros — y son los registros los que hacen el trabajo: la fase de la Luna aquella noche, si el cielo
        estaba cubierto, si había un cometa sobre el horizonte, si la órbita baja estaba siquiera iluminada.</p>
      <p><strong>Lo que una reconstrucción intenta es ponerse de acuerdo con el observador.</strong> No
        ilustrar su relato, ni corregirlo: converger hacia él, corrección tras corrección, hasta que diga
        que eso es lo que vio. Cada paso de esa convergencia añade algo que puede comprobarse, así que
        cuanto más se acerca, más hay con lo que explicar el avistamiento
        — o con lo que no lograrlo.</p>
      <p>Y ahí es donde demuestra su valor. Supongamos que la reconstrucción puede situar un fenómeno
        conocido — <a href="https://rr0.org/place/systeme/solaire/planete/venus/">un planeta</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un halo</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">un avión</a> —
        en el lugar exacto donde el observador vio algo, con el tamaño correcto, a la hora correcta. Muéstraselo
        y hazle la única pregunta que importa: <em>¿se parece a lo que viste?</em>
        Si la respuesta es sí, investigador y observador han convergido en los hechos en lugar de
        discutir la conclusión, y la explicación se apoya en algo más firme que la opinión que
        cada uno tiene del otro.</p>
      <p>Si la respuesta es no, eso también es un resultado, y mejor que una nota escrita diciendo que el
        observador no estaba de acuerdo — porque lo que rechaza está en pantalla, en el lugar correcto
        y con el tamaño correcto, y la siguiente persona puede mirarlo.</p>
    </div>

    <h2>Frente a otras herramientas</h2>

    <div class="faq-item">
      <h3>¿En qué se diferencia de Sitrec?</h3>
      <p><a href="https://github.com/MickWest/sitrec">Sitrec</a> («<i lang="en">situation recreation</i>», Mick West,
        desde 2022) es una herramienta excelente y hace otro trabajo. Parte de
        <em>datos de instrumentos</em> — un vídeo, una traza ADS-B, los metadatos de un sensor, elementos
        orbitales — y reconstruye la geometría que pudo producir esas imágenes. Es la
        herramienta adecuada cuando hay imágenes.</p>
      <p>UFO@home empieza donde no las hay: una persona, un relato y una fecha. Reconstruye lo que
        un <em>observador</em> describió, y está construida en torno a lo que un relato puede y no puede decir —
        ángulos en lugar de metros, una apariencia declarada en lugar de un objeto colocado, y un registro
        explícito de quién aportó cada hecho no testimonial.</p>
      <p>Sus licencias también difieren. Sitrec tenía licencia MIT; se archivó en marzo de 2026 en
        favor de <a href="https://github.com/MickWest/Sitrec2">Sitrec2</a>, cuya licencia solo permite
        el uso personal o académico no comercial, y ni la redistribución ni la modificación.
        UFO@home es MIT.</p>
    </div>

    <div class="faq-item">
      <h3>¿No es esto lo que hacía SIMOVNI?</h3>
      <p>Es la misma idea, cincuenta años antes y en hardware. <strong>SIMOVNI</strong> fue un
        simulador óptico construido en 1976 en el GEPAN francés (el grupo de estudio de ovnis del propio CNES) por
        Jean-Jacques Velasco: el observador miraba por un visor el paisaje real con un
        ovni virtual superpuesto, cuya forma (en diapositivas), color, brillo y tamaño podían
        ajustarse hasta que coincidiera. Es, hasta donde sabemos, el primer intento serio de relato visual
        en lugar de escrito. También era un único banco físico en Toulouse, solo se utilizó
        en una o dos ocasiones, y Dominique Caudron — que había construido sus propios simuladores
        antes — consideraba poco fiables sus resultados.</p>
      <p><strong>SimOvni 2</strong>, presentado por Laurent Chabin en el CAIPAN 2 en 2022, recupera la
        idea con un visor de realidad virtual y un verdadero trabajo de calibración detrás.</p>
      <p>Lo que añade UFO@home no es un banco óptico mejor: es que una reconstrucción se convierte en un
        pequeño archivo que cualquiera puede abrir, reproducir, incrustar, comprobar y rebatir — en lugar de una sesión
        que tuvo lugar una vez en una sala, ante un solo investigador, y dejó un resumen escrito.</p>
    </div>

    <div class="faq-item">
      <h3>¿Por qué no usar simplemente Stellarium?</h3>
      <p>Stellarium es un planetario, y muy bueno — hemos leído su código fuente para aprender cómo
        hace las cosas. Pero responde a «¿qué había en el cielo?», no a «¿qué vio esta persona, y podría
        el cielo explicarlo?». No tiene formato de relato, ni fenómeno observado, ni meteorología, ni
        decorado alrededor del observador, ni instrumento de exposición larga, ni nada que incrustar en una página.</p>
      <p>Donde ambos se solapan, UFO@home toma a veces el camino más difícil a propósito: la Vía Láctea
        es una textura en Stellarium y una integral a lo largo de la línea de visión aquí, por eso su grieta oscura
        sale de un modelo de polvo y no de una imagen. Donde Stellarium representa algo que nosotros
        no, la regla de trabajo de este proyecto es ir a averiguar cómo lo hacen.</p>
    </div>

    <div class="faq-item">
      <h3>¿Por qué no pedir a una IA que construya la simulación desde cero?</h3>
      <p>Porque lo que construiría sería una ilustración. Si se le pide «una escena de lo que vio este
        testigo», un modelo escribe una escena 3D o pinta un vídeo que parece correcto: un cielo, un campo, una
        luz. Si la Luna estaba realmente sobre el horizonte, dónde estaba realmente el Sol, cómo era la nubosidad
        aquella mañana, de qué tamaño se veía realmente la cosa desde donde estaba el observador: cada una de esas cosas
        puede haberla acertado, y nada en el resultado dice cuáles. Además es un ejemplar único:
        mil líneas de código que nadie ha comprobado, escritas de otra manera para el siguiente caso, que
        no pueden ponerse junto al siguiente caso.</p>
      <p>Una grabación de UFO@home reparte el trabajo al revés. Lo que escribe la IA es solo el
        relato: una fecha, un lugar, direcciones y tamaños aparentes a lo largo del tiempo, cada valor marcado como
        declarado, calculado o supuesto. El cielo, los registros meteorológicos, el suelo, la óptica del
        ojo o de la cámara se calculan a partir de ello con el mismo motor para todos los casos, probado y
        público. Los límites del formato son parte de la cuestión: no tiene campo para un tamaño real ni una
        distancia, así que un asistente no puede colar una conclusión entre los hechos, y lo que sí escribe
        es un archivo corto que cualquiera puede leer, reproducir, corregir y mostrar al observador.</p>
      <p>Por eso tampoco compiten. Un asistente de IA es una buena manera de
        <a href="/docs/create/">escribir una grabación</a> a partir de un expediente: en un caso del GEIPAN, uno al que
        solo se le dio el expediente público y estas páginas produjo una grabación cuyo fenómeno coincidía con el
        hecho a mano con una precisión de una décima de grado. Lo que no puede hacer por sí solo es hacer el resultado
        comprobable, y esa es la parte que es este proyecto.</p>
    </div>

    <h2>Usarla, y cambiarla</h2>

    <div class="faq-item">
      <h3>¿Cómo pido una funcionalidad, o informo de algo que está mal?</h3>
      <p>Abre una incidencia: <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        Una cuenta de GitHub es gratuita y se crea en un minuto.</p>
      <p>Lo que hace que una petición sea fácil de atender:</p>
      <ul class="plain">
        <li><strong>Un caso real, si lo hay.</strong> «Los observadores dicen a menudo que estaba detrás de una
          colina» es una funcionalidad; «aquí hay un avistamiento donde eso importa, fechado, situado y con fuentes» es
          una funcionalidad que se construye bien.</li>
        <li><strong>Lo que dicen los registros.</strong> Si lo que quieres ver reconstruido está medido
          en alguna parte — un conjunto de datos, un catálogo, una medición publicada — di dónde. La
          regla de este proyecto es que nada se inventa: algo reproducible necesita datos o física detrás,
          y saber cuál de los dos es resuelve la mayor parte del diseño.</li>
        <li><strong>Lo que concluirías a partir de ello.</strong> Una funcionalidad que no puede cambiar la
          lectura de ningún caso es decoración.</li>
      </ul>
      <p>Las <i lang="en">pull requests</i> son bienvenidas en las mismas condiciones que en cualquier proyecto MIT. Si prefieres no usar
        GitHub, el contacto del mantenedor está en <a href="https://rr0.org/Contact.html">rr0.org</a>.</p>
    </div>

    <div class="faq-item">
      <h3>¿Puedo poner una reconstrucción en un mensaje de un foro?</h3>
      <p>Si el foro admite HTML sin procesar y un script de módulo, sí — las dos líneas están en
        <a href="/edit/">la página del editor</a>, y cada reconstrucción publicada las proporciona
        ella misma. La mayoría de los foros no lo admiten, por buenas razones. Dos cosas que suelen funcionar
        en su lugar: un <code>&lt;iframe&gt;</code> que apunte a una página tuya que contenga el
        componente, o simplemente un enlace a <code>ufoathome.org/edit/?sighting=</code> seguido de la
        URL de tu grabación, que la abre aquí para cualquiera.</p>
    </div>

    <div class="faq-item">
      <h3>¿Y si no sé la fecha exacta, o la hora exacta?</h3>
      <p>Dilo, y la herramienta también lo dirá. Las fechas se guardan en EDTF, así que «1954», «junio de 2025»,
        «hacia las 05:00» e «incierta» son cosas que <a href="/docs/format/">el formato</a> puede declarar. Lo que se pierde es solo
        lo que depende de verdad de la parte que falta: sin fecha completa ni lugar no hay cielo que
        calcular, y la interfaz lo dice en lugar de dibujar uno verosímil.</p>
    </div>

    <div class="faq-item">
      <h3>¿Qué idiomas habla?</h3>
      <p>Los componentes están en inglés y en francés, y este sitio en inglés, francés, español e
        italiano, elegidos según las preferencias de tu navegador, con el inglés como respaldo. Añadir un
        idioma a los componentes consiste en añadir un módulo de mensajes
        tipado por componente — sin cambios en el marcado ni en la configuración de compilación. Es una de las
        contribuciones más fáciles de hacer.</p>
      <p>No hay selector de idioma, y esa es la idea: una dirección no lleva idioma, así que un
        enlace que envías lo lee quien lo abre en el <em>suyo</em>. Envía a alguien en Lyon una sección
        de esta página y llegará a esa misma sección, en francés.</p>
    </div>

    <div class="faq-item">
      <h3>¿Cuánto cuesta?</h3>
      <p>Nada: ni precio, ni cuenta, ni cuota, ni nivel de pago. Los servicios externos que usa
        durante la redacción son servicios públicos cuyas políticas de uso respeta — por eso la búsqueda de lugares
        solo se lanza cuando la pides.</p>
    </div>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h1>Domande frequenti.</h1>
    <p class="lede">Che cos'è lo strumento, che cosa permette e in che cosa si distingue dagli altri.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Chi l'ha fatto, e che cosa permette</h2>

    <div class="faq-item">
      <h3>Chi ha scritto UFO@home?</h3>
      <p>È sviluppato da <a href="https://github.com/RR0">RR0</a>, che tra l'altro ha
        realizzato <a href="https://rr0.org">rr0.org</a>, un'enciclopedia francese dei fenomeni
        inspiegati. Quel sito usa UFO@home per illustrare i propri dossier — e RR0 ha avuto cura
        di mantenere lo strumento utilizzabile da chiunque.</p>
    </div>

    <div class="faq-item">
      <h3>Che cosa permette la licenza?</h3>
      <p>UFO@home è sotto <a href="https://github.com/RR0/UfoAtHome/blob/master/LICENSE">licenza
        MIT</a>. Questa ti permette di:</p>
      <ul class="plain">
        <li>usarlo su qualsiasi sito, anche commerciale;</li>
        <li>modificarlo, e tenere private le tue modifiche;</li>
        <li>ridistribuirlo, integrarlo nel tuo prodotto e far pagare quel prodotto;</li>
        <li>farne un fork, e portarlo avanti nella tua direzione.</li>
      </ul>
      <p>L'unico obbligo è conservare l'avviso di copyright e il testo della licenza con le copie che
        distribuisci. Non c'è alcun <i lang="en">contributor licence agreement</i> né alcuna registrazione.</p>
      <p>Il codice sorgente è su <a href="https://github.com/RR0/UfoAtHome">GitHub</a>, compresi gli
        script che generano i suoi cataloghi di stelle, comete, novae e satelliti a partire da fonti pubbliche — così i
        dati sono riproducibili oltre che leggibili.</p>
    </div>

    <div class="faq-item">
      <h3>Che cosa invia in rete?</h3>
      <p>Le registrazioni restano nel tuo browser: non c'è alcun account né alcuna archiviazione lato server.
        <strong>Export</strong> scrive un file sul tuo disco, e quel file è l'intera registrazione.</p>
      <p>Tutto ciò che viene scaricato — da dove, quando e con quale licenza — è elencato fonte per
        fonte in <a href="/docs/sources/">Fonti e scelte</a>, l'unico elenco che esista, perché
        questa risposta non debba tenerne una seconda copia. In breve:</p>
      <ul>
        <li><strong>Mentre compili</strong>, l'editor cerca le cose per te: le coordinate di un
          luogo quando premi <strong>Locate</strong>, il dato meteorologico non appena sono noti una data completa e
          un luogo, il rilievo e le immagini aeree intorno all'osservatore. Ogni consultazione è un selettore
          nell'interfaccia, dove il suo dato è riportato, con l'attribuzione richiesta dalla sua licenza.
          Redigere una registrazione a partire dalla sua descrizione invia quel testo al modello che hai scelto, con la tua
          chiave, e solo quando lo chiedi.</li>
        <li><strong>Una pagina che si limita a riprodurre</strong> una registrazione finita (<code>&lt;rr0-scene&gt;</code>,
          <code>&lt;rr0-sighting&gt;</code>) richiede le tessere di rilievo e di immagini, ciò che questo sito serve
          da sé (elementi orbitali dei satelliti, modelli 3D) e ciò a cui punta la registrazione stessa (una foto del
          luogo, un suono). Una registrazione pubblicata porta con sé il proprio meteo e non viene mai più consultata,
          ed è anche per questo che si legge identica anni dopo.</li>
      </ul>
    </div>

    <div class="faq-item">
      <h3>Posso ospitarlo interamente da solo, senza alcun servizio esterno?</h3>
      <p>Sì, e niente di tutto ciò dipende da RR0. I componenti sono pubblicati su npm come
        <code>@rr0/ufoathome</code> e serviti da questo dominio; installali o copia i <i lang="en">bundle</i>
        <code>.mjs</code> compilati sul tuo server e le ricostruzioni si riprodurranno, senza alcuna
        dipendenza di esecuzione da rr0.org. Le registrazioni sono file tuoi, sul tuo hosting, e una
        ricostruzione afferma ciò che la sua registrazione dichiara e nient'altro — nessuna conclusione, nessun
        marchio, nessun numero di dossier se non quello che ci metti tu.</p>
      <p>Copia i <i lang="en">bundle</i> <code>.mjs</code> sul tuo server e le ricostruzioni si riprodurranno.
        Fai a meno dei fornitori di rilievo e di immagini (o puntali al tuo server di tessere) e la scena
        ripiega su un orizzonte spoglio. Le consultazioni esistono per la <em>compilazione</em>; la riproduzione di una
        registrazione finita non ne ha bisogno.</p>
    </div>

    <h2>Perché esiste</h2>

    <div class="faq-item">
      <h3>Perché costruire tutto questo?</h3>
      <p>L'idea è nata da conversazioni con il sociologo
        <a href="https://rr0.org/people/l/LagrangePierre/">Pierre Lagrange</a>, che citava al suo autore
        il lavoro di Roger Shepard.</p>
      <p>Perché un resoconto messo per iscritto perde quasi tutto. Nel 1968, al simposio dell'AAAS,
        lo psicologo <a href="https://rr0.org/people/s/ShepardRogerN/">Roger Shepard</a> sostenne, nella
        <a href="https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index.html">relazione che vi presentò</a>, che una ricostruzione visiva di un resoconto
        è più fedele di una scritta o orale — gli osservatori sono molto più bravi a riconoscere e
        correggere un'immagine che a generare una descrizione. UFO@home è quell'idea, fatta
        software: disegnalo, muovilo, e lascia che l'osservatore lo corregga finché non corrisponde.</p>
      <p>Il progetto è nato nel 2003 come applet Java. È stato riscritto da zero in TypeScript nel
        2026, come componenti web, perché l'applet era diventata impossibile da eseguire e perché la metà
        mancante era sempre stata il cielo: una ricostruzione senza il cielo reale di quella notte non può
        essere confrontata con nulla.</p>
    </div>

    <div class="faq-item">
      <h3>Perché un resoconto è disegnato piatto, e quando entra in gioco il 3D?</h3>
      <p>Il resoconto stesso è disegnato così come è giunto all'occhio dell'osservatore: una forma nel suo campo visivo,
        di questa grandezza, che si muove in questo modo. Perché un oggetto 3D collocato nella scena è già una conclusione. Afferma una grandezza, una
        distanza e una solidità che nessun osservatore poteva percepire — e, peggio, esclude in silenzio
        ogni spiegazione in cui lì non ci fosse alcun oggetto:
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un alone</a>,
        <a href="https://rr0.org/place/systeme/solaire/planete/venus/">un pianeta</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/Satellites.html">un satellite</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">il faro di atterraggio di un aereo</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/nuage/">una nube lenticolare</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/lens/">un riflesso su un parabrezza</a>. Quei link portano al
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/">catalogo degli equivoci</a> di rr0.org, che è il motivo per cui questo strumento è costruito
        così.</p>
      <p>Una forma piatta nel campo visivo dell'osservatore stesso afferma esattamente ciò che ha dichiarato:
        questo è ciò che è giunto al mio occhio, di questa grandezza, che si muove in questo modo. Tutto il resto rimane
        aperto — ed è l'unico modo in cui una ricostruzione possa servire a <em>mettere alla prova</em> un equivoco anziché
        escluderlo per costruzione.</p>
      <p>Il 3D entra in gioco come <em>interpretazione</em>, tenuta separata dal resoconto: ciò che l'osservatore
        crede di aver visto (a Silly-le-Long, T1 descrive un unico triangolo piatto e grigio, visto di fronte
        e poi da dietro), o la spiegazione di un analista esposta in un dossier (lì, l'aereo leggero
        in finale del GEIPAN). Ciascuna è una scelta del selettore <strong>Interpretation</strong> del
        lettore, mostrata una alla volta, con un modello, una grandezza e una traiettoria in metri. Il
        pulsante <strong>Compare with the account</strong> sovrappone allora i contorni del resoconto stesso
        e indica, istante per istante, quanto distano in direzione, larghezza e altezza. Il
        resoconto non cambia mai per adattarsi a un'interpretazione: è l'interpretazione che deve rispondergli.</p>
      <p>Rende anche lo strumento onesto sulla grandezza. Una registrazione memorizza un angolo, mai metri —
        ma questo NON significa rinunciare alla distanza. Dove l'osservatore ha visto il fenomeno attraversare
        qualcosa la cui posizione è nota, quell'attraversamento è dichiarato nella registrazione (è passato
        <em>dietro</em> quell'hangar, <em>davanti</em> a quell'albero) e la scena lancia un raggio lungo l'esatta
        linea di vista per misurarlo. Ogni attraversamento limita da un lato la sua larghezza reale; un
        angolo più una distanza danno una grandezza, e una grandezza non cambia mentre si muove — così ogni
        altro istante della registrazione si rilegge anch'esso come una distanza. L'editor mostra l'intervallo
        sotto la grandezza apparente, segnala una contraddizione quando gli attraversamenti dichiarati non possono essere
        tutti veri, e dice «sconosciuta» dove nulla attraversa la linea di vista, che è la risposta onesta
        per una luce in un cielo vuoto.</p>
    </div>

    <div class="faq-item">
      <h3>Una ricostruzione è una prova?</h3>
      <p>No. È un modo di esporre un resoconto con precisione sufficiente da poterlo mettere accanto ai
        dati registrati — e sono i dati a fare il lavoro: la fase della Luna quella notte, se il cielo
        era coperto, se una cometa era sopra l'orizzonte, se l'orbita bassa era anche solo illuminata.</p>
      <p><strong>Ciò che una ricostruzione cerca di fare è trovarsi d'accordo con l'osservatore.</strong> Non
        illustrare il suo resoconto, né correggerlo: convergere verso di esso, una correzione alla volta,
        finché non dice che è proprio ciò che ha visto. Ogni passo di questa convergenza aggiunge qualcosa
        di verificabile, così più ci si avvicina, più c'è con cui spiegare l'avvistamento
        — o con cui non riuscirci.</p>
      <p>Ed è lì che dimostra il suo valore. Supponiamo che la ricostruzione possa collocare un fenomeno
        noto — <a href="https://rr0.org/place/systeme/solaire/planete/venus/">un pianeta</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/optique/">un alone</a>,
        <a href="https://rr0.org/science/crypto/ufo/enquete/meprise/aeronef/avion/">un aereo</a> —
        nel punto esatto in cui l'osservatore ha visto qualcosa, della giusta grandezza, all'ora giusta. Mostraglielo
        e poni l'unica domanda che conta: <em>somiglia a ciò che hai visto?</em>
        Se la risposta è sì, investigatore e osservatore sono convenuti sui fatti anziché
        discutere della conclusione, e la spiegazione poggia su qualcosa di più solido dell'opinione
        che l'uno ha dell'altro.</p>
      <p>Se la risposta è no, anche questo è un risultato, e migliore di una nota scritta che dice che
        l'osservatore non era d'accordo — perché ciò che rifiuta è sullo schermo, nel punto giusto
        e della giusta grandezza, e chi viene dopo può guardarlo.</p>
    </div>

    <h2>A confronto con altri strumenti</h2>

    <div class="faq-item">
      <h3>In che cosa è diverso da Sitrec?</h3>
      <p><a href="https://github.com/MickWest/sitrec">Sitrec</a> («<i lang="en">situation recreation</i>», Mick West,
        dal 2022) è uno strumento eccellente e fa un lavoro diverso. Parte da
        <em>dati strumentali</em> — un video, una traccia ADS-B, i metadati di un sensore, elementi
        orbitali — e ricostruisce la geometria che potrebbe aver prodotto quelle riprese. È lo
        strumento giusto quando ci sono delle riprese.</p>
      <p>UFO@home comincia dove non ce ne sono: una persona, un resoconto e una data. Ricostruisce ciò che
        un <em>osservatore</em> ha descritto, ed è costruito attorno a ciò che un resoconto può e non può dire —
        angoli anziché metri, un aspetto dichiarato anziché un oggetto collocato, e una traccia
        esplicita di chi ha fornito ogni fatto non testimoniale.</p>
      <p>Anche le loro licenze differiscono. Sitrec era sotto licenza MIT; è stato archiviato nel marzo 2026 a
        favore di <a href="https://github.com/MickWest/Sitrec2">Sitrec2</a>, la cui licenza consente
        solo un uso personale o accademico non commerciale, e né la ridistribuzione né la modifica.
        UFO@home è MIT.</p>
    </div>

    <div class="faq-item">
      <h3>Non è quello che faceva SIMOVNI?</h3>
      <p>È la stessa idea, cinquant'anni prima e in hardware. <strong>SIMOVNI</strong> era un
        simulatore ottico costruito nel 1976 all'interno del GEPAN francese (il gruppo di studio sugli UFO del CNES) da
        Jean-Jacques Velasco: l'osservatore guardava attraverso un mirino il paesaggio reale con un
        UFO virtuale sovrapposto, di cui si potevano regolare la forma (su diapositive), il colore, la luminosità e la grandezza
        finché non corrispondeva. È, per quanto ne sappiamo, il primo tentativo serio di resoconto visivo
        anziché scritto. Era anche un unico banco fisico a Tolosa, fu usato
        solo in una o due occasioni, e Dominique Caudron — che in precedenza aveva costruito i propri simulatori
        — ne riteneva inaffidabili i risultati.</p>
      <p><strong>SimOvni 2</strong>, presentato da Laurent Chabin al CAIPAN 2 nel 2022, riprende
        l'idea con un visore di realtà virtuale e un vero lavoro di calibrazione alle spalle.</p>
      <p>Ciò che UFO@home aggiunge non è un banco ottico migliore: è che una ricostruzione diventa un
        piccolo file che chiunque può aprire, riprodurre, incorporare, verificare e contestare — invece di una sessione
        avvenuta una volta in una stanza, davanti a un solo investigatore, che ha lasciato un riassunto scritto.</p>
    </div>

    <div class="faq-item">
      <h3>Perché non usare semplicemente Stellarium?</h3>
      <p>Stellarium è un planetario, e molto buono — ne abbiamo letto il codice sorgente per imparare come
        fa le cose. Ma risponde a «che cosa c'era nel cielo?», non a «che cosa ha visto questa persona, e il cielo
        potrebbe spiegarlo?». Non ha un formato di resoconto, né un fenomeno osservato, né meteo, né
        scenario intorno all'osservatore, né strumento a lunga esposizione, né nulla da incorporare in una pagina.</p>
      <p>Dove i due si sovrappongono, UFO@home a volte prende di proposito la strada più difficile: la Via Lattea
        è una texture in Stellarium e un integrale lungo la linea di vista qui, ed è per questo che la sua fenditura scura
        esce da un modello di polvere anziché da un'immagine. Dove Stellarium rappresenta qualcosa che noi
        non rappresentiamo, la regola di lavoro di questo progetto è andare a scoprire come fanno.</p>
    </div>

    <div class="faq-item">
      <h3>Perché non chiedere a un'IA di costruire la simulazione da zero?</h3>
      <p>Perché ciò che costruirebbe sarebbe un'illustrazione. Se gli si chiede «una scena di ciò che ha visto questo
        testimone», un modello scrive una scena 3D o dipinge un video che sembra giusto: un cielo, un campo, una
        luce. Se la Luna era davvero sopra l'orizzonte, dove si trovava davvero il Sole, com'era la copertura nuvolosa
        quella mattina, quanto grande appariva davvero la cosa dal punto in cui si trovava l'osservatore: ciascuna di queste cose
        potrebbe averla azzeccata, e niente nel risultato dice quali. È anche un pezzo unico:
        mille righe di codice che nessuno ha verificato, scritte in modo diverso per il caso successivo, che
        non possono essere messe accanto al caso successivo.</p>
      <p>Una registrazione UFO@home divide il lavoro nell'altro senso. Ciò che l'IA scrive è solo il
        resoconto: una data, un luogo, direzioni e grandezze apparenti nel tempo, ogni valore contrassegnato come
        dichiarato, calcolato o supposto. Il cielo, i dati meteorologici, il suolo, l'ottica dell'occhio o
        della fotocamera ne vengono calcolati dallo stesso motore per ogni caso, testato e
        pubblico. I limiti del formato fanno parte del senso: non ha alcun campo per una grandezza reale o una
        distanza, così un assistente non può far passare una conclusione tra i fatti, e ciò che scrive
        è un file breve che chiunque può leggere, riprodurre, correggere e mostrare all'osservatore.</p>
      <p>È anche per questo che i due non sono in concorrenza. Un assistente IA è un buon modo per
        <a href="/docs/create/">scrivere una registrazione</a> a partire da un dossier: su un caso del GEIPAN, uno a cui erano stati dati
        solo il dossier pubblico e queste pagine ha prodotto una registrazione il cui fenomeno coincideva con quello
        fatto a mano entro un decimo di grado. Ciò che non può fare da solo è rendere il risultato
        verificabile, ed è quella la parte che questo progetto è.</p>
    </div>

    <h2>Usarlo, e cambiarlo</h2>

    <div class="faq-item">
      <h3>Come chiedo una funzionalità, o segnalo qualcosa che non va?</h3>
      <p>Apri una issue: <a href="https://github.com/RR0/UfoAtHome/issues/new">github.com/RR0/UfoAtHome/issues</a>.
        Un account GitHub è gratuito e richiede un minuto.</p>
      <p>Che cosa rende una richiesta facile da soddisfare:</p>
      <ul class="plain">
        <li><strong>Un caso reale, se c'è.</strong> «Gli osservatori dicono spesso che era dietro una
          collina» è una funzionalità; «ecco un avvistamento in cui questo conta, datato, localizzato e documentato» è
          una funzionalità che viene costruita bene.</li>
        <li><strong>Che cosa dicono i dati.</strong> Se ciò che vuoi ricostruito è misurato
          da qualche parte — un insieme di dati, un catalogo, una misura pubblicata — di' dove. La regola
          di questo progetto è che nulla viene inventato: qualcosa di riproducibile ha bisogno di dati o di fisica alle spalle,
          e sapere quale dei due risolve la maggior parte della progettazione.</li>
        <li><strong>Che cosa ne concluderesti.</strong> Una funzionalità che non può cambiare la
          lettura di nessun caso è decorazione.</li>
      </ul>
      <p>Le <i lang="en">pull request</i> sono benvenute alle stesse condizioni di qualsiasi progetto MIT. Se preferisci non usare
        GitHub, il contatto del manutentore è su <a href="https://rr0.org/Contact.html">rr0.org</a>.</p>
    </div>

    <div class="faq-item">
      <h3>Posso mettere una ricostruzione in un messaggio su un forum?</h3>
      <p>Se il forum accetta HTML grezzo e uno script di modulo, sì — le due righe sono nella
        <a href="/edit/">pagina dell'editor</a>, e ogni ricostruzione pubblicata le fornisce
        da sé. La maggior parte dei forum non lo consente, per buone ragioni. Due cose che di solito funzionano
        al loro posto: un <code>&lt;iframe&gt;</code> che punta a una tua pagina contenente il
        componente, o semplicemente un link a <code>ufoathome.org/edit/?sighting=</code> seguito
        dall'URL della tua registrazione, che la apre qui per chiunque.</p>
    </div>

    <div class="faq-item">
      <h3>E se non conosco la data esatta, o l'ora esatta?</h3>
      <p>Dillo, e lo strumento lo dirà a sua volta. Le date sono memorizzate in EDTF, quindi «1954», «giugno 2025»,
        «verso le 05:00» e «incerta» sono tutte cose che <a href="/docs/format/">il formato</a> sa dichiarare. Ciò che si perde è solo
        ciò che dipende davvero dalla parte mancante: senza data completa e luogo non c'è alcun cielo da
        calcolare, e l'interfaccia lo dice invece di disegnarne uno plausibile.</p>
    </div>

    <div class="faq-item">
      <h3>Quali lingue parla?</h3>
      <p>I componenti sono in inglese e in francese, e questo sito in inglese, francese, spagnolo e
        italiano, scelti in base alle preferenze del tuo browser, con l'inglese come ripiego. Aggiungere
        una lingua ai componenti significa aggiungere un modulo di messaggi
        tipizzato per componente — nessuna modifica al markup, nessuna configurazione di build. È uno dei
        contributi più facili da dare.</p>
      <p>Non c'è alcun selettore di lingua, ed è proprio questo il punto: un indirizzo non porta con sé alcuna lingua, così un
        link che invii viene letto da chi lo apre nella <em>sua</em>. Invia una sezione di questa pagina a qualcuno
        a Lione e arriverà a quella stessa sezione, in francese.</p>
    </div>

    <div class="faq-item">
      <h3>Quanto costa?</h3>
      <p>Niente: nessun prezzo, nessun account, nessuna quota e nessun livello a pagamento. I servizi esterni che usa
        durante la compilazione sono servizi pubblici di cui rispetta le condizioni d'uso — ed è per questo che la ricerca
        dei luoghi parte solo quando la chiedi.</p>
    </div>
  </div>
</section>
`
  }
}
