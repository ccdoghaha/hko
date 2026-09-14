# LAE operations product — method and limits

**Purpose.** A go/no-go weather assessment for low-altitude operations (small
uncrewed aircraft and eVTOL class) in Hong Kong, assembled from four independent
sources and reduced to a single verdict with the limiting factors named.

This document records what feeds it, how each quantity is derived, what the
thresholds are, and — importantly — what it is not.

---

## 1. Inputs

| Input | Source | Cadence | Why |
|---|---|---|---|
| 10-minute mean wind, direction, gust | HKO `latest_10min_wind.csv`, 30 stations | 10 min | the primary LAE constraint |
| Surface observation at VHHH | METAR via aviationweather.gov | ~30 min | visibility, ceiling, wind, QNH |
| Aerodrome forecast | TAF via aviationweather.gov | ~6 h | the forward-looking window |
| Official warnings | HKO `warnsum` | 1 min | typhoon / rainstorm / thunderstorm |
| Lightning | HKO `rhrread.lightning` | 5 min | convective activity by district |

Note that the district feeds carry **no visibility at all and no ceiling** — the
Observatory's automatic network does not measure either. Those two quantities
therefore come only from the aerodrome reports, which is why the product needs
both families of data rather than one.

---

## 2. Wind: why direction is never interpolated

This is the single most important implementation detail.

A wind of 350° and a wind of 010° are 20° apart. Their **scalar** mean is 180° —
the exact opposite direction. Any interpolation that treats direction as a number
is therefore wrong whenever the field straddles north, which in Hong Kong's
prevailing easterlies and northerlies is routine.

The field is instead interpolated as **u and v components** and recombined:

```
u = -speed * sin(dir)      (dir is the direction the wind comes FROM)
v = -speed * cos(dir)

interpolate u and v separately over the grid
speed = hypot(u, v)
dir   = atan2(-u, -v)
```

`scripts/check-lae.js` proves this on exactly that case and asserts the scalar
alternative would have been 180° wrong.

### 2.1 Parsing traps in the feed

The wind CSV emits several non-numeric forms and they do **not** mean the same
thing:

| Cell | Meaning | Handling |
|---|---|---|
| `N/A` | sensor gave nothing | station **dropped** for direction |
| `Calm` | genuinely no wind | speed 0, direction undefined |
| `Variable` | direction not resolvable | station **dropped** |
| *(empty)* | no gust recorded | gust null, not zero |

Conflating `N/A` with `Calm` would inject false calm readings into the analysis
and understate the wind field. Three rows also carry a trailing comma (6 fields
instead of 5); the parser reads the first five positionally.

On a representative run: **23 of 30 stations usable**, 7 dropped — 5 for a
non-resolvable direction alongside a real speed, 1 with no reading at all
(Stanley), and Tai Mei Tuk reported calm.

### 2.2 Extrapolation to the operating altitude

The network measures at 10 m. Operations happen higher. The wind is extrapolated
with a power law:

```
v(z) = v10 * (z / 10) ^ alpha
```

| Surface | alpha |
|---|---|
| open water / flat coast | 0.143 (default) |
| suburban, low-rise | 0.22 |
| dense high-rise | 0.33 |

**This is an approximation, and it is stated as one.** alpha depends on surface
roughness and atmospheric stability, and the real profile over a dense city or a
coastline can differ substantially from any single exponent. It is useful for
planning; it is not a substitute for measurement at the operating altitude.

---

## 3. Aviation decoding

METAR and TAF are decoded rather than pattern-matched, with unfamiliar tokens
passed through untouched instead of silently dropped — an operator needs to see
what the report actually said.

Key semantics implemented correctly:

- **`9999` visibility means "10 km or more"**, reported as 10000 m so downstream
  comparisons do not read it as slightly less than 10 km.
- **A ceiling is the lowest BKN or OVC layer.** FEW and SCT layers are *not*
  ceilings. A `FEW010CB` is therefore not a 1000 ft ceiling, despite being
  cumulonimbus — this is asserted as a test because getting it wrong would
  systematically under-report ceiling.
- **Wind groups may carry gusts** (`06015G25KT`), in which case the gust is the
  binding constraint, not the mean.
- **Flight category** follows the standard VFR/MVFR/IFR/LIFR thresholds.

For TAF, every `TEMPO` / `BECMG` / `FM` / `PROB` change group is parsed with its
own validity window, and the assessment takes the **worst** value of each
quantity across the groups overlapping the window. Averaging would let a
thunderstorm be cancelled out by otherwise fine conditions.

