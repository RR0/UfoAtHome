import type { GenerativeKitMessages } from "./GenerativeKitMessages.js"

export const generativeKitMessages_it = {
  readmeFile: "LEGGIMI.md",
  label: "Ricostruzione generata, non un'immagine reale",
  readme: `# Kit per IA generativa: {title}

Questo kit serve a produrre, con un generatore video (Runway, Kling, Luma, Veo…), una versione realistica della ricostruzione UFO@home di questa osservazione, senza lasciare che il generatore inventi la testimonianza.

Fonte: {source}
Fatto con UFO@home (https://ufoathome.org) il {date}.

## Contenuto

- **reference.mp4**: la ricostruzione come la mostra il lettore, con il suo sonoro, senza didascalia né logo ({fps} immagini/s, {duration} s).
- **first-frame.png**: la sua prima immagine, per i generatori che partono da un'immagine.
- **depth.mp4**: la distanza di ogni pixel, bianco vicino, nero lontano e per il cielo, su una scala logaritmica da {near} m a {far} m, la stessa per tutto il video.
- **phenomenon-mask.mp4**: in bianco, il posto del fenomeno descritto dal testimone, allargato di {margin} pixel: ciò da cui il fenomeno generato non deve uscire.
- **sky-mask.mp4**: in bianco, il cielo.
- **prompt.txt**: il prompt e il prompt negativo, in inglese, scritti solo a partire da ciò che afferma la registrazione.
- **manifest.json**: la provenienza e le stesse informazioni, per un programma.

## Istruzioni

1. Nel generatore, scegliere una modalità che parta da un video («video to video», «restyle», «modify video»…) e dargli reference.mp4. Se il video è troppo lungo per esso, tagliarlo attorno al momento voluto.
2. Incollare il contenuto di prompt.txt. Regolare la trasformazione al minimo che renda l'immagine realistica: la geometria, l'orizzonte, l'inquadratura e il movimento devono restare quelli del riferimento.
3. Se il generatore accetta un video di controllo della profondità («depth»), dargli depth.mp4.
4. Il generatore rende anche il fenomeno, perché abbia la stessa grana, la stessa sfocatura e la stessa luce del resto. Poi controllare il risultato sovrapponendo phenomenon-mask.mp4 al video generato: se il fenomeno ne esce, cambia forma, dimensione, colore o movimento, o acquista dettagli (oblò, luci, riflessi), scartare il video e ricominciare con una trasformazione più debole.
5. Sovrimprimere su tutta l'immagine, e non in un angolo: «{label}».
6. Citare la fonte qui sopra ovunque il video sia pubblicato.

## Da non fare

- Mostrare il video generato a un testimone prima di averlo intervistato: un'immagine realistica può modificarne il ricordo.
- Dare al generatore il testo della testimonianza come prompt: ne disegnerebbe ogni parola, compreso ciò che il testimone non ha detto.
- Reincollare il fenomeno di reference.mp4 sul video generato: meno realistico del resto, sembrerebbe aggiunto e attirerebbe lo sguardo più di tutto il resto.
- Presentare il risultato come una prova: mostra una ricostruzione, non ciò che è stato visto.
`
} satisfies GenerativeKitMessages
