import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, TrendingUp, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

export interface PredictionRecord {
  url: string;
  label: "PHISHING" | "LEGITIMATE";
  confidence: number;
  timestamp: number;
}

interface StatisticWidgetProps {
  history: PredictionRecord[];
  onSelectUrl?: (url: string) => void;
}

const COLORS = { PHISHING: "var(--cyber-danger)", LEGITIMATE: "var(--cyber-accent)" };

export function StatisticWidget({ history, onSelectUrl }: StatisticWidgetProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const total = history.length;
  const phishingCount = history.filter((r) => r.label === "PHISHING").length;
  const legitCount = total - phishingCount;

  const pieData = total > 0
    ? [
        { name: "Phishing", value: phishingCount },
        { name: "Legitimate", value: legitCount },
      ]
    : [{ name: "No data", value: 1 }];

  const recent = [...history].reverse().slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL", value: total, color: "var(--cyber-accent-2)" },
          { label: "PHISHING", value: phishingCount, color: "var(--cyber-danger)" },
          { label: "LEGIT", value: legitCount, color: "var(--cyber-accent)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${s.color}33`,
            }}
          >
            <p
              className="text-2xl font-bold"
              style={{ color: s.color, textShadow: `0 0 8px ${s.color}` }}
            >
              {s.value}
            </p>
            <p className="text-xs tracking-widest mt-0.5" style={{ color: "rgba(224,224,224,0.4)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      {total > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,157,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#00ff9d" }} />
            <p className="text-xs tracking-widest" style={{ color: "rgba(0,255,157,0.7)" }}>
              DISTRIBUTION
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === "No data" ? "#1a2a2a" : COLORS[entry.name as keyof typeof COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0a1a1a", border: "1px solid #00ff9d33", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#00ff9d" }}
                  itemStyle={{ color: "#e0e0e0" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff3b3b", boxShadow: "0 0 4px #ff3b3b" }} />
                <span className="text-xs" style={{ color: "#e0e0e0" }}>
                  Phishing <span style={{ color: "#ff3b3b" }}>{total > 0 ? Math.round((phishingCount / total) * 100) : 0}%</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#00ff9d", boxShadow: "0 0 4px #00ff9d" }} />
                <span className="text-xs" style={{ color: "#e0e0e0" }}>
                  Legit <span style={{ color: "#00ff9d" }}>{total > 0 ? Math.round((legitCount / total) * 100) : 0}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent history */}
      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,157,0.1)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" style={{ color: "#00ffff" }} />
          <p className="text-xs tracking-widest" style={{ color: "rgba(0,255,255,0.7)" }}>
            RECENT SCANS
          </p>
        </div>

        {recent.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "rgba(224,224,224,0.3)" }}>
            No scans yet
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r, i) => dismissed.has(r.timestamp) ? null : (
              <motion.li
                key={r.timestamp}
                drag={shouldReduceMotion ? false : "x"}
                dragConstraints={{ left: -200, right: 0 }}
                onDragEnd={(_, info) => { if (info.offset.x < -80) setDismissed((prev) => new Set(prev).add(r.timestamp)); }}
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -120 }}
                transition={{ delay: shouldReduceMotion ? 0 : i * 0.05, duration: shouldReduceMotion ? 0 : 0.2 }}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{
                  background: hoveredIndex === i ? "rgba(0,255,157,0.06)" : "rgba(255,255,255,0.03)",
                  border: hoveredIndex === i ? "1px solid rgba(0,255,157,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "grab",
                }}
                onClick={() => { if (r.url) onSelectUrl?.(r.url); }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: r.label === "PHISHING" ? "#ff3b3b" : "#00ff9d",
                    boxShadow: r.label === "PHISHING" ? "0 0 4px #ff3b3b" : "0 0 4px #00ff9d",
                  }}
                />
                <span
                  className="text-xs truncate flex-1"
                  style={{ color: "rgba(224,224,224,0.6)", fontFamily: "monospace" }}
                >
                  {r.url.replace(/^https?:\/\//, "")}
                </span>
                <span
                  className="text-xs font-bold flex-shrink-0"
                  style={{
                    color: r.label === "PHISHING" ? "#ff3b3b" : "#00ff9d",
                    fontSize: 10,
                  }}
                >
                  {r.confidence.toFixed(0)}%
                </span>
                {hoveredIndex === i && (
                  <RotateCcw className="flex-shrink-0" style={{ width: 16, height: 16, color: "#00ff9d" }} />
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