The live VHHH TAF on the sample run carried five change groups, including two
separate `TEMPO ... TSRA` windows — that is what produced the no-go verdict.

---

## 4. Assessment model

Every factor is evaluated independently and the verdict is the **worst** factor,
because an operation is bounded by its most limiting constraint.

| Factor | GO | CAUTION | NO-GO |
|---|---|---|---|
| Surface wind (10 m mean) | < 25 km/h | 25–35 | > 35 |
| Maximum gust | < 35 km/h | 35–50 | > 50 |
| Gust spread (gust − mean) | < 15 km/h | 15–25 | > 25 |
| Wind at operating altitude | < 30 km/h | 30–45 | > 45 |
| Visibility | > 5000 m | 1500–5000 | < 1500 |
| Cloud ceiling | > 1500 ft | 500–1500 | < 500 |
| Thunderstorm (observed or forecast) | none | — | present |
| Lightning detected | none | any district | — |
| Precipitation | none | present | — |
| Flight category | VFR | MVFR | IFR / LIFR |
| Warnings | none | TC1/TC3, WRA, WMS, WTS… | TC8+, TC9/10, WRB/WRC, WT |

An **UNKNOWN** factor (a missing feed) is treated as neutral rather than as a
pass or a failure: it neither blocks nor licenses an operation, and it remains
visible in the factor table so the gap is not hidden.

### 4.1 Warning classification

Warning codes are matched **exactly**. A substring test for `WT` also matches
`WTS` (thunderstorm, a routine advisory), while `WT` alone is a tsunami warning
— a mistake that would either ground operations for a thunderstorm advisory or,
worse, wave through a tsunami.

---

## 5. Validation

```
node scripts/check-lae.js      # 41 checks
```

Covers the vector-wind wraparound, every CSV edge case above, METAR and TAF
decoding against real reports, ceiling semantics, worst-case merging, and unit
conversions.

Vector leave-one-out cross-validation is reported in **operational units** —
speed RMSE in km/h and direction error in degrees — because scalar RMSE on u and
v would mean nothing to an operator. On the sample run:

```
speed RMSE      3.47 km/h   (MAE 2.79, bias -1.86)
direction MAE   35.5 deg    over 9 stations reporting >= 5 km/h
direction MAE   61.8 deg    over all 19 stations reporting a direction
```

The two direction figures are both shown deliberately. Direction error is
**physically meaningless at near-calm wind speeds**: a 1 km/h wind with a 1 km/h
vector error is a 180° direction error carrying no operational information. On
this run the network was almost entirely 0–10 km/h, so the all-station figure is
dominated by noise. Filtering without disclosing the filter would be misleading,
so both are reported.

---

## 6. Known limitations

1. **Thresholds are not an approved standard.** They are this demonstration's own
   starting point for a small-UAS / eVTOL class operation, stated explicitly in
   `lib/lae.js` so they can be reviewed and replaced. They do not replace an
   operator's documented limits or an approved flight planning process.
2. **The go/no-go is area-wide, not site-specific.** It uses the strongest
   reported wind across the whole network. A site-specific decision should use
   the nearest stations plus a site survey.
3. **Extrapolation to altitude is an engineering approximation** (§2.2), not a
   measurement.
4. **No upper-air data.** No radiosonde or wind profiler is ingested; the
   altitude wind is derived entirely from the surface network.
5. **Visibility and ceiling are single-point** (VHHH) and are applied across the
   whole territory, which is wrong for a district 30 km away under a different
   airmass. A real product would interpolate visibility products or use the
   airport's own low-level windshear and LIDAR data.
6. **TAF worst-case is conservative by construction.** Taking the worst of every
   TEMPO group over the whole validity will over-warn outside the actual hazard
   windows. A time-stepped assessment per window would be more useful and is the
   obvious next improvement.
7. **No turbulence, icing or windshear product.** Gust spread is a crude proxy
   for mechanical turbulence only.
8. **Calm and N/A are distinguished**, but a station that is genuinely broken
   will still be counted as reporting if its speed is plausible.
9. **No quality control on observations.** A single erroneous gust propagates
   straight into the verdict.

---

## 7. References

- Beaufort scale and the Hellmann wind-profile exponent — standard boundary-layer
  meteorology
- METAR/TAF coding — ICAO Annex 3 / WMO FM-15, FM-51
- Flight category thresholds — standard aviation convention
- HKO regional weather CSVs —
  <https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/>
