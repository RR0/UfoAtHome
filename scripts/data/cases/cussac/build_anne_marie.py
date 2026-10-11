"""
Derives the Cussac recording of Anne-Marie Delpeuch (9) from her brother's (public/demo-data/observer-cussac.json),
so that the field, the hedge, the beings, the weather and the sphere's path stay the same and only what SHE
says differs. What the GEPAN's 1978 reconstruction (report CNES/CT/GEPAN 140, annex A8, pages A8.26 to A8.35)
records of her, FROM HER OWN POINT, 13 m west of her brother's, "parallèlement à la route":
- the sphere 71.5 m off (his: 82 m), 3 m across (his: 5 m), "argent bleuté", on the ground as bright as the Sun;
- the beings' height "d'après ses indications" 1.20 m, "noir brillant";
- the lift-off at 13, 15 and 17 s over three tries (his: 14 s) and the disappearance at 25, 31 and 35 s (his: 25 s);
  the whistle 12 to 18 s; a spiral that widens about 3 times, at 1 Hz, the same way round as his;
- the sphere's departure "écartée de 7,6° seulement" from his, and the three positions in the meadow the same
  place "à quelques mètres près".
She also said, in the morning, the sphere was 55 m away and 1.5 to 2 m across: what she told the investigators
before they measured; the recording states the MEASURED one.

Her observer's point is the spot of her own survey; every position is stated from there. The sphere is where her
angles put it (71.5 m, azimuth 297.3), not where his do (82 m, 288): the ground-truth contradiction between the
two accounts is the GEPAN's own finding ("quelques mètres près"). The beings and the hedge stay where the first
recording puts them (the same field), and the sphere's climb is his path, moved to her ball and re-timed to her
chronometry (ASSUMED: nobody measured her climb path itself).

Run with: python3 scripts/data/cases/cussac/build_anne_marie.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
SOURCE = os.path.join(ROOT, "public", "demo-data", "observer-cussac.json")
TARGET = os.path.join(ROOT, "public", "demo-data", "observer-cussac-anne-marie.json")

HER_E, HER_N = -12.6, -3.4          # in her brother's frame, 13 m west of him along the road
HER_EYE_M = 1.2
HIS_EYE_M = 1.0
BALL_DIST_M, BALL_AZ, BALL_ALT = 71.5, 297.3, -0.08
LIFT_HIS, LIFT_HER = 14000, 15000
GONE_HIS, GONE_HER = 25000, 30300
END_MS = 32000
LAT, LNG = 44.98127, 2.917384
HER_LAT = LAT + HER_N / 111320.0
HER_LNG = LNG + HER_E / (111320.0 * math.cos(math.radians(LAT)))


def warp(t):
    if t < LIFT_HIS:
        return t
    return round(LIFT_HER + (t - LIFT_HIS) * (GONE_HER - LIFT_HER) / (GONE_HIS - LIFT_HIS))


def world(az, alt, dist, eye, origin=(0.0, 0.0)):
    a, h = math.radians(az), math.radians(alt)
    return (origin[0] + dist * math.cos(h) * math.sin(a), origin[1] + dist * math.cos(h) * math.cos(a), eye + dist * math.sin(h))


def seen_from_her(p):
    de, dn, dz = p[0] - HER_E, p[1] - HER_N, p[2] - HER_EYE_M
    flat = math.hypot(de, dn)
    return (round(math.degrees(math.atan2(de, dn)) % 360, 2), round(math.degrees(math.atan2(dz, flat)), 2), round(math.sqrt(flat * flat + dz * dz), 1))


d = json.load(open(SOURCE, encoding="utf-8"))
d["id"] = "1967-08-29-DelpeuchAnneMarie"
d.pop("image", None)  # her own photograph, written by scripts/share-cards/ShareCards.ts once this is generated
d["observer"] = {"id": "DelpeuchAnneMarie", "title": "Anne-Marie Delpeuch"}
d["account"] = {"observerAgeYears": 9, "source": "on-site", "followedUp": True}
d["durationSeconds"] = END_MS // 1000
d["place"] = [{
    "value": {"lat": round(HER_LAT, 6), "lng": round(HER_LNG, 6)},
    "basis": "derived",
    "rationale": "Her brother's spot (the dossier's Plan.kml) moved 13 m west along the road: the GEPAN had her place her own point \"dans le champ à 13 m à l'ouest de celui déterminé par son frère, parallèlement à la route\" (annex A8, p. A8.26), the point it then measured her angles from. The spot is the same as the other recording's, 13 m along."
}]
d["description"] = {
    "fr": "Vue d'Anne-Marie Delpeuch, 9 ans, la sœur de François, qui joue aux cartes avec lui derrière le muret, puis se lève et regarde à son tour. La GÉOMÉTRIE est celle de son propre relevé au théodolite par le GEPAN en avril 1978 (rapport CNES/CT/GEPAN 140, annexe A8), depuis le point qu'elle a elle-même placé à 13 m à l'ouest de celui de son frère, parallèlement à la route : la sphère à 71,5 m (82 m pour lui), de 3 m de diamètre (5 m pour lui), à peu de mètres du même endroit du pré (les trois positions sont « à quelques mètres près au même endroit », écrit le GEPAN), « argent bleuté », aussi lumineuse que le Soleil au sol. Ses propres chronométrages : décollage à 13, 15 et 17 s (15 s retenus), disparition à 25, 31 et 35 s (30,3 s retenus), sifflement de 12 à 18 s, spirale élargie environ trois fois, à 1 Hz, dans le même sens que celle de son frère. Les êtres sont les mêmes que dans l'autre compte rendu, de 1,20 m « d'après ses indications », « noir brillant ». Elle les regarde de plus loin que lui et debout dans le pré, derrière le muret. RECONSTITUÉ : la trajectoire de la montée est celle du compte rendu de François, déplacée sur sa sphère et recalée sur ses durées ; personne n'a relevé la sienne. Elle dira aussi, avant mesure, que la sphère était à 55 m et de 1,5 à 2 m de diamètre : l'enregistrement énonce les valeurs mesurées. Non représentés : les béquilles qu'elle seule voit à terre, le « nez pointu » du dernier être, l'odeur (elle n'en reconnaît aucune au test du GEPAN).",
    "en": "Anne-Marie Delpeuch's view, aged nine, François's sister, who plays cards with him behind the wall, then stands up and looks in her turn. The GEOMETRY is that of her own theodolite survey by the GEPAN in April 1978 (report CNES/CT/GEPAN 140, annex A8), from the point she herself placed 13 m west of her brother's, along the road: the sphere 71.5 m off (82 m for him), 3 m across (5 m for him), within a few metres of the same place in the meadow (the three positions are \"à quelques mètres près au même endroit\", the GEPAN writes), \"bluish silver\", as bright as the Sun on the ground. Her own timings: lift-off at 13, 15 and 17 s (15 s kept), disappearance at 25, 31 and 35 s (30.3 s kept), whistling from 12 to 18 s, a spiral widening about three times, at 1 Hz, the same way round as her brother's. The beings are the same as in the other account, 1.20 m \"according to her indications\", \"bright black\". She sees them from further off than he does, standing in the meadow behind the wall. RECONSTRUCTED: the path of the climb is the one of François's account, moved onto her sphere and re-timed to her chronometry; nobody surveyed hers. She also said, before it was measured, that the sphere was 55 m off and 1.5 to 2 m across: the recording states the measured values. Not shown: the crutches only she saw on the ground, the last being's \"pointed nose\", the smell (she recognised none in the GEPAN's test).",
    "es": "Vista de Anne-Marie Delpeuch, 9 años, hermana de François, que juega a las cartas con él tras el muro, luego se levanta y mira a su vez. La GEOMETRÍA es la de su propio levantamiento con teodolito por el GEPAN en abril de 1978 (informe CNES/CT/GEPAN 140, anexo A8), desde el punto que ella misma situó a 13 m al oeste del de su hermano: la esfera a 71,5 m (82 m para él), de 3 m de diámetro (5 m para él), « argénteo azulado ». Sus cronometrajes: despegue a 13, 15 y 17 s, desaparición a 25, 31 y 35 s, silbido de 12 a 18 s. Los seres son los mismos que en el otro relato. RECONSTRUIDO: la trayectoria del ascenso es la del relato de François, trasladada a su esfera y reajustada a sus tiempos.",
    "it": "Veduta di Anne-Marie Delpeuch, 9 anni, sorella di François, che gioca a carte con lui dietro il muretto, poi si alza e guarda a sua volta. La GEOMETRIA è quella del suo rilievo al teodolite del GEPAN dell'aprile 1978 (rapporto CNES/CT/GEPAN 140, allegato A8), dal punto che lei stessa ha posto a 13 m a ovest di quello del fratello: la sfera a 71,5 m (82 m per lui), di 3 m di diametro (5 m per lui), « argento bluastro ». I suoi cronometraggi: decollo a 13, 15 e 17 s, scomparsa a 25, 31 e 35 s, fischio da 12 a 18 s. Gli esseri sono gli stessi dell'altro racconto. RICOSTRUITO: la traiettoria della salita è quella del racconto di François, spostata sulla sua sfera e riadattata ai suoi tempi."
}

# Nobody drew anything for her: empty keyframes, so that the recording has a length (see the Valensole one).
d["timeline"] = {"keyframes": [{"t": 0, "shapes": []}, {"t": END_MS, "shapes": []}]}
pose = {"lat": round(HER_LAT, 6), "lng": round(HER_LNG, 6), "elevationM": HER_EYE_M, "headingDeg": 297, "pitchDeg": 2, "fovDeg": 60}
d["observerTrack"] = {"keyframes": [{"t": 0, "pose": pose}, {"t": END_MS, "pose": pose}]}
# The view his references (a photo with his drawing over it) and his milestones are his.
del d["references"]
del d["milestones"]
d["soundTrack"] = {"keyframes": [
    {"t": 0, "sound": {"kind": "none", "volume": 0, "pitchHz": 0}},
    {"t": LIFT_HER, "sound": {"kind": "whistle", "volume": 0.45, "pitchHz": 2400}},
    {"t": GONE_HER, "sound": {"kind": "whistle", "volume": 0.55, "pitchHz": 3200}},
    {"t": GONE_HER + 300, "sound": {"kind": "none", "volume": 0, "pitchHz": 0}}
]}
d["weatherTrack"]["keyframes"][-1]["t"] = END_MS - 1000 if len(d["weatherTrack"]["keyframes"]) > 1 else d["weatherTrack"]["keyframes"][-1]["t"]

# Everything fixed in the field is stated from HER point now: her brother's moves from the origin to where he stands.
for o in d["decor"]:
    if o["id"] == "anne-marie":
        o.clear()
        o.update({
            "id": "francois", "kind": "observer",
            "title": {"fr": "François Delpeuch (13 ans et demi), 13 m à l'est", "en": "François Delpeuch (13½), 13 m to the east", "es": "François Delpeuch (13 y medio), 13 m al este", "it": "François Delpeuch (13 e mezzo), 13 m a est"},
            "eastM": 0, "northM": 0, "headingDeg": 288, "sizeM": {"heightM": 1.55},
            "model": {"id": "ufoathome-cussac-francois"}
        })
    o["eastM"] = round(o["eastM"] - HER_E, 2)
    o["northM"] = round(o["northM"] - HER_N, 2)
bodies = d["interpretation"]["bodies"]
d["interpretation"]["title"] = {
    "fr": "Une sphère de trois mètres posée dans le pré, et quatre êtres qui y plongent",
    "en": "A three-metre sphere standing in the meadow, and four beings who dive into it",
    "es": "Una esfera de tres metros posada en el prado, y cuatro seres que se zambullen en ella",
    "it": "Una sfera di tre metri posata nel prato, e quattro esseri che vi si tuffano dentro"
}

# The sphere: her ball position by her own angles, then her brother's climb, moved onto it and re-timed.
sphere = bodies[0]
his = sphere["track"]["value"]
hisGround = world(his[0]["azimuthDeg"], his[0]["altitudeDeg"], his[0]["distanceM"], HIS_EYE_M)
herBall = world(BALL_AZ, BALL_ALT, BALL_DIST_M, HER_EYE_M, (HER_E, HER_N))
track = []
for k in his:
    t = warp(k["t"])
    if "azimuthDeg" not in k:
        track.append({**k, "t": t})
        continue
    p = world(k["azimuthDeg"], k["altitudeDeg"], k["distanceM"], HIS_EYE_M)
    q = (herBall[0] + p[0] - hisGround[0], herBall[1] + p[1] - hisGround[1], herBall[2] + p[2] - hisGround[2])
    az, alt, dist = seen_from_her(q) if k["t"] >= LIFT_HIS + 500 else (BALL_AZ, BALL_ALT, BALL_DIST_M)
    # Her sphere is 3 m across, not 5; it rises by its centre as his does, so the heights above are the same.
    nk = {**k, "t": t, "azimuthDeg": az, "altitudeDeg": alt, "distanceM": dist}
    if "sizeM" in nk:
        nk["sizeM"] = {"widthM": 3, "lengthM": 3, "heightM": 3}
    if "appearance" in nk and nk["appearance"].get("color") == "#e9ece9":
        nk["appearance"] = {**nk["appearance"], "color": "#dce3ee"}
    track.append(nk)
sphere["track"] = {
    "value": track, "basis": "derived",
    "rationale": "The ground position is the one of her own survey (annex A8: 71.5 m, Ø 3 m, her instrument's azimuth reduced to the true one, 297.3°), "
                 "4.5 m from where her brother's puts it, as the GEPAN says (\"à quelques mètres près au même endroit\"). The climb is the path of the other account, "
                 "moved onto this ground position and re-timed to her chronometry (lift-off 15 s, gone 30.3 s: the means of her three tries). Its shape, its widening "
                 "(about three times her sphere's diameter, \"sens : même sens de rotation que son frère\") and its rate (1 Hz) are hers; the exact path is ASSUMED."
}
for b in bodies[1:]:
    for k in b["track"]:
        k["t"] = warp(k["t"])
        if "eastM" in k:
            # They dive into the sphere, which is where HER angles put it; the rest of the field is stated from her point.
            diving = (k["eastM"], k["northM"]) == (-78, 25.3)
            east, north = (herBall[0], herBall[1]) if diving else (k["eastM"], k["northM"])
            k["eastM"], k["northM"] = round(east - HER_E, 2), round(north - HER_N, 2)
        if "sizeM" in k:
            k["sizeM"] = {**k["sizeM"], "heightM": 1.2}
        if "appearance" in k:
            k["appearance"] = {**k["appearance"], "color": "#101114"}

json.dump(d, open(TARGET, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(TARGET, "a").write("\n")
print("wrote", TARGET, "ball", [round(x, 1) for x in herBall])
