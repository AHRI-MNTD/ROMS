import React from "react";

interface BoundaryBoxProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const BoundaryBox: React.FC<BoundaryBoxProps> = ({ label, children, style }) => (
  <div className="system-boundary" style={style}>
    <div className="boundary-label">{label}</div>
    {children}
  </div>
);
