"""Builds the three Braine-le-Comte 2015 recordings and their case from the COBEPS report.

Source: COBEPS_BraineLeComte_20150712.pdf (next to this script; http://www.cobeps.org/pdf/BraineLeComte_20150712.pdf),
Tableau 1 (what each observer gave), Tableau 2 (the investigators' time line), §V.1 (the accounts).

Writes, into ../../../public/demo-data: observer-braine-le-comte-{akh,bjn,fwy}.json and case-braine-le-comte.json.
Only the observers' INITIALS are used, as the report gives them.
"""
import json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "demo-data"))

LAT, LNG = 50.6, 4.1
STEP_MS = 500
LANGS = ("fr", "en", "es", "it")

REPORT = "COBEPS report 20150712BraineleComte"
TABLE1 = f"{REPORT}, table 1"
TABLE2 = f"{REPORT}, table 2"


def stated(v, rationale=None):
    return {"value": v, "basis": "stated", **({"rationale": rationale} if rationale else {})}


def derived(v, rationale):
    return {"value": v, "basis": "derived", "rationale": rationale}


def assumed(v, rationale):
    return {"value": v, "basis": "assumed", "rationale": rationale}


# ----- sky geometry -------------------------------------------------------------------------------

def unit(az, alt):
    a, h = math.radians(az), math.radians(alt)
    return (math.cos(h) * math.sin(a), math.cos(h) * math.cos(a), math.sin(h))


def azalt(u):
    return (math.degrees(math.atan2(u[0], u[1])) % 360, math.degrees(math.asin(max(-1, min(1, u[2])))))


def separation(p, q):
    d = sum(a * b for a, b in zip(unit(*p), unit(*q)))
    return math.degrees(math.acos(max(-1, min(1, d))))


def slerp(p, q, f):
    u, v = unit(*p), unit(*q)
    omega = math.acos(max(-1, min(1, sum(a * b for a, b in zip(u, v)))))
    if omega < 1e-9:
        return p
    s = math.sin(omega)
    a, b = math.sin((1 - f) * omega) / s, math.sin(f * omega) / s
    return azalt(tuple(a * x + b * y for x, y in zip(u, v)))


def sky_path(waypoints, step_ms=STEP_MS):
    """Samples of a flight that goes through the waypoints [(t_ms, az, alt, width_deg)] on great circles
    (a straight flight seen from one point is one), at the constant angular speed the report assumes
    (§V.4.1). Every waypoint is a sample; the others fall on multiples of step_ms."""
    times = sorted({w[0] for w in waypoints} | {t for t in range(waypoints[0][0], waypoints[-1][0] + 1)
                                                if t % step_ms == 0})
    samples = []
    for t in times:
        for (t0, az0, alt0, w0), (t1, az1, alt1, w1) in zip(waypoints, waypoints[1:]):
            if t0 <= t <= t1:
                f = (t - t0) / (t1 - t0)
                az, alt = slerp((az0, alt0), (az1, alt1), f)
                samples.append({"t": t, "az": az, "alt": alt, "w": w0 + (w1 - w0) * f,
                                "waypoint": any(t == w[0] for w in waypoints)})
                break
    # the screen angle of the tip: the direction of travel, clockwise from the zenith
    raw = []
    for i, s in enumerate(samples):
        a, b = samples[max(i - 1, 0)], samples[min(i + 1, len(samples) - 1)]
        d_az = ((b["az"] - a["az"] + 540) % 360) - 180
        raw.append(math.atan2(d_az * math.cos(math.radians(s["alt"])), b["alt"] - a["alt"]))
    for i in range(1, len(raw)):   # unwrapped, so that interpolating between two keyframes never spins
        while raw[i] - raw[i - 1] > math.pi:
            raw[i] -= 2 * math.pi
        while raw[i] - raw[i - 1] < -math.pi:
            raw[i] += 2 * math.pi
    for s, angle in zip(samples, raw):
        s["angle"] = angle
    return samples


# ----- the boomerang ------------------------------------------------------------------------------

class Boomerang:
    """A V pointing forward, rounded, drawn from a centre line: a half apex angle of 50 degrees (obtuse, "angle obtus" for BJN), an arm
    a third of the span thick, a wing more than a stroke (BJN: "cerf-volant, deltaplane"; AKH: "masse compacte, dense").
    Work in box units (the box is 1 wide); u is to the right, v forward."""
    HALF_APEX = math.radians(50)
    THICKNESS = 0.34

    def __init__(self):
        arm = 0.5 / math.sin(self.HALF_APEX)
        self.centre = [(-0.5, -arm * math.cos(self.HALF_APEX)), (0.0, 0.0), (0.5, -arm * math.cos(self.HALF_APEX))]
        h = self.THICKNESS / 2
        (p0, p1, p2) = self.centre
        d1, d2 = self._dir(p0, p1), self._dir(p1, p2)
        n1, n2 = (-d1[1], d1[0]), (-d2[1], d2[0])
        k = 1 + n1[0] * n2[0] + n1[1] * n2[1]
        miter = ((n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k)
        up = [(p0[0] + n1[0] * h, p0[1] + n1[1] * h), (p1[0] + miter[0] * h, p1[1] + miter[1] * h),
              (p2[0] + n2[0] * h, p2[1] + n2[1] * h)]
        down = [(p0[0] - n1[0] * h, p0[1] - n1[1] * h), (p1[0] - miter[0] * h, p1[1] - miter[1] * h),
                (p2[0] - n2[0] * h, p2[1] - n2[1] * h)]
        # left normal of a left-to-right walk is the FORWARD side, so `up` is the leading edge
        self.leading, self.rear = up, down
        cap = lambda c, a0: [(c[0] + h * math.cos(a0 - math.pi * i / 8), c[1] + h * math.sin(a0 - math.pi * i / 8))
                             for i in range(1, 8)]
        a_end = math.atan2(n2[1], n2[0])
        a_start = math.atan2(-n1[1], -n1[0])
        outline = up + cap(p2, a_end) + down[::-1] + cap(p0, a_start)
        for _ in range(2):   # Chaikin: the report says "bords arrondis"
            smoothed = []
            for (x0, y0), (x1, y1) in zip(outline, outline[1:] + outline[:1]):
                smoothed += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
            outline = smoothed
        xs, ys = [p[0] for p in outline], [p[1] for p in outline]
        self.x0, self.x1, self.y0, self.y1 = min(xs), max(xs), min(ys), max(ys)
        self.box_w = self.x1 - self.x0
        self.box_h = self.y1 - self.y0
        self.outline = outline

    @staticmethod
    def _dir(a, b):
        n = math.hypot(b[0] - a[0], b[1] - a[1])
        return ((b[0] - a[0]) / n, (b[1] - a[1]) / n)

    def polygon_points(self):
        """Pixels in a box 100 wide, y down, tip at the top."""
        return [{"x": round((x - self.x0) / self.box_w * 100, 2), "y": round((self.y1 - y) / self.box_w * 100, 2)}
                for x, y in self.outline]

    @property
    def aspect(self):
        return self.box_h / self.box_w

    def local(self, u, v):
        """Box-relative position (centre 0, 1 = the box's width) of a point in the raw frame."""
        return ((u - (self.x0 + self.x1) / 2) / self.box_w, (v - (self.y0 + self.y1) / 2) / self.box_w)

    def along(self, polyline, n, jitter=0.0, rng=None):
        """n points along a polyline, evenly by length (or perturbed by jitter, a share of the spacing)."""
        lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(polyline, polyline[1:])]
        total = sum(lengths)
        points = []
        for i in range(n):
            s = (i + 0.5) / n if jitter else i / (n - 1)
            if jitter:
                s += (rng.random() - 0.5) * jitter / n
            s *= total
            for (a, b), length in zip(zip(polyline, polyline[1:]), lengths):
                if s <= length + 1e-12:
                    f = s / length
                    points.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
                    break
                s -= length
        return points


