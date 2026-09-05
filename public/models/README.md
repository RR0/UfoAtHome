# The 3D models UFO@home hosts

A decor object can be drawn as a real 3D model instead of the built-in shape — a patrol car rather
than a box, an airframe rather than a cylinder with a fin. A recording names the model it wants by
`id` (see `DecorModelRef` in `src/engine/model/Decor.ts`), and this directory is what those ids mean.

## Why they are hosted here rather than linked

Because of what a survey of the alternatives actually found. The catalogues that are readable
cross-origin hold test objects and props: Khronos's own sample assets are there to exercise glTF
features (a toy car, a milk truck carrying Cesium's trademark), and Poly Haven's 521 models are
tools, bottles and food, with no vehicle and no building among them. The CC0 kits that do contain a
car, an airframe, a shed or a lamp post exist mainly on third-party mirrors whose permanence and
stated licence vary from repository to repository.

A reconstruction that is meant to be checked years from now cannot rest on that. So the rule is the
one this project already applies to every other kind of data it did not produce: when a source is
not guaranteed to last, take a copy, keep the credit with it, and serve it from somewhere that will.

## Layout

`index.json` is the catalogue. Each entry:

```json
{
  "id": "pontiac-catalina-1964",
  "kind": "vehicle",
  "name": "Pontiac Catalina, 1964",
  "file": "pontiac-catalina-1964.glb",
  "headingOffsetDeg": 0,
  "sizeM": { "widthM": 2.02, "lengthM": 5.41, "heightM": 1.42 },
  "credit": {
    "title": "…",
    "author": "…",
    "license": "CC0 1.0",
    "sourceUrl": "https://…"
  }
}
```

- `file` is relative to `index.json`, so the whole directory can be copied to another host — or
  served by a dev server — without rewriting a single address in it.
- `kind` is the `DecorKind` the model can stand for; it is what the editor's picker filters on.
- `headingOffsetDeg` turns the model so its nose faces −Z, this scene's heading-0 direction. It
  belongs to the file, not to any recording.
- `sizeM` is what the real object depicted actually measures. It is offered as a decor object's own
  size when the model is picked and nothing else states one — never imposed over a recording's own
  measurement.
- `credit` is not optional. A model whose credit is missing is not drawn (see
  `SceneRenderer.loadDecorModel`): an unattributed model is not a licence, it is a hope.

## Adding one

1. Check the licence permits redistribution, and that the model carries no third-party trademark
   you would then be redistributing too. (This is exactly why Khronos's milk truck is not here: CC
   BY 4.0 for the mesh, but a Cesium logo painted on the side under a separate trademark grant.)
2. Keep it small. These are scenery at tens or hundreds of meters, where a 4K texture set buys
   nothing and costs everything — Khronos's CC0 lantern is a fine lamp post and 9.5 MB, which is
   why it is not here either.
3. Check whether the file is self-contained. A `.glb` may still reference its texture by relative
   URI rather than embedding it — Kenney's kits do, with a `Textures/colormap.png` shared by every
   model in the kit. Those files go beside the model, at the path the glTF names, and the model is
   kept byte-for-byte as its author published it rather than rewritten to embed them.
4. Drop the `.glb` in this directory, add its entry to `index.json`, and record where it came from
   in the `credit`. Keep the author's own licence file beside it (see
   `kenney-car-kit.License.txt`) — a licence quoted in a JSON field is a summary, the file is the
   grant.

## What is in here today

Two stylised low-poly cars from Kenney's **Car Kit 3.1** (CC0), a patrol car and a saloon. They are
placeholders and are named as such in the picker: they are of the right KIND, not of any particular
model or year. What they buy is a silhouette that reads as a car at forty metres in evening light,
where a rectangular prism reads as a building — which was the complaint that started this.

Nothing here yet stands in for a building, a tree, a streetlight or an airframe. The same recipe
applies: Kenney and Quaternius both publish CC0 kits covering all four.

## What happens when this is unreachable

Nothing breaks. A recording naming a model no catalogue can resolve, or one whose file cannot be
fetched, draws the built-in shape at the size the recording states — which is what every recording
did before models existed. The models are detail, never the reconstruction itself.
