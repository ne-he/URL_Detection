import { Target, Layers, Shield, FileSearch, Github as GithubIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GlitchText } from "./GlitchText";
import { NeonSeparator } from "./NeonSeparator";
import { CollaboratorCard } from "./CollaboratorCard";

const REPO_URL = "https://github.com/ne-he/URL_Detection";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Klaim di halaman ini sengaja dibatasi ke yang bisa dibuktikan dari repo: angka
// diambil dari docs/EVAL.md, dan urutan layer sesuai app/threat.py + app/predictor.py.
const features = [
  {
    icon: <Target size={20} color="#00ff9d" />,
    title: "Measured, Not Claimed",
    description:
      "95.7% accuracy and 95.8% recall on a 1,000-URL holdout that never entered training. The full report is in the repo.",
  },
  {
    icon: <Layers size={20} color="#00ff9d" />,
    title: "Layered Checks",
    description:
      "A live phishing blocklist runs first, then a curated allowlist, and only then the model. Every response says which layer decided.",
  },
  {
    icon: <Shield size={20} color="#00ff9d" />,
    title: "Nothing Kept",
    description:
      "The URL is sent to the API to be scored and is not logged or stored. Your scan history stays in your own browser.",
  },
  {
    icon: <FileSearch size={20} color="#00ff9d" />,
    title: "Open About Its Limits",
    description:
      "The known failure modes are documented, including the model's bias against legitimate login pages.",
  },
];

export function AboutUs() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div
      style={{
        background: "#0a0f0f",
        minHeight: "100%",
        padding: "32px 24px",
        fontFamily: "monospace",
      }}
    >
      <div
        className="max-w-6xl mx-auto"
        style={{ maxWidth: 1152, margin: "0 auto" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ── Left Column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div>
              <GlitchText
                text="About PhishGuard"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "block",
                  lineHeight: 1.2,
                }}
              />
              <p
                style={{
                  color: "rgba(0,255,255,0.5)",
                  fontSize: 11,
                  letterSpacing: "0.25em",
                  marginTop: 8,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                PHISHING DETECTION SYSTEM v2.2
              </p>

              {/* Decorative divider: two gradient lines + diamond */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background:
                      "linear-gradient(90deg, transparent, #00ff9d, transparent)",
                    boxShadow: "0 0 6px #00ff9d",
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: "#00ff9d",
                    transform: "rotate(45deg)",
                    boxShadow: "0 0 8px #00ff9d",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background:
                      "linear-gradient(90deg, transparent, #00ff9d, transparent)",
                    boxShadow: "0 0 6px #00ff9d",
                  }}
                />
              </div>
            </div>

            <NeonSeparator />

            {/* Project description */}
            <p
              style={{
                color: "rgba(224,224,224,0.7)",
                fontSize: 14,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              PhishGuard reads a URL the way an attacker writes one. The address is
              embedded with a sentence transformer and combined with 20 handcrafted
              lexical signals, then scored by a small dense network. No page is
              visited and no site is downloaded: the verdict comes from the address
              alone, which is why it answers in a second.
            </p>

            <NeonSeparator label="WHY IT EXISTS" />

            {/* Mission */}
            <p
              style={{
                color: "rgba(224,224,224,0.7)",
                fontSize: 14,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              Most demo detectors report one accuracy number and stop there. This one
              publishes the confusion matrix, the adversarial breakdown, and the cases
              it still gets wrong, because a security tool that hides its failure modes
              is asking to be trusted further than it has earned.
            </p>

            <NeonSeparator label="WHAT IT DOES" />

            {/* Feature grid 2x2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {features.map((f) => (
                <div
                  key={f.title}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "rgba(0,255,157,0.08)",
                      border: "1px solid rgba(0,255,157,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <span
                    style={{
                      color: "#e0e0e0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {f.title}
                  </span>
                  <span
                    style={{
                      color: "rgba(224,224,224,0.5)",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {f.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <NeonSeparator label="BUILT BY" />

            <motion.div
              variants={shouldReduceMotion ? undefined : staggerContainer}
              initial="hidden"
              animate="show"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
                <CollaboratorCard
                  name="Nehemiah Wilhelmus Junaidi"
                  role="Data Science, Bina Nusantara"
                  githubUrl="https://github.com/ne-he"
                  description="Built the v2 detector end to end: dataset, feature engineering, training, the FastAPI service, the threat layers, the test suite, and this interface. Runs on Hugging Face Spaces and Vercel."
                />
              </motion.div>
            </motion.div>

            <NeonSeparator label="UNDER THE HOOD" />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                color: "rgba(224,224,224,0.6)",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {[
                ["Embedding", "all-MiniLM-L6-v2, 384 dimensions"],
                ["Features", "20 lexical signals, 404-d input in total"],
                ["Classifier", "dense 404 to 128 to 64 to 1, numpy forward pass"],
                ["Serving", "FastAPI on Hugging Face Spaces"],
                ["Interface", "React and Vite on Vercel"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: "1px solid rgba(0,255,157,0.08)",
                    paddingBottom: 8,
                  }}
                >
                  <span style={{ color: "rgba(0,255,255,0.7)", flexShrink: 0 }}>{k}</span>
                  <span style={{ textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>

            <NeonSeparator label="HISTORY" />

            <p
              style={{
                color: "rgba(224,224,224,0.55)",
                fontSize: 12,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              v1 was a university group project where my part was the frontend. v2 is a
              solo rebuild: the model was retrained, the backend was written from
              scratch, and the parts that were quietly broken in v1 were fixed and
              locked with tests. Everything you are using here comes from that rebuild.
            </p>

            {/* View GitHub button */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "rgba(0,255,157,0.07)",
                border: "1px solid rgba(0,255,157,0.3)",
                color: "#00ff9d",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxSizing: "border-box",
              }}
            >
              <GithubIcon size={16} />
              View Source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