BOOMERANG = Boomerang()


def place(sample, offset_box, width_deg):
    """Sky direction of a point fixed on the boomerang: offset_box is (u, v) in box widths, the boomerang
    being `width_deg` wide, turned by the sample's angle."""
    u, v = offset_box[0] * width_deg, offset_box[1] * width_deg
    c, s = math.cos(sample["angle"]), math.sin(sample["angle"])
    x, y = u * c + v * s, -u * s + v * c
    return (sample["az"] + x / max(math.cos(math.radians(sample["alt"])), 0.05), sample["alt"] + y)


# ----- the texts ----------------------------------------------------------------------------------

def said(**kw):
    return {lang: kw[lang] for lang in LANGS}


MILESTONES = {
    "AKH": [
        (0, said(fr="Il repère le phénomène au sud-ouest, bas sur l'horizon, et alerte les deux autres.",
                 en="He spots the phenomenon in the south-west, low over the horizon, and calls the other two.",
                 es="Ve el fenómeno al suroeste, bajo sobre el horizonte, y avisa a los otros dos.",
                 it="Nota il fenomeno a sud-ovest, basso sull'orizzonte, e avverte gli altri due.")),
        (8437, said(fr="En s'éloignant vers le nord-ouest, à 31° de hauteur, il croit distinguer des petites lumières rouges fixes sur la tranche arrière.",
                    en="As it moves away to the north-west, 31° up, he seems to make out small steady red lights along the rear edge.",
                    es="Al alejarse hacia el noroeste, a 31° de altura, cree distinguir pequeñas luces rojas fijas en el canto trasero.",
                    it="Mentre si allontana verso nord-ovest, a 31° di altezza, gli sembra di distinguere piccole luci rosse fisse sul bordo posteriore.")),
        (10000, said(fr="Il disparaît derrière les toits des maisons d'en face, à 13° de hauteur.",
                     en="It disappears behind the roofs of the houses opposite, 13° up.",
                     es="Desaparece tras los tejados de las casas de enfrente, a 13° de altura.",
                     it="Scompare dietro i tetti delle case di fronte, a 13° di altezza."))],
    "BJN": [
        (0, said(fr="AKH dit « regardez, c'est bizarre ! » : BJN regarde alors vers le nord-est.",
                 en="AKH says “look, that's odd!”: BJN is then looking north-east.",
                 es="AKH dice «¡mirad, qué raro!»: BJN mira entonces hacia el nordeste.",
                 it="AKH dice «guardate, è strano!»: BJN guarda allora verso nord-est.")),
        (2000, said(fr="Il se retourne et voit le phénomène à 42° de hauteur (temps estimé par les enquêteurs).",
                    en="He turns round and sees the phenomenon 42° up (a time the investigators estimated).",
                    es="Se da la vuelta y ve el fenómeno a 42° de altura (tiempo estimado por los investigadores).",
                    it="Si volta e vede il fenomeno a 42° di altezza (tempo stimato dagli investigatori).")),
        (6000, said(fr="Le phénomène lui paraît au plus proche : à 60° de hauteur, presque à la verticale.",
                    en="The phenomenon looks closest to him: 60° up, almost overhead.",
                    es="El fenómeno le parece lo más cercano: a 60° de altura, casi en la vertical.",
                    it="Il fenomeno gli appare al punto più vicino: a 60° di altezza, quasi allo zenit.")),
        (10000, said(fr="Il n'est plus qu'un point plus petit qu'une bille, à 13° de hauteur, et disparaît.",
                     en="It is no more than a dot smaller than a marble, 13° up, and gone.",
                     es="No es más que un punto más pequeño que una canica, a 13° de altura, y desaparece.",
                     it="Non è più che un punto più piccolo di una biglia, a 13° di altezza, e scompare."))],
    "FWY": [
        (0, said(fr="AKH dit de regarder : FWY regarde alors vers le nord-nord-ouest.",
                 en="AKH tells them to look: FWY is then looking north-north-west.",
                 es="AKH dice que miren: FWY mira entonces hacia el nornoroeste.",
                 it="AKH dice di guardare: FWY guarda allora verso nord-nord-ovest.")),
        (3000, said(fr="Il se retourne, de tout le corps : il voit à l'ouest, à 20° de hauteur, une forme plus noire que le ciel portée par des lumières orange.",
                    en="He turns round, his whole body: he sees in the west, 20° up, a shape blacker than the sky carrying orange lights.",
                    es="Se da la vuelta, con todo el cuerpo: ve al oeste, a 20° de altura, una forma más negra que el cielo con luces naranjas.",
                    it="Si volta, con tutto il corpo: vede a ovest, a 20° di altezza, una forma più nera del cielo con luci arancioni.")),
        (8000, said(fr="Elle disparaît « comme ça », à 12° de hauteur, pendant qu'il cligne des yeux.",
                    en="It disappears “just like that”, 12° up, while he blinks.",
                    es="Desaparece «así, de golpe», a 12° de altura, mientras parpadea.",
                    it="Scompare «così», a 12° di altezza, mentre sbatte le palpebre."))],
}

# ----- the observers ------------------------------------------------------------------------------

# Where each stands, in metres east/north of the observer being replayed's own place. The report gives
# 130 cm between AKH and FWY, 180 cm to BJN, and a line "globalement parallèle au sens du déplacement"
# (N 7.7 deg E): taken as north-south, AKH at the south end facing SW, FWY to his north facing NNW, BJN to
# FWY's north facing NE. Their exact places were not agreed on by the observers themselves (figure 7).
STAND = {"AKH": (0.0, 0.0), "FWY": (0.0, 1.3), "BJN": (0.0, 3.1)}
FACING = {"AKH": 215.0, "FWY": 337.5, "BJN": 45.0}
AGE = {"AKH": 40, "BJN": None, "FWY": 17}

