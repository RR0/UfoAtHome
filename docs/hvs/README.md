# Le cas fictif HVS dans le format d'UFO@home

Stéphane Baron a proposé (novembre 2026) un cas fictif, `FICTIF-2026-001`, pour voir si un dossier analysé selon son protocole HVS 7.0
(taxonomie 2.1) peut s'écrire dans le format d'UFO@home. [`fictif-2026-001.json`](fictif-2026-001.json) en est la transcription à la
main : le format la prend entière, et elle se charge sans rien inventer (test `HvsTranscription.test.ts`). Le dossier
[`case.json`](case.json) y ajoute la liste des éléments et les hypothèses pesées, que l'éditeur de dossier montre sous les lectures
comparées (« Hypothèses pesées (HVS) »).

## Ce qui passe tel quel

| HVS | UFO@home | Remarque |
|---|---|---|
| `cas.lieu` lat, lon | `place.locations[0]` et la pose du témoin | WGS84, degrés décimaux, comme HVS |
| `cas.lieu.alt_m` (60) | `elevationM: 0` | le nôtre est au-dessus du sol local ; l'altitude du sol vient du relief |
| `cas.heure_tu`, `heure_locale` | `time` légal + `utcOffsetHours: 2` + `timeZone` | une seule heure, l'autre s'en déduit |
| E1, « un point lumineux orangé » (fait observé) | la forme `lumiere`, ovale, orange, avec son titre | |
| E2, azimut 245 [M/R], [242, 248], « repère de terrain photographié » | `aim.azimuthDeg` : `basis: "derived"`, `how: "landmark"`, `range`, `rationale` | avec une photo calée sur la scène, `source.picture` la nommerait |
| E3, élévation déclarée 15, [12, 18], testimoniale | `aim.altitudeDeg` : `basis: "stated"`, `how: "estimated"`, `range` | voir l'élévation plus bas |
| E4, distance [H], `[350, null]`, « premier obstacle à 350 m » | un élément de décor à 350 m, `occludesSourceIds: ["lumiere"]` | jamais une distance saisie : l'inégalité « au moins 350 m » est déduite |
| E5, extinction brutale (fait observé) | une image clé 0,1 s après la dernière, `brightness: 0`, `transparency: 1` | dessinée, mais pas un élément compté |
| `trajectoire[]` | `timeline.keyframes[].shapes[].shape.aim` | `t` en ms depuis le début |
| [M], [R], [H] | `measured`/`established`, `derived`, `assumed` | plus `stated` et `fitted` |
| intervalle, borne ouverte | `range: [min, max]`, `null` du côté ouvert | les bornes ouvertes sont nouvelles (c3b1d1e9) |

## L'élévation

Une élévation dite par un témoin est apparente : c'est ce qu'il a vu, réfraction comprise. UFO@home dessine le ciel réfracté, donc la
garde telle quelle. Une élévation géométrique ne vient que d'un calcul (un astre, un avion dont on connaît la position) ; l'écart est
d'environ 3,6′ à 15°, 0,5° à l'horizon. Un export HVS devra soit retirer la réfraction, soit déclarer `"elevation": "apparente"` dans
`conventions`.

## Éléments, hypothèses et scores (dans le `case.json`)

| HVS | UFO@home |
|---|---|
| `elements[]` : `id`, `libelle`, `statut` | `elements[]` : `id`, `title`, `status` (`observed`, `inferred`, `association`) ; `elementsSealed` dit la liste arrêtée |
| un élément qui est un angle | `phenomenon: { sourceId, t }` : une lecture de l'hypothèse le tranche par sa confrontation au témoignage, sans déclaration |
| `iqi` | `hvs.iqi`, mêmes cinq groupes (`complete`, `partial`, `absent`) ; un groupe omis est suggéré d'après le dossier quand c'est possible (date, lieu, enquête) |
| `hypotheses[].code`, `libelle` | `hvs.hypotheses[].code`, `title` ; `readings` nomme les lectures qui la reconstituent |
| éléments expliqués | `explains`, pour ceux qu'aucune lecture ne tranche |
| `ps` | `plausibility` : `existence`, `frequency`, `compatibility`, `context`, chacun avec sa plage ; PS calculée |
| `cs_brute`, `cs_discriminante`, `hvs.prefere`, `hvs.enveloppe` | calculés, jamais saisis |
| jalons | « dominante » calculée ; `milestone` : `identified`, `proven` |

L'hypothèse « avion » n'est pas dans l'exemple de Baron : elle n'est là que pour qu'un élément sépare deux hypothèses. L'exemple ne
donne que PS = 0,70 ; sa décomposition en trois cotes de 0,7 est pour l'illustration.

### Choix faits ici, à confirmer avec Stéphane Baron

- **Enveloppe de la CS** : de la part expliquée sans compter les inférences, jusqu'à la part préférée (les inférences comptées).
- **Moyenne géométrique** : quand une cote est ≤ 0,2 alors qu'une autre est ≥ 0,6.
- **CS discriminante** : sur les éléments que toutes les hypothèses listées n'expliquent pas de la même façon ; HVS la prend quand elle
  existe, sinon la CS brute (son exemple : 0,67 × 0,70 = 0,47).
- **Dominante** : la retenue de plus grande CS discriminante ; aucune en cas d'égalité.
- **IQI** : un niveau complet vaut 1, partiel 0,5 ; la somme est sur les groupes notés.

## Ce qui manque encore

- La grille des 20 catégories et leurs plages de PS : à Baron de dire si elles peuvent être publiées.
- Le réajustement des hypothèses exotiques (barème inspiré de Kass & Raftery).
- Un export et un import au format de son exemple, s'il le garde.
- La saisie des éléments et des hypothèses ailleurs que dans l'onglet Fichier du dossier.
