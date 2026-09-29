# Artificial night sky brightness tiles

Cut from the World Atlas of the artificial night sky brightness by
`scripts/build-light-pollution-tiles.ts`; read by `AtlasLightPollutionProvider`.

Each `.bin` is a raw-deflated square of `tileDeg`° on a side (see `index.json`), `cells` × `cells`
bytes, north row first. A byte is the artificial zenith brightness on a logarithmic scale:
0 below `floorMcd` mcd/m², otherwise `floorMcd × 10^((code − 1) / subdivisions)`. A square with no
artificial light is not written; `index.json`'s `present` bitmap says which squares exist.

## Source, licence and citation

Data: Falchi, F., Cinzano, P., Duriscoe, D., Kyba, C. C. M., Elvidge, C. D., Baugh, K., Portnov, B.,
Rybnikova, N. A., Furgoni, R. (2016): Supplement to: The New World Atlas of Artificial Night Sky
Brightness. GFZ Data Services. https://doi.org/10.5880/GFZ.1.4.2016.001

Paper: Falchi, F. et al. (2016), The new world atlas of artificial night sky brightness. Science
Advances 2(6), e1600377. https://doi.org/10.1126/sciadv.1600377

Licence: Creative Commons Attribution-NonCommercial 4.0 International
(https://creativecommons.org/licenses/by-nc/4.0/), as the dataset's page states. These tiles are a
quantized adaptation of it (to within 0.02 mag of the total sky) and carry the same licence; they
are not covered by this repository's MIT licence.
