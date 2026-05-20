import React from "react";

interface Relation {
  from: string;
  arrow: string;
  to: string;
  label: string;
}

interface RelationsListProps {
  relations: readonly Relation[];
  title?: string;
}

export const RelationsList: React.FC<RelationsListProps> = ({ relations, title }) => (
  <div>
    {title && <div className="sec-header">{title}</div>}
    <div className="relations">
      {relations.map((r, i) => (
        <div className="rel" key={i}>
          <span className="rel-from">{r.from}</span>
          <span className="rel-arrow">{r.arrow}</span>
          <span className="rel-to">{r.to}</span>
          <span className="rel-label">— {r.label}</span>
        </div>
      ))}
    </div>
  </div>
);
