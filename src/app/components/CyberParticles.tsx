import { useCallback, useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

// Singleton init — only runs once across the app lifetime
let engineInitialized = false;
let enginePromise: Promise<void> | null = null;

function getEngine() {
  if (!enginePromise) {
    enginePromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    });
  }
  return enginePromise;
}

const particleOptions: ISourceOptions = {
  // fullScreen: true renders on a fixed canvas covering the whole viewport
  fullScreen: { enable: true, zIndex: 0 },
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  particles: {
    number: {
      value: 130,
      density: { enable: true, width: 800 },
    },
    color: { value: ["#00ff9d", "#00ffff"] },
    shape: {
      type: ["circle", "char"],
      options: {
        char: {
          value: ["0", "1", ">", "$", "#"],
          font: "monospace",
          style: "",
          weight: "700",
        },
      },
    },
    opacity: {
      value: { min: 0.6, max: 0.9 },
      animation: { enable: true, speed: 0.5, sync: false },
    },
    size: { value: { min: 3, max: 6 } },
    links: {
      enable: true,
      distance: 120,
      color: "#00ffff",
      opacity: 0.55,
      width: 1.5,
    },
    move: {
      enable: true,
      speed: 1.2,
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "bounce" },
    },
  },
  interactivity: {
    detectsOn: "window",
    events: {
      onHover: { enable: true, mode: "repulse" },
      onClick: { enable: true, mode: "push" },
    },
    modes: {
      repulse: { distance: 150, duration: 0.4, factor: 5 },
      push: { quantity: 4 },
    },
  },
  detectRetina: true,
};

export function CyberParticles() {
  const [ready, setReady] = useState(engineInitialized);

  useEffect(() => {
    if (engineInitialized) return;
    getEngine().then(() => {
      engineInitialized = true;
      setReady(true);
    });
  }, []);

  const particlesLoaded = useCallback(async () => {}, []);

  if (!ready) return null;

  return (
    <Particles
      id="cyber-particles"
      particlesLoaded={particlesLoaded}
      options={particleOptions}
      style={{ pointerEvents: "none" }}
    />
  );
}
