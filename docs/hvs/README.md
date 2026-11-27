# Le cas fictif HVS dans le format d'UFO@home

Stéphane Baron a proposé (novembre 2026) un cas fictif, `FICTIF-2026-001`, pour voir si un dossier analysé selon son protocole HVS 7.0
(taxonomie 2.1) peut s'écrire dans le format d'UFO@home. [`fictif-2026-001.json`](fictif-2026-001.json) en est la transcription à la
main : le format la prend entière, et elle se charge sans rien inventer (test `HvsTranscription.test.ts`).

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

## Ce qui manque

1. **L'IQI** (date et heure, lieu, identification, nombre de témoins, enquête) : rien ne le note aujourd'hui. Les évaluateurs
   Ballester-Guasp et Poher jouent un rôle voisin.
2. **La liste arrêtée des éléments**, avec leur statut (fait observé, inférence, inférence d'association) : E1 à E5 sont ici dispersés
   dans la scène, et E5 n'existe que comme dessin.
3. **Les hypothèses et leurs scores** : une lecture « lanterne » se reconstitue (`interpretation`), et se confronte au témoignage
   instant par instant, mais ni la CS (brute, discriminante), ni la PS, ni le HVS et son enveloppe n'ont de place.
4. **Le code de la taxonomie** (`T1.4`) d'une hypothèse.
