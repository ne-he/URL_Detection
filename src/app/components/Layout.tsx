import { Link, Outlet, useLocation } from "react-router";
import { Home, Info, Shield } from "lucide-react";
import { lazy, Suspense } from "react";
import { CyberParticles } from "./CyberParticles";
import { ThreeScene } from "./ThreeScene";
import { CustomCursor } from "./CustomCursor";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeProvider } from "../context/ThemeContext";
import { GamificationProvider } from "../context/GamificationContext";
import { ScanProvider } from "../context/ScanContext";
import { ScanlineOverlay } from "./hud/ScanlineOverlay";
import { HUDSystem } from "./hud/HUDSystem";
import { ConnectionStatus } from "./pwa/ConnectionStatus";
import { TerminalModal } from "./terminal/TerminalModal";

const ShaderBackground = lazy(() =>
  import("./shader/ShaderBackground").then((m) => ({ default: m.ShaderBackground }))
);

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/about", label: "About Us", icon: Info },
  ];

  return (
    <ThemeProvider>
      <GamificationProvider>
        <ScanProvider>
    <div
    style={{
    display: "flex",
    height: "100vh",
    background: "#0a0f0f",
    color: "#e0e0e0",
    position: "relative",
    overflow: "hidden",
  }}
    >
      {/* Custom cursor */}
      <CustomCursor />

      {/* Shader background (lazy) */}
      <Suspense fallback={null}>
        <ShaderBackground />
      </Suspense>

      {/* Scanline overlay */}
      <ScanlineOverlay />

      {/* HUD system */}
      <HUDSystem />

      {/* Connection status */}
      <ConnectionStatus />

      {/* Terminal modal (Ctrl+K) */}
      <TerminalModal />

      {/* Layer 0: particles (fixed, fullscreen) */}
      <CyberParticles />

      {/* Layer 1: Three.js globe (fixed, right side) */}
      <ThreeScene />

      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          background: "rgba(5,10,10,0.92)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid var(--cyber-border-color)",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(0,255,157,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36, height: 36,
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,255,157,0.1)",
                border: "1px solid rgba(0,255,157,0.35)",
                boxShadow: "0 0 12px rgba(0,255,157,0.2)",
              }}
            >
              <Shield style={{ width: 18, height: 18, color: "var(--cyber-accent)" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "var(--cyber-accent)", textShadow: "0 0 10px var(--cyber-accent)", textTransform: "uppercase" }}>
                PhishGuard
              </p>
              <p style={{ fontSize: 10, color: "rgba(224,224,224,0.35)", letterSpacing: "0.1em" }}>v3.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(0,255,157,0.4)", marginBottom: 10, paddingLeft: 8 }}>
            NAVIGATION
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      ...(isActive
                        ? {
                            background: "rgba(0,255,157,0.1)",
                            border: "1px solid rgba(0,255,157,0.3)",
                            color: "#00ff9d",
                            textShadow: "0 0 6px #00ff9d",
                            boxShadow: "0 0 14px rgba(0,255,157,0.12)",
                          }
                        : {
                            border: "1px solid transparent",
                            color: "rgba(224,224,224,0.55)",
                          }),
                    }}
                  >
                    <Icon style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.05em" }}>{item.label}</span>
                    {isActive && (
                      <span
                        style={{
                          marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
                          background: "#00ff9d", boxShadow: "0 0 8px #00ff9d",
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,255,157,0.1)" }}>
          <p style={{ fontSize: 10, textAlign: "center", letterSpacing: "0.15em", color: "rgba(0,255,157,0.35)", marginBottom: 8 }}>
            SYSTEM ONLINE
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--cyber-accent)", boxShadow: "var(--cyber-glow)",
                  animation: `pulse-dot 1.5s ease-in-out ${i * 0.3}s infinite`,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          position: "relative",
          zIndex: 10,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "32px 40px",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: -4, skewX: 2, filter: "blur(2px)" }}
            animate={{ opacity: 1, x: 0, skewX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 4, skewX: -2, filter: "blur(2px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ maxWidth: 1400, margin: "0 auto" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        /* Ensure html/body fill viewport without overflow */
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
        </ScanProvider>
      </GamificationProvider>
    </ThemeProvider>
  );
}
