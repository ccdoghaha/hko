# High-resolution surface temperature analysis — method

**Purpose.** Turn the ~26-station automatic weather station network into a
continuous surface temperature field on a 250 m grid, and quantify how much of
the added detail is real.

This document records what the pipeline does, what it assumes, and — most
importantly — what the validation actually showed, including a case where the
expected improvement did not materialise.

---

## 1. Summary of results

Measured on live observations, 2026-09-14:

| Estimator | LOO RMSE | MAE | Bias | Max error |
|---|---|---|---|---|
| **IDW, no terrain correction** | **1.03 K** | 0.78 | −0.04 | 2.63 |
| IDW with terrain correction | 1.07 K | 0.82 | −0.02 | 2.48 |
| Ordinary kriging with terrain correction | 1.20 K | 0.91 | −0.05 | 2.78 |

**The terrain correction did not help.** The analysis therefore uses the
uncorrected estimator. Section 5 explains why, and demonstrates the correction
working correctly in a controlled experiment where the network does span relief.

---

## 2. Inputs

| Input | Source | Resolution / cadence |
|---|---|---|
| Station observations | HKO Open Data API, `rhrread` | 26 stations, ~10 min |
| Station positions | `lib/stations.js` | approximate, ~50 m |
| Terrain elevation | Mapbox "terrarium" tiles, AWS Open Data | 38 m/px at zoom 12 |
| Station elevation | sampled from the terrain mosaic | 38 m/px, bilinear |

Station elevation is *sampled from the DEM at runtime* rather than stored. A
hand-typed elevation table would silently disagree with whatever DEM is in use;
sampling guarantees they cannot diverge.

---

## 3. Pipeline

```
terrarium tiles ──▶ PNG decode ──▶ mosaic ──▶ void fill
                                                 │
                                   sample station elevations
                                                 │
rhrread observations ────────────────────────────┤
                                                 ▼
                                   leave-one-out cross-validation
                                    (3 estimators scored)
                                                 │
                                         select best RMSE
                                                 ▼
                                    interpolate onto 250 m grid
                                                 │
                                    land mask ──▶ RGBA raster ──▶ PNG
```

### 3.1 Terrain decoding

Terrarium encodes elevation as `(R × 256 + G + B/256) − 32768`. The tiles are
PNG, so the pipeline includes a small PNG decoder (`lib/png.js`) — 8-bit,
non-interlaced, grey/RGB/RGBA. It was verified byte-identical to Pillow on a
real tile, which is the check that matters: a subtly wrong decoder would produce
a plausible-looking but wrong DEM.

48 tiles cover the analysis box (~2.4 km² of ground per tile at this latitude).

### 3.2 Void filling

The source data contains occasional no-data artifacts — measured at **121 cells
out of 3,145,728 (0.004%)**, appearing as isolated values of −1256 m or
+6431 m adjacent to real terrain. These are *not* decoder errors (confirmed
against Pillow); they are in the source.

They matter: a single 6431 m cell inside the domain would distort every
interpolation weight near it. Cells outside a plausible range (−100..1100 m) are
rejected and filled iteratively from valid 8-connected neighbours. This is a
standard DEM void-fill and it reduced the mosaic range from −1256..6431 m to
−100..962 m.

### 3.3 Grid

The analysis grid is **regular in latitude and longitude**, deliberately, not in
the Mercator projection the tiles arrive in. The browser map draws with a plain
equirectangular projection, so a Mercator-regular grid would shear against the
station markers and coastline. Regular-in-lat/lon means the raster is placed in
the chart by a single affine transform with no drift anywhere in the box
(verified: max deviation 1.4 × 10⁻¹⁴ degrees).

250 m was chosen as the target cell size. The grid resolves to **290 × 216 cells
at 249.6 m**, of which 28,588 cells are land.

---

## 4. Interpolation

### 4.1 Inverse distance weighting

`w_i = 1 / d_i^p`, with `p = 2`, summed over all stations. Exact at observing
points. No statistical model of the field — the weight is a fixed function of
distance.

### 4.2 Ordinary kriging

Weights come from a fitted variogram rather than a fixed law, which lets the
data set its own spatial correlation length. An experimental variogram is
binned from station pairs and a spherical model fitted by moment estimation:

```
gamma(h) = nugget + sill * (1.5 h/a - 0.5 (h/a)^3)   for h < a
```

For 2026-09-14 the fit was nugget 0.062, sill 1.059, **range 11.5 km** — i.e.
the data's own correlation length is about 11.5 km, well beyond the ~6.5 km mean
station spacing. The kriging system is solved per grid cell with 8 nearest
neighbours (a 9×9 linear system).

### 4.3 Terrain correction

Temperature falls with height. The correction reduces each station to a common
sea-level datum, interpolates there, then re-references the result to the
terrain:

```
T_sl   = T_obs + Gamma * z_obs          (reduce observations to sea level)
T_grid = interp(T_sl) - Gamma * z_grid  (re-apply terrain)
```

