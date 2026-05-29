import React from "react";
import { Outlet } from "react-router-dom";

export default function QMSLayout() {
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Outlet />
    </div>
  );
}
