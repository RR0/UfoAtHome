# A320 flight deck

`cockpit.glb` is cut from "A320 Cockpit 2" (https://sketchfab.com/3d-models/a320-cockpit-2-5fb0c671a91042c1a9d8f2cf3e2df021) by
davidmarton1987 (https://sketchfab.com/davidmarton1987), licensed under Creative Commons Attribution 4.0 International (CC BY 4.0):
see `LICENSE` here and https://creativecommons.org/licenses/by/4.0/.

Changes: the downloaded file is a whole Lufthansa A320neo about a quarter of the real size (outside, cabin and flight deck, 45 MB).
`scripts/extract-a320-cockpit.py` keeps the 64 of its 135 objects that make up the flight deck (panels, seats, windscreen frames, side
window openings) and scales them by 4.12, so that the wingspan of the original is the real 35.8 m. No vertex or texture is edited. The
nose is towards -z, y is up. The captain's eye, found by looking out of the model from the left seat, is 0.557 m left of the centre of
the box, 0.266 m above it and 0.484 m behind it.

34.7 MB: it is fetched only by a recording that places its observer aboard an airliner (see DecorObject.observerSide).
