import type { GenerativeKitMessages } from "./GenerativeKitMessages.js"

export const generativeKitMessages_fr = {
  readmeFile: "LISEZ-MOI.md",
  label: "Reconstitution générée, pas une image réelle",
  readme: `# Kit pour IA générative : {title}

Ce kit sert à produire, avec un générateur vidéo (Runway, Kling, Luma, Veo…), une version réaliste de la reconstitution UFO@home de cette observation, sans laisser le générateur inventer le témoignage.

Source : {source}
Fait avec UFO@home (https://ufoathome.org) le {date}.

## Contenu

- **reference.mp4** : la reconstitution telle que le lecteur la montre, avec son son, sans légende ni logo ({fps} images/s, {duration} s).
- **first-frame.png** : sa première image, pour les générateurs qui partent d'une image.
- **depth.mp4** : la distance de chaque pixel, blanc près, noir loin et pour le ciel, sur une échelle logarithmique de {near} m à {far} m, la même pour toute la vidéo.
- **phenomenon-mask.mp4** : en blanc, la place du phénomène décrit par le témoin, élargie de {margin} pixels : ce dont le phénomène généré ne doit pas sortir.
- **sky-mask.mp4** : en blanc, le ciel.
- **prompt.txt** : le prompt et le prompt négatif, en anglais, écrits à partir des seuls énoncés de l'enregistrement.
- **manifest.json** : la provenance et ces mêmes informations, pour un programme.

## Mode d'emploi

1. Dans le générateur, choisir un mode qui part d'une vidéo (« video to video », « restyle », « modify video »…) et y déposer reference.mp4. Si la vidéo est trop longue pour lui, la couper autour du moment voulu.
2. Coller le contenu de prompt.txt. Régler la transformation au plus bas qui rende l'image réaliste : la géométrie, l'horizon, le cadrage et le mouvement doivent rester ceux de la référence.
3. Si le générateur accepte une vidéo de contrôle de profondeur (« depth »), lui donner depth.mp4.
4. Le générateur rend aussi le phénomène, pour qu'il ait le même grain, le même flou et la même lumière que le reste. Contrôler ensuite le résultat en superposant phenomenon-mask.mp4 à la vidéo générée : si le phénomène en sort, change de forme, de taille, de couleur ou de mouvement, ou gagne des détails (hublots, lumières, reflets), rejeter la vidéo et recommencer avec une transformation plus faible.
5. Incruster sur toute l'image, et pas dans un coin : « {label} ».
6. Citer la source ci-dessus partout où la vidéo est publiée.

## À ne pas faire

- Montrer la vidéo générée à un témoin avant de l'avoir interrogé : une image réaliste peut modifier son souvenir.
- Donner au générateur le texte du témoignage comme prompt : il en dessinerait chaque mot, y compris ce que le témoin n'a pas dit.
- Recoller le phénomène de reference.mp4 sur la vidéo générée : moins réaliste que le reste, il aurait l'air rapporté et attirerait l'œil plus que tout le reste.
- Présenter le résultat comme une preuve : il montre une reconstitution, pas ce qui a été vu.
`
} satisfies GenerativeKitMessages