OBSERVERS = {
    "AKH": {
        "account_fr": ("« Nous observions le ciel depuis quelques minutes lorsque j'ai remarqué l'arrivée au sud-ouest de quelque "
                       "chose que je ne pouvais définir, et j'ai invité mon compagnon et mon neveu à le regarder également. Il "
                       "s'agissait d'une forme de boomerang qui se détachait faiblement mais de façon certaine du ciel étoilé, "
                       "mais ne semblait initialement pas émettre de lumière. [...] le phénomène avançait « pointe en avant » "
                       "suivant une trajectoire rectiligne. Lorsqu'il s'est éloigné de nous vers le nord-ouest, il m'a semblé "
                       "distinguer toute une série de petites lumières rouges fixes distribuées sur toute la « tranche » "
                       "arrière, mais avec comme des turbulences, comme si ces lumières étaient partiellement/successivement "
                       "masquées par quelque chose qui passait devant elles. [...] Nous n'avons pas entendu le moindre bruit. "
                       "[...] Le phénomène est sorti de notre champ de vision en s'éloignant derrière une rangée de maisons. »"),
        "account_en": ("“We had been watching the sky for a few minutes when I noticed the arrival, in the south-west, of something "
                       "I could not define, and I asked my partner and my nephew to look at it too. It was a boomerang shape that "
                       "stood out faintly but definitely against the starry sky, yet did not seem at first to emit any light. "
                       "[...] the phenomenon moved forward ‘tip first’ along a straight path. As it moved away from us towards the "
                       "north-west, I seemed to make out a whole series of small steady red lights spread along the whole rear "
                       "‘edge’, but with something like turbulence, as if the lights were partly or successively hidden by "
                       "something passing in front of them. [...] We did not hear the slightest noise. [...] The phenomenon left "
                       "our field of view by moving away behind a row of houses.”"),
        "account_es": ("«Llevábamos unos minutos observando el cielo cuando noté la llegada, por el suroeste, de algo que no podía "
                       "definir, e invité a mi pareja y a mi sobrino a mirarlo también. Era una forma de bumerán que se "
                       "distinguía débilmente pero con seguridad del cielo estrellado, aunque al principio no parecía emitir luz. "
                       "[...] el fenómeno avanzaba «con la punta por delante» siguiendo una trayectoria rectilínea. Cuando se "
                       "alejó de nosotros hacia el noroeste, me pareció distinguir toda una serie de pequeñas luces rojas fijas "
                       "repartidas por todo el «canto» trasero, pero con como turbulencias, como si esas luces estuvieran "
                       "parcial o sucesivamente tapadas por algo que pasaba delante. [...] No oímos el menor ruido. [...] El "
                       "fenómeno salió de nuestro campo de visión alejándose tras una hilera de casas.»"),
        "account_it": ("«Osservavamo il cielo da qualche minuto quando ho notato l'arrivo, a sud-ovest, di qualcosa che non riuscivo a "
                       "definire, e ho invitato il mio compagno e mio nipote a guardarlo anche loro. Era una forma di boomerang che "
                       "si staccava debolmente ma con certezza dal cielo stellato, ma all'inizio non sembrava emettere luce. [...] "
                       "il fenomeno avanzava «a punta avanti» lungo una traiettoria rettilinea. Quando si è allontanato da noi "
                       "verso nord-ovest, mi è sembrato di distinguere tutta una serie di piccole luci rosse fisse distribuite "
                       "su tutto il «bordo» posteriore, ma con come delle turbolenze, come se quelle luci fossero in parte o "
                       "successivamente coperte da qualcosa che passava davanti. [...] Non abbiamo sentito il minimo rumore. [...] "
                       "Il fenomeno è uscito dal nostro campo visivo allontanandosi dietro una fila di case.»"),
        "occupation": said(fr="fonctionnaire européen, astronome amateur", en="European civil servant, amateur astronomer",
                           es="funcionario europeo, astrónomo aficionado", it="funzionario europeo, astronomo dilettante"),
        "index": "pp. 11-13, 18-21",
    },
    "BJN": {
        "account_fr": ("« Puis AKH a dit « regardez, c'est bizarre ! ». À cet instant, je me suis retourné et j'ai vu au loin un "
                       "objet passer rapidement aux environs de 100 mètres de hauteur au-delà du chemin de fer (distance "
                       "difficile à évaluer). La trajectoire était linéaire, direction sud-sud-ouest vers nord-nord-est. [...] "
                       "L'objet était plus clair que noir avec une légère phosphorescence, ou une impression de presque vibration "
                       "comme un écran de télévision (quelque chose d'électrique). La texture avait l'air d'un métal sombre. "
                       "[...] La forme ressemblait à un cerf-volant, un deltaplane ou un boomerang avec un angle obtus. [...] Je "
                       "n'ai vu aucun spot de lumière, ni de flash. La scène a duré environ 10 secondes, le temps de voir l'objet "
                       "traverser tout le ciel. Il n'y a eu aucun bruit. »"),
        "account_en": ("“Then AKH said ‘look, that's odd!’. At that moment I turned round and saw in the distance an object pass "
                       "quickly at around 100 metres' height beyond the railway (a distance hard to judge). The path was linear, "
                       "from south-south-west towards north-north-east. [...] The object was lighter than black with a slight "
                       "phosphorescence, or an impression of almost vibrating like a television screen (something electric). "
                       "The texture looked like a dark metal. [...] The shape looked like a kite, a hang glider or a boomerang "
                       "with an obtuse angle. [...] I saw no spot of light, no flash. The scene lasted about 10 seconds, the time "
                       "to see the object cross the whole sky. There was no noise.”"),
        "account_es": ("«Entonces AKH dijo «¡mirad, qué raro!». En ese instante me di la vuelta y vi a lo lejos un objeto pasar "
                       "rápidamente a unos 100 metros de altura más allá de la vía del tren (distancia difícil de evaluar). La "
                       "trayectoria era lineal, de sur-suroeste a nor-noreste. [...] El objeto era más claro que negro, con una "
                       "ligera fosforescencia, o una impresión de casi vibración como una pantalla de televisión (algo eléctrico). "
                       "La textura parecía de un metal oscuro. [...] La forma se parecía a una cometa, un ala delta o un bumerán "
                       "con un ángulo obtuso. [...] No vi ningún punto de luz ni destello. La escena duró unos 10 segundos, el "
                       "tiempo de ver el objeto cruzar todo el cielo. No hubo ningún ruido.»"),
        "account_it": ("«Poi AKH ha detto «guardate, è strano!». In quel momento mi sono voltato e ho visto in lontananza un oggetto "
                       "passare velocemente a circa 100 metri di altezza oltre la ferrovia (distanza difficile da valutare). La "
                       "traiettoria era lineare, da sud-sud-ovest verso nord-nord-est. [...] L'oggetto era più chiaro che nero, con "
                       "una leggera fosforescenza, o un'impressione di quasi vibrazione come uno schermo televisivo (qualcosa di "
                       "elettrico). La texture sembrava di un metallo scuro. [...] La forma somigliava a un aquilone, a un "
                       "deltaplano o a un boomerang con un angolo ottuso. [...] Non ho visto nessun punto di luce, né lampi. La "
                       "scena è durata circa 10 secondi, il tempo di vedere l'oggetto attraversare tutto il cielo. Non c'è stato "
                       "alcun rumore.»"),
        "occupation": said(fr="professeur de musique (conservatoire), porte des lunettes",
                           en="music teacher (conservatoire), wears glasses",
                           es="profesor de música (conservatorio), lleva gafas", it="insegnante di musica (conservatorio), porta gli occhiali"),
        "index": "pp. 13-14, 18-21",
    },
    "FWY": {
        "account_fr": ("« [...] AKH a vu quelque chose et nous dit de regarder. Donc, le temps que je me retourne, et tout ça, je n'ai "
                       "pas vu très longtemps, enfin deux ou trois secondes, une forme un peu plus noire que le ciel, mais il y "
                       "avait des lumières orange, qui formaient, je vais faire une comparaison pour la forme : un boomerang. "
                       "Donc, les lumières s'allumaient, comme une sorte de boomerang qui se dirigeait vers l'horizon. Et puis à "
                       "un moment a disparu. » À l'entretien, il précise que l'ensemble était composé de cinq à sept sphères "
                       "lumineuses orange, d'une luminosité uniforme et faible qu'il compare à du feu, régulièrement espacées, "
                       "sur un support plus foncé que le ciel ; qu'il n'a pas fait attention à la forme mais à l'alignement ; "
                       "qu'il ne s'éloignait pas quand il a disparu : il a dû cligner des yeux, et pendant ce clignement il n'y "
                       "avait plus rien à observer."),
        "account_en": ("“[...] AKH saw something and told us to look. So, by the time I turned round and all that, I did not see for "
                       "very long, well two or three seconds, a shape a bit blacker than the sky, but there were orange lights, "
                       "which formed, to make a comparison for the shape: a boomerang. So the lights came on, like a sort of "
                       "boomerang heading for the horizon. And then at some point it disappeared.” At the interview he adds that "
                       "it was made of five to seven orange luminous spheres, of uniform and faint brightness, which he compares "
                       "to fire, evenly spaced on a support darker than the sky; that he paid attention not to the shape but to "
                       "the alignment; that it was not moving away when it disappeared: he must have blinked, and during that "
                       "blink there was nothing left to see."),
        "account_es": ("«[...] AKH vio algo y nos dijo que miráramos. Así que, el tiempo de darme la vuelta y todo eso, no vi muy "
                       "mucho, bueno dos o tres segundos, una forma un poco más negra que el cielo, pero había luces naranjas, "
                       "que formaban, voy a hacer una comparación para la forma: un bumerán. O sea, las luces se encendían, como "
                       "una especie de bumerán que se dirigía hacia el horizonte. Y luego en un momento desapareció.» En la "
                       "entrevista precisa que el conjunto estaba compuesto de cinco a siete esferas luminosas naranjas, de "
                       "luminosidad uniforme y débil que compara con fuego, espaciadas con regularidad, sobre un soporte más "
                       "oscuro que el cielo; que no se fijó en la forma sino en la alineación; que no se alejaba cuando "
                       "desapareció: debió de parpadear, y durante ese parpadeo ya no había nada que observar."),
        "account_it": ("«[...] AKH ha visto qualcosa e ci ha detto di guardare. Quindi, il tempo di voltarmi e tutto il resto, non ho "
                       "visto molto a lungo, insomma due o tre secondi, una forma un po' più nera del cielo, ma c'erano luci "
                       "arancioni, che formavano, faccio un paragone per la forma: un boomerang. Quindi le luci si accendevano, "
                       "come una specie di boomerang che si dirigeva verso l'orizzonte. E poi a un certo punto è scomparso.» "
                       "All'intervista precisa che l'insieme era composto da cinque a sette sfere luminose arancioni, di "
                       "luminosità uniforme e debole che paragona al fuoco, regolarmente distanziate, su un supporto più scuro "
                       "del cielo; che non ha badato alla forma ma all'allineamento; che non si allontanava quando è scomparso: "
                       "deve aver sbattuto le palpebre, e durante quel battito non c'era più nulla da osservare."),
        "occupation": said(fr="étudiant, filleul d'AKH", en="student, AKH's godson", es="estudiante, ahijado de AKH",
                           it="studente, figlioccio di AKH"),
        "index": "pp. 14-16, 18-21",
    },
}

