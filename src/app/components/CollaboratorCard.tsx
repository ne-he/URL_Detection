import { useState } from "react";
import { GlitchText } from "./GlitchText";

interface CollaboratorCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  githubUrl?: string;
  description?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CollaboratorCard({
  name,
  role,
  avatarUrl,
  githubUrl,
  description,
}: CollaboratorCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="collaborator-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(8,14,14,0.88)",
        border: hovered ? "1px solid #00ff9d" : "1px solid rgba(0,255,157,0.18)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transform: hovered ? "scale(1.03)" : "scale(1)",
        boxShadow: hovered ? "0 0 20px rgba(0,255,157,0.25)" : "none",
        transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
    >
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: "#00ff9d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "#0a0f0f",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              {getInitials(name)}
            </span>
          )}
        </div>

        {/* Name + Role */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <GlitchText text={name} style={{ fontSize: 16, fontWeight: 700 }} />
          <span
            style={{
              color: "rgba(0,255,255,0.7)",
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.08em",
            }}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Description */}
      {description && description.length > 0 && (
        <p
          style={{
            color: "rgba(224,224,224,0.5)",
            fontFamily: "monospace",
            fontSize: 12,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {/* GitHub link */}
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            alignSelf: "flex-start",
            color: "#00ff9d",
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textDecoration: "none",
            border: "1px solid rgba(0,255,157,0.35)",
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          GitHub
        </a>
      )}
    </div>
  );
}
