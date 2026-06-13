'use client';
// components/tour/SplatTour.tsx — the walkable Gaussian-splat viewer. OWNED BY SHAURYA.
//
// Renders a Gaussian splat with Spark on raw Three.js (NOT react-three-fiber).
// Must be loaded client-only via next/dynamic({ ssr:false }). Walk with arrow
// keys/WASD; the voice layer drives it through the SplatTourHandle (apply()).
// Press "p" to log the camera pose (for filling waypoints in lib/tourData.ts).
//
// Implements the shared contract: tour: TourMeta, NavCommand { type, waypointId?, speech }.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import type { NavCommand, SplatTourHandle, TourMeta } from '@/lib/types';

interface Props {
  tour: TourMeta;
  /** Delivered via callback too — robust through next/dynamic, which can drop refs. */
  onReady?: (handle: SplatTourHandle) => void;
  reducedMotion?: boolean;
}

function eulerToQuat(rot?: [number, number, number]): THREE.Quaternion {
  const [x, y, z] = rot ?? [0, 0, 0];
  const e = new THREE.Euler(
    THREE.MathUtils.degToRad(x),
    THREE.MathUtils.degToRad(y),
    THREE.MathUtils.degToRad(z),
    'YXZ'
  );
  return new THREE.Quaternion().setFromEuler(e);
}