SOURCE = {
    "title": "Boomerang survolant Braine-le-Comte (N° COBEPS 20150712BraineleComte)",
    "authors": ["Jean-Marc Wattecamps", "Karine Faucher", "Philippe Perbet"],
    "url": "http://www.cobeps.org/pdf/BraineLeComte_20150712.pdf",
    "publication": {"publisher": "COBEPS", "time": "2016-02-12"},
}

# ----- the phenomenon, per observer ---------------------------------------------------------------

def rng_for(key):
    return random.Random(f"braine-le-comte-{key}")


def phenomenon_keyframes(code):
    """Returns (keyframes, order, observer poses). Every shape of the phenomenon is one source; the body
    carries the stated direction, the lights follow it, turned and scaled with it."""
    if code == "AKH":
        a_lights = round(10000 * separation((215, 10), (320, 31)) /
                         (separation((215, 10), (320, 31)) + separation((320, 31), (321.5, 13))))
        waypoints = [(0, 215, 10, 1.5), (a_lights, 320, 31, 2.5), (10000, 321.5, 13, 2.5)]
        first_seen = 0
    elif code == "BJN":
        waypoints = [(2000, 217.5, 42, 2.5), (6000, 295, 60, 5.67), (10000, 12, 13, 1.0)]
        first_seen = 2000
    else:
        waypoints = [(3000, 270, 20, 5.67), (8000, 293, 12, 1.0)]
        first_seen = 3000
    samples = sky_path(waypoints)

    body_id = "pan"
    sources = {body_id: {}}
    rng = rng_for(code)
    lights = []   # [(sourceId, offset in box widths, relative size)]
    if code == "AKH":
        # about a dozen ("une bonne dizaine") small red lights along the whole rear edge, irregular
        offsets = [BOOMERANG.local(*p) for p in BOOMERANG.along(BOOMERANG.rear, 11, jitter=0.9, rng=rng)]
        for i, off in enumerate(offsets):
            lights.append((f"feu-{i + 1}", off, 0.032, 0.25 + 0.4 * rng.random()))
    elif code == "FWY":
        # five ("cinq à sept") orange spheres, evenly spaced along the V, each 1.47 deg at 5.67 deg across
        offsets = [BOOMERANG.local(*p) for p in BOOMERANG.along(BOOMERANG.centre, 5)]
        for i, off in enumerate(offsets):
            lights.append((f"feu-{i + 1}", off, 1.47 / 5.67, 0.35))

    frames = []
    # a fade in before the first sight: nobody says where it was before, so it is not shown
    def shapes_at(sample, transparency, first=False):
        shapes = []
        aim = {"azimuthDeg": round(sample["az"], 3), "altitudeDeg": round(sample["alt"], 3)}
        w = sample["w"]
        body = {"aim": aim, "angle": round(sample["angle"], 4), "transparency": transparency,
                "angular": {"widthDeg": round(w, 3), "heightDeg": round(w * BOOMERANG.aspect, 3)}}
        shapes.append({"sourceId": body_id, "shape": body})
        for sid, off, rel, _ in lights:
            az, alt = place(sample, off, w)
            shapes.append({"sourceId": sid, "shape": {
                "aim": {"azimuthDeg": round(az % 360, 3), "altitudeDeg": round(alt, 3)},
                "transparency": 1 if sample.get("lights_hidden") else transparency,
                "angular": {"widthDeg": round(rel * w, 4), "heightDeg": round(rel * w, 4)}}})
        return shapes

    if code == "AKH":
        for s in samples:
            s["lights_hidden"] = s["t"] < waypoints[1][0]
    first = samples[0]
    if first["t"] > 0:   # nobody says where it was before, so it is not shown until they turn round
        frames.append({"t": first["t"] - 150, "sample": first, "transparency": 1})
    for s in samples:
        frames.append({"t": s["t"], "sample": s, "transparency": 0})
    last, before = samples[-1], samples[-2]
    # one step more along the same heading. FWY says it vanished at once (a blink), the others that it
    # went behind the roofs: their tail sinks for 300 ms and the houses hide it.
    dt = (last["t"] - before["t"]) / 1000
    lead = 0.06 if code == "FWY" else 0.3
    tail = dict(last)
    tail["t"] = last["t"] + round(lead * 1000)
    tail["az"] = (last["az"] + ((last["az"] - before["az"] + 540) % 360 - 180) / dt * lead) % 360
    tail["alt"] = last["alt"] + (last["alt"] - before["alt"]) / dt * lead
    frames.append({"t": tail["t"], "sample": tail, "transparency": 1})
    return frames, shapes_at, lights, samples, waypoints, first_seen


