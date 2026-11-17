# Modèle d'erreur du témoin et variantes sous une hypothèse

Note technique ([English version](witness-error-model.md)). Elle décrit comment un enregistrement
porte ce que l'on sait des erreurs de chaque valeur donnée par un témoin, et à quoi sert ce savoir :
non pas à rendre l'enregistrement flou, mais à demander si une explication candidate peut en être
atteinte, et à quel point une lecture qui en est faite est robuste.

Écrite d'abord le 2026-10-22 comme note de conception, avant tout code ; l'essentiel en a été
réalisé depuis. [Où en est-on](#où-en-est-on) dit ce qui est fait et où, et
[Pas encore fait](#pas-encore-fait) ce qui ne l'est pas. Les sections intermédiaires gardent le
raisonnement, que le code suit toujours.

Les lois d'erreur elles-mêmes sont dans [testimony-evaluation-leads.md](testimony-evaluation-leads.md)
(résumé pour les utilisateurs : [ufoathome.org/roadmap/witness](https://ufoathome.org/roadmap/witness/)).
Cette note porte sur le format, l'éditeur, le lecteur et les recherches qui les mettent en œuvre.

## Où en est-on

En novembre 2026 (UFO@home 0.178) :

- **Fondements.** Tout champ peut s'écrire `{ value, basis, how, rationale }`
  (`src/engine/persistence/Provenance.ts`). `basis` vaut `established`, `measured`, `stated`
  (par défaut), `derived`, `assumed` ou `fitted` (voir le tableau plus bas) ; `how` dit comment la
  valeur a été obtenue, dans une liste fermée par type de valeur. L'enveloppe est retirée à la
  lecture et remise à l'écriture : aucun consommateur ne la voit.
- **Conditions d'un compte rendu** (`Account.conditions`, `src/engine/model/Account.ts`) : délai,
  version, mot employé, exposition, indépendance, adaptation à l'obscurité, vue corrigée,
  éblouissement et la jauge lunaire.
- **Le modèle d'erreur** (`src/engine/witness/WitnessError.ts`) : la loi de l'erreur d'une valeur
  selon son type, sa valeur, son fondement, son `how` et les conditions du témoin, chaque loi avec
  son statut et ses sources, et les paramètres du témoin qui lient entre elles les erreurs d'un même
  témoin. Deux lectures de la littérature : `consolidated` et `keul` (tailles montrées sur place),
  choisies dans l'éditeur.
- **L'éditeur** (`src/component/WitnessErrorView.ts`) : une marque de fondement sur l'heure de
  début, la durée, le cap et la largeur apparente, qui ouvre une fenêtre pour dire comment la valeur
  a été obtenue ; une valeur retapée repasse à `stated` et le dit. Sous chacune, sa loi, en lecture
  seule, dans son unité, avec son statut. La section Témoin contient les conditions, la jauge lunaire
  et les paramètres d'erreur, et avertit quand les lois sont étendues au plein jour.
- **Contradictions selon les lois** (`BodyConfrontation.lawsOf`,
  `src/engine/interpretation/BodyConfrontation.ts`) : dans la scène de l'éditeur, une interprétation
  est contredite là où elle sort des lois, pas simplement là où elle s'écarte du compte rendu.
- **La recherche de candidats** (`src/engine/witness/CandidateSearch.ts`,
  `src/component/CandidatesView.ts`) : pour chaque candidat (la Lune et les planètes assez brillantes
  dans ce ciel, les rentrées et bolides répertoriés, et les interprétations et lectures du compte
  rendu lui-même), les paramètres du témoin qui rapprochent le plus le compte rendu de ce candidat,
  les valeurs qu'ils déplacent, le coût et le verdict. Les variantes structurelles sont déclarées par
  les candidats. Une variante peut être vue par-dessus la scène, et gardée dans les `variants` de
  l'enregistrement comme une interprétation portant ses paramètres, son coût, son verdict et son
  modèle d'erreur.
- **La sensibilité d'une lecture** (`src/engine/interpretation/ReadingSensitivity.ts`,
  `<rr0-reading-sensitivity>`) : voir [Sensibilité d'une lecture](#sensibilité-dune-lecture).

Avant ce travail, `stated` confondait ce qu'un témoin avait estimé et ce qui avait été lu sur un
instrument, les marges n'existaient que pour l'heure (comme qualificatifs EDTF), et les tolérances
étaient codées en dur là où elles servaient (`BodyConfrontation.DIRECTION_TOLERANCE_DEG = 1`,
`SIZE_TOLERANCE = 1.5`), les mêmes pour chaque témoin, chaque valeur et chaque condition. Les
tolérances fixes restent comme le cas « sans modèle d'erreur » (voir plus bas).

## Principe : les marges sont calculées, jamais saisies

Une marge saisie par un auteur est une supposition sur une supposition. Les études disent mieux :
l'erreur d'une valeur dépend de **son type**, de **sa valeur**, de **la façon dont elle a été
obtenue** et des **conditions de son obtention**, et cette dépendance n'est souvent ni symétrique ni
même une marge.

| Valeur                          | Ce que l'on sait (voir la note des pistes)                                                                    | Forme de l'erreur                              |
|---------------------------------|----------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| Hauteur                         | Surestimée ; « au-dessus de la tête » veut dire 30° ou plus ; des estimations de 25 à 40° valaient 10° ou moins 4 fois sur 10 | Unilatérale, vers le bas, croissant avec la valeur |
| Distance d'une lumière basse    | Placée à la distance de la ligne d'horizon, moins à mesure qu'elle monte                                       | **Non informative** dans une bande autour de la distance de l'horizon donnée par le MNT |
| Distance, taille, vitesse (m)   | Fausses d'un facteur 10 ou plus sans point d'ancrage                                                          | Pas des données ; seuls les ancrages comptent  |
| Cap                             | Fiable à environ ±45° en travers de la ligne de visée ; sens parfois inversé                                  | Symétrique, plus une inversion discrète        |
| Taille angulaire                | Surestimée (3 à 4× à bout de bras) ou entre +2 et +17 % quand elle est montrée sur place (contesté)           | Multiplicative, par témoin, par méthode        |
| Heure                           | N(0, 6 min) pour 90 %, queue plus large ; une horloge lue l'emporte sur toute estimation                     | Dépend de la source de l'heure                 |
| Durée                           | Log-normale, σ(ln) ≈ 1,25 (×/÷3)                                                                              | Multiplicative                                 |
| Date                            | Juste pour 98 % ; les dates fausses le sont souvent d'un jour, d'un mois, d'un an ou de l'heure d'été         | Décalages **discrets**, pas une marge          |

Le modèle est donc une fonction, pas un champ :

```
error(kind, value, how, conditions) → law | uninformative
```

où une `law` est une distribution dans les termes propres de la valeur (unilatérale,
multiplicative, décalages discrets...) et `uninformative` dit que la valeur ne porte aucune
information sur ce qu'elle prétend mesurer (la distance d'une lumière basse dans la bande de
l'horizon). Chaque loi nomme ses sources et porte le statut de la piste dont elle vient
(consolidée, étude unique, argumentée, contestée).

### Un point d'extension, comme `Assessor`

`ErrorModel` serait un registre de `DataSource` comme les autres, pour la même raison qu'`Assessor` :
la littérature n'est pas d'accord (la taille angulaire est contestée entre Peiniger et Keul), et le
format ne doit pas prendre parti. Une implémentation par lecture de la littérature ; celui qui la
choisit en est crédité.

Une loi est une statistique de population. Elle dit comment les témoins se trompent en général, pas
comment celui-ci s'est trompé. La seule façon de la rendre individuelle est de mesurer le témoin
(voir la jauge lunaire plus bas), c'est pourquoi les entrées dont le modèle a besoin comptent plus
que le modèle.

### Les dates restent en EDTF

EDTF dit déjà à quel point une date est précise (`~`, `?`, `%`, dates partielles) et reste la
manière de l'écrire. Ce qu'EDTF n'exprime pas, c'est l'erreur de date : une date donnée précisément
et fausse d'un jour, d'un mois, d'un an ou d'une heure d'été. Ce n'est pas une marge ; c'est une
variante (plus bas).

## Ce que l'enregistrement doit porter

Pas de nouveau champ de marge. À la place, les entrées que lit le modèle d'erreur.

### Par valeur : comment elle a été obtenue

`basis` a gagné `measured`, classé au-dessus de `stated`. Deux autres ont été ajoutés en novembre
2026 à la demande du GEIPAN (A. Cousyn), tous deux à propos d'un même danger, une reconstitution faite
pour coller puis lue comme une validation : `established` au-dessus de tous les autres, et `fitted`
en dessous de tous.

| Fondement     | Signification                                                                                         | Rang (le plus fort d'abord) |
|---------------|-------------------------------------------------------------------------------------------------------|-----------------------------|
| `established` | Établi hors du compte rendu comme de la reconstitution : un registre, un relevé, un permis, une orbite publiée | 1 |
| `measured`    | Lu sur un instrument ou une jauge, par le témoin ou un enquêteur                                      | 2                           |
| `stated`      | Estimé ou remémoré par le témoin (par défaut)                                                         | 3                           |
| `derived`     | Déduit de valeurs déclarées ou mesurées et de quelque chose de vérifiable                            | 4                           |
| `assumed`     | Choisi pour que la reconstitution puisse tourner                                                     | 5                           |
| `fitted`      | Ajusté pour voir si une hypothèse peut être amenée à coller                                          | 6                           |

Une lecture est jugée sur les valeurs `established` et jamais sur les valeurs `fitted` : s'accorder
avec une valeur ajustée pour s'accorder, c'est l'ajustement, pas un résultat (`ReadingCheck`,
`ReadingVerdict`).

et d'un `how` facultatif, dans une liste fermée par type de valeur, parce que c'est lui qui choisit
une loi :

- heure : `clock`, `anchored` (à une émission, un train...), `estimated` ;
- taille angulaire : `shown-on-the-spot`, `arm-length-gauge`, `recalled-object` (« un ballon de
  football ») ;
- hauteur, cap : `instrument`, `landmark`, `estimated` ;
- distance : `occlusion`, `known-size`, `triangulation`, `estimated`.

Les fichiers existants ne changent pas : pas de `how` veut dire la loi d'une estimation sans
précision.

### Par témoin : les conditions

Des champs sur le témoin (ou sur chaque version de son compte rendu), chacun une entrée d'une loi :

- le **délai** entre l'observation et ce compte rendu, et **de quelle version** il s'agit (la plus
  ancienne pèse le plus ; raconter à nouveau fait baisser la part des détails justes) ;
- **le mot employé** pour le phénomène (lumière, objet, engin, OVNI), qui prédit si des détails
  chiffrés sont donnés spontanément, pas à quel point ils sont faux ;
- l'**exposition** avant le compte rendu (presse, télévision, autres témoins), et si les témoins se
  sont parlé (indépendance) ;
- les **conditions d'observation** : adaptation à l'obscurité, vue corrigée, vitre ou pare-brise,
  jumelles, lumière vive récente ;
- **la jauge lunaire** : le témoin montre la pleine Lune comme il a montré le phénomène. Le rapport
  est son propre facteur de taille angulaire, et la seule entrée qui fait d'une loi de population une
  loi individuelle. Elle mérite un contrôle dédié, puisque l'enquêteur la relève une fois par témoin.

### Par témoin : des erreurs corrélées

Les erreurs d'un témoin ne sont pas indépendantes d'une valeur à l'autre. La même personne applique
le même facteur de taille à chaque angle qu'elle donne, le même décalage d'horloge à chaque heure, la
même compression à chaque hauteur. Le modèle expose donc quelques **paramètres du témoin** plutôt
qu'une marge par image clé :

| Paramètre                    | S'applique à                               | Loi tirée de                     |
|------------------------------|--------------------------------------------|----------------------------------|
| décalage d'horloge           | chaque heure de l'enregistrement           | source de l'heure                |
| décalage de date             | la date (±1 j, mois, an ; heure d'été)     | piste des dates fausses          |
| rotation du cap, miroir      | chaque azimut                              | piste du cap                     |
| compression des hauteurs     | chaque hauteur                             | piste de la hauteur              |
| facteur de taille angulaire  | chaque taille angulaire                    | jauge lunaire, sinon méthode     |
| facteur de durée             | la durée, et l'échelle de la timeline      | piste de la durée                |

Moins de dix dimensions, chacune avec sa loi. C'est ce qui garde la recherche ci-dessous traitable.

## Les variantes sont des observations, trouvées à partir d'une hypothèse

### Pas des variations de champs

Faire varier les champs un par un n'est pas la bonne unité : 3 valeurs pour chacun de N champs
incertains font 3^N enregistrements, presque tous dénués de sens, parce qu'ils cassent les
corrélations ci-dessus (un témoin ne surestime pas une hauteur pour sous-estimer la suivante).

### Pas non plus une énumération

Même avec des paramètres du témoin, échantillonner l'espace et rejouer chaque échantillon ne répond à
aucune question. La question que pose un enquêteur va dans l'autre sens : **« ce témoignage
pourrait-il être une méprise sur X, et à quel coût ? »**

### La recherche

Pour l'enregistrement d'un témoin et un candidat (Vénus, l'ISS, un avion de ligne sur sa trajectoire
enregistrée, une rentrée, un panache de lancement) :

1. Placer le candidat dans la scène (il y est déjà : `interpretations`, `BodyConfrontation`).
2. Trouver les paramètres du témoin qui rapprochent le plus le témoignage de ce à quoi le candidat
   aurait ressemblé, sous leurs lois. C'est un ajustement en moins de dix dimensions, plus quelques
   choix discrets (décalage de date, miroir).
3. Son résultat est **une variante par candidat** : le témoignage tel qu'il se lirait si le témoin
   s'était trompé de cette façon, plus son **coût** : quels biais elle invoque, de combien en unités
   de la dispersion de chaque loi, et le statut de chacun.

Le nombre de variantes est le nombre de candidats, pas une puissance du nombre de champs.

### Variantes structurelles

Certaines méprises ne sont pas des décalages d'une valeur mais une autre lecture de la scène, et
viennent du candidat, pas d'un paramètre :

- des lumières lues comme un seul corps (une formation, les fragments d'une rentrée, les feux d'un
  avion de ligne) ;
- un mouvement apparent qui n'en est pas un (une lumière fixe vue en mouvement, un avion qui approche
  vu en vol stationnaire, une lumière qui s'éteint vue comme partant) ;
- un éclat croissant lu comme une approche.

Chaque candidat déclare celles dont il peut avoir besoin, et la variante dit laquelle elle a
utilisée. Elles sont peu nombreuses et ne sont jamais cherchées à l'aveugle.

### Une variante est une interprétation

`Interpretation.ts` le dit déjà : une interprétation est une autre observation, celle qui a eu lieu,
selon qui l'interprète. Une variante est exactement cela, avec deux ajouts :

- les **paramètres du témoin** appliqués (la transformation du compte rendu en la variante), pour que
  la variante soit reproductible et que le compte rendu lui-même ne change jamais ;
- le **coût** et le **modèle d'erreur** avec lequel elle a été calculée (son id, comme une source de
  données), pour qu'elle puisse être recalculée quand le modèle change.

Elle vit là où vivent les interprétations (événements de dossier de type `interpretation`, ou celles
de l'enregistrement lui-même), et se rejoue de la même manière. Le compte rendu reste la référence ;
rien ne l'écrase.

### Verdicts

Par candidat, trois issues, dans le vocabulaire des statuts des pistes :

- **compatible avec des biais consolidés** : atteignable avec les seules lois consolidées, dans leur
  dispersion habituelle ;
- **compatible seulement en invoquant des biais contestés ou argumentés**, ou les queues des lois
  (nommées) ;
- **incompatible même aux bornes** : aucun réglage des paramètres du témoin ne l'atteint. Selon la
  piste « une explication doit aussi être possible », c'est un résultat contre l'explication, pas
  contre le compte rendu.

Les tolérances fixes de `BodyConfrontation` deviennent le cas particulier « sans modèle d'erreur » :
ses `disagreements` sont calculés selon la loi de chaque valeur (`BodyConfrontation.lawsOf`) au lieu
de 1° et ×1,5. La scène de l'éditeur et la sensibilité utilisent les lois ; la scène du lecteur
utilise encore les tolérances fixes.

La règle de contradiction reste la même (une valeur déclarée contredite par le calcul est montrée
barrée en rouge, jamais retirée), avec un affinement : une valeur n'est contredite que si elle sort
de sa loi, pas simplement si elle diffère.

## Effets sur l'interface

### Éditeur

- **Par champ** : une marque de fondement, montrée au survol ou au focus, qui ouvre un sélecteur
  (`measured`, `stated`, `derived`, `assumed`), la liste `how` de ce type de valeur, et la
  justification. Un fondement autre que celui par défaut reste visible au repos. Le vocabulaire
  visuel doit se distinguer des marques d'évaluation (contour plein ou pointillé dans la couleur
  d'alerte, qui veut dire « sans réponse ») ; une marque typographique (italique pour `assumed`, un
  petit glyphe pour `measured`) évite le conflit.
- **Quand une valeur est retapée**, son fondement qui expire reste la règle, mais de façon visible :
  la marque se réinitialise et le dit.
- **La loi calculée** est montrée en lecture seule à côté du champ, dans l'unité du champ
  (« ≈ 12 à 30°, hauteur surestimée »), avec la piste dont elle vient et son statut, dans le style
  des crédits en ligne des sources de données. Là où le modèle répond `uninformative`, il le dit au
  lieu d'une fourchette.
- **Par témoin** : un groupe de conditions (délai, version, mot, exposition, conditions
  d'observation) et le contrôle de la jauge lunaire.

Aucune saisie « ± » nulle part.

### Lecteur et player

- Un **sélecteur de variantes** à côté des interprétations : le compte rendu tel que donné, puis une
  entrée par candidat, triées par verdict et coût.
- Dans une variante, chaque valeur qui a bougé est montrée **barrée avec la valeur de la variante à
  côté**, comme les contradictions, avec le biais qui l'a déplacée. Le compte rendu est toujours à un
  clic.
- Une **puce par candidat** sous le rendu, avec son verdict, qui mène à la variante.
- En option, une **enveloppe** : le phénomène dessiné comme un nuage échantillonné selon les lois des
  paramètres du témoin, pour montrer ce que le compte rendu permet sans nommer de candidat. Un rendu,
  pas une liste.

### Évaluateurs

- Un évaluateur de candidats produisant les verdicts ci-dessus.
- `CoverageAssessor` peut compter `measured` et la jauge lunaire comme des réponses plus fortes.

### Rédaction par IA

`RecordingRules` demande actuellement une fourchette dans `rationale` quand une valeur est supposée.
Avec `how` et les conditions du témoin, le brouillon note plutôt comment chaque valeur a été obtenue,
et la fourchette est calculée.

## Sensibilité d'une lecture

La recherche de candidats déplace le **compte rendu** dans ses lois pour atteindre un candidat. La
sensibilité pose la question inverse à une **lecture** (une interprétation du compte rendu, dans un
dossier) : jusqu'où peut-on déplacer ce que la lecture a elle-même choisi avant qu'elle reproduise
moins bien le compte rendu ? Une ressemblance qui ne tient qu'à un degré près d'un cap supposé a été
fabriquée ; une qui tient sur trente degrés a été trouvée. Elle répond à la demande du GEIPAN de
« mesurer la sensibilité des résultats à des variations raisonnables des paramètres incertains »,
pour qu'une reconstitution séduisante ne soit pas prise pour une validation.

### Des marges, pas des variations échantillonnées

Échantillonner des « variations raisonnables » demanderait une fourchette pour chaque valeur que
personne n'a donnée, et la choisir serait un paramètre libre de plus. Une marge n'a pas besoin de ce
choix et laisse en juger qui la lit. Ainsi, pour chaque corps libre d'une lecture (ses champs marqués
libres par `Provenance.free`), cinq réglages sont poussés dans chaque sens jusqu'à ce que la lecture
reproduise moins bien le compte rendu que telle qu'elle est écrite :

- la direction en travers de la ligne de visée (jusqu'à 45°) ;
- la hauteur au-dessus de l'horizon (jusqu'à 30°) ;
- la distance le long de la ligne de visée (jusqu'à ×/÷10) ;
- la taille (jusqu'à ×/÷10) ;
- l'instant (jusqu'à 10 s).

Une extrémité qui atteint la limite est la limite de la recherche, pas de la lecture : elle tient
encore là. Ce que la lecture reproduit est la part des comparaisons (instant × phénomène) qu'elle ne
contredit pas, puisqu'aucune lecture réelle ne reproduit chaque instant. Un réglage qui reproduit
**mieux** que la lecture telle qu'écrite est signalé aussi : cette lecture n'était pas à son
meilleur.

### L'erreur du témoin est dans la tolérance, pas dans les réglages

Ce que le témoin a déclaré n'est jamais déplacé. De combien son estimation peut être fausse est déjà
dans ce qui compte comme une contradiction, par les lois de cette note (`BodyConfrontation.lawsOf`,
données comme tolérance). Une marge est dite **suffisante** quand elle couvre la moitié de
l'incertitude de la valeur dans chaque sens (`ReadingSensitivity.SUFFICIENT`) : une lecture qui
reste d'accord quand ce qu'elle a supposé est déplacé de la moitié de ce dont le témoin pouvait se
tromper. En dessous, la lecture repose sur un **réglage fin**.

### Seul ce qui a été dit est comparé

Une timeline est dessinée pour être jouée ; elle contient donc bien plus que ce qui a été dit : une
direction toutes les demi-secondes là où le témoin en a donné trois, une taille que personne n'a
donnée. Comparer une lecture à cela reviendrait à comparer deux reconstitutions entre elles. Seule
une direction ou une taille que l'enregistrement rattache au témoin (un fondement qui n'est pas
libre et dit sur quoi il repose, ou un passage cité d'une interview) est comparée.

### Où elle apparaît

`<rr0-reading-sensitivity>` montre les marges sur la carte de chaque lecture dans l'éditeur de
dossier et sous l'image dans le lecteur (`rr0-sighting`, donc `rr0-case`). Le rapport de dossier
(HTML, JSON, CSV) l'inclut. `scripts/reading-sensitivity.ts <case.json>` l'affiche en ligne de
commande, jugée comme ci-dessus ; avec `ALL=1`, par rapport à tout ce que dessinent les timelines,
avec les tolérances fixes.

### Limites

- Le relief n'est pas connu de ce calcul : le sol est plat aux pieds du témoin.
- Chaque réglage est tourné seul ; les marges de deux réglages tournés ensemble ne sont pas
  calculées.
- Une lecture dont les corps ne disent pas ce qu'ils expliquent (pas d'`explains`) n'a rien à quoi
  être confrontée, et n'a donc pas de marges.

## Réserves

- Plusieurs lois reposent sur des études connues ici seulement par des résumés (Jimenez, Peiniger,
  Keul, Sharps ; voir la liste de lecture de la note des pistes). Tant qu'elles n'ont pas été lues
  dans l'original, leurs lois devraient servir aux variantes mais pas aux verdicts.
- Les lois sont mesurées sur des stimuli identifiés, surtout des rentrées et des astres de nuit. Les
  appliquer à une observation rapprochée en plein jour est une extrapolation et devrait le dire.
- Un coût n'est pas une probabilité. Les taux de base des candidats (les parts de Hendry) varient
  selon le lieu et l'époque et sont des a priori à fixer par échantillon, pas des constantes ; le
  verdict ne les combine pas.
- Plusieurs témoins : des comptes rendus indépendants ne partagent aucun paramètre du témoin, donc un
  candidat doit être atteignable depuis chacun avec les siens ; des comptes rendus non indépendants
  (ils se sont parlé, ils ont lu la presse) ne peuvent pas compter comme des confirmations séparées,
  et le modèle devrait savoir lesquels ils sont.

## Ordre des travaux

1. `measured` et `how` dans le format ; la marque de fondement par champ dans l'éditeur. **Fait**
   (12e3f4e0).
2. Conditions du témoin et jauge lunaire dans le format et l'éditeur. **Fait** (12e3f4e0).
3. Le point d'extension `ErrorModel` ; les lois montrées en lecture seule dans l'éditeur. **Fait**
   (12e3f4e0), avec deux modèles.
4. `BodyConfrontation` lit ses tolérances dans le modèle ; les contradictions utilisent les lois.
   **Fait** dans l'éditeur (abfefc1b).
5. La recherche, les variantes comme interprétations, les puces de verdict. **Fait** (abfefc1b,
   e0c4b471).
6. `established` et `fitted`, et la sensibilité d'une lecture. **Fait** (novembre 2026).

## Pas encore fait

- **Décalage de date et miroir dans la recherche.** Tous deux sont des lois du modèle (un jour, un
  mois, un an ou une heure d'été faux ; le sens d'un cap inversé), mais `CandidateSearch` ne tourne
  que l'horloge, le cap, la hauteur, la taille, la durée et le balayage.
- **Marques de fondement sur tous les champs.** L'éditeur ne les montre que sur l'heure de début, la
  durée, le cap et la largeur apparente.
- **La scène du lecteur** confronte encore les interprétations avec les tolérances fixes, pas avec
  les lois (ses marges de sensibilité, elles, les utilisent).
- **Rédaction par IA** : `RecordingRules` demande encore une fourchette dans `rationale` quand une
  valeur est supposée, plutôt que la façon dont chaque valeur a été obtenue.
- **Le rendu en enveloppe**, s'il est toujours voulu.
- **`ErrorModel` comme source de données** avec son crédit : les deux modèles sont une liste fixe
  (`WitnessError.MODELS`).
- **Sensibilité** : le relief, et des réglages tournés ensemble (voir ses limites).
