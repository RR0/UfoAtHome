# Inputs of `npm run build:novae`

Versioned so that `src/engine/astronomy/novaCatalog.ts` can be regenerated exactly, even if a
source moves or disappears. See `scripts/build-nova-catalog.ts` for how each file is used.

| File | What it is | Source |
|---|---|---|
| `strope2010-table1.dat` | Peak magnitude and date, t2, t3, class of 93 novae | Strope, Schaefer & Henden 2010, AJ 140, 34 — VizieR J/AJ/140/34, https://cdsarc.cds.unistra.fr/ftp/J/AJ/140/34/table1.dat |
| `strope2010-table2.dat` | Their binned AAVSO V light curves | same catalogue, `table2.dat` |
| `sn1987a-V.csv` | V photometry of SN 1987A (MJD, magnitude, band, source) | Open Supernova Catalog, https://api.astrocats.space/SN1987A/photometry/time+magnitude+band+source?band=V&format=csv |
| `v1369cen-izzo2017-fig1.json` | `[days from 2013-12-02T00:00Z, V]` for V1369 Cen, read from the vector markers of figure 1 of Izzo 2017 (arXiv:1704.07214, file `lightcurve_all_epochs.pdf` in its source), calibrated on the plot's tick marks (magnitude 3 at y = 282.04, 77.79 pt per magnitude; day 0 at x = 39.84, 6.96 pt per day). All 104 markers are kept here; the build uses days 0 to 55 only, the part the figure shows. | AAVSO data as plotted by L. Izzo |

The supernovae of 1006 to 1604 and the post-2006 novae other than V1369 Cen are entered in the build
script itself, with their references.