BODY_OPACITY = {
    "AKH": assumed(0.45, "\"se détachait faiblement\", \"à peine perceptible\": a faint patch against the stars; how faint is not stated"),
    "BJN": 1,
    "FWY": 1,
}


def build(code):
    frames, shapes_at, lights, samples, waypoints, first_seen = phenomenon_keyframes(code)
    lights_on = waypoints[1][0] if code == "AKH" else None
    keyframes = []
    wrapped_body_opacity = False
    for i, f in enumerate(frames):
        shapes = shapes_at(f["sample"], f["transparency"])
        for sh in shapes:
            if sh["sourceId"] != "pan":
                continue
            body = sh["shape"]
            if body["transparency"] == 0:   # seen: as opaque as the account says
                opacity = BODY_OPACITY[code]
                if isinstance(opacity, dict):
                    body["transparency"] = round(1 - opacity["value"], 3) if wrapped_body_opacity else \
                        {**opacity, "value": round(1 - opacity["value"], 3)}
                    wrapped_body_opacity = True
            if f["sample"].get("waypoint"):
                rationale = f"{TABLE1}: where {code} puts it at this moment (azimuth, elevation)"
                if code == "AKH" and f["t"] == lights_on:
                    rationale = (f"{TABLE1}: AKH's red lights seen at the rear at azimuth 320, elevation 31; the time is derived, "
                                 "the report assuming a constant angular speed (§V.4.1)")
                if code == "AKH" and f["t"] == 10000:
                    rationale = f"{TABLE1}: AKH's end, azimuth 321-322, elevation 13, after 10 s"
                if code == "BJN" and f["t"] == 6000:
                    rationale = f"{TABLE1}: BJN's \"au plus proche\", azimuth 295, elevation 60; {TABLE2} puts it at 6 s, half way through the time left after T1"
                if code == "FWY" and f["t"] == 8000:
                    rationale = f"{TABLE1}: FWY's end, azimuth 293, elevation 12; 5 s after he turned round, his own duration"
                body["aim"] = stated(body["aim"], rationale)
        keyframes.append({"t": f["t"], "shapes": shapes})
    keyframes[0]["shapes"] = [full_shape(code, sh) for sh in keyframes[0]["shapes"]]
    return keyframes, lights, samples, waypoints, first_seen


def full_shape(code, entry):
    """The first keyframe's shape in full: what it is and how it looks, as far as the account says."""
    sid = entry["sourceId"]
    shape = dict(entry["shape"])
    if sid == "pan":
        look = {
            "AKH": (stated("#bdbaab", f"{TABLE1}: surface \"Pebble grey\" RGB 189 186 171; the written account says a faint grey-orange "
                                      "glow, like a cloud lit by street lamps"),
                    said(fr="Forme de boomerang, faiblement lumineuse", en="Boomerang shape, faintly luminous",
                         es="Forma de bumerán, débilmente luminosa", it="Forma di boomerang, debolmente luminosa")),
            "BJN": (stated("#2b2629", f"{TABLE1}: surface \"Grey brown\" RGB 43 38 41; \"métal sombre\", \"plus clair que noir\""),
                    said(fr="Boomerang (ou cerf-volant, deltaplane)", en="Boomerang (or kite, hang glider)",
                         es="Bumerán (o cometa, ala delta)", it="Boomerang (o aquilone, deltaplano)")),
            "FWY": (stated("#05060a", "\"une forme un peu plus noire que le ciel\""),
                    said(fr="Forme un peu plus noire que le ciel", en="A shape a bit blacker than the sky",
                         es="Una forma un poco más negra que el cielo", it="Una forma un po' più nera del cielo")),
        }[code]
        shape.update({"kind": "polygon", "points": BOOMERANG.polygon_points(), "color": look[0], "title": look[1],
                      "haloScale": 0, "selected": False,
                      "bounds": {"x": 300, "y": 170, "width": 100, "height": round(100 * BOOMERANG.aspect, 2)}})
        return {"sourceId": sid, "shape": shape}
    if code == "AKH":
        shape.update({"kind": "oval", "color": stated("#a3171a", f"{TABLE1}: lights \"Signal red\" RGB 163 23 26"),
                      "haloScale": 1.6, "brightness": 0.4,
                      "title": said(fr="Petite lumière rouge fixe", en="Small steady red light", es="Pequeña luz roja fija",
                                    it="Piccola luce rossa fissa")})
    else:
        shape.update({"kind": "oval", "color": stated("#eb3b1c", f"{TABLE1}: lights \"Traffic orange\" RGB 235 59 28"),
                      "haloScale": 0.6, "brightness": 0,
                      "title": said(fr="Sphère lumineuse orange", en="Orange luminous sphere", es="Esfera luminosa naranja",
                                    it="Sfera luminosa arancione")})
    shape["selected"] = False
    shape["bounds"] = {"x": 320, "y": 180, "width": 2, "height": 2}
    return {"sourceId": sid, "shape": shape}


