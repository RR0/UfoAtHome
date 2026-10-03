"""
Derives the Valensole recording of Maurice Masse's first statement to the gendarmerie (procès-verbal
n° 445, made on 2 July 1965 at 20:00 and 23:15) from the detailed one
(public/demo-data/observer-valensole.json), so that the field, the lavender and the weather stay
the same and only what THAT statement says differs.

What the procès-verbal says (GEIPAN, "PV n° 445 (1965309761)", read page by page):
- he saw the craft from about 60 m, "de la grosseur d'une voiture Dauphine", mat, "ressemblant à un
  ballon de rugby avec une porte à glissière sur le côté", the top transparent, "par laquelle j'ai
  aperçu une personne à l'intérieur";
- "un homme était déjà à terre", "habillé d'une combinaison semble-t-il, tête nue, les mains vides",
  "d'environ un mètre, mais de corpulence assez importante";
- the passenger seems to warn him; he goes back aboard at once, gripping the edge of the opening with
  his right hand; "un bruit sourd", the craft leaves obliquely, out of sight after 10 to 15 m, at 6 to
  8 m up, "pire qu'un éclair";
- it stood "sur six pattes placées au-dessous et un pivot de couleur acier, au centre", and on takeoff
  the six legs seemed to turn "toutes dans le même sens";
- no tube, no immobilisation, and "il me semble qu'ils étaient de type européen".
So here: the same craft model as the detailed account (its legs and pivot ARE in this statement), one
man on the ground, the passenger seated in the dome, the witness standing 60 m away, and a takeoff of a
few metres. The 2D drawings of the detailed recording are not copied: nobody drew anything that day.

Run with: python3 scripts/data/cases/valensole/build_pv_1965_07_02.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
SOURCE = os.path.join(ROOT, "public", "demo-data", "observer-valensole.json")
TARGET = os.path.join(ROOT, "public", "demo-data", "observer-valensole-pv-1965-07-02.json")
PV_URL = "https://www.geipan.fr/sites/default/files/PV%20n%C2%B0445%20%281965309761%29.pdf"
CRAFT_NORTH_M = -89.9
# The craft is 89.9 m from where the detailed account starts; 60 m from it is 29.9 m along the walk.
WITNESS_LAT = 43.845508 - 29.9 / 111320.0
LEAVES_MS = 61000
DURATION_MS = 66000

d = json.load(open(SOURCE, encoding="utf-8"))
d["id"] = "1965-07-01-MasseMaurice-pv-1965-07-02"
d["observer"] = {"id": "MasseMaurice", "title": "Maurice Masse (procès-verbal du 2 juillet 1965)"}
d["durationSeconds"] = DURATION_MS // 1000
d["tags"] = ["RR3", "landing"]
d["sources"] = [{
    "type": "article",
    "title": "Procès-verbal n° 445 du 2 juillet 1965, gendarmerie de Valensole",
    "url": PV_URL,
    "publication": {"publisher": "GEIPAN", "time": "1965-07-02"}
}]
d["description"] = {
    "fr": "Ce que Maurice Masse déclare à la gendarmerie de Valensole le 2 juillet 1965 à 20 h, puis à 23 h 15 (procès-verbal n° 445). Il voit l'engin de 60 m environ, « de la grosseur d'une voiture Dauphine », de couleur mate, en forme de ballon de rugby, avec une porte à glissière sur le côté et un dessus transparent par lequel il aperçoit une personne à l'intérieur. Un homme est déjà à terre, « habillé d'une combinaison semble-t-il, tête nue, les mains vides », d'environ un mètre « mais de corpulence assez importante ». Prévenu par le passager, il remonte aussitôt à bord en s'agrippant de la main droite ; un bruit sourd, les six pattes tournent, et l'engin part en oblique, hors de vue au bout de 10 à 15 m, à 6 à 8 m de hauteur, « pire qu'un éclair ». Il ne parle ni de tube ni d'immobilisation. Le témoin reste à 60 m, ce qu'il dit sur le moment. L'engin est le modèle de l'autre version (sa forme, ses pieds et son pivot sont dans cette déclaration) ; le passager dans le dôme est posé là où le dôme le laisse voir et modelé comme l'homme à terre, la déclaration ne décrivant pas son aspect. Le lieu figuré est celui du mémorial, en bordure de la D6A.",
    "en": "What Maurice Masse states to the Valensole gendarmerie on 2 July 1965 at 8 pm, then at 11:15 pm (procès-verbal no. 445). He sees the craft from about 60 m, \"the size of a Dauphine car\", of a matt colour, shaped like a rugby ball, with a sliding door on its side and a transparent top through which he sees a person inside. A man is already on the ground, \"dressed in what seems to be a suit, bare-headed, empty-handed\", about a metre tall \"but quite stocky\". Warned by the passenger, he climbs back aboard at once, gripping with his right hand; a dull noise, the six legs turn, and the craft leaves at a slant, out of sight after 10 to 15 m, 6 to 8 m up, \"worse than a flash of lightning\". He mentions neither a tube nor any immobilisation. The witness stays 60 m away, as he says at the time. The craft is the model of the other version (its shape, its legs and its pivot are in this statement); the passenger in the dome is placed where the dome lets him be seen, and is modelled like the man on the ground, the statement not describing his appearance. The place shown is the memorial's, at the edge of the D6A.",
    "es": "Lo que Maurice Masse declara a la gendarmería de Valensole el 2 de julio de 1965 a las 20 h, y luego a las 23:15 (acta n.º 445). Ve la nave a unos 60 m, « del tamaño de un coche Dauphine », de color mate, con forma de balón de rugby, con una puerta corredera en el costado y una parte superior transparente por la que ve a una persona en el interior. Un hombre ya está en el suelo, « vestido con lo que parece un mono, sin nada en la cabeza, con las manos vacías », de aproximadamente un metro « pero bastante corpulento ». Avisado por el pasajero, vuelve a subir enseguida agarrándose con la mano derecha; un ruido sordo, las seis patas giran y la nave se va en oblicuo, fuera de la vista tras 10 a 15 m, a 6 u 8 m de altura, « peor que un relámpago ». No habla ni de tubo ni de inmovilización. El testigo se queda a 60 m. La nave es el modelo de la otra versión.",
    "it": "Ciò che Maurice Masse dichiara alla gendarmeria di Valensole il 2 luglio 1965 alle 20, poi alle 23:15 (verbale n. 445). Vede il velivolo da circa 60 m, « delle dimensioni di una Dauphine », di colore opaco, a forma di pallone da rugby, con una porta scorrevole su un lato e una parte superiore trasparente attraverso la quale scorge una persona all'interno. Un uomo è già a terra, « vestito di quella che sembra una tuta, a capo scoperto, a mani vuote », alto circa un metro « ma piuttosto corpulento ». Avvertito dal passeggero, risale subito a bordo aggrappandosi con la mano destra; un rumore sordo, le sei gambe girano e il velivolo se ne va in obliquo, fuori vista dopo 10-15 m, a 6-8 m di altezza, « peggio di un lampo ». Non parla né di tubo né di immobilizzazione. Il testimone resta a 60 m. Il velivolo è il modello dell'altra versione."
}
# No shapes (nobody drew anything), but two empty keyframes: the length of a recording is read from its
# timeline, and one without any cannot be played past its first instant.
d["timeline"] = {"keyframes": [{"t": 0, "shapes": []}, {"t": DURATION_MS, "shapes": []}]}
first = d["observerTrack"]["keyframes"][0]["pose"]
# The scene's origin is where the walk STARTS (every decor object is placed from it), so the first
# keyframe stays where it was; he walks to 60 m from the craft and stays there.
d["observerTrack"]["keyframes"] = [
    {"t": 0, "pose": first},
    {"t": 20000, "pose": {**first, "lat": WITNESS_LAT, "headingDeg": 180, "pitchDeg": 2}},
    {"t": DURATION_MS, "pose": {**first, "lat": WITNESS_LAT, "headingDeg": 180, "pitchDeg": 2}}
]
if "keyframes" in d.get("weatherTrack", {}):
    d["weatherTrack"]["keyframes"] = [k for k in d["weatherTrack"]["keyframes"] if k["t"] <= DURATION_MS] or d["weatherTrack"]["keyframes"][:1]

craft_size = {"widthM": 3.49, "lengthM": 3.49, "heightM": 2.42}
craft_track = {
    "value": [
        {"t": 0, "eastM": 0, "northM": CRAFT_NORTH_M, "onGround": True, "sizeM": craft_size,
         "appearance": {"color": "#b8b3a6", "albedo": 0.35}, "motions": {"legs-turn": 0}},
        {"t": LEAVES_MS, "eastM": 0, "northM": CRAFT_NORTH_M, "onGround": True, "motions": {"legs-turn": 0}},
        {"t": LEAVES_MS + 1500, "eastM": -4.0, "northM": CRAFT_NORTH_M - 1.5, "altitudeAboveGroundM": 3.0, "motions": {"legs-turn": 0.75}},
        {"t": LEAVES_MS + 2800, "eastM": -9.0, "northM": CRAFT_NORTH_M - 3.0, "altitudeAboveGroundM": 7.0, "motions": {"legs-turn": 1.4}},
        {"t": LEAVES_MS + 3000, "present": False}
    ],
    "basis": "derived",
    "rationale": "The craft of the other version: this statement gives its size by a comparison (\"la grosseur d'une voiture Dauphine\", the same one as the later \"volume d'une Renault Dauphine\"), its shape (a rugby ball), a sliding door on its side, a transparent top, \"six pattes placées au-dessous et un pivot de couleur acier, au centre\", and nothing else, so it is drawn with the same model and size. It stands where the later account puts it, 90 m from the heap of stones; here he is 60 m from it. It leaves \"en oblique\", \"un bruit sourd\", the six legs seeming to turn \"toutes dans le même sens\"; he loses sight of it after 10 to 15 m of its path, 6 to 8 m up. The direction of the path (towards the west-south-west here, as in the later account) is ASSUMED: the statement says only \"en direction de l'Anosque\"."
}
man_track = {
    "value": [
        {"t": 0, "eastM": -1.4, "northM": -88.2, "onGround": True,
         "sizeM": {"widthM": 0.3, "lengthM": 0.28, "heightM": 1.0},
         "attitude": {"headingDeg": 0}, "appearance": {"color": "#6f7263", "albedo": 0.28}},
        {"t": LEAVES_MS - 1000, "eastM": -1.4, "northM": -88.2, "onGround": True},
        {"t": LEAVES_MS - 500, "present": False}
    ],
    "basis": "assumed",
    "rationale": "\"Un homme était déjà à terre. Il était habillé d'une combinaison semble-t-il, tête nue, les mains vides\", \"d'environ un mètre, mais de corpulence assez importante\": one being, a metre tall, stocky, bare-headed, empty-handed, on the ground beside the craft. Where, and which way he faces, are not in the statement: he is put a step in front of the craft on the witness's side. He goes back aboard at once, once the passenger has warned him, just before the craft leaves."
}
passenger_track = {
    "value": [
        {"t": 0, "eastM": 0, "northM": CRAFT_NORTH_M, "altitudeAboveGroundM": 1.68,
         "sizeM": {"widthM": 0.21, "lengthM": 0.2, "heightM": 0.7},
         "attitude": {"headingDeg": 0}, "appearance": {"color": "#6f7263", "albedo": 0.28}},
        {"t": LEAVES_MS, "eastM": 0, "northM": CRAFT_NORTH_M, "altitudeAboveGroundM": 1.68},
        {"t": LEAVES_MS + 1500, "eastM": -4.0, "northM": CRAFT_NORTH_M - 1.5, "altitudeAboveGroundM": 3.0 + 1.68},
        {"t": LEAVES_MS + 2800, "eastM": -9.0, "northM": CRAFT_NORTH_M - 3.0, "altitudeAboveGroundM": 7.0 + 1.68},
        {"t": LEAVES_MS + 3000, "present": False}
    ],
    "basis": "assumed",
    "rationale": "\"Le dessus était en matière transparente par laquelle j'ai aperçu une personne à l'intérieur\": a second being, seen through the transparent top. How he sat, and what he looked like, are not in the statement; he is drawn smaller than the one standing outside, seated so that his head shows through the cupola, and goes with the craft."
}
d["interpretation"] = {
    "title": {
        "fr": "L'engin sur ses six pattes, un homme d'un mètre trapu et tête nue à terre, une personne dans le dôme",
        "en": "The craft on its six legs, a stocky bare-headed man a metre tall on the ground, a person in the dome",
        "es": "La nave sobre sus seis patas, un hombre de un metro, corpulento y sin nada en la cabeza, en el suelo, una persona en la cúpula",
        "it": "Il velivolo sulle sue sei gambe, un uomo alto un metro, corpulento e a capo scoperto, a terra, una persona nella cupola"
    },
    "bodies": [
        {"id": "craft", "title": {"fr": "L'engin", "en": "The craft", "es": "La nave", "it": "Il velivolo"},
         "model": {"id": "ufoathome-valensole-craft"}, "outlineNode": "hull", "track": craft_track},
        {"id": "homme-a-terre", "title": {"fr": "L'homme à terre", "en": "The man on the ground", "es": "El hombre en el suelo", "it": "L'uomo a terra"},
         "model": {"id": "ufoathome-valensole-being-pv-1965-07-02"}, "track": man_track},
        {"id": "passager", "title": {"fr": "Le passager", "en": "The passenger", "es": "El pasajero", "it": "Il passeggero"},
         "model": {"id": "ufoathome-valensole-being-pv-1965-07-02"}, "track": passenger_track}
    ]
}
with open(TARGET, "w", encoding="utf-8") as out:
    out.write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("wrote", os.path.relpath(TARGET, ROOT), len(json.dumps(d)))
