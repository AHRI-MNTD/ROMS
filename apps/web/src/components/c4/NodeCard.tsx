import React from "react";

interface NodeCardProps {
  icon: string;
  kind: string;
  name: string;
  tech?: string;
  desc?: string;
  color?: string; // "ext" | "ctx" | "con" | "cmp" | "cod" | "sys"
  drillLabel?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  icon,
  kind,
  name,
  tech,
  desc,
  color = "",
  drillLabel,
  onClick,
  style,
}) => (
  <div
    className={`node ${color}`}
    onClick={onClick}
    style={{
      minWidth: 140,
      maxWidth: 200,
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
  >
    <div className="node-icon">{icon}</div>
    <div className="node-kind">{kind}</div>
    <div className="node-name">{name}</div>
    {tech && <div className="node-tech">{tech}</div>}
    {desc && <div className="node-desc">{desc.length > 90 ? `${desc.slice(0, 90)}…` : desc}</div>}
    {drillLabel && <div className="node-arrow">▶ {drillLabel}</div>}
  </div>
);