def poses_for(code, samples, first_seen):
    here = {"lat": LAT, "lng": LNG, "elevationM": 0, "fovDeg": 60}
    poses = []
    facing = FACING[code]
    if code == "AKH":
        pass
    elif code == "BJN":
        poses.append({"t": 0, "pose": {**here,
                                       "headingDeg": stated(facing, "\"BJN [regarde] vers le NE\" (§V.1.3)"),
                                       "pitchDeg": assumed(35, "looking at the stars, constellations (Cassiopeia, Orion): no height stated")}})
        poses.append({"t": 1200, "pose": {**here, "headingDeg": facing, "pitchDeg": 35}})
    else:
        poses.append({"t": 0, "pose": {**here,
                                       "headingDeg": stated(facing, "\"FWY vers le NNO\" (§V.1.3)"),
                                       "pitchDeg": assumed(30, "looking for shooting stars: no height stated")}})
        poses.append({"t": 2200, "pose": {**here, "headingDeg": facing, "pitchDeg": 30}})
    for s in samples:
        pose = {**here, "headingDeg": round(s["az"], 2), "pitchDeg": round(s["alt"], 2)}
        if code == "AKH" and s["t"] == 0:
            pose["headingDeg"] = stated(215, "\"AKH regarde vers le SO\": he faces where he first sees it (table 1, azimuth 215)")
        poses.append({"t": s["t"], "pose": pose})
    return poses


def decor_for(code):
    me = STAND[code]
    things = []
    # the others, as people: their own recording when there is one
    for other in ("AKH", "BJN", "FWY"):
        if other == code:
            continue
        east, north = STAND[other][0] - me[0], STAND[other][1] - me[1]
        things.append({
            "id": f"observer-{other.lower()}", "kind": "observer",
            "title": said(fr=f"{other}, à {math.hypot(east, north):.1f} m".replace(".", ","),
                          en=f"{other}, {math.hypot(east, north):.1f} m away",
                          es=f"{other}, a {math.hypot(east, north):.1f} m".replace(".", ","),
                          it=f"{other}, a {math.hypot(east, north):.1f} m".replace(".", ",")),
            "eastM": round(east, 2), "northM": round(north, 2), "headingDeg": FACING[other],
            "sightingUrl": f"observer-braine-le-comte-{other.lower()}.json",
            "sizeM": {"widthM": 0.5, "lengthM": 0.35, "heightM": 1.7 if other != "FWY" else 1.75}})
    # the roofs they saw it go behind: the same ~12 deg at three different azimuths
    DIST, TOP_ALT, EYE = 40.0, 12.0, 1.6
    roof = round(EYE + DIST * math.tan(math.radians(TOP_ALT)), 1)
    rng = rng_for("roofs")
    az = 278.0
    i = 0
    while az < 36 + 360:
        width = 10.5
        step = math.degrees(width * 0.92 / DIST)
        mid = az + step / 2
        a = math.radians(mid)
        things.append({
            "id": f"toit-{i + 1}", "kind": "building",
            "title": said(fr="Maison d'en face (distance supposée)", en="House opposite (distance assumed)",
                          es="Casa de enfrente (distancia supuesta)", it="Casa di fronte (distanza supposta)"),
            "eastM": round(DIST * math.sin(a), 2), "northM": round(DIST * math.cos(a), 2),
            "headingDeg": round((mid + 90) % 360, 1), "floors": 2,
            "sizeM": {"widthM": width, "lengthM": 9.0, "heightM": round(roof + (rng.random() - 0.5) * 0.3, 1)},
            "occludesSourceIds": None})
        az += step
        i += 1
    return things, roof



# ----- the common plane ---------------------------------------------------------------------------

MEASURED = {"AKH": [(215, 10), (320, 31), (321.5, 13)],
            "BJN": [(217.5, 42), (295, 60), (12, 13)],
            "FWY": [(270, 20), (293, 12)]}
HEIGHT_M = 100.0      # BJN: "aux environs de 100 mètres de hauteur" (COBEPS p. 13), his estimate, not a measure
SPAN_M = 10.5         # what the angular sizes come to on that flight (scripts/build-braine-le-comte-craft.ts)


def jacobi(matrix):
    """Eigenvalues and eigenvectors (columns) of a symmetric 3x3 matrix."""
    a = [row[:] for row in matrix]
    v = [[1.0 if i == j else 0.0 for j in range(3)] for i in range(3)]
    for _ in range(60):
        p, q = max(((i, j) for i in range(3) for j in range(i + 1, 3)), key=lambda ij: abs(a[ij[0]][ij[1]]))
        if abs(a[p][q]) < 1e-14:
            break
        theta = 0.5 * math.atan2(2 * a[p][q], a[q][q] - a[p][p])
        c, s = math.cos(theta), math.sin(theta)
        for k in range(3):
            akp, akq = a[k][p], a[k][q]
            a[k][p], a[k][q] = c * akp - s * akq, s * akp + c * akq
        for k in range(3):
            apk, aqk = a[p][k], a[q][k]
            a[p][k], a[q][k] = c * apk - s * aqk, s * apk + c * aqk
        for k in range(3):
            vkp, vkq = v[k][p], v[k][q]
            v[k][p], v[k][q] = c * vkp - s * vkq, s * vkp + c * vkq
    return [a[i][i] for i in range(3)], v


def fit_plane():
    """The plane through the observer that every measured direction lies closest to, as the report's
    stereonet does: the normal is the direction the measured unit vectors least point along."""
    units = [unit(*p) for points in MEASURED.values() for p in points]
    m = [[sum(u[i] * u[j] for u in units) for j in range(3)] for i in range(3)]
    values, vectors = jacobi(m)
    i = min(range(3), key=lambda k: values[k])
    normal = [vectors[r][i] for r in range(3)]
    if normal[2] < 0:
        normal = [-x for x in normal]
    return normal


PLANE = fit_plane()
STRIKE_DEG = math.degrees(math.atan2(PLANE[1], -PLANE[0])) % 360   # horizontal direction lying in the plane
HEADING_DEG = STRIKE_DEG if (STRIKE_DEG < 90 or STRIKE_DEG > 270) else (STRIKE_DEG + 180) % 360   # northwards, as it went
DIP_DEG = math.degrees(math.acos(PLANE[2]))


def project_on_plane(direction):
    d = sum(a * b for a, b in zip(direction, PLANE))
    v = [a - d * b for a, b in zip(direction, PLANE)]
    length = math.sqrt(sum(x * x for x in v))
    return [x / length for x in v]


def flight_track(code, samples, height=None):
    """That observer's directions, each laid on the common plane and set on the level line 100 m up."""
    height = HEIGHT_M if height is None else height
    track = []
    for s in samples:
        v = project_on_plane(unit(s["az"], s["alt"]))
        if v[2] < 0.02:
            continue
        distance = height / v[2]
        az, alt = azalt(v)
        track.append({"t": s["t"], "azimuthDeg": round(az, 2), "altitudeDeg": round(alt, 2), "distanceM": round(distance, 1)})
    first = track[0]
    track[0] = {**first, "present": True, "sizeM": {"widthM": SPAN_M, "lengthM": round(SPAN_M * BOOMERANG.aspect, 2), "heightM": 1.3},
                "attitude": {"headingDeg": round(HEADING_DEG, 1), "pitchDeg": 0},
                "appearance": {"color": "#2b2629", "albedo": 0.1}}
    lead = []
    if first["t"] > 0:
        lead = [{"t": 0, "azimuthDeg": first["azimuthDeg"], "altitudeDeg": first["altitudeDeg"], "distanceM": first["distanceM"], "present": False}]
    return lead + track


