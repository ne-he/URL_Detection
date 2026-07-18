import React from "react";

interface NeonSeparatorProps {
  color?: string;
  label?: string;
  className?: string;
}

export function NeonSeparator({ color, label, className = "" }: NeonSeparatorProps) {
  const colorStyle = color
    ? {
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        boxShadow: `0 0 8px ${color}`,
      }
    : undefined;

  if (label) {
    return (
      <div
        className={`neon-separator-wrapper ${className}`}
        style={{ display: "flex", alignItems: "center", width: "100%", gap: 12 }}
      >
        <div className="neon-separator" style={{ flex: 1, ...(colorStyle ?? {}) }} />
        <span
          style={{
            color: color ?? "#00ff9d",
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            textShadow: `0 0 8px ${color ?? "#00ff9d"}`,
          }}
        >
          {label}
        </span>
        <div className="neon-separator" style={{ flex: 1, ...(colorStyle ?? {}) }} />
      </div>
    );
  }

  return <div className={`neon-separator ${className}`} style={colorStyle} />;
}
