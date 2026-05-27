import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { ClipboardPaste, Camera, Upload, X, ShieldAlert, ShieldCheck, Copy, ExternalLink, Terminal, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GlitchText } from "./GlitchText";
import { MatrixProgress } from "./MatrixProgress";
import { StatisticWidget, type PredictionRecord } from "./StatisticWidget";
import { ToastNotification } from "./ToastNotification";
import { ThreatMeter } from "./threat/ThreatMeter";
import { VoiceButton, speakVerdict } from "./voice/VoiceButton";
import { NeuralNetModal } from "./analysis/NeuralNetModal";
import { useScanContext } from "../context/ScanContext";
import { useGamification } from "../context/GamificationContext";

const ThreatGlobe = lazy(() =>
  import("./globe/ThreatGlobe").then((m) => ({ default: m.ThreatGlobe }))
);

const STORAGE_KEY = "phishguard_history";
function loadHistory(): PredictionRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveHistory(h: PredictionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 50)));
}

function CyberCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(8,14,14,0.88)", backdropFilter: "blur(14px)", border: "1px solid rgba(0,255,157,0.18)", borderRadius: 16, boxShadow: "0 0 30px rgba(0,255,157,0.05)", ...style }}>{children}</div>
  );
}

function SectionLabel({ children, color = "#00ff9d" }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.2em", color, margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color, textShadow: `0 0 6px ${color}` }}>&#9658;</span> {children}
    </p>
  );
}

