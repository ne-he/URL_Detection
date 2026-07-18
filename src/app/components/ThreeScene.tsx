import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "../context/ThemeContext";

export function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const mouseNDC = useRef({ x: 0, y: 0 });
  const webglFailed = useRef(false);
  const materialsRef = useRef<{ mat: THREE.MeshBasicMaterial; dotMat: THREE.PointsMaterial; ringMat: THREE.MeshBasicMaterial } | null>(null);

  const { threeAccentColor } = useTheme();

  // Update material colors when theme changes
  useEffect(() => {
    if (!materialsRef.current) return;
    const color = new THREE.Color(threeAccentColor);
    materialsRef.current.mat.color = color;
    materialsRef.current.dotMat.color = color;
  }, [threeAccentColor]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      webglFailed.current = true;
      return; // WebGL not supported, cleanup and exit
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 3.2;

    // ── Globe wireframe ──
    const geo = new THREE.SphereGeometry(1.2, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const globe = new THREE.Mesh(geo, mat);
    scene.add(globe);

    // ── Inner glow sphere ──
    const innerGeo = new THREE.SphereGeometry(1.18, 24, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const innerGlobe = new THREE.Mesh(innerGeo, innerMat);
    innerGlobe.rotation.y = Math.PI / 4;
    scene.add(innerGlobe);

    // ── Orbit ring ──
    const ringGeo = new THREE.TorusGeometry(1.6, 0.008, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    // ── Floating dots ──
    const dotCount = 60;
    const dotPositions = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.22 + Math.random() * 0.05;
      dotPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      dotPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dotPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const originalPositions = new Float32Array(dotPositions); // copy for repulse
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    scene.add(dots);

    // Store material refs for theme updates
    materialsRef.current = { mat, dotMat, ringMat };

    // ── Clock for ring pulse ──
    const clock = new THREE.Clock();

    // ── Mouse move handler ──
    const onMouseMove = (e: MouseEvent) => {
      targetRotation.current.x = (e.clientY / window.innerHeight - 0.5) * 0.4;
      targetRotation.current.y = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouseNDC.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Animation loop ──
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Mouse parallax rotation (lerp)
      globe.rotation.x += (targetRotation.current.x - globe.rotation.x) * 0.03;
      globe.rotation.y += (targetRotation.current.y - globe.rotation.y) * 0.03;

      innerGlobe.rotation.y -= 0.002;
      ring.rotation.z += 0.004;
      dots.rotation.y += 0.002;

      // Orbit ring pulse opacity
      ringMat.opacity = 0.15 + 0.25 * (Math.sin(clock.getElapsedTime() * 1.2) * 0.5 + 0.5);

      // Dot repulse effect
      const positions = dotGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dotCount; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        // const oz = originalPositions[i * 3 + 2]; // unused in projection
        // Project to NDC (simplified: use x/z ratio)
        const ndcX = ox / 2;
        const ndcY = oy / 2;
        const dx = ndcX - mouseNDC.current.x;
        const dy = ndcY - mouseNDC.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.3) {
          const force = (0.3 - dist) / 0.3;
          positions[i * 3]     += (dx / dist) * force * 0.02;
          positions[i * 3 + 1] += (dy / dist) * force * 0.02;
        } else {
          // Lerp back to original position
          positions[i * 3]     += (ox - positions[i * 3]) * 0.05;
          positions[i * 3 + 1] += (oy - positions[i * 3 + 1]) * 0.05;
        }
      }
      dotGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ──
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglFailed.current) return null;

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "55vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.55,
      }}
    />
  );
}
