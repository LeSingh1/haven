# Getting a walkable splat for Haven — researched verdict

**The question:** can an online tool turn Zillow listing *photos* into a walkable 3D scene we can load in Spark (`.ply`/`.spz`)?

## Short answer
- **Photogrammetry (Luma, Polycam, KIRI, Postshot, Scaniverse, RealityScan): NO** — not from listing stills. They all need *dense, overlapping* capture (a slow video / hundreds of frames) so structure-from-motion can solve camera poses. Zillow photos are the opposite: ~15–40 frames, one wide/fisheye shot per room, non-overlapping, HDR-processed. SfM fails → "reconstruction failed" or a warped, hole-ridden blob. (Even Zillow's own splats use *drone video that circles the home*, not the listing stills.)
- **Sparse-view research (InstantSplat, FSGS, DUSt3R/MASt3R, pixelSplat): NO for a hackathon** — they need a few *overlapping* views of the *same* region (not disjoint rooms), and none ship as a reliable one-click web tool (the InstantSplat HF Space is currently sleeping).
- **Generative image-to-3D-world: ✅ YES — and it's a first-party fit.** **World Labs Marble** takes 1-to-few images → an explorable 3D world → exports a Gaussian splat (`.ply`/`.spz`) → loads in Spark **because Spark is World Labs' own renderer.** This is the only path that works from sparse photos, because it *invents* the missing geometry instead of triangulating it.

## The catch (state this honestly — it's a credibility win, not a weakness)
Marble **hallucinates** everything the photo didn't show (World Labs' own words: the model "must invent all the details of the world that are not present in the input"). The visible-from-the-photo part resembles the listing; walking *through* it shows plausible *invented* space, not the real home. For a housing tool this could mislead a buyer, so **label it in the UI as "AI-generated 3D impression from listing photos," not "walk the actual home."** Multi-image input (paid tier) reduces invention but never eliminates it.

## Recommended path A — Marble (works from listing photos; synthetic)
1. Sign up at **marble.worldlabs.ai** (Free tier = 4 worlds/month; $20 Standard unlocks multi-image input; Pro $35 adds commercial rights — use Pro if the demo is shown publicly).
2. Feed Marble the **cleanest single wide-angle shot per room** (or 2–4 shots of the same room on Standard+ for closer resemblance).
3. Export as a Gaussian splat — choose **`.spz` or `.ply`**, and the **lightweight ~500k-splat** option (not the 2M full-res) so it streams fast in-browser.
4. Save it to **`public/splats/home.spz`** in this repo. **No code change needed** — `SplatTour` + `lib/tourData.ts` (`HOME_TOUR`) already load that path via Spark.
5. Walk it at `/splat-test` → Home scene; press **`p`** at each room to log camera poses → paste into `HOME_TOUR.waypoints`.
6. Add the honest "AI-generated impression" label in the tour UI.

## Recommended path B — faithful capture (your own home; truthful)
If you want a *real, faithful* walkthrough: shoot a slow 60–90s phone **video** of one home → **Luma AI** (free) → export `.ply` → `home.spz`. Truthful, but only of a place you can physically capture. (This is the safer "it's a real space" demo; Marble is the "any listing, instantly" wow.)

> **Best of both:** demo Marble for the "find any listing → tour it" story (labeled as AI impression), and keep a Luma capture of one real room as the "and here's a faithful capture" credibility beat.

## Don't
- **Don't scrape Zillow.** Their ToS (updated Oct 28, 2025) bans automated access and the photos are copyrighted. Use photos you legitimately have, or your own capture.
- **Don't say "4D."** A static home is **3D** Gaussian Splatting; 4D = dynamic/temporal scenes (moving people/light) — irrelevant here and more expensive.
- Don't use TRELLIS / Hunyuan3D-2 — those are *object* generators (a chair), not walkable *rooms*.

## Tool reference
| Tool | Type | From sparse Zillow photos? | Output → Spark | Cost |
|---|---|---|---|---|
| **World Labs Marble** | generative world | **Yes** (invents geometry) | `.ply`/`.spz` → native (Spark is theirs) | Free 4/mo; $20/$35 tiers |
| Luma AI | photogrammetry | No (needs video/dense) | `.ply` → yes | Free |
| Polycam | photogrammetry | No (20+ imgs, 70-80% overlap) | `.ply` (Pro) → yes | Free capture; Pro export |
| Scaniverse | on-device scan | No (must scan in person) | `.spz`/`.ply` → yes | Free |
| Postshot | photogrammetry (local) | No | `.ply` → yes | Free; needs NVIDIA GPU |
| InstantSplat / FSGS | sparse-view research | Partial (overlap needed) | needs conversion | Free; GPU/Colab |
| HunyuanWorld-Mirror | generative (OSS) | Partial | `.ply` → yes | Free; self-host GPU |
| TRELLIS / Hunyuan3D-2 | object generator | No (objects, not rooms) | — | Free |
| Odyssey | real-time video world | No (video stream, no file) | no | — |

## Sources
World Labs Marble — https://marble.worldlabs.ai/ · Spark (World Labs renderer) — https://github.com/sparkjsdev/spark · Luma — https://lumalabs.ai/ · Polycam splat — https://poly.cam/tools/gaussian-splatting · InstantSplat — https://github.com/NVlabs/InstantSplat · HunyuanWorld-Mirror — https://github.com/Tencent-Hunyuan/HunyuanWorld-Mirror · Zillow 3D Home — https://www.zillow.com/z/3d-home/
