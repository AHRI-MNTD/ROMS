import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";

export default function InventoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory-list"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/inventory");
        return resp.data as { data: Record<string, unknown>[]; total: number };
      } catch {
        return { data: [], total: 0 };
      }
    },
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-xl)", color: "var(--color-text)", marginBottom: 4 }}>
          📦 Lab Inventory & Supply Chain
        </h1>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
          Manage lab inventory & supply chain records. Showing live data from the ROMS API.
        </p>
      </div>

      {isLoading && (
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>Loading…</div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-sm)", color: "#991b1b", marginBottom: 16 }}>
          API unavailable — start the API server with <code>pnpm dev</code>
        </div>
      )}

      {data && (
        <>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", marginBottom: 10 }}>
            {data.total} record{data.total === 1 ? "" : "s"}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-divider)" }}>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'SKU'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'NAME'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'QUANTITY'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'MINTHRESHOLD'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'UNIT'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'EXPIRYDATE'.replace('_',' ')}</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--color-divider)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
                  >
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['sku'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['name'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['quantity'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['minThreshold'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['unit'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['expiryDate'] ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