def interpretation_event(code, samples):
    rationale = (f"The measured directions of the three observers ({TABLE1}) are fitted by one plane through the observer, as the report's "
                 f"stereonet does (its strike here: {STRIKE_DEG % 180:.1f} deg, the report's 7.7; dip {DIP_DEG:.0f} deg). The phenomenon is laid on the "
                 f"level line where that plane is {HEIGHT_M:.0f} m up, along each of {code}'s own directions brought onto the plane. "
                 f"The height is BJN's own estimate (COBEPS p. 13), and so the distances and the {SPAN_M} m span that follow from it: assumed.")
    return {
        "type": "event", "eventType": "interpretation", "sighting": f"2015-07-12-BraineLeComte-{code}",
        "title": said(
            fr=f"Un vol rectiligne et horizontal à {HEIGHT_M:.0f} m, dans le plan ajusté sur les trois jeux de mesures (cap {HEADING_DEG:.0f}°)",
            en=f"One straight, level flight {HEIGHT_M:.0f} m up, in the plane fitted to the three sets of measurements (heading {HEADING_DEG:.0f}°)",
            es=f"Un vuelo rectilíneo y horizontal a {HEIGHT_M:.0f} m, en el plano ajustado a los tres conjuntos de mediciones (rumbo {HEADING_DEG:.0f}°)",
            it=f"Un volo rettilineo e orizzontale a {HEIGHT_M:.0f} m, nel piano adattato ai tre insiemi di misure (rotta {HEADING_DEG:.0f}°)"),
        "bodies": [{
            "id": "pan", "explains": ["pan"],
            "title": said(fr="Le phénomène", en="The phenomenon", es="El fenómeno", it="Il fenomeno"),
            "model": {"id": "ufoathome-braine-le-comte-craft"}, "outlineNode": "hull",
            "track": {"value": flight_track(code, samples), "basis": "assumed", "rationale": rationale}}]}


BIRD_HEIGHT_M = 40.0   # the speed of a bird: at 100 m the fitted flight is ~55 m/s (200 km/h), at 40 m ~22 m/s (80 km/h)
BIRD_SPAN_M = round(SPAN_M * BIRD_HEIGHT_M / HEIGHT_M, 1)
BIRDS = 7              # FWY: "cinq à sept" lights, AKH: "une bonne dizaine" of points; a V of seven


def bird_offsets():
    """Seven birds in a V, tip forward: the lead, then a pair at each of three steps back along the arms."""
    half = BOOMERANG.HALF_APEX
    step = (BIRD_SPAN_M / 2) / (3 * math.sin(half))
    offsets = [(0.0, 0.0)]
    for k in (1, 2, 3):
        offsets += [(-k * step * math.sin(half), -k * step * math.cos(half)), (k * step * math.sin(half), -k * step * math.cos(half))]
    return offsets


def bird_event(code, samples):
    heading = math.radians(HEADING_DEG)
    forward, right = (math.sin(heading), math.cos(heading)), (math.cos(heading), -math.sin(heading))
    centre = flight_track(code, samples, BIRD_HEIGHT_M)
    bodies = []
    for index, (u, v) in enumerate(bird_offsets()):
        track = []
        for point in centre:
            az, alt, distance = math.radians(point["azimuthDeg"]), math.radians(point["altitudeDeg"]), point["distanceM"]
            east = distance * math.cos(alt) * math.sin(az) + u * right[0] + v * forward[0]
            north = distance * math.cos(alt) * math.cos(az) + u * right[1] + v * forward[1]
            up = distance * math.sin(alt)
            d = math.sqrt(east * east + north * north + up * up)
            key = {"t": point["t"], "azimuthDeg": round(math.degrees(math.atan2(east, north)) % 360, 2),
                   "altitudeDeg": round(math.degrees(math.asin(up / d)), 2), "distanceM": round(d, 1)}
            if "present" in point:
                key["present"] = point["present"]
            track.append(key)
        track[0] = {**track[0], "present": track[0].get("present", True),
                    "sizeM": {"widthM": 0.9, "lengthM": 0.5, "heightM": 0.15},
                    "attitude": {"headingDeg": round(HEADING_DEG, 1), "pitchDeg": 0},
                    "appearance": {"color": "#4a3a2a", "albedo": 0.25}}
        bodies.append({"id": f"oiseau-{index + 1}",
                       "title": said(fr=f"Oiseau {index + 1}", en=f"Bird {index + 1}", es=f"Ave {index + 1}", it=f"Uccello {index + 1}"),
                       "model": {"id": "ellipsoid"},
                       "track": {"value": track, "basis": "assumed",
                                 "rationale": (f"A flock of {BIRDS} birds in a V {BIRD_SPAN_M} m across, flying the same straight level flight as the fitted one "
                                               f"(see that interpretation) but {BIRD_HEIGHT_M:.0f} m up: the speed it needs there is about 80 km/h, a goose's or a duck's, "
                                               f"where at 100 m it would be 200 km/h. Each bird 0.9 m across (a duck's wings) and lit from below, dark. "
                                               f"None of it is stated by the report, which does not examine this hypothesis.")}})
    return {
        "type": "event", "eventType": "interpretation", "sighting": f"2015-07-12-BraineLeComte-{code}",
        "title": said(
            fr=f"Un vol de {BIRDS} oiseaux en V à {BIRD_HEIGHT_M:.0f} m, éclairés par en dessous (hypothèse que le rapport n'examine pas)",
            en=f"A flock of {BIRDS} birds in a V, {BIRD_HEIGHT_M:.0f} m up, lit from below (a hypothesis the report does not examine)",
            es=f"Una bandada de {BIRDS} aves en V a {BIRD_HEIGHT_M:.0f} m, iluminadas desde abajo (hipótesis que el informe no examina)",
            it=f"Uno stormo di {BIRDS} uccelli a V a {BIRD_HEIGHT_M:.0f} m, illuminati dal basso (ipotesi che il rapporto non esamina)"),
        "bodies": bodies}

# ----- assemble -----------------------------------------------------------------------------------

SCENE_EXCLUDED = ("version", "id", "observer", "account", "description", "sources", "tags", "timeline", "milestones", "interpretation")


def reading_recording(code, rec, number, event):
    """A reading is another observation (see InterpretationEventJson): a recording of its own, with the
    place, the time and the observer's pose of the account it reads, and its bodies in its own
    `interpretation`, and an event of type `sighting` in the case marked `interpretationOf` it."""
    url = f"interpretation-braine-le-comte-{code.lower()}-{number}.json"
    held = {k: v for k, v in event.items() if k in ("title", "bodies", "smoke", "reentries")}
    reading = {"version": 1, "id": f"{rec['id']}-interpretation-{number}"}
    # The whole scene of the account (a reading edited without its decor, weather and pose shows bodies
    # over bare ground), not its words, its observer, its sources or its shapes.
    for key, value in rec.items():
        if key not in SCENE_EXCLUDED:
            reading[key] = value
    reading["tags"] = ["interpretation"]
    reading["timeline"] = {"keyframes": [], "order": [], "groups": []}
    reading["interpretation"] = held
    return url, reading, {"type": "event", "eventType": "sighting", "interpretationOf": code.lower(), "title": event["title"], "url": url}


