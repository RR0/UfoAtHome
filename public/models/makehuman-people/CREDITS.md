# MakeHuman people

Five anonymous, realistic people in plain country clothes, built by `scripts/people/build_people.py`
with MPFB (the MakeHuman community's Blender add-on) from the MakeHuman system assets. Their body, skin,
hair, eyes, brows, clothes and shoes are all from the "MakeHuman system assets" pack, released under CC0
1.0 (https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html); a model
exported from MakeHuman or MPFB from those assets is itself CC0. Nothing here comes from a community
asset pack, whose licences differ and must be checked one by one.

Only changes made to the assets: the woman's top is the pack's `female_casualsuit01` with the
MakeHuman logo painted out and its colours muted to olive green (the stock one carries the project's
mark); every texture is reduced to 512 px; the triangles of the body, clothes and shoes are halved.

| File | Who |
| --- | --- |
| `farmer-40s.glb` | Man in his forties, denim shirt and jeans, black boots |
| `man-overalls.glb` | Man in overalls |
| `man-jacket.glb` | Man in a green jacket and jeans |
| `old-man.glb` | Old man, striped shirt |
| `woman.glb` | Woman, plain top and jeans |
| `valensole-being-pv-1965-07-02.glb` | The man Maurice Masse described on 2 July 1965 (see below) |
| `valensole-being-pv-1965-08-18.glb` | The beings he described on 18 August 1965 (see below) |
| `cussac-francois-13.glb` | François Delpeuch at 13 and a half, as the dossier's photographs show him: short dark hair, a dark top and trousers (see below) |
| `cussac-anne-marie-9.glb` | Anne-Marie Delpeuch at 9: a bob, a dark jacket and trousers (see below) |
| `socorro-figure.glb` | A figure in white coveralls, as Lonnie Zamora saw two of them at Socorro (see below) |

## The Valensole beings

Two stand-ins, one per procès-verbal the gendarmerie wrote (GEIPAN, "PV n° 445" and "PV n° 145"), because
the two statements do not describe the same being.

- **2 July 1965** (`valensole-being-pv-1965-07-02.glb`): "un homme était déjà à terre", "habillé d'une
  combinaison semble-t-il, tête nue, les mains vides", "d'environ un mètre, mais de corpulence assez
  importante", "de type européen". An adult man's proportions, a metre tall, stocky, an ordinary face and
  short hair, in a grey-green suit. Assumed: his age, his hair (bare-headed says no hat, not no hair), the
  colour of the suit.
- **18 August 1965** (`valensole-being-pv-1965-08-18.glb`): "n'atteignaient pas un mètre", "une tête en forme
  de potiron d'un volume égal à trois fois la tête d'un homme normal", "des oreilles assez grandes, pas de
  menton, un trou rond à la place de notre bouche, des yeux [...] ressembler aux nôtres mais sans sourcils",
  "un grand crâne sans aucun cheveu", "leur peau était lisse", "leur carrure était à peine plus large que leur
  tête", "la tête rentrée dans les épaules", "une combinaison assez foncée d'une seule pièce". Assumed: the
  child's build, the colour of the eyes, the shoes ("je n'ai pas fait attention à leurs pieds").

Nothing is drawn that neither procès-verbal says: the large black eyes, prominent cheekbones, pointed ears
and tiny nose that later retellings add are in neither, and the second says the opposite for the eyes.

## The Socorro figure

Lonnie Zamora saw "two figures in white coveralls" beside the craft, small, "possibly small adults or large
children" (Project Blue Book's Socorro file, his own statement). `socorro-figure.glb` is the man of
`valensole-being-pv-1965-07-02.glb`, a bare-headed adult in a one-piece suit, whose suit's texture is replaced by
off-white cloth by `scripts/people/derive_socorro_figure.py`. Nothing else changes, so it needs no Blender and
no MakeHuman assets, and it stays CC0 like the file it comes from. Assumed: the whiteness of the cloth, the
beings' age and build, their height (1.3 m, which is the recording's, not a measurement).

## The Cussac children

Two stand-ins for the witnesses of 29 August 1967, built from the dossier's photographs of them (their
faces are masked there, so nothing here is a likeness): a boy of 13 and a half (1.55 m) and a girl of 9
(1.30 m), body proportions from MPFB's age macro, plain dark clothes (copies of the pack's casual suits
whose texture is replaced by one colour with a little grain, no logo or pattern). Assumed: their height,
build, hair and the colour of their clothes. François wore glasses; the CC0 system assets have none, so
the model has none.

## duboc-slumped-headset-gaze.glb

Captain Jean-Charles Duboc seated at the left seat of an A320 flight deck, built by `scripts/people/build_pilot.py` (then cut at the neck by `scripts/people/split_head.py`, so that the head turns) from the MakeHuman system
assets (CC0 1.0, https://www.makehumancommunity.org/) with MPFB, like the other people here, after his portrait on rr0.org: stout, balding,
bearded, glasses, headset, a white shirt with the four stripes of a captain and a black tie. The beard, glasses, headset, epaulettes and tie
are made by the script itself (CC0 1.0, UFO@home). His height, trousers and shoes are assumed. See `scripts/people/README.md`.

The headset is not made here: it is the original one of "A320 Cockpit 2" (https://sketchfab.com/3d-models/a320-cockpit-2-5fb0c671a91042c1a9d8f2cf3e2df021)
by davidmarton1987 (https://sketchfab.com/davidmarton1987), CC BY 4.0, cut out of that model by `scripts/people/extract_headset.py` (the band, the two cups
and the boom, turned so that the cups face each other along the ears' axis, scaled to the head and put on it). The rest is CC0 as above; the file as a
whole must credit davidmarton1987 wherever it is shared. See `davidmarton-a320-cockpit/CREDITS.md`.

## chief-steward.glb

The chief steward of flight AF 3532, standing in his uniform: `man-jacket.glb` (above), cut at the neck by `scripts/people/split_head.py` so that his head turns, the colour of his clothes
stated by the recording (a navy blue). CC0 1.0 like the figure it is made from. Nothing says what he looked like: a stand-in.
