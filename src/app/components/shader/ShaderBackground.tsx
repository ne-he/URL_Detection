import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScanContext } from '../../context/ScanContext';
import { useTheme } from '../../context/ThemeContext';

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader — data stream wave effect
const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uConfidence;
  uniform vec3 uAccentColor;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Data stream wave
    float wave1 = sin(vUv.y * 30.0 + uTime * 2.0) * 0.5 + 0.5;
    float wave2 = sin(vUv.x * 20.0 - uTime * 1.5) * 0.5 + 0.5;
    float wave = (wave1 * wave2) * uIntensity * 0.12;

    // Matrix rain columns
    float col = floor(vUv.x * 40.0);
    float speed = random(vec2(col, 0.0)) * 2.0 + 1.0;
    float rain = fract(vUv.y * 20.0 - uTime * speed * uIntensity);
    float rainAlpha = smoothstep(0.9, 1.0, rain) * uIntensity * 0.08;

    // Chromatic aberration based on confidence
    float aberration = uConfidence * 0.015;
    vec3 color = uAccentColor * (wave + rainAlpha);

    // Red tint for high phishing confidence
    if (uConfidence > 0.7) {
      color = mix(color, vec3(1.0, 0.2, 0.2) * (wave + rainAlpha), (uConfidence - 0.7) / 0.3);
    }

    gl_FragColor = vec4(color, wave + rainAlpha);
  }
`;

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scanState } = useScanContext();
  const { threeAccentColor } = useTheme();

  const targetIntensity = useRef(0.3);
  const currentIntensity = useRef(0.3);
  const targetConfidence = useRef(0);
  const currentConfidence = useRef(0);

  // Update targets based on scan state
  if (scanState.isScanning) {
    targetIntensity.current = 1.0;
  } else if (scanState.result) {
    targetIntensity.current = 0.5;
    targetConfidence.current = scanState.result.confidence / 100;
  } else {
    targetIntensity.current = 0.3;
    targetConfidence.current = 0;
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0.3 },
    uConfidence: { value: 0 },
    uAccentColor: { value: new THREE.Color(threeAccentColor) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    // Smooth interpolation
    currentIntensity.current += (targetIntensity.current - currentIntensity.current) * delta * 2;
    currentConfidence.current += (targetConfidence.current - currentConfidence.current) * delta * 1.5;

    mat.uniforms.uTime.value += delta;
    mat.uniforms.uIntensity.value = currentIntensity.current;
    mat.uniforms.uConfidence.value = currentConfidence.current;
    mat.uniforms.uAccentColor.value.set(threeAccentColor);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function ShaderBackground() {
  if (!isWebGLSupported()) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'var(--cyber-bg)',
          animation: 'cyber-pulse 3s ease infinite',
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