export function LinkPredictor({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [legitProb, setLegitProb] = useState<number | null>(null);
  const [displayLegit, setDisplayLegit] = useState(100);
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>(loadHistory);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [btnSuccess, setBtnSuccess] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { startScan, completeScan } = useScanContext();
  const { recordScan } = useGamification();

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLogs]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setTerminalLogs((p) => [...p, `[${ts}] ${msg}`]);
  };

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setUrl(t);
      addLog("URL pasted");
      setToast("Pasted!");
    } catch {
      setToast("Clipboard denied");
    }
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setToast("Copied!");
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return alert("Masukkan URL dulu");
    if (!navigator.onLine) {
      addLog("ERROR: No internet connection");
      setToast("Offline — tidak bisa menganalisis URL");
      return;
    }
    setPulseKey((k) => k + 1);
    setIsAnalyzing(true); setProgress(0); setLabel(null); setAccuracy(null);
    setLegitProb(null); setDisplayLegit(100); setTerminalLogs([]); setShowTerminal(true);
    startScan(url);
    addLog("Initializing...");
    const iv = setInterval(() => setProgress((p) => p >= 98 ? p : p + 2), 100);
    setTimeout(() => addLog("Encoding URL..."), 600);
    setTimeout(() => addLog("Generating vector [384-dim]..."), 1400);
    setTimeout(() => addLog("Running model inference..."), 2400);
    setTimeout(() => addLog("Post-processing..."), 3600);
    setTimeout(() => addLog("Finalizing..."), 4400);
    try {
      const res = await fetch("https://adhikaxx88-phishing-detection-api.hf.space/predict", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setTimeout(() => {
        clearInterval(iv); setProgress(100); setLabel(data.label); setAccuracy(data.confidence);
        setLegitProb(data.legitimate_chance); setIsAnalyzing(false);
        setBtnSuccess(true); setTimeout(() => setBtnSuccess(false), 1000);
        addLog(`Result: ${data.label} (${data.confidence.toFixed(1)}%)`);
        const record: PredictionRecord = { url, label: data.label, confidence: data.confidence, timestamp: Date.now() };
        const updated = [record, ...history]; setHistory(updated); saveHistory(updated);
        completeScan({ label: data.label, confidence: data.confidence, legitimateChance: data.legitimate_chance, timestamp: Date.now() });
        recordScan({ label: data.label, confidence: data.confidence });
        speakVerdict(data.label, data.confidence);
        let cur = 100;
        const barIv = setInterval(() => {
          cur -= 1; setDisplayLegit(cur);
          if (cur <= data.legitimate_chance) { setDisplayLegit(data.legitimate_chance); clearInterval(barIv); }
        }, 20);
      }, 5000);
    } catch (err) {
      clearInterval(iv); setIsAnalyzing(false); addLog("ERROR: backend unreachable");
      alert("Tidak bisa terhubung ke FastAPI"); console.error(err);
    }
  };

  const startCameraScanning = async () => {
    setScanError(null); setIsScanning(true); addLog("Starting camera...");
    try {
      const qr = new Html5Qrcode("qr-reader"); html5QrCodeRef.current = qr;
      await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decoded) => { setUrl(decoded); addLog(`QR: ${decoded}`); stopScanning(); }, () => {});
    } catch { setScanError("Camera error"); setIsScanning(false); }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) { await html5QrCodeRef.current.stop(); html5QrCodeRef.current.clear(); html5QrCodeRef.current = null; }
    setIsScanning(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanError(null); addLog(`Scanning: ${file.name}`);
    try {
      const qr = new Html5Qrcode("qr-file-reader");
      const result = await qr.scanFile(file, true);
      setUrl(result); addLog(`QR: ${result}`); qr.clear();
    } catch { setScanError("QR tidak terbaca"); addLog("ERROR: decode failed"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isPhishing = label === "PHISHING";
  const hasResult = label !== null && accuracy !== null && legitProb !== null;
  const btnSec: React.CSSProperties = { padding: "9px 16px", borderRadius: 8, background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.22)", color: "var(--cyber-accent-2)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" };
  const btnIcon: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, background: "rgba(0,255,157,0.07)", border: "1px solid rgba(0,255,157,0.22)", color: "var(--cyber-accent)", cursor: "pointer", display: "flex", alignItems: "center" };

  const analyzeBoxShadow = btnSuccess
    ? "0 0 20px #00ff9d, 0 0 40px rgba(0,255,157,0.4)"
    : btnHovered && !isAnalyzing
      ? "0 0 14px rgba(0,255,157,0.4)"
      : "none";

  return (
    <div style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px 0" }}>
          <GlitchText text="Link Predictor" />
        </h1>
        <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "rgba(0,255,255,0.5)", margin: 0 }}>DEEP LEARNING PHISHING DETECTION SYSTEM v3.0</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <div style={{ height: 1, width: 100, background: "linear-gradient(90deg, transparent, #00ff9d)" }} />
          <span style={{ color: "#00ff9d", textShadow: "0 0 8px #00ff9d" }}>&#9670;</span>
          <div style={{ height: 1, width: 100, background: "linear-gradient(90deg, #00ff9d, transparent)" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CyberCard style={{ padding: 24 }}>
            <SectionLabel>TARGET URL</SectionLabel>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://example.com"
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,255,157,0.25)", color: "#e0e0e0", outline: "none", fontFamily: "monospace", fontSize: 13 }}
                  onFocus={(e) => { e.target.style.borderColor = "#00ff9d"; e.target.style.boxShadow = "0 0 12px rgba(0,255,157,0.3)"; setInputFocused(true); }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(0,255,157,0.25)"; e.target.style.boxShadow = "none"; setInputFocused(false); }}
                />
                <button onClick={handlePaste} style={btnIcon}><ClipboardPaste style={{ width: 16, height: 16 }} /></button>
                <button onClick={handleCopyUrl} style={btnIcon}><Copy style={{ width: 16, height: 16 }} /></button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <VoiceButton onUrlDetected={(u) => setUrl(u)} />
              </div>
              {inputFocused && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: 2,
                  width: "100%",
                  background: "linear-gradient(90deg, #00ff9d, #00ffff)",
                  boxShadow: "0 0 8px #00ff9d",
                  animation: "cyber-sweep-line 0.3s ease forwards",
                  transformOrigin: "left",
                  pointerEvents: "none",
                }} />
              )}
            </div>
            <button
              key={pulseKey}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(0,255,157,0.14), rgba(0,255,255,0.08))",
                border: "1px solid rgba(0,255,157,0.5)",
                color: "#00ff9d",
                textShadow: "0 0 10px #00ff9d",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                opacity: isAnalyzing ? 0.6 : 1,
                position: "relative",
                overflow: "hidden",
                boxShadow: analyzeBoxShadow,
                transform: btnHovered && !isAnalyzing ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s ease",
                animation: "cyber-btn-pulse 0.4s ease",
              }}>
              <span style={{ position: "relative", zIndex: 1 }}>{isAnalyzing ? "Scanning..." : "Analyze URL"}</span>
              {isAnalyzing && <div style={{ position: "absolute", top: 0, left: "-60%", width: "50%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(0,255,157,0.3), transparent)", animation: "cyber-sweep 1.2s linear infinite" }} />}
            </button>
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} style={{ marginTop: 14, overflow: "hidden" }}>
                  <MatrixProgress progress={progress} />
                </motion.div>
              )}
            </AnimatePresence>
          </CyberCard>

          <CyberCard style={{ padding: 24 }}>
            <SectionLabel color="#00ffff">QR / BARCODE SCANNER</SectionLabel>
            {!isScanning && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={startCameraScanning} style={{ ...btnSec, flex: 1, justifyContent: "center" }}><Camera style={{ width: 14, height: 14 }} />&nbsp;Camera</button>
                <label style={{ ...btnSec, flex: 1, justifyContent: "center", cursor: "pointer" }}>
                  <Upload style={{ width: 14, height: 14 }} />&nbsp;Upload
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
              </div>
            )}
            {isScanning && (
              <div>
                <button onClick={stopScanning} style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff3b3b", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginBottom: 10 }}>
                  <X style={{ width: 14, height: 14 }} /> Stop
                </button>
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,255,157,0.35)" }}>
                  <div id="qr-reader" />
                  <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #00ff9d, transparent)", boxShadow: "0 0 10px #00ff9d", animation: "cyber-scan-line 1.8s linear infinite", pointerEvents: "none" }} />
                </div>
              </div>
            )}
            <div id="qr-file-reader" style={{ display: "none" }} />
            {scanError && <p style={{ color: "#ff3b3b", fontSize: 12, margin: "10px 0 0 0" }}>&#9888; {scanError}</p>}
          </CyberCard>

          <CyberCard style={{ overflow: "hidden" }}>
            <button onClick={() => setShowTerminal((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", color: "rgba(0,255,157,0.7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 10, letterSpacing: "0.2em" }}>SYSTEM LOG</span>
                {terminalLogs.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(0,255,157,0.15)", color: "#00ff9d" }}>{terminalLogs.length}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setTerminalLogs([]); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,59,59,0.6)", padding: "2px 4px", display: "flex", alignItems: "center" }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
                {showTerminal ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              </div>
            </button>
            <AnimatePresence>
              {showTerminal && (
                <motion.div initial={{ height: 0 }} animate={{ height: 150 }} exit={{ height: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} style={{ overflow: "hidden" }}>
                  <div ref={terminalRef} style={{ height: 150, overflowY: "auto", padding: "0 20px 14px", fontFamily: "monospace", fontSize: 11 }}>
                    {terminalLogs.length === 0
                      ? <p style={{ color: "rgba(224,224,224,0.2)", margin: 0 }}>Awaiting...</p>
                      : terminalLogs.map((log, i) => (
                          <motion.p
                            key={i}
                            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                            style={{ color: log.includes("ERROR") ? "#ff3b3b" : "rgba(0,255,157,0.75)", lineHeight: 1.9, margin: 0 }}
                          >
                            {log}
                          </motion.p>
                        ))
                    }
                    {isAnalyzing && <span style={{ color: "#00ff9d" }}>|</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CyberCard>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CyberCard style={{ padding: 24, flex: 1 }}>
            <SectionLabel color="#00ffff">ANALYSIS RESULT</SectionLabel>
            <AnimatePresence mode="wait">
              {!hasResult && !isAnalyzing && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.15)" }}>
                    <ShieldAlert style={{ width: 28, height: 28, color: "rgba(0,255,157,0.3)" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(224,224,224,0.3)", textAlign: "center", lineHeight: 1.7, margin: 0 }}>Enter a URL and click Analyze</p>
                </motion.div>
              )}
              {isAnalyzing && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(0,255,157,0.5)", boxShadow: "0 0 24px rgba(0,255,157,0.25)", animation: "cyber-border-spin 2s linear infinite" }}>
                    <span style={{ fontSize: 26 }}>&#9889;</span>
                  </div>
                  <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(0,255,157,0.6)", margin: 0 }}>ANALYZING...</p>
                </motion.div>
              )}
              {hasResult && !isAnalyzing && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div style={{ borderRadius: 12, padding: "18px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16, background: isPhishing ? "rgba(255,59,59,0.08)" : "rgba(0,255,157,0.08)", border: `1px solid ${isPhishing ? "rgba(255,59,59,0.45)" : "rgba(0,255,157,0.45)"}`, boxShadow: isPhishing ? "0 0 24px rgba(255,59,59,0.12)" : "0 0 24px rgba(0,255,157,0.12)" }}>
                    {isPhishing ? <ShieldAlert style={{ width: 44, height: 44, color: "#ff3b3b", filter: "drop-shadow(0 0 10px #ff3b3b)", flexShrink: 0 }} /> : <ShieldCheck style={{ width: 44, height: 44, color: "#00ff9d", filter: "drop-shadow(0 0 10px #00ff9d)", flexShrink: 0 }} />}
                    <div>
                      <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(224,224,224,0.4)", margin: "0 0 4px 0" }}>VERDICT</p>
                      <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: "0.15em", color: isPhishing ? "#ff3b3b" : "#00ff9d", textShadow: isPhishing ? "0 0 14px #ff3b3b" : "0 0 14px #00ff9d", margin: 0 }}>{label}</p>
                    </div>
                  </div>
                  {[{ lbl: "CONFIDENCE", val: accuracy, anim: true }, { lbl: "LEGITIMATE PROBABILITY", val: displayLegit, anim: false }].map(({ lbl, val, anim }) => (
                    <div key={lbl} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6, color: "rgba(224,224,224,0.5)", letterSpacing: "0.15em" }}>
                        <span>{lbl}</span><span style={{ color: "#00ffff" }}>{(val ?? 0).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                        {anim
                          ? <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.9, ease: "easeOut" }} style={{ height: "100%", borderRadius: 5, background: isPhishing ? "linear-gradient(90deg,#ff3b3b,#ff6b6b)" : "linear-gradient(90deg,#00ff9d,#00ffff)", boxShadow: isPhishing ? "0 0 10px #ff3b3b" : "0 0 10px #00ff9d" }} />
                          : <div style={{ height: "100%", borderRadius: 5, width: `${val}%`, background: "linear-gradient(90deg,#00ff9d,#00ffff)", boxShadow: "0 0 10px #00ff9d", transition: "width 75ms linear" }} />
                        }
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button onClick={handleCopyUrl} style={{ ...btnSec, flex: 1, justifyContent: "center" }}><Copy style={{ width: 13, height: 13 }} />&nbsp;Copy URL</button>
                    {!isPhishing && <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSec, flex: 1, justifyContent: "center" }}><ExternalLink style={{ width: 13, height: 13 }} />&nbsp;Open URL</a>}
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                    <ThreatMeter confidence={accuracy} label={label} />
                  </div>
                  <NeuralNetModal url={url} label={label} confidence={accuracy} />
                </motion.div>
              )}
            </AnimatePresence>
          </CyberCard>

          <CyberCard style={{ padding: 24 }}>
            <SectionLabel>STATISTICS & HISTORY</SectionLabel>
            <StatisticWidget history={history} onSelectUrl={(u) => setUrl(u)} />
          </CyberCard>
        </div>
      </div>

      <ToastNotification message={toast} onDone={() => setToast(null)} />

      {/* ThreatGlobe — lazy loaded */}
      <div style={{ marginTop: 32 }}>
        <Suspense fallback={<div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,255,157,0.3)", fontFamily: "monospace", fontSize: 12 }}>Loading Globe...</div>}>
          <ThreatGlobe />
        </Suspense>
      </div>
    </div>
  );
}
