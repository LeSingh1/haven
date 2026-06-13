# Splat assets

The walkable tour loads a pre-captured 3D Gaussian splat from this folder.

- **`sample.spz`** — a small bundled sample so the viewer works immediately
  (`/splat-test`, "Sample" scene). Don't rely on it for the real demo.
- **`home.spz`** — **YOU add this.** Your captured demo home. Once it's here,
  the "Home" scene in `/splat-test` (and `lib/tourData.ts` → `HOME_TOUR`) loads it.

## Capturing `home.spz` (do this BEFORE the hackathon)

1. Film a slow, steady **60–90s phone video** of one home/room. Lights on,
   overlap your path, orbit doorways, avoid mirrors/glass and fast pans.
   Capture the same space 2–3 times for a backup.
2. Upload to **[Luma AI](https://lumalabs.ai)** → Gaussian Splatting scene → let it train.
3. Export the **Gaussian Splat `.ply` from the Luma WEB app** (not mobile) — unzip it.
4. Convert `.ply` → **`.spz`** (~10× smaller, loads fast) with
   [spz-js](https://github.com/arrival-space/spz-js) or
   [PlayCanvas SuperSplat](https://superspl.at/editor). Keep the `.ply` as a fallback.
5. Save it here as `home.spz`.
6. Open `/splat-test`, switch to the **Home** scene, walk with arrow keys, press
   **`p`** at each room to log a camera pose, and paste those into
   `lib/tourData.ts` → `HOME_TOUR.waypoints`.

> If the demo device is an older iPhone (iOS 16.2), `.spz` may not render — keep
> `home.ply` here too and point `HOME_TOUR.splatUrl` at it instead.
