import React, { useState } from "react";
import { DOMAIN_CATALOG } from "@roms/shared";
import type { Domain, SubFunction } from "@roms/shared";
import { DomainList } from "../components/workspace/DomainList";
import { SubFunctionList } from "../components/workspace/SubFunctionList";
import { TaskList } from "../components/workspace/TaskList";

/**
 * Operations page — ports research-operations-domains-and-sub-functions.html
 * Three-pane layout: Domain list → Sub-function list → Task list
 * Uses same CSS tokens for visual parity.
 */
export default function OperationsPage() {
  const [activeDomainId, setActiveDomainId] = useState<number | null>(null);
  const [activeSubfnIdx, setActiveSubfnIdx] = useState<number | null>(null);

  const activeDomain = activeDomainId
    ? (DOMAIN_CATALOG.find((d) => d.id === activeDomainId) as Domain)
    : null;

  const activeSubfn: SubFunction | null =
    activeDomain && activeSubfnIdx !== null
      ? activeDomain.subfunctions[activeSubfnIdx]
      : null;

  const handleSelectDomain = (id: number) => {
    setActiveDomainId(id);
    setActiveSubfnIdx(null);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <DomainList
        domains={DOMAIN_CATALOG}
        activeId={activeDomainId}
        onSelect={handleSelectDomain}
      />
      <SubFunctionList
        subfunctions={activeDomain?.subfunctions ?? []}
        activeIdx={activeSubfnIdx}
        onSelect={setActiveSubfnIdx}
      />
      <TaskList
        domain={activeDomain}
        subFunction={activeSubfn}
        subfnIndex={activeSubfnIdx}
      />
    </div>
  );
}
