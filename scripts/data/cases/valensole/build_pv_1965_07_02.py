"""
Derives the Valensole recording of the gendarmerie's summary of 2 July 1965 from the detailed one
(public/demo-data/observer-valensole.json), so that the field, the lavender, the weather and the
observer's walk stay the same and only what the summary states differs.

What the summary says (quoted by the French Wikipedia article, from the gendarmerie's own text):
"un engin de type « soucoupe volante » de la grosseur d'une Dauphine avec deux passagers. Un
individu, taille 1 m environ, de forte corpulence, vêtu d'une combinaison, tête nue, serait descendu
de l'engin quelques instants. Puis l'engin aurait disparu subitement à la vitesse d'un éclair." It
describes the craft as a rugby ball with a sliding door on its side and a transparent top, of the
size of a Dauphine. So here:

- the craft is the plain ovoid of that size (a Renault Dauphine measures about 3.95 x 1.52 x 1.35 m),
  with no legs and no pivot: the legs, the pivot and the 3.5 m x 2.5 m come from LATER accounts, and
  the model that carries them is not used for this one;
- ONE being, stocky, bare-headed, steps out for a few moments (the second passenger stays aboard and
  is not drawn: nothing says what he looked like);
- no paralysis, no tube, no drawing: the summary has none. The 2D drawings of the detailed recording
  are not copied, since nobody drew anything at that statement.

Run with: python3 scripts/data/cases/valensole/build_pv_1965_07_02.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
SOURCE = os.path.join(ROOT, "public", "demo-data", "observer-valensole.json")
TARGET = os.path.join(ROOT, "public", "demo-data", "observer-valensole-pv-1965-07-02.json")
DURATION_MS = 120000

d = json.load(open(SOURCE, encoding="utf-8"))
d["id"] = "1965-07-01-MasseMaurice-pv-1965-07-02"
d["observer"] = {"id": "MasseMaurice", "title": "Maurice Masse (procès-verbal du 2 juillet 1965)"}
d["durationSeconds"] = DURATION_MS // 1000
d["tags"] = ["RR3", "landing"]
d["sources"] = [{
    "type": "article",
    "title": "Rencontre de Valensole",
    "url": "https://fr.wikipedia.org/wiki/Rencontre_de_Valensole",
    "publication": {"publisher": "Wikipédia"}
}]
d["description"] = {
    "fr": "Ce que la gendarmerie de Valensole consigne le 2 juillet 1965 à 20 h, puis lors d'une seconde audition de 23 h 15 à 23 h 30 : un engin « de la grosseur d'une Dauphine », en forme de ballon de rugby, avec une porte à glissière sur le côté et un dessus transparent, et deux passagers. Un individu, d'environ 1 m, de forte corpulence, en combinaison et tête nue, descend de l'engin quelques instants, puis l'engin disparaît subitement « à la vitesse d'un éclair ». Le résumé ne mentionne ni les pieds ni le pivot, ni le tube, ni l'immobilisation, ni un second être hors de l'engin : ils ne sont donc pas figurés. L'engin est un simple ovoïde aux dimensions d'une Dauphine, et l'être, qui est un corps d'enfant de forte corpulence, n'a pour visage que ce que d'autres déclarations de Masse en disent. Le lieu figuré est celui du mémorial, en bordure de la D6A.",
    "en": "What the Valensole gendarmerie recorded on 2 July 1965 at 8 pm, then at a second hearing from 11:15 to 11:30 pm: a craft \"the size of a Dauphine\", shaped like a rugby ball, with a sliding door on its side and a transparent top, and two passengers. One individual, about 1 m tall, stocky, in a suit and bare-headed, got out of the craft for a few moments, then the craft vanished suddenly \"at the speed of lightning\". The summary mentions neither the legs nor the pivot, nor the tube, nor the immobilisation, nor a second being outside the craft: so they are not drawn. The craft is a plain ovoid of a Dauphine's size, and the being, a stocky child's body, has no face but what Masse's other statements say of it. The place shown is the memorial's, at the edge of the D6A.",
    "es": "Lo que la gendarmería de Valensole consigna el 2 de julio de 1965 a las 20 h, y luego en una segunda audiencia de 23:15 a 23:30: una nave « del tamaño de un Dauphine », con forma de balón de rugby, con una puerta corredera en el costado y una parte superior transparente, y dos pasajeros. Un individuo, de aproximadamente 1 m, corpulento, con mono y sin nada en la cabeza, baja de la nave unos instantes, y luego la nave desaparece de repente « a la velocidad del rayo ». El resumen no menciona ni las patas ni el pivote, ni el tubo, ni la inmovilización, ni un segundo ser fuera de la nave: por eso no se representan. La nave es un simple ovoide del tamaño de un Dauphine.",
    "it": "Ciò che la gendarmeria di Valensole registra il 2 luglio 1965 alle 20, poi in una seconda audizione dalle 23:15 alle 23:30: un velivolo « delle dimensioni di una Dauphine », a forma di pallone da rugby, con una porta scorrevole su un lato e una parte superiore trasparente, e due passeggeri. Un individuo, alto circa 1 m, corpulento, in tuta e a capo scoperto, scende dal velivolo per qualche istante, poi il velivolo scompare all'improvviso « alla velocità di un lampo ». Il riassunto non menziona né le gambe né il perno, né il tubo, né l'immobilizzazione, né un secondo essere fuori dal velivolo: non sono quindi raffigurati. Il velivolo è un semplice ovoide delle dimensioni di una Dauphine."
}
d["timeline"] = {"keyframes": []}
d["observerTrack"]["keyframes"] = [k for k in d["observerTrack"]["keyframes"] if k["t"] <= DURATION_MS]
if "keyframes" in d.get("weatherTrack", {}):
    d["weatherTrack"]["keyframes"] = [k for k in d["weatherTrack"]["keyframes"] if k["t"] <= DURATION_MS] or d["weatherTrack"]["keyframes"][:1]

CRAFT_SIZE = {"widthM": 1.52, "lengthM": 3.95, "heightM": 1.35}
craft_track = {
    "value": [
        {"t": 0, "eastM": 0, "northM": -89.9, "onGround": True, "sizeM": CRAFT_SIZE,
         "attitude": {"headingDeg": 0},
         "appearance": {"color": "#b8b3a6", "albedo": 0.35}},
        {"t": 100000, "present": False}
    ],
    "basis": "assumed",
    "rationale": "The summary gives the craft's size by a comparison (\"la grosseur d'une Dauphine\"), its shape (a rugby ball), a sliding door on its side and a transparent top, and nothing else: no legs, no pivot, no colour. It is therefore drawn as a plain ovoid of a Renault Dauphine's overall dimensions (about 3.95 x 1.52 x 1.35 m), in the neutral matte colour of the later accounts, at the 90 m from which he first saw it. The 3.5 m x 2.5 m, the six legs and the pivot are later statements and are not read back into this one. It vanishes \"subitement\", at the speed of lightning: here after the being has gone back aboard."
}
being_track = {
    "value": [
        {"t": 0, "present": False},
        {"t": 60000, "eastM": -1.2, "northM": -88.0, "onGround": True,
         "sizeM": {"widthM": 0.35, "lengthM": 0.3, "heightM": 1.0},
         "attitude": {"headingDeg": 0}, "appearance": {"color": "#6f7263", "albedo": 0.28}, "present": True},
        {"t": 90000, "present": False}
    ],
    "basis": "assumed",
    "rationale": "\"Un individu, taille 1 m environ, de forte corpulence, vêtu d'une combinaison, tête nue, serait descendu de l'engin quelques instants\": one being, about a metre tall, stocky, in a suit, bare-headed, standing by the craft for a short while. How long, where, and facing which way are not in the summary: it is put beside the craft, on the side he was walking up, for thirty seconds, facing him."
}
d["interpretation"] = {
    "title": {
        "fr": "Un engin ovoïde de la taille d'une Dauphine et un individu d'un mètre, trapu, tête nue, qui en descend",
        "en": "An ovoid craft the size of a Dauphine and one stocky, bare-headed individual, a metre tall, getting out of it",
        "es": "Una nave ovoide del tamaño de un Dauphine y un individuo de un metro, corpulento y sin nada en la cabeza, que baja de ella",
        "it": "Un velivolo ovoidale delle dimensioni di una Dauphine e un individuo alto un metro, corpulento e a capo scoperto, che ne scende"
    },
    "bodies": [
        {"id": "craft", "title": {"fr": "L'engin", "en": "The craft", "es": "La nave", "it": "Il velivolo"},
         "model": {"id": "ellipsoid"}, "track": craft_track},
        {"id": "etre-1", "title": {"fr": "L'individu", "en": "The individual", "es": "El individuo", "it": "L'individuo"},
         "model": {"id": "ufoathome-valensole-being"}, "track": being_track}
    ]
}
# Decor objects that exist only for the later accounts' moments are kept: the field is the same.
with open(TARGET, "w", encoding="utf-8") as out:
    out.write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("wrote", os.path.relpath(TARGET, ROOT), len(json.dumps(d)))