def recording(code):
    keyframes, lights, samples, waypoints, first_seen = build(code)
    info = OBSERVERS[code]
    body_ids = ["pan"] + [sid for sid, *_ in lights]
    decor, roof = decor_for(code)
    for d in decor:
        if d.get("occludesSourceIds", 1) is None:
            d["occludesSourceIds"] = body_ids
    duration = {"AKH": stated(10, f"\"Notre observation a duré entre 5 et 10 secondes\" (written account); {TABLE2}: T4 at 10 s"),
                "BJN": stated(10, "\"La scène a duré environ 10 secondes\" (§V.1.2); table 1 says 12 s, table 2 retains 10 s"),
                "FWY": derived(10, f"the recording runs on the investigators' common clock ({TABLE2}, T0 to T4 = 10 s); "
                                   "his own duration is 5 s, from his turning round (T2, 3 s) to 8 s")}[code]
    pose_list = poses_for(code, samples, first_seen)
    milestones = [{"t": t, "label": "ABCDE"[i], "note": note} for i, (t, note) in enumerate(MILESTONES[code])]
    description = {"fr": info["account_fr"], "en": info["account_en"], "es": info["account_es"], "it": info["account_it"]}
    source = dict(SOURCE)
    source["index"] = info["index"]
    age = AGE[code]
    account = {"observerOccupation": info["occupation"],
               "source": stated("interview", "cognitive interview on 2016-01-23, six months after (BJN's and FWY's also; AKH also wrote a form on 2015-07-13)"),
               "followedUp": stated(True, "reconstruction on site, questions by e-mail in April 2016")}
    if age:
        account["observerAgeYears"] = stated(age, "about 40 (\"± 40 ans\")" if code == "AKH" else "17 at the time")
    rec = {
        "version": 1,
        "id": f"2015-07-12-BraineLeComte-{code}",
        "time": derived({"year": 2015, "month": 7, "day": 12, "hour": 0, "minute": 45, "second": 0},
                        "the report gives 00:30 to 01:00; the middle of it is taken, and it is the moment at which the report's own "
                        "sky (Arcturus at azimuth 260, elevation 33) is right to the degree (22:45 UTC)"),
        "durationSeconds": duration,
        "utcOffsetHours": derived(2, "Central European Summer Time on 2015-07-12; the report gives 22:30-23:00 UTC for 00:30-01:00"),
        "timeZone": "Europe/Brussels",
        "place": [assumed({"lat": LAT, "lng": LNG, "name": "Braine-le-Comte, Hainaut, Belgium"},
                          "the report redacts the address and gives the place to a tenth of a degree only (50.6 N, 4.1 E, 89 m), a garden "
                          "in a residential area near the Mons-Brussels railway")],
        "observer": {"id": f"BraineLeComte-2015-{code}", "title": code},
        "account": account,
        "description": description,
        "tags": ["NL", "GEIPAN D"],
        "sources": [source],
        "lightPollution": derived(20.05, "World Atlas of the artificial night sky brightness (Falchi et al. 2016, "
                                          "doi:10.1126/sciadv.1600377), SQM of the tile at 50.6 N, 4.1 E (50.604, 4.104): 0.86 mcd/m² artificial, "
                                          "zenith 20.05 mag/arcsec². The report says the Milky Way was \"particulièrement visible\" and that "
                                          "there were a few street lamps and the house's own lights"),
        "instrument": "eye",
        "observerTrack": {"keyframes": pose_list},
        "timeline": {"order": ["pan"] + [sid for sid, *_ in lights], "groups": [["pan"] + [sid for sid, *_ in lights]],
                     "keyframes": keyframes},
        "milestones": milestones,
        "soundTrack": {"keyframes": [{"t": 0, "sound": stated({"kind": "none", "volume": 0, "pitchHz": 0},
                                                            "\"Pas le moindre bruit\" (all three); BJN could hear the cat go by")}]},
        "decor": decor,
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudLayers": [], "cloudCover": 0, "relativeHumidity": 0.82,
            "precipitationType": "none", "precipitationIntensity": 0,
            "windDirectionDeg": 220, "windSpeed": 3.6, "storm": False}}]},
        "weatherSource": {"id": "metar-ebcv", "name": "METAR EBCV 112225Z AUTO 22007KT 9999 NCD 13/10 Q1020 (Chièvres, 25 min before)",
                          "url": "http://www.cobeps.org/pdf/BraineLeComte_20150712.pdf"},
    }
    return rec


def main():
    os.makedirs(OUT, exist_ok=True)
    readings = []
    for code in ("AKH", "BJN", "FWY"):
        rec = recording(code)
        path = os.path.join(OUT, f"observer-braine-le-comte-{code.lower()}.json")
        with open(path, "w") as f:
            json.dump(rec, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print(path, os.path.getsize(path), "bytes,", len(rec["timeline"]["keyframes"]), "keyframes")
        for number, event in enumerate((interpretation_event, bird_event), start=1):
            url, reading, case_event = reading_recording(code, rec, number, event(code, phenomenon_keyframes(code)[3]))
            with open(os.path.join(OUT, url), "w", encoding="utf-8") as f:
                json.dump(reading, f, ensure_ascii=False, indent=1)
                f.write("\n")
            readings.append(case_event)
    case = {
        "id": "BraineLeComte2015", "title": "Braine-le-Comte", "time": "2015-07-12 00:45",
        "events": [{"type": "event", "eventType": "sighting", "id": code.lower(), "time": "2015-07-12 00:45", "title": code,
                    "url": f"observer-braine-le-comte-{code.lower()}.json"} for code in ("AKH", "BJN", "FWY")] + readings}
    case_path = os.path.join(OUT, "case-braine-le-comte.json")
    if os.path.exists(case_path):  # what a shared link says of the case is written by hand: keep it
        previous = json.load(open(case_path))
        case = {**{k: previous[k] for k in ("summary", "image") if k in previous}, **case}
        case = {k: case[k] for k in ("id", "title", "summary", "image", "time", "events") if k in case}
    with open(case_path, "w") as f:
        json.dump(case, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"plane strike {STRIKE_DEG % 180:.2f} heading {HEADING_DEG:.1f} dip {DIP_DEG:.1f}"); print(f"box aspect {BOOMERANG.aspect:.3f}; FWY lights {1.47 / 5.67:.3f} of the box, spacing "
          f"{math.hypot(*[a - b for a, b in zip(BOOMERANG.local(*BOOMERANG.along(BOOMERANG.centre, 5)[0]), BOOMERANG.local(*BOOMERANG.along(BOOMERANG.centre, 5)[1]))]):.3f}")


if __name__ == "__main__":
    main()