// FPS-style orientation from yaw (about world up) + pitch (about local right),
// with no roll. YXZ order keeps "turn then look up/down" feeling natural.
function quatFromYawPitch(yawDeg: number, pitchDeg: number): THREE.Quaternion {
  const e = new THREE.Euler(
    THREE.MathUtils.degToRad(pitchDeg),
    THREE.MathUtils.degToRad(yawDeg),
    0,
    'YXZ'
  );
  return new THREE.Quaternion().setFromEuler(e);
}

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const SplatTour = forwardRef<SplatTourHandle, Props>(function SplatTour(
  { tour, onReady, reducedMotion = false },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const idxRef = useRef(0);
  const yawRef = useRef(0);   // degrees — current view yaw (source of truth for turns)
  const pitchRef = useRef(0); // degrees — current view pitch (clamped)
  const animRef = useRef<{
    fromP: THREE.Vector3; toP: THREE.Vector3;
    fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number; dur: number;
  } | null>(null);

  // Smoothly animate the camera to a target pose (or snap if reduced-motion).
  const glide = useCallback(
    (toP: THREE.Vector3, toQ: THREE.Quaternion, dur = 1.0) => {
      const cam = camRef.current;
      if (!cam) return;
      if (reducedMotion) {
        cam.position.copy(toP);
        cam.quaternion.copy(toQ);
      } else {
        animRef.current = { fromP: cam.position.clone(), toP, fromQ: cam.quaternion.clone(), toQ, t: 0, dur };
      }
    },
    [reducedMotion]
  );

  // The single entry point the voice/keyboard layer calls (NavCommand from /api/nav).
  const apply = useCallback(
    (cmd: NavCommand) => {
      const cam = camRef.current;
      if (!cam) return;
      const wps = tour.waypoints;
      const b = tour.bounds ?? { min: [-15, -8, -15] as const, max: [15, 8, 15] as const };
      const clampPos = (v: THREE.Vector3) => {
        v.x = clampNum(v.x, b.min[0], b.max[0]);
        v.y = clampNum(v.y, b.min[1], b.max[1]);
        v.z = clampNum(v.z, b.min[2], b.max[2]);
        return v;
      };
      // Jump to waypoint i: set yaw/pitch from its rotation and fly there.
      const gotoWp = (i: number) => {
        const w = wps[i];
        if (!w) return;
        idxRef.current = i;
        yawRef.current = w.rotation?.[1] ?? 0;
        pitchRef.current = clampNum(w.rotation?.[0] ?? 0, -80, 80);
        glide(new THREE.Vector3(...w.position), quatFromYawPitch(yawRef.current, pitchRef.current), 1.3);
      };
      // Current planar forward / right (y flattened) for moves.
      const planarBasis = () => {
        const fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
        return { fwd, right };
      };

      switch (cmd.type) {
        case 'goto': {
          const i = wps.findIndex((w) => w.id === cmd.waypointId);
          gotoWp(i >= 0 ? i : 0);
          break;
        }
        case 'reset':
          gotoWp(0);
          break;
        case 'next':
          gotoWp(Math.min(wps.length - 1, idxRef.current + 1));
          break;
        case 'prev':
          gotoWp(Math.max(0, idxRef.current - 1));
          break;
        case 'turn': {
          const deg = cmd.amount ?? (cmd.direction === 'around' ? 180 : 60);
          if (cmd.direction === 'right') yawRef.current -= deg;
          else if (cmd.direction === 'around') yawRef.current += 180;
          else yawRef.current += deg; // 'left' or unspecified
          glide(cam.position.clone(), quatFromYawPitch(yawRef.current, pitchRef.current), 0.85);
          break;
        }
        case 'tilt': {
          const deg = cmd.amount ?? 25;
          pitchRef.current = clampNum(pitchRef.current + (cmd.direction === 'down' ? -deg : deg), -80, 80);
          glide(cam.position.clone(), quatFromYawPitch(yawRef.current, pitchRef.current), 0.7);
          break;
        }
        case 'move': {
          const m = cmd.amount ?? 1.2;
          const { fwd, right } = planarBasis();
          const to = cam.position.clone();
          if (cmd.direction === 'back') to.addScaledVector(fwd, -m);
          else if (cmd.direction === 'left') to.addScaledVector(right, -m);
          else if (cmd.direction === 'right') to.addScaledVector(right, m);
          else to.addScaledVector(fwd, m); // 'forward' or unspecified
          glide(clampPos(to), cam.quaternion.clone(), 0.85);
          break;
        }
        case 'zoom': {
          const step = (cmd.amount ?? 1.2) * (cmd.direction === 'out' ? -1 : 1);
          const fwd = new THREE.Vector3();
          cam.getWorldDirection(fwd).normalize();
          glide(clampPos(cam.position.clone().addScaledVector(fwd, step)), cam.quaternion.clone(), 0.75);
          break;
        }
        case 'look': {
          // generic "look around" — a gentle glance to the side
          yawRef.current += 40;
          glide(cam.position.clone(), quatFromYawPitch(yawRef.current, pitchRef.current), 0.8);
          break;
        }
        default:
          break; // 'unknown' — do nothing
      }
    },
    [tour, glide]
  );

  useImperativeHandle(ref, () => ({ apply }), [apply]);
  useEffect(() => {
    onReady?.({ apply });
  }, [onReady, apply]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    setStatus('loading');

    const bounds = tour.bounds ?? { min: [-15, -8, -15] as const, max: [15, 8, 15] as const };
    const splatUrl = tour.splatUrl ?? '/splats/sample.spz';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000);
    camera.position.set(...(tour.spawn?.position ?? [0, 0, 4]));
    camera.quaternion.copy(eulerToQuat(tour.spawn?.rotation));
    camRef.current = camera;
    yawRef.current = tour.spawn?.rotation?.[1] ?? 0;
    pitchRef.current = clampNum(tour.spawn?.rotation?.[0] ?? 0, -80, 80);
    idxRef.current = 0;

    // preserveDrawingBuffer lets the canvas be screenshotted/sampled (used for
    // share images and render verification); negligible cost for a single splat.
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    let splat: SplatMesh | null = null;
    try {
      splat = new SplatMesh({ url: splatUrl });
      // Orientation depends on the capture pipeline: 3DGS/COLMAP scenes are Y-down
      // (180° X flip [1,0,0,0]); Marble/Forge .spz are Y-up (identity [0,0,0,1]).
      splat.quaternion.set(...(tour.splatQuat ?? [1, 0, 0, 0]));
      scene.add(splat);
      // Spark resolves `initialized` once the splat is decoded and ready to draw.
      // Until then the scene is empty (black) — drive the loading overlay off this.
      splat.initialized
        .then(() => { if (!cancelled) setStatus('ready'); })
        .catch((e) => {
          console.error('[SplatTour] splat failed to initialize:', splatUrl, e);
          if (!cancelled) setStatus('error');
        });
    } catch (e) {
      console.error('[SplatTour] failed to load splat:', splatUrl, e);
      setStatus('error');
    }

    const clamp = (cam: THREE.PerspectiveCamera) => {
      const { min, max } = bounds;
      cam.position.x = Math.max(min[0], Math.min(max[0], cam.position.x));
      cam.position.y = Math.max(min[1], Math.min(max[1], cam.position.y));
      cam.position.z = Math.max(min[2], Math.min(max[2], cam.position.z));
    };

    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'p') {
        const c = camRef.current!;
        const eul = new THREE.Euler().setFromQuaternion(c.quaternion, 'YXZ');
        const deg = (r: number) => Math.round(THREE.MathUtils.radToDeg(r));
        // eslint-disable-next-line no-console
        console.log(
          `position: [${c.position.x.toFixed(2)}, ${c.position.y.toFixed(2)}, ${c.position.z.toFixed(2)}], ` +
            `rotation: [${deg(eul.x)}, ${deg(eul.y)}, ${deg(eul.z)}]`
        );
      }
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const clock = new THREE.Clock();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const up = new THREE.Vector3(0, 1, 0);
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const SPEED = 2.0;

    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      const a = animRef.current;
      if (a) {
        a.t = Math.min(1, a.t + dt / a.dur);
        const e = ease(a.t);
        camera.position.lerpVectors(a.fromP, a.toP, e);
        camera.quaternion.copy(a.fromQ).slerp(a.toQ, e);
        if (a.t >= 1) animRef.current = null;
      } else {
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        right.crossVectors(fwd, up).normalize();
        const d = SPEED * dt;
        const k = keysRef.current;
        if (k['w'] || k['arrowup']) camera.position.addScaledVector(fwd, d);
        if (k['s'] || k['arrowdown']) camera.position.addScaledVector(fwd, -d);
        if (k['a'] || k['arrowleft']) camera.position.addScaledVector(right, -d);
        if (k['d'] || k['arrowright']) camera.position.addScaledVector(right, d);
        clamp(camera);
      }
      renderer.render(scene, camera);
    });

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('resize', onResize);
      const disposable = splat as unknown as { dispose?: () => void } | null;
      disposable?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [tour]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {status !== 'ready' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px',
            background: 'rgba(8,10,16,0.92)', color: '#e7ecf5',
            fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '24px',
            pointerEvents: status === 'error' ? 'auto' : 'none',
          }}
        >
          {status === 'loading' ? (
            <>
              <div
                aria-hidden
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#6ea8fe',
                  animation: 'haven-spin 0.9s linear infinite',
                }}
              />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Entering the home…</div>
              <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 320 }}>
                Loading the 3D space. You&apos;ll be able to walk through with the arrow keys or your voice.
              </div>
              <style>{`@keyframes haven-spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Couldn&apos;t load the 3D tour</div>
              <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 340 }}>
                The 3D model failed to load. Check your connection and refresh the page.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default SplatTour;