`Gamma` defaults to 6.5 K/km. Because terrain is known everywhere, using it at
the verification point in cross-validation is legitimate — it is not leakage.

---

## 5. The result that matters

The correction is *supposed* to help. On this network it does not, and the
reason is a property of the observing network rather than of the method.

**The `rhrread` network is lowland-dominated.** Its stations span
**1 m to 204 m — a range of 203 m** — with only two stations above 100 m:

```
青衣             204 m
荃灣城門谷        153 m
(everything else) 1-52 m
```

A lapse rate fitted over 203 m of relief is extrapolation, not a relationship.
The Observatory's hilltop sites (Tai Mo Shan 957 m, Ngong Ping, Tate's Cairn) are
**not in this feed**. So the correction adds a term the data cannot constrain,
and cross-validation correctly rejects it.

### Control experiment

To confirm the *mechanism* is right and it is the network that limits it, the
same analytic field was sampled two ways:

| Synthetic network | Elevation span | Raw IDW | Corrected IDW | Improvement |
|---|---|---|---|---|
| Stations at the real locations | 203 m | 1.47 K | 1.15 K | 22% |
| Stations spread across the terrain | 587 m | 0.97 K | 0.51 K | **48%** |

Same field, same code — the only difference is whether the stations span relief.
The correction more than doubles its benefit when they do. This separates "the
implementation is wrong" from "this network cannot support the correction",
which a single real-data number could not.

**Design consequence:** the estimator is selected by measured leave-one-out RMSE
on every run, not hard-coded. If HKO adds hilltop stations to the feed, or if
this pipeline is pointed at a denser network, the correction will start winning
on its own and be adopted automatically.

---

## 6. Land mask

The terrarium DEM encodes **ocean as exactly 0 m**. Flat reclaimed land at
1–3 m is therefore numerically indistinguishable from water, and a 250 m cell
cannot resolve a narrow feature: Kai Tak Runway Park (a 100 m-wide strip) had its
cell centre land at −0.42 m and was masked as sea despite a station sitting on it.

Since station locations are known to be on land, each station's cell and its
immediate neighbours are forced to land — 14 cells in total for this network.
Verified: 26/26 stations now fall on land cells, 5/5 open-sea test points remain
transparent.

This is a documented limitation, not a general land/sea product. A proper
coastline vector would be the correct fix.

---

## 7. Validation

Two scripts, runnable after any change:

```
node scripts/check-dem.js      # PNG codec, georeferencing, DEM accuracy, alignment
node scripts/check-interp.js   # station table sync, synthetic tests, live LOO
```

`check-dem.js` — 16 checks:

```
PNG encode -> decode            byte-identical
projection round-trip x4        offsets inside tile bounds
void detection + fill           121 cells (0.004%) filled; range -100..962 m
georeferencing (flat sites)     Chek Lap Kok 1 vs 7 m, HKO HQ 37 vs 32 m
vertical accuracy (summits)     Tai Mo Shan 954/957, Sunset 852/869,
                                Victoria 546/552, Lantau Peak 895/934
grid regularity                 max deviation 1.4e-14 deg
affine raster placement         worst cell-vs-sampled 36 m across 26 stations
```

`check-interp.js` — 11 checks, including the two synthetic experiments in §5 and
the assertion that `lib/stations.js` and `public/app.js` hold identical
coordinates (they are duplicated because the browser cannot `require()`, so a
drift check is the safeguard).

Note Lantau Peak: the DEM reads 895 m against a published 934 m. The source data
under-resolves this particular summit; a 39 m deficit is within the tolerance
set for it but it is a genuine data limitation rather than a clean pass.

---

## 8. Known limitations

1. **Coarse mask.** Land/sea comes from a terrain threshold at 250 m. Reclaimed
   land and narrow features need the station-cell override described in §6. A
   coastline vector would be more correct.
2. **Lowland network.** The terrain correction is not identifiable from this
   feed (§5).
3. **Station positions are approximate** (~50 m), not survey-grade.
4. **Single variable.** Only temperature is currently analysed. Humidity,
   rainfall and wind need different treatment — wind in particular must be
   vector-interpolated, not interpolated as a scalar magnitude.
5. **No observation-error model.** The variogram nugget is fitted from the data;
   instrument error is not independently characterised.
6. **Analyses are not quality-controlled.** A single bad observation propagates
   into the field. Real operational systems screen observations first.
7. **250 m is the analysis resolution, not the information content.** The
   effective information content is set by the ~6.5 km station spacing; the grid
   is 26× finer than the network, so much of the apparent fine detail is
   interpolation artefact. The LOO RMSE (~1 K) is the honest precision figure.

---

## 9. References

- HKO Open Data API — <https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>
- Mapbox terrarium tiles — <https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/>
- Spherical variogram model, ordinary kriging — standard geostatistics
  (e.g. Cressie, *Statistics for Spatial Data*)
