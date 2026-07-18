import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

interface ThreatPoint {
  lat: number;
  lng: number;
  urls: string[];
  country: string;
}

interface PredictionRecord {
  url: string;
  label: string;
  confidence: number;
  timestamp: number;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Deterministic pseudo-random from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function domainToFakeLatlng(domain: string): { lat: number; lng: number } {
  const h = hashString(domain);
  const lat = ((h % 180) - 90) * 0.8; // -72 to 72
  const lng = (((h >> 8) % 360) - 180);
  return { lat, lng };
}

async function resolveGeoLocation(url: string): Promise<{ lat: number; lng: number; country: string } | null> {
  try {
    const domain = new URL(url).hostname;
    const res = await fetch(`https://ip-api.com/json/${domain}?fields=lat,lon,country,status`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json() as { status: string; lat: number; lon: number; country: string };
    if (data.status === 'success') return { lat: data.lat, lng: data.lon, country: data.country };
    const fake = domainToFakeLatlng(domain);
    return { ...fake, country: 'Unknown' };
  } catch {
    try {
      const domain = new URL(url).hostname;
      const fake = domainToFakeLatlng(domain);
      return { ...fake, country: 'Unknown' };
    } catch {
      return null;
    }
  }
}

// Globe mesh component
function GlobeMesh({ accentColor }: { accentColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color={accentColor} wireframe opacity={0.15} transparent />
    </mesh>
  );
}

// Threat point dot
function ThreatDot({ position, onClick }: { position: THREE.Vector3; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      meshRef.current.scale.setScalar(scale);
    }
  });
  return (
    <mesh ref={meshRef} position={position} onClick={onClick}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color="#ff3b3b" />
    </mesh>
  );
}

// Orbit satellite
function OrbitSatellite({ accentColor }: { totalScans: number; accentColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime * 0.5;
      meshRef.current.position.set(Math.cos(t) * 1.4, Math.sin(t * 0.3) * 0.3, Math.sin(t) * 1.4);
    }
  });
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.04, 0.04, 0.04]} />
      <meshBasicMaterial color={accentColor} />
    </mesh>
  );
}

function GlobeScene({ threatPoints, onPointClick, accentColor, totalScans }: {
  threatPoints: ThreatPoint[];
  onPointClick: (point: ThreatPoint) => void;
  accentColor: string;
  totalScans: number;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <GlobeMesh accentColor={accentColor} />
      <OrbitSatellite totalScans={totalScans} accentColor={accentColor} />
      {threatPoints.map((point, i) => {
        const pos = latLngToVector3(point.lat, point.lng, 1.02);
        return (
          <ThreatDot key={i} position={pos} onClick={() => onPointClick(point)} />
        );
      })}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} dampingFactor={0.05} enableDamping />
    </>
  );
}

export function ThreatGlobe() {
  const [threatPoints, setThreatPoints] = useState<ThreatPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<ThreatPoint | null>(null);
  const { threeAccentColor } = useTheme();

  // Load from localStorage on mount
  useEffect(() => {
    const loadThreatPoints = async () => {
      try {
        const history = JSON.parse(localStorage.getItem('phishguard_history') ?? '[]') as PredictionRecord[];
        const phishingUrls = history.filter(r => r.label === 'PHISHING').map(r => r.url);
        if (phishingUrls.length === 0) return;

        const pointMap = new Map<string, ThreatPoint>();
        for (const url of phishingUrls.slice(0, 20)) {
          const geo = await resolveGeoLocation(url);
          if (!geo) continue;
          const key = `${geo.lat.toFixed(1)},${geo.lng.toFixed(1)}`;
          if (pointMap.has(key)) {
            pointMap.get(key)!.urls.push(url);
          } else {
            pointMap.set(key, { lat: geo.lat, lng: geo.lng, urls: [url], country: geo.country });
          }
        }
        setThreatPoints(Array.from(pointMap.values()));
      } catch {
        // fail silently
      }
    };
    loadThreatPoints();
  }, []);

  const totalScans = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('phishguard_history') ?? '[]') as PredictionRecord[]).length;
    } catch { return 0; }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} style={{ background: 'transparent' }}>
        <GlobeScene
          threatPoints={threatPoints}
          onPointClick={setSelectedPoint}
          accentColor={threeAccentColor}
          totalScans={totalScans}
        />
      </Canvas>

      {/* Stats overlay */}
      <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontFamily: 'monospace', color: 'rgba(224,224,224,0.4)' }}>
        <div>{threatPoints.length} threat locations</div>
        <div>{totalScans} total scans</div>
      </div>

      {threatPoints.length === 0 && (
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(224,224,224,0.25)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          No threat data available
        </div>
      )}

      {/* Selected point modal */}
      {selectedPoint && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(5,10,10,0.95)', border: '1px solid var(--cyber-danger)',
            borderRadius: 10, padding: 16, zIndex: 10, minWidth: 200,
            boxShadow: '0 0 20px rgba(255,59,59,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#ff3b3b', letterSpacing: '0.15em' }}>THREAT LOCATION</span>
            <button onClick={() => setSelectedPoint(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,224,224,0.5)', fontSize: 14 }}>×</button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(224,224,224,0.6)', margin: '0 0 8px 0' }}>{selectedPoint.country}</p>
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {selectedPoint.urls.map((url, i) => (
              <p key={i} style={{ fontSize: 9, color: '#ff3b3b', fontFamily: 'monospace', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url.length > 40 ? url.slice(0, 40) + '...' : url}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
