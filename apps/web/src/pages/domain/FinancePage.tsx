import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";

export default function FinancePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["finance-list"],
    queryFn: async () => {
      try {
        const resp = await apiClient.get("/domains/finance/grants");
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
          💰 Finance & Grant Management
        </h1>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)" }}>
          Manage finance & grant management records. Showing live data from the ROMS API.
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
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'CODE'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'TITLE'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'FUNDER'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'AWARDEDAMOUNT'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'CURRENCY'.replace('_',' ')}</th>
              <th style={{padding:'5px 10px',fontSize:'var(--fs-xs)',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--color-text-faint)',textAlign:'left'}}>{'STATUS'.replace('_',' ')}</th>
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
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['code'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['title'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['funder'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['awardedAmount'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['currency'] ?? '—')}</td>
              <td style={{padding:'5px 10px',fontSize:'var(--fs-xs)',color:'var(--color-text-muted)'}}>{String((row as Record<string,unknown>)['status'] ?? '—')}</td>
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
