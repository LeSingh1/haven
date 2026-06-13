'use client';
// components/tour/SplatTour.tsx — the walkable Gaussian-splat viewer. OWNED BY SHAURYA.
//
// Renders a Gaussian splat with Spark on raw Three.js (NOT react-three-fiber).
// Must be loaded client-only via next/dynamic({ ssr:false }). Walk with arrow
// keys/WASD; the voice layer drives it through the SplatTourHandle (apply()).
// Press "p" to log the camera pose (for filling waypoints in lib/tourData.ts).
//
// Implements the shared contract: tour: TourMeta, NavCommand { type, waypointId?, speech }.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
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

const SplatTour = forwardRef<SplatTourHandle, Props>(function SplatTour(
  { tour, onReady, reducedMotion = false },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const idxRef = useRef(0);
  const animRef = useRef<{
    fromP: THREE.Vector3; toP: THREE.Vector3;
    fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number; dur: number;
  } | null>(null);

  const flyTo = useCallback(
    (pos: [number, number, number], rot?: [number, number, number]) => {
      const cam = camRef.current;
      if (!cam) return;
      const toP = new THREE.Vector3(...pos);
      const toQ = eulerToQuat(rot);
      if (reducedMotion) {
        cam.position.copy(toP);
        cam.quaternion.copy(toQ);
      } else {
        animRef.current = { fromP: cam.position.clone(), toP, fromQ: cam.quaternion.clone(), toQ, t: 0, dur: 1.4 };
      }
    },
    [reducedMotion]
  );

  // The single entry point the voice layer calls (NavCommand from /api/nav).
  const apply = useCallback(
    (cmd: NavCommand) => {
      const wps = tour.waypoints;
      if (cmd.type === 'goto') {
        const i = wps.findIndex((w) => w.id === cmd.waypointId);
        if (i >= 0) { idxRef.current = i; flyTo(wps[i].position, wps[i].rotation); }
      } else if (cmd.type === 'reset') {
        idxRef.current = 0;
        if (wps[0]) flyTo(wps[0].position, wps[0].rotation);
      } else if (cmd.type === 'next') {
        idxRef.current = Math.min(wps.length - 1, idxRef.current + 1);
        const w = wps[idxRef.current];
        if (w) flyTo(w.position, w.rotation);
      } else if (cmd.type === 'prev') {
        idxRef.current = Math.max(0, idxRef.current - 1);
        const w = wps[idxRef.current];
        if (w) flyTo(w.position, w.rotation);
      } else if (cmd.type === 'look') {
        const cam = camRef.current;
        if (cam) {
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(45));
          cam.quaternion.premultiply(q);
        }
      }
    },
    [tour, flyTo]
  );

  useImperativeHandle(ref, () => ({ apply }), [apply]);
  useEffect(() => {
    onReady?.({ apply });
  }, [onReady, apply]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const bounds = tour.bounds ?? { min: [-15, -8, -15] as const, max: [15, 8, 15] as const };
    const splatUrl = tour.splatUrl ?? '/splats/sample.spz';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 1000);
    camera.position.set(...(tour.spawn?.position ?? [0, 0, 4]));
    camera.quaternion.copy(eulerToQuat(tour.spawn?.rotation));
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const spark = new SparkRenderer({ renderer });
    scene.add(spark);

    let splat: SplatMesh | null = null;
    try {
      splat = new SplatMesh({ url: splatUrl });
      splat.quaternion.set(1, 0, 0, 0); // Spark loads Y-down; 180° flip about X
      scene.add(splat);
    } catch (e) {
      console.error('[SplatTour] failed to load splat:', splatUrl, e);
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

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});

export default SplatTour;
