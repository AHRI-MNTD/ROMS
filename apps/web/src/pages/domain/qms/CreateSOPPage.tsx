import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchSOPs, fetchAllUsers } from "../../../api/domains";
import { useAuth } from "../../../auth/useAuth";
import { hasTabAccess } from "../../../auth/permissions";

// Custom Circle Option Dropdown (Single-select)
interface CircleDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  hasOther?: boolean;
  otherValue?: string;
  onOtherChange?: (val: string) => void;
}

const CircleDropdown: React.FC<CircleDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  hasOther = false,
  otherValue = "",
  onOtherChange = (_val: string) => { },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const isOtherSelected = hasOther && value === "Other (specify)";

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", width: "100%" }}>
      <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "10px 14px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          color: value ? "var(--color-text)" : "var(--color-text-faint)",
          fontSize: "var(--fs-sm)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          outline: "none",
          minHeight: 40,
        }}
      >
        <span>{value || "Select option"}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            marginTop: 4,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            maxHeight: 240,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--color-text)",
                  background: isSelected ? "var(--color-primary-highlight)" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: isSelected ? "4px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    background: isSelected ? "transparent" : "var(--color-surface-2)",
                  }}
                />
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {isOtherSelected && (
        <input
          type="text"
          placeholder="Please specify other details..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          required
          style={{
            marginTop: 4,
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "var(--fs-sm)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
};

// Custom Rectangle Multiple Option Dropdown (Multi-select)
interface RectangleMultiselectProps {
  label: string;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  hasOther?: boolean;
  otherValue?: string;
  onOtherChange?: (val: string) => void;
}

const RectangleMultiselect: React.FC<RectangleMultiselectProps> = ({
  label,
  selectedValues,
  onChange,
  options,
  hasOther = false,
  otherValue = "",
  onOtherChange = (_val: string) => { },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const isOtherSelected = hasOther && selectedValues.includes("Other (specify)");

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", width: "100%" }}>
      <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          color: "var(--color-text)",
          fontSize: "var(--fs-sm)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          outline: "none",
          minHeight: 40,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: "90%" }}>
          {selectedValues.length === 0 ? (
            <span style={{ color: "var(--color-text-faint)" }}>Select multiple options</span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                style={{
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(val);
                }}
              >
                {val}
                <span style={{ fontSize: "9px" }}>✕</span>
              </span>
            ))
          )}
        </div>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            marginTop: 4,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            maxHeight: 280,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {options.map((opt) => {
            const isSelected = selectedValues.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => handleToggle(opt)}
                style={{
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--color-text)",
                  background: isSelected ? "var(--color-surface-offset)" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "1.5px solid var(--color-border)",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    background: isSelected ? "var(--color-primary)" : "var(--color-surface-2)",
                    borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                    color: "#ffffff",
                    fontSize: "8px",
                    fontWeight: "bold",
                  }}
                >
                  {isSelected && "✓"}
                </div>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {isOtherSelected && (
        <input
          type="text"
          placeholder="Please specify other details..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          required
          style={{
            marginTop: 4,
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "var(--fs-sm)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
};

// Rich Text Editor Component
interface RichTextEditorProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  required = false,
  value,
  onChange,
  rows = 4,
  placeholder = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState("#334155");
  const [selectedHighlight, setSelectedHighlight] = useState("transparent");
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isHighlightOpen, setIsHighlightOpen] = useState(false);
  const [isMoreFormatOpen, setIsMoreFormatOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [hoveredGrid, setHoveredGrid] = useState({ r: 0, c: 0 });
  const [gridSize, setGridSize] = useState({ rows: 8, cols: 10 });

  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const moreFormatRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  const savedSelectionRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRangeRef.current = range;
      }
    }
  };

  const restoreSelection = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        if (savedSelectionRangeRef.current && editorRef.current.contains(savedSelectionRangeRef.current.commonAncestorContainer)) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRangeRef.current);
        } else {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          savedSelectionRangeRef.current = range;
        }
      }
    }
  };

  // Sync state to innerHTML only when value is changed externally (not by user typing)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current || !value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (colorRef.current && !colorRef.current.contains(target)) setIsColorOpen(false);
      if (highlightRef.current && !highlightRef.current.contains(target)) setIsHighlightOpen(false);
      if (moreFormatRef.current && !moreFormatRef.current.contains(target)) setIsMoreFormatOpen(false);
      if (tableMenuRef.current && !tableMenuRef.current.contains(target)) setIsTableMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isTableMenuOpen) {
      setGridSize({ rows: 8, cols: 10 });
      setHoveredGrid({ r: 0, c: 0 });
    }
  }, [isTableMenuOpen]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, arg: string = "") => {
    restoreSelection();
    document.execCommand(command, false, arg);
    handleInput();
    saveSelection();
  };

  const handleTextType = (type: string) => {
    if (type === "h1") exec("formatBlock", "<h1>");
    else if (type === "h2") exec("formatBlock", "<h2>");
    else if (type === "h3") exec("formatBlock", "<h3>");
    else if (type === "normal") exec("formatBlock", "<p>");
    else if (type === "small") exec("formatBlock", "<small>");
  };

  const handleLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      exec("createLink", url);
    }
  };

  const getSelectedCell = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.getRangeAt(0).startContainer;
    while (node) {
      if (node.nodeName === "TD" || node.nodeName === "TH") {
        return node as HTMLTableCellElement;
      }
      if (node.nodeName === "BODY" || node.nodeName === "HTML" || (node instanceof HTMLElement && node.classList.contains("rich-editor-content"))) {
        break;
      }
      node = node.parentNode as Node;
    }
    return null;
  };

  const handlePlus = (action: string, args?: any) => {
    restoreSelection();
    if (action === "quote") {
      exec("formatBlock", "<blockquote>");
    } else if (action === "table") {
      const rows = args?.rows || 2;
      const cols = args?.cols || 2;

      let rowsHtml = "";
      for (let r = 0; r < rows; r++) {
        let colsHtml = "";
        for (let c = 0; c < cols; c++) {
          colsHtml += `<td style="border:1px solid var(--color-border); padding:8px; min-width:50px;"><br></td>`;
        }
        rowsHtml += `<tr>${colsHtml}</tr>`;
      }

      const tableHtml = `<table style="width:100%; border-collapse:collapse; border:1px solid var(--color-border); margin:10px 0;">
  <tbody>
    ${rowsHtml}
  </tbody>
</table>`;
      exec("insertHTML", tableHtml);
    } else if (action === "addRow") {
      const cell = getSelectedCell();
      if (cell) {
        const row = cell.parentNode as HTMLTableRowElement;
        const newRow = row.cloneNode(true) as HTMLTableRowElement;
        Array.from(newRow.cells).forEach(c => c.innerHTML = "<br>");
        row.parentNode?.insertBefore(newRow, row.nextSibling);
        handleInput();
      } else {
        alert("Please place your cursor inside a table cell to add a row.");
      }
    } else if (action === "addColumn") {
      const cell = getSelectedCell();
      if (cell) {
        const table = cell.closest("table");
        if (table) {
          const colIndex = cell.cellIndex;
          Array.from(table.rows).forEach(row => {
            const newCell = row.cells[colIndex].cloneNode(true) as HTMLTableCellElement;
            newCell.innerHTML = "<br>";
            row.insertBefore(newCell, row.cells[colIndex].nextSibling);
          });
          handleInput();
        }
      } else {
        alert("Please place your cursor inside a table cell to add a column.");
      }
    } else if (action === "deleteRow") {
      const cell = getSelectedCell();
      if (cell) {
        const row = cell.parentNode as HTMLTableRowElement;
        row.parentNode?.removeChild(row);
        handleInput();
      } else {
        alert("Please place your cursor inside a table cell to delete the row.");
      }
    } else if (action === "deleteColumn") {
      const cell = getSelectedCell();
      if (cell) {
        const table = cell.closest("table");
        if (table) {
          const colIndex = cell.cellIndex;
          Array.from(table.rows).forEach(row => {
            if (row.cells[colIndex]) {
              row.deleteCell(colIndex);
            }
          });
          handleInput();
        }
      } else {
        alert("Please place your cursor inside a table cell to delete the column.");
      }
    } else if (action === "image") {
      const url = prompt("Enter Image URL:", "https://");
      if (url) {
        exec("insertImage", url);
      }
    } else if (action === "video") {
      const url = prompt("Enter Video URL:", "https://");
      if (url) {
        const videoHtml = `<video src="${url}" controls style="max-width:100%; height:auto; margin:10px 0;"></video>`;
        exec("insertHTML", videoHtml);
      }
    } else if (action === "formula") {
      const formula = prompt("Enter mathematical formula:", "");
      if (formula) {
        const formulaHtml = `<span style="font-family:monospace; background:var(--color-surface-2); padding:2px 4px; border-radius:4px;">${formula}</span>`;
        exec("insertHTML", formulaHtml);
      }
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: "2px 6px",
    background: "none",
    border: "none",
    borderRadius: "4px",
    color: "var(--color-text)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "26px",
    height: "26px",
    position: "relative",
  };

  const selectStyle: React.CSSProperties = {
    padding: "2px 4px",
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: "4px",
    color: "var(--color-text)",
    cursor: "pointer",
    fontSize: "11px",
    outline: "none",
    height: "26px",
  };

  const FONT_COLORS = [
    { name: "Default", value: "#334155" },
    { name: "Red", value: "#ef4444" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Orange", value: "#f97316" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Black", value: "#000000" },
  ];

  const HIGHLIGHT_COLORS = [
    { name: "None", value: "transparent" },
    { name: "Yellow", value: "#fef08a" },
    { name: "Green", value: "#bbf7d0" },
    { name: "Blue", value: "#bfdbfe" },
    { name: "Pink", value: "#fbcfe8" },
    { name: "Orange", value: "#fed7aa" },
  ];

  const isAnyMenuOpen = isColorOpen || isHighlightOpen || isMoreFormatOpen || isTableMenuOpen;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <style>{`
        .rich-editor-content:empty:before {
          content: attr(placeholder);
          color: var(--color-text-faint);
          font-style: italic;
          cursor: text;
        }
        .editor-btn:hover {
          background-color: var(--color-surface-offset) !important;
        }
        .popover-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          font-size: 12px;
          color: var(--color-text);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
        }
        .popover-menu-item:hover {
          background-color: var(--color-surface-offset);
        }
        .popover-menu-item.active {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }
        .grid-cell {
          width: 16px;
          height: 16px;
          border: 1px solid #cccccc;
          background-color: #f9f9f9;
          cursor: pointer;
          transition: background-color 0.1s, border-color 0.1s;
        }
        .grid-cell.highlighted {
          background-color: #e8d5e8;
          border-color: #ab47bc;
        }
      `}</style>
      <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label} {required && <span style={{ color: "red" }}>*</span>}
      </label>
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: isAnyMenuOpen ? 50 : 1,
        }}
      >
        {/* Editor Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
            padding: "4px 8px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            borderTopLeftRadius: "var(--radius-sm)",
            borderTopRightRadius: "var(--radius-sm)",
          }}
        >
          {/* Text Type Selection */}
          <select
            onChange={(e) => {
              handleTextType(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            style={selectStyle}
          >
            <option value="" disabled>Normal Text</option>
            <option value="normal">Normal Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="small">Small</option>
          </select>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* Bold, Italic */}
          <button
            type="button"
            onClick={() => exec("bold")}
            style={buttonStyle}
            className="editor-btn"
            title="Bold"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2h4.5a3.5 3.5 0 0 1 2.5 6 3.5 3.5 0 0 1-2.5 6H4V2zm2 2.5v3.5h2a1.75 1.75 0 0 0 0-3.5H6zm0 5.5v3h2.5a1.75 1.75 0 0 0 0-3.5H6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            style={buttonStyle}
            className="editor-btn"
            title="Italic"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 2h6v2.5H9.4l-2.8 7H9v2.5H3V11.5h2.6l2.8-7H6V2z" />
            </svg>
          </button>

          {/* Custom Color Selector */}
          <div ref={colorRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => setIsColorOpen(!isColorOpen)}
              style={buttonStyle}
              className="editor-btn"
              title="Text Color"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ display: "block" }}>
                <path d="M4 11h8M8 2L3 11h2.2l.8-2h4l.8 2h2.2L9 2zm0 2.2L9.2 8H6.8z" />
                <rect x="1" y="13" width="14" height="2.5" fill={selectedColor} />
              </svg>
            </button>
            {isColorOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-md)",
                  zIndex: 200,
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                  minWidth: 120,
                }}
              >
                {FONT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      exec("foreColor", c.value);
                      setSelectedColor(c.value);
                      setIsColorOpen(false);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: c.value,
                      border: c.value === "#ffffff" ? "1px solid #ccc" : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Custom Highlight Selector */}
          <div ref={highlightRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => setIsHighlightOpen(!isHighlightOpen)}
              style={buttonStyle}
              className="editor-btn"
              title="Highlight Color"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ display: "block" }}>
                <path d="M11.5 1.5a1.5 1.5 0 0 1 2.12 0l.88.88a1.5 1.5 0 0 1 0 2.12L7.3 11.7l-3 1.2a.5.5 0 0 1-.67-.67l1.2-3zM6 9.8L11.2 4.6l-1-1L5 8.8z" />
                <rect x="1" y="13" width="14" height="2.5" fill={selectedHighlight === "transparent" ? "#dddddd" : selectedHighlight} />
              </svg>
            </button>
            {isHighlightOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-md)",
                  zIndex: 200,
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                  minWidth: 100,
                }}
              >
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      exec("hiliteColor", c.value);
                      setSelectedHighlight(c.value);
                      setIsHighlightOpen(false);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: c.value === "transparent" ? "#fff" : c.value,
                      border: c.value === "transparent" ? "1px dashed #999" : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "8px",
                      color: "#999",
                      borderRadius: "2px",
                    }}
                    title={c.name}
                  >
                    {c.value === "transparent" && "✕"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* Alignments */}
          <button
            type="button"
            onClick={() => exec("justifyLeft")}
            style={buttonStyle}
            className="editor-btn"
            title="Align Left"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="3" x2="14" y2="3" />
              <line x1="2" y1="6" x2="10" y2="6" />
              <line x1="2" y1="9" x2="14" y2="9" />
              <line x1="2" y1="12" x2="8" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => exec("justifyCenter")}
            style={buttonStyle}
            className="editor-btn"
            title="Align Center"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="3" x2="14" y2="3" />
              <line x1="4" y1="6" x2="12" y2="6" />
              <line x1="2" y1="9" x2="14" y2="9" />
              <line x1="5" y1="12" x2="11" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => exec("justifyRight")}
            style={buttonStyle}
            className="editor-btn"
            title="Align Right"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="3" x2="14" y2="3" />
              <line x1="6" y1="6" x2="14" y2="6" />
              <line x1="2" y1="9" x2="14" y2="9" />
              <line x1="8" y1="12" x2="14" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => exec("justifyFull")}
            style={buttonStyle}
            className="editor-btn"
            title="Justify"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="3" x2="14" y2="3" />
              <line x1="2" y1="6" x2="14" y2="6" />
              <line x1="2" y1="9" x2="14" y2="9" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            style={buttonStyle}
            className="editor-btn"
            title="Bullet List"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="4" r="1.5" />
              <rect x="7" y="3" width="8" height="2" rx="0.5" />
              <circle cx="3" cy="8" r="1.5" />
              <rect x="7" y="7" width="8" height="2" rx="0.5" />
              <circle cx="3" cy="12" r="1.5" />
              <rect x="7" y="11" width="8" height="2" rx="0.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            style={buttonStyle}
            className="editor-btn"
            title="Number List"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 2v3h.5V2.5h1v2h.5v-2.5h-.5V2zM2.8 7.5h1.4c0-.3-.1-.5-.3-.7a.7.7 0 0 0-.5-.2.4.4 0 0 0-.4.2c-.1.1-.1.2-.1.3h-.5a.8.8 0 0 1 .2-.6c.2-.2.4-.3.7-.3.3 0 .6.1.7.3.2.2.3.4.3.7 0 .3-.1.5-.3.7L3.4 9.5h1.3V10H2.5v-.5l.8-1h-.5zm.2 4.2h1.3v.5H3V13h1.3v.5H3v.5h1.5c.3 0 .5-.1.6-.3.2-.2.2-.4.2-.6 0-.2-.1-.4-.2-.5l-.3-.1v-.1c.2 0 .3-.2.4-.3.1-.2.1-.4.1-.5 0-.3-.1-.5-.3-.7a.7.7 0 0 0-.6-.3H2.8v.5z" />
              <rect x="7" y="3" width="8" height="2" rx="0.5" />
              <rect x="7" y="7" width="8" height="2" rx="0.5" />
              <rect x="7" y="11" width="8" height="2" rx="0.5" />
            </svg>
          </button>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* Interactive Table & Elements Popover */}
          <div ref={tableMenuRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => {
                setIsTableMenuOpen(!isTableMenuOpen);
                setIsGridVisible(true);
              }}
              style={buttonStyle}
              className="editor-btn"
              title="Table & Elements"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 2h3.5v3.5H2V2zm0 4.5h3.5v3H2v-3zm0 4H2v-3.5h3.5v3.5zm4.5 3.5V11H10v3.5H6.5zm4.5 0V11h3v3.5h-3zM14 10h-3V6.5h3V10zm0-4.5h-3V2h3v3.5zM10 2v3.5H6.5V2H10zm-3.5 4.5H10v3H6.5v-3z" />
              </svg>
              <span style={{ fontSize: "8px", marginLeft: "2px" }}>▼</span>
            </button>
            {isTableMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  zIndex: 200,
                  display: "flex",
                  padding: 4,
                }}
              >
                {/* Left Action List */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 155, gap: 1 }}>
                  <button
                    type="button"
                    className={`popover-menu-item ${isGridVisible ? "active" : ""}`}
                    onMouseEnter={() => setIsGridVisible(true)}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 2h3.5v3.5H2V2z" />
                      </svg>
                      Table
                    </span>
                    <span>&gt;</span>
                  </button>

                  <div style={{ height: 1, backgroundColor: "var(--color-border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("addRow");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="2" width="12" height="6" rx="1" />
                      <line x1="2" y1="12" x2="14" y2="12" />
                      <line x1="8" y1="10" x2="8" y2="14" />
                    </svg>
                    Add Row Below
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("addColumn");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="2" width="6" height="12" rx="1" />
                      <line x1="12" y1="2" x2="12" y2="14" />
                      <line x1="10" y1="8" x2="14" y2="8" />
                    </svg>
                    Add Column Right
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("deleteRow");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="2" y1="8" x2="14" y2="8" stroke="red" strokeWidth="2.5" />
                    </svg>
                    Delete Row
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("deleteColumn");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="8" y1="2" x2="8" y2="14" stroke="red" strokeWidth="2.5" />
                    </svg>
                    Delete Column
                  </button>

                  <div style={{ height: 1, backgroundColor: "var(--color-border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("quote");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    Quote Block
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("image");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    Image
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("video");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    Video
                  </button>

                  <button
                    type="button"
                    className="popover-menu-item"
                    onMouseEnter={() => setIsGridVisible(false)}
                    onClick={() => {
                      handlePlus("formula");
                      setIsTableMenuOpen(false);
                    }}
                  >
                    Formula
                  </button>
                </div>

                {/* Right Extended Table Grid Picker */}
                {isGridVisible && (
                  <div
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderLeft: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`, gap: 3 }}>
                      {Array.from({ length: gridSize.rows }).map((_, rIdx) => {
                        const rowNum = rIdx + 1;
                        return Array.from({ length: gridSize.cols }).map((__, cIdx) => {
                          const colNum = cIdx + 1;
                          const isHighlighted = rowNum <= hoveredGrid.r && colNum <= hoveredGrid.c;
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`grid-cell ${isHighlighted ? "highlighted" : ""}`}
                              onMouseEnter={() => {
                                setHoveredGrid({ r: rowNum, c: colNum });

                                // Grow the grid dynamically if hovering near current maximums (up to 30x30)
                                let newRows = gridSize.rows;
                                let newCols = gridSize.cols;
                                if (rowNum >= gridSize.rows) {
                                  newRows = Math.min(rowNum + 2, 30);
                                }
                                if (colNum >= gridSize.cols) {
                                  newCols = Math.min(colNum + 2, 30);
                                }
                                if (newRows !== gridSize.rows || newCols !== gridSize.cols) {
                                  setGridSize({ rows: newRows, cols: newCols });
                                }
                              }}
                              onMouseLeave={() => setHoveredGrid({ r: 0, c: 0 })}
                              onClick={() => {
                                handlePlus("table", { rows: rowNum, cols: colNum });
                                setIsTableMenuOpen(false);
                                setGridSize({ rows: 8, cols: 10 });
                              }}
                              style={{ width: 14, height: 14 }}
                            />
                          );
                        });
                      })}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        textAlign: "center",
                      }}
                    >
                      {hoveredGrid.r > 0 && hoveredGrid.c > 0 ? `${hoveredGrid.c}×${hoveredGrid.r}` : "Insert Table"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* More formatting dropdown (underline, strike, link, clear formatting) */}
          <div ref={moreFormatRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => setIsMoreFormatOpen(!isMoreFormatOpen)}
              style={buttonStyle}
              className="editor-btn"
              title="More Formatting"
            >
              •••
            </button>
            {isMoreFormatOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-md)",
                  zIndex: 200,
                  padding: 4,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 150,
                  gap: 1,
                }}
              >
                <button
                  type="button"
                  className="popover-menu-item"
                  onClick={() => {
                    exec("underline");
                    setIsMoreFormatOpen(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 2 }}>
                    <path d="M4 3v5a4 4 0 0 0 8 0V3M2 14h12" />
                  </svg>
                  Underline
                </button>
                <button
                  type="button"
                  className="popover-menu-item"
                  onClick={() => {
                    exec("strikeThrough");
                    setIsMoreFormatOpen(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 2 }}>
                    <path d="M3 11.5c1 1.5 3 2 5 2a4 4 0 0 0 4-4c0-2-1.5-3-4-3.5s-4-1-4-3a3 3 0 0 1 3-3c2 0 4 .5 5 2M1 8h14" />
                  </svg>
                  Strikethrough
                </button>
                <button
                  type="button"
                  className="popover-menu-item"
                  onClick={() => {
                    handleLink();
                    setIsMoreFormatOpen(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 2 }}>
                    <path d="M6.5 9.5l3-3M10 4a3 3 0 0 1 4 4l-2 2a3 3 0 0 1-4.2 0M6 12a3 3 0 0 1-4-4l2-2" />
                  </svg>
                  Link
                </button>
                <button
                  type="button"
                  className="popover-menu-item"
                  onClick={() => {
                    exec("removeFormat");
                    setIsMoreFormatOpen(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 2 }}>
                    <path d="M2 13h12M11 2L3 10M13 4l-2-2L3 10" />
                  </svg>
                  Clear Formatting
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Editable Content Div */}
        <div
          ref={editorRef}
          contentEditable={true}
          onInput={handleInput}
          onBlur={saveSelection}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onFocus={saveSelection}
          className="rich-editor-content"
          {...{ placeholder }}
          style={{
            padding: "10px 14px",
            minHeight: `${rows * 22}px`,
            background: "transparent",
            color: "var(--color-text)",
            fontSize: "var(--fs-sm)",
            outline: "none",
            overflowY: "auto",
            fontFamily: "inherit",
            width: "100%",
            boxSizing: "border-box",
            border: "none",
            borderBottomLeftRadius: "var(--radius-sm)",
            borderBottomRightRadius: "var(--radius-sm)",
          }}
        />
      </div>
    </div>
  );
};

// Generate SOP Version list: 1.0 to 5.1
const SOP_VERSION_OPTIONS: string[] = [];
for (let major = 1; major <= 5; major++) {
  for (let minor = 0; minor <= 9; minor++) {
    if (major === 5 && minor > 1) break;
    SOP_VERSION_OPTIONS.push(`${major}.${minor}`);
  }
}

const ASSAY_CATEGORY_OPTIONS = [
  "Sample collection / preparation",
  "Nucleic acid extraction",
  "Real-time qPCR",
  "Gel-based PCR (incl. nested PCR)",
  "Genotyping (MSP1 / MSP2)",
  "Digital PCR (Pfhrp2 / Pfhrp3)",
  "NGS library preparation",
  "Serology / bead-based assays",
  "Vector / entomology procedure",
  "Equipment operation / maintenance"
];

const METHOD_FAMILY_OPTIONS = [
  "Conventional PCR",
  "Real-time qPCR",
  "Digital PCR",
  "Next-generation sequencing",
  "Immunoassay / serology",
  "Nucleic-acid extraction",
  "Sample collection / preparation",
  "Vector / entomology",
  "Equipment SOP",
  "Other"
];

const ROLE_OPTIONS = [
  "Laboratory manager",
  "Laboratory supervisor",
  "Senior analyst / research scientist",
  "Analyst / lab technologist",
  "Laboratory technician",
  "Entomologist / vector biologist",
  "Data manager",
  "Phlebotomist / clinician",
  "Trainee / fellow",
  "QA / QC officer",
  "Biosafety officer",
  "Other (specify)"
];

const SAMPLE_MATRIX_OPTIONS = [
  "Whole blood",
  "DBS",
  "Plasma",
  "Serum",
  "RBC pellet",
  "RNA-protect whole blood",
  "Mosquito – adult",
  "Mosquito – larvae",
  "Mosquito midgut",
  "Mosquito head-thorax",
  "Mosquito abdomen",
  "Purified DNA extract",
  "Purified RNA extract",
  "In-vitro culture / control strain",
  "Other (specify)"
];

const INPUT_MATERIAL_OPTIONS = [
  "DBS punch(es)",
  "Whole blood",
  "Plasma / serum",
  "Single mosquito",
  "Mosquito pool",
  "Larvae",
  "Cultured parasites",
  "Other"
];

const PRIMARY_EQUIPMENT_OPTIONS = [
  "GeneRotex 96 automatic nucleic-acid extractor",
  "KingFisher Flex",
  "Bio-Rad CFX96 Deep Well",
  "QIAcuity One Digital PCR",
  "Luminex MAGPIX",
  "Oxford Nanopore MinION Mk1C",
  "Conventional thermocycler",
  "Gel doc / UV imager",
  "Centrifuge",
  "Biosafety cabinet",
  "Other (specify)"
];

const PPE_REQUIRED_OPTIONS = [
  "Lab coat",
  "Gloves (nitrile)",
  "Double gloves",
  "Safety glasses / goggles",
  "Face shield",
  "N95 respirator",
  "Surgical mask",
  "Closed shoes",
  "Disposable apron",
  "Other (specify)"
];

const BIOSAFETY_LEVEL_OPTIONS = [
  "BSL-1",
  "BSL-2",
  "BSL-2+",
  "BSL-3"
];

const HAZARDS_RELEVANT_OPTIONS = [
  "Biohazardous material",
  "Chemical hazard",
  "Phenol / chloroform",
  "Ethidium bromide / GelRed",
  "UV radiation",
  "Liquid nitrogen / cryogenic",
  "Sharps / needles",
  "Mosquito / vector bite risk",
  "Electrical / high voltage",
  "Other (specify)"
];

const CONTROLS_INCLUDED_OPTIONS = [
  "Positive control",
  "Negative control",
  "No-template control (NTC)",
  "Internal / extraction control",
  "Calibrator / standard curve",
  "Reference strain (e.g., 3D7)",
  "Blank",
  "Other (specify)"
];

const QC_METHODS_OPTIONS = [
  "NanoDrop (UV)",
  "Qubit (fluorometric)",
  "TapeStation / Bioanalyzer",
  "Agarose gel",
  "Not performed",
  "Other"
];

const STORAGE_SAMPLE_TYPE_OPTIONS = [
  "DBS",
  "Whole blood",
  "Plasma",
  "Serum",
  "Cell pellet",
  "Whole blood in RNA-protect",
  "Preserved mosquitoes",
  "Purified DNA / RNA"
];

const STORAGE_TEMP_OPTIONS = [
  "Room temperature",
  "+4 °C",
  "−20 °C",
  "−80 °C",
  "Liquid nitrogen",
  "Dry ice (transport)"
];

const TRANSPORT_MODE_OPTIONS = [
  "Cold box with ice packs",
  "Dry ice",
  "LN2 dry shipper",
  "Ambient with desiccant (DBS)",
  "Commercial courier (categorized)",
  "Hand-carried"
];


export default function CreateSOPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("edit");

  const { user } = useAuth();
  const canAccessAuthor = hasTabAccess(user?.roles, "qms", "create-sop", user?.permissions);

  if (!canAccessAuthor) {
    return (
      <div style={{ padding: "48px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
          Access Restricted — SOP Authoring Right Required
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", maxWidth: 500, margin: "0 auto 20px" }}>
          You do not have permission to draft or create SOPs. Please contact your system administrator or QA Officer to grant the <strong>Author</strong> right in User Rights Control.
        </p>
        <button
          onClick={() => navigate("/domains/qms/sop-authoring-control")}
          style={{
            padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8,
            border: "1px solid var(--color-primary)", background: "var(--color-primary)",
            color: "#fff", cursor: "pointer"
          }}
        >
          Return to QMS Dashboard
        </button>
      </div>
    );
  }

  const formRef = useRef<HTMLFormElement>(null);

  // Dynamic navigation section
  const [activeSection, setActiveSection] = useState("ID");
  const [sopType, setSopType] = useState<"Procedure SOP" | "Equipment SOP" | "Analysis SOP">("Procedure SOP");

  // Assay Category & Method Family (Now for all SOP types)
  const [assayCategory, setAssayCategory] = useState("");
  const [methodFamily, setMethodFamily] = useState("");

  // Core Identification Info
  const [enteredBy, setEnteredBy] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [sopCode, setSopCode] = useState("");
  const [sopVersion, setSopVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [sopStatus, setSopStatus] = useState("Draft");
  const [owningSite, setOwningSite] = useState("AHRI – Addis Ababa");
  const [owningLabUnit, setOwningLabUnit] = useState("MNTD Molecular Lab");
  const [proposedVerifier, setProposedVerifier] = useState("");
  const [proposedAuthorizer, setProposedAuthorizer] = useState("");

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAllUsers().then(setUsers).catch(console.error);
  }, []);

  // A. Annual Review of Document
  const [annualReviews, setAnnualReviews] = useState<{
    revNo: string; reviewDate: string;
    reviewedByName: string; reviewedBySignature: string;
    approvedByName: string; approvedBySignature: string;
  }[]>([{ revNo: "", reviewDate: "", reviewedByName: "", reviewedBySignature: "", approvedByName: "", approvedBySignature: "" }]);

  // B. Version History
  const [versionHistory, setVersionHistory] = useState<{
    revNo: string; pageNo: string; description: string;
    amendmentDate: string; effectiveDate: string;
    amendName: string; amendSignature: string;
    approvalName: string; approvalSignature: string;
  }[]>([{ revNo: "", pageNo: "", description: "", amendmentDate: "", effectiveDate: "", amendName: "", amendSignature: "", approvalName: "", approvalSignature: "" }]);

  // C. Amendment Log
  const [amendmentLog, setAmendmentLog] = useState<{
    versionNo: string; effectiveDate: string; changesComments: string;
  }[]>([{ versionNo: "", effectiveDate: "", changesComments: "" }]);

  // Common Sections Content (Purpose, Scope, Background replaces objectivesScope)
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState("");
  const [background, setBackground] = useState("");
  const [abbreviationsDefinitions, setAbbreviationsDefinitions] = useState("");

  // Responsibility & Accountability narrative and grid
  const [responsibilityAccountability, setResponsibilityAccountability] = useState("");
  const [tasksGrid, setTasksGrid] = useState<{ task: string; authorized: string[]; authorizedOther?: string; responsible: string[]; responsibleOther?: string }[]>([
    { task: "", authorized: [], authorizedOther: "", responsible: [], responsibleOther: "" }
  ]);

  const [procedure, setProcedure] = useState("");
  const [relatedDocuments, setRelatedDocuments] = useState("");
  const [relatedForms, setRelatedForms] = useState("");
  const [references, setReferences] = useState("");
  const [attachments, setAttachments] = useState("");

  // Equipment SOP Specific Sections
  const [equipmentDescription, setEquipmentDescription] = useState("");
  const [calibration, setCalibration] = useState("");
  const [controls, setControls] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [operation, setOperation] = useState("");
  const [problemSolving, setProblemSolving] = useState("");

  // Analysis SOP Specific Sections
  const [principleMethodologicalBasis, setPrincipleMethodologicalBasis] = useState("");

  // Samples / Specimens Covered
  const [sampleMatrices, setSampleMatrices] = useState<string[]>([]);
  const [sampleMatricesOther, setSampleMatricesOther] = useState("");
  const [inputMaterialTypes, setInputMaterialTypes] = useState<string[]>([]);
  const [inputMaterialTypesOther, setInputMaterialTypesOther] = useState("");
  const [sampleVolume, setSampleVolume] = useState("");
  const [sampleAcceptance, setSampleAcceptance] = useState("");
  const [sampleRejection, setSampleRejection] = useState("");

  // Reagents & supplies
  const [reagentsNarrative, setReagentsNarrative] = useState("");
  const [reagentsOnePerLine, setReagentsOnePerLine] = useState("");

  // Equipment & Instruments
  const [primaryEquipment, setPrimaryEquipment] = useState<string[]>([]);
  const [primaryEquipmentOther, setPrimaryEquipmentOther] = useState("");
  const [equipmentOnePerLine, setEquipmentOnePerLine] = useState("");

  // Environmental & Safety Controls
  const [ppeRequired, setPpeRequired] = useState<string[]>([]);
  const [ppeRequiredOther, setPpeRequiredOther] = useState("");
  const [bslRequired, setBslRequired] = useState("BSL-2");
  const [hazardsRelevant, setHazardsRelevant] = useState<string[]>([]);
  const [hazardsRelevantOther, setHazardsRelevantOther] = useState("");
  const [wasteHandling, setWasteHandling] = useState("");
  const [additionalSafety, setAdditionalSafety] = useState("");

  // Quality Control
  const [controlsIncluded, setControlsIncluded] = useState<string[]>([]);
  const [controlsIncludedOther, setControlsIncludedOther] = useState("");
  const [qcMethods, setQcMethods] = useState<string[]>([]);
  const [qcMethodsOther, setQcMethodsOther] = useState("");
  const [acceptanceRejectionCriteria, setAcceptanceRejectionCriteria] = useState("");
  const [qcNarrative, setQcNarrative] = useState("");

  // Stepwise Procedure
  const [procedureNarrative, setProcedureNarrative] = useState("");
  const [procedureOnePerLine, setProcedureOnePerLine] = useState("");

  // Calculation / Data Analysis
  const [calculationsFormulas, setCalculationsFormulas] = useState("");
  const [softwareAnalysisTools, setSoftwareAnalysisTools] = useState("");
  const [interpretationThresholds, setInterpretationThresholds] = useState("");

  // Result Reporting & Interpretation
  const [reportingFormat, setReportingFormat] = useState("");
  const [cutOffsThresholds, setCutOffsThresholds] = useState("");
  const [limsDatabaseMapping, setLimsDatabaseMapping] = useState("");
  const [resultReportingNarrative, setResultReportingNarrative] = useState("");

  // Storage & Transport Requirements
  const [storageSampleTypes, setStorageSampleTypes] = useState<string[]>([]);
  const [storageSampleTypesOther, setStorageSampleTypesOther] = useState("");
  const [storageTemperature, setStorageTemperature] = useState("Room temperature");
  const [maxStorageDuration, setMaxStorageDuration] = useState("");
  const [acceptableTransportModes, setAcceptableTransportModes] = useState<string[]>([]);
  const [acceptableTransportModesOther, setAcceptableTransportModesOther] = useState("");
  const [storageTransportNarrative, setStorageTransportNarrative] = useState("");

  // Loading SOP data if editing
  useEffect(() => {
    const populateFromItem = (item: any) => {
      setSopCode(item.code || "");
      setSopTitle(item.title || "");
      setSopVersion(item.version || "1.0");
      setSopStatus(item.status || "Draft");
      setSopType(item.sopType || "Procedure SOP");
      setEnteredBy(item.author || "");

      const details = item.details || {};
      setEffectiveDate(details.effectiveDate || "");
      setNextReviewDate(details.nextReviewDate || "");
      setOwningSite(details.owningSite || "AHRI – Addis Ababa");
      setOwningLabUnit(details.owningLabUnit || "MNTD Molecular Lab");
      setProposedVerifier(details.proposedVerifier || "QA Officer");
      setProposedAuthorizer(details.proposedAuthorizer || "Laboratory Manager");
      setAssayCategory(details.assayCategory || "");
      setMethodFamily(details.methodFamily || "");

      // Revision & Amendment tables
      setAnnualReviews(details.annualReviews || [{ revNo: "", reviewDate: "", reviewedByName: "", reviewedBySignature: "", approvedByName: "", approvedBySignature: "" }]);
      setVersionHistory(details.versionHistory || [{ revNo: "", pageNo: "", description: "", amendmentDate: "", effectiveDate: "", amendName: "", amendSignature: "", approvalName: "", approvalSignature: "" }]);
      setAmendmentLog(details.amendmentLog || [{ versionNo: "", effectiveDate: "", changesComments: "" }]);

      // Common sections
      setPurpose(details.purpose || details.objectivesScope || "");
      setScope(details.scope || "");
      setBackground(details.background || "");
      setAbbreviationsDefinitions(details.abbreviationsDefinitions || "");

      // Responsibility Narrative
      setResponsibilityAccountability(details.responsibilityAccountability || "");

      // Tasks Matrix (parse legacy string items into arrays safely)
      if (details.tasksGrid) {
        const loadedTasks = details.tasksGrid.map((t: any) => ({
          task: t.task || "",
          authorized: Array.isArray(t.authorized) ? t.authorized : (t.authorized ? [t.authorized] : []),
          authorizedOther: t.authorizedOther || "",
          responsible: Array.isArray(t.responsible) ? t.responsible : (t.responsible ? [t.responsible] : []),
          responsibleOther: t.responsibleOther || ""
        }));
        setTasksGrid(loadedTasks);
      } else {
        setTasksGrid([{ task: "", authorized: [], authorizedOther: "", responsible: [], responsibleOther: "" }]);
      }

      setProcedure(details.procedure || "");
      setRelatedDocuments(details.relatedDocuments || "");
      setRelatedForms(details.relatedForms || "");
      setReferences(details.references || "");
      setAttachments(details.attachments || "");

      // Equipment specifics
      setEquipmentDescription(details.equipmentDescription || "");
      setCalibration(details.calibration || "");
      setControls(details.controls || "");
      setMaintenance(details.maintenance || "");
      setOperation(details.operation || "");
      setProblemSolving(details.problemSolving || "");

      // Analysis specifics / Principle
      setPrincipleMethodologicalBasis(details.principleMethodologicalBasis || details.principle || "");

      // Samples / Specimens Covered
      setSampleMatrices(details.sampleMatrices || []);
      setSampleMatricesOther(details.sampleMatricesOther || "");
      setInputMaterialTypes(details.inputMaterialTypes || []);
      setInputMaterialTypesOther(details.inputMaterialTypesOther || "");
      setSampleVolume(details.sampleVolume || "");
      setSampleAcceptance(details.sampleAcceptance || "");
      setSampleRejection(details.sampleRejection || "");

      // Reagents
      setReagentsNarrative(details.reagentsNarrative || "");
      setReagentsOnePerLine(details.reagentsOnePerLine || "");

      // Equipment & Instruments
      setPrimaryEquipment(details.primaryEquipment || []);
      setPrimaryEquipmentOther(details.primaryEquipmentOther || "");
      setEquipmentOnePerLine(details.equipmentOnePerLine || "");

      // Environmental & Safety Controls
      setPpeRequired(details.ppeRequired || []);
      setPpeRequiredOther(details.ppeRequiredOther || "");
      setBslRequired(details.bslRequired || "BSL-2");
      setHazardsRelevant(details.hazardsRelevant || []);
      setHazardsRelevantOther(details.hazardsRelevantOther || "");
      setWasteHandling(details.wasteHandling || "");
      setAdditionalSafety(details.additionalSafety || "");

      // Quality Control
      setControlsIncluded(details.controlsIncluded || []);
      setControlsIncludedOther(details.controlsIncludedOther || "");
      setQcMethods(details.qcMethods || []);
      setQcMethodsOther(details.qcMethodsOther || "");
      setAcceptanceRejectionCriteria(details.acceptanceRejectionCriteria || "");
      setQcNarrative(details.qcNarrative || "");

      // Stepwise Procedure
      setProcedureNarrative(details.procedureNarrative || "");
      setProcedureOnePerLine(details.procedureOnePerLine || "");

      // Calculations
      setCalculationsFormulas(details.calculationsFormulas || "");
      setSoftwareAnalysisTools(details.softwareAnalysisTools || "");
      setInterpretationThresholds(details.interpretationThresholds || "");

      // Result Reporting
      setReportingFormat(details.reportingFormat || "");
      setCutOffsThresholds(details.cutOffsThresholds || "");
      setLimsDatabaseMapping(details.limsDatabaseMapping || "");
      setResultReportingNarrative(details.resultReportingNarrative || "");

      // Storage & Transport
      setStorageSampleTypes(details.storageSampleTypes || []);
      setStorageSampleTypesOther(details.storageSampleTypesOther || "");
      setStorageTemperature(details.storageTemperature || "Room temperature");
      setMaxStorageDuration(details.maxStorageDuration || "");
      setAcceptableTransportModes(details.acceptableTransportModes || []);
      setAcceptableTransportModesOther(details.acceptableTransportModesOther || "");
      setStorageTransportNarrative(details.storageTransportNarrative || "");
    };

    if (editCode) {
      // 1. Try localStorage first
      let found = false;
      try {
        const saved = localStorage.getItem("roms_local_sops");
        if (saved) {
          const list = JSON.parse(saved);
          const item = list.find((s: any) => s.code === editCode);
          if (item) {
            populateFromItem(item);
            found = true;
          }
        }
      } catch (e) {
        console.error("Error loading SOP from localStorage:", e);
      }

      // 2. Fallback to API if not found locally
      if (!found) {
        fetchSOPs(1, 1000)
          .then((res) => {
            const apiItems = (res.data || []) as any[];
            const item = apiItems.find((s: any) => s.code === editCode);
            if (item) {
              populateFromItem(item);
            } else {
              console.warn(`SOP with code "${editCode}" not found in localStorage or API.`);
            }
          })
          .catch((err) => {
            console.error("Error fetching SOP from API for editing:", err);
          });
      }
    }
  }, [editCode]);

  // Compute initials for naming convention
  const getInitials = (name: string) => {
    if (!name) return "AB";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
  };

  const cleanTitle = (title: string) => {
    if (!title) return "Title";
    return title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, ".");
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const filenameSuggestion = `${sopCode || "CODE"}.${cleanTitle(sopTitle)}.${currentYear}.${currentMonth}.${getInitials(enteredBy || "Author")}.docx`;

  const getSectionsList = () => {
    const commonStart = [
      { id: "ID", label: "SOP Identification & Metadata" },
      { id: "REV_HISTORY", label: "Revision & Amendment History" },
      { id: "PURPOSE_SCOPE", label: "Purpose, Scope & Background" },
      { id: "ABBREV", label: "Abbreviations & Definitions" },
      { id: "ROLES", label: "Tasks, Responsibilities & Accountabilities" }
    ];

    if (sopType === "Equipment SOP") {
      return [
        ...commonStart,
        { id: "EQUIP_DESC", label: "Equipment Description" },
        { id: "SAFETY", label: "Environmental & Safety Controls" },
        { id: "STARTUP_MAINT", label: "Startup & Maintenance" },
        { id: "OPERATION", label: "Operation" },
        { id: "PROBLEM_SOLVING", label: "Problem Solving" },
        { id: "DOCS", label: "Related Documents" },
        { id: "FORMS", label: "Related Forms" },
        { id: "REFS", label: "References" },
        { id: "ATTACHMENTS", label: "Attachments" }
      ];
    } else if (sopType === "Analysis SOP") {
      return [
        ...commonStart,
        { id: "PRINCIPLE", label: "Principle of the Method" },
        { id: "SAFETY", label: "Environmental & Safety Controls" },
        { id: "SAMPLE", label: "Samples / Specimens Covered" },
        { id: "REAGENTS", label: "Reagents & supplies" },
        { id: "EQUIP_SUPPLIES", label: "Equipment & Instruments" },
        { id: "QC", label: "Quality Control" },
        { id: "PROCEDURE", label: "Stepwise Procedure" },
        { id: "CALCULATION", label: "Calculation / Data Analysis" },
        { id: "REPORTING", label: "Result Reporting & Interpretation" },
        { id: "STORAGE_TRANSPORT", label: "Storage & Transport Requirements" },
        { id: "DOCS", label: "Related Documents" },
        { id: "FORMS", label: "Related Forms" },
        { id: "REFS", label: "References" },
        { id: "ATTACHMENTS", label: "Attachments" }
      ];
    } else {
      // Procedure SOP
      return [
        ...commonStart,
        { id: "PROCEDURE", label: "Stepwise Procedure" },
        { id: "DOCS", label: "Related Documents" },
        { id: "FORMS", label: "Related Forms" },
        { id: "REFS", label: "References" },
        { id: "ATTACHMENTS", label: "Attachments" }
      ];
    }
  };

  const sections = getSectionsList();

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const saveSOPToLocalStorage = (statusToSave: string) => {
    if (!sopCode || !sopTitle) {
      alert("SOP Code and Title are required to save draft or submit!");
      return false;
    }

    if (!assayCategory || !methodFamily) {
      alert("Assay Category and Method Family are required!");
      return false;
    }

    const saved = localStorage.getItem("roms_local_sops");
    const list = saved ? JSON.parse(saved) : [];
    const item = list.find((s: any) => s.code === (editCode || sopCode)) || {};

    const updatedSopItem = {
      id: item.id || `sop-local-${Date.now()}`,
      code: sopCode,
      title: sopTitle,
      sopSection: sopType,
      sopSubSection: owningLabUnit,
      version: sopVersion,
      status: statusToSave,
      author: enteredBy || item.author || "Author",
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sopType: sopType,
      details: {
        ...(item.details || {}),
        effectiveDate,
        nextReviewDate,
        owningSite,
        owningLabUnit,
        proposedVerifier,
        proposedAuthorizer,
        assayCategory,
        methodFamily,

        // Revision & Amendment tables
        annualReviews,
        versionHistory,
        amendmentLog,

        // Common sections
        purpose,
        scope,
        background,
        abbreviationsDefinitions,

        // Roles
        responsibilityAccountability,
        tasksGrid,

        procedure,
        relatedDocuments,
        relatedForms,
        references,
        attachments,

        // Equipment specifics
        equipmentDescription,
        calibration,
        controls,
        maintenance,
        operation,
        problemSolving,

        // Analysis specifics
        principleMethodologicalBasis,

        // Samples
        sampleMatrices,
        sampleMatricesOther,
        inputMaterialTypes,
        inputMaterialTypesOther,
        sampleVolume,
        sampleAcceptance,
        sampleRejection,

        // Reagents
        reagentsNarrative,
        reagentsOnePerLine,

        // Equipment & Instruments
        primaryEquipment,
        primaryEquipmentOther,
        equipmentOnePerLine,

        // Environmental & Safety Controls
        ppeRequired,
        ppeRequiredOther,
        bslRequired,
        hazardsRelevant,
        hazardsRelevantOther,
        wasteHandling,
        additionalSafety,

        // Quality Control
        controlsIncluded,
        controlsIncludedOther,
        qcMethods,
        qcMethodsOther,
        acceptanceRejectionCriteria,
        qcNarrative,

        // Stepwise Procedure
        procedureNarrative,
        procedureOnePerLine,

        // Calculation / Data Analysis
        calculationsFormulas,
        softwareAnalysisTools,
        interpretationThresholds,

        // Result Reporting & Interpretation
        reportingFormat,
        cutOffsThresholds,
        limsDatabaseMapping,
        resultReportingNarrative,

        // Storage & Transport Requirements
        storageSampleTypes,
        storageSampleTypesOther,
        storageTemperature,
        maxStorageDuration,
        acceptableTransportModes,
        acceptableTransportModesOther,
        storageTransportNarrative,

        // Dynamic Filename
        filenameSuggestion
      }
    };

    try {
      const codeToFilter = editCode || sopCode;
      const filtered = list.filter((s: any) => s.code !== codeToFilter);
      localStorage.setItem("roms_local_sops", JSON.stringify([updatedSopItem, ...filtered]));
      return true;
    } catch (e) {
      console.error(e);
      alert("Failed to save SOP data to storage.");
      return false;
    }
  };

  const handleSaveDraft = () => {
    const success = saveSOPToLocalStorage("DRAFT");
    if (success) {
      navigate("/domains/qms", { state: { successMessage: "SOP Draft saved successfully!" } });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = saveSOPToLocalStorage("UNDER REVIEW");
    if (success) {
      navigate("/domains/qms", { state: { successMessage: "SOP submitted for review and approval!" } });
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }}>
      {/* LEFT SIDEBAR INDEX */}
      <div
        style={{
          width: 250,
          minWidth: 250,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/domains/qms")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 20,
            padding: "4px 8px",
            textAlign: "left",
          }}
        >
          ← Back to QMS
        </button>

        {/* Dynamic SOP Type Switcher - only editable if creating a new SOP */}
        {!editCode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>SOP Type Framework</label>
            <select
              value={sopType}
              onChange={(e) => setSopType(e.target.value as any)}
              style={{
                padding: "8px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                fontSize: "var(--fs-sm)",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="Procedure SOP">Procedure SOP</option>
              <option value="Equipment SOP">Equipment SOP</option>
              <option value="Analysis SOP">Analysis SOP</option>
            </select>
          </div>
        )}

        <h3
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            margin: "0 0 12px 8px",
          }}
        >
          SOP Sections
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: isActive ? "var(--color-primary-highlight)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  fontSize: "var(--fs-sm)",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--color-surface-offset)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FORM WORKSPACE CONTAINER */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* HEADER BLOCK */}
        <div
          style={{
            padding: "12px 24px",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              SOP Editor: {sopType}
            </h1>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
              {sopTitle || "Untitled Document"} ({sopCode || "Awaiting Code Setup"})
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--fs-xs)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={(e) => {
                if (formRef.current) {
                  formRef.current.requestSubmit();
                } else {
                  handleSubmit(e as any);
                }
              }}
              style={{
                background: "var(--color-primary)",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Submit SOP
            </button>
          </div>
        </div>

        {/* FORM MAIN SCROLL */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            padding: "32px 40px 100px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* SOP Type Guideline Card */}
          <div style={{
            background: "var(--color-primary-soft)",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            color: "var(--color-text)"
          }}>
            {sopType === "Analysis SOP" && (
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700, color: "var(--color-primary)" }}>🧪 1. Analysis SOPs</h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "var(--fs-sm)", lineHeight: "1.5" }}>
                  Analysis SOPs describe how laboratory tests or analyses are performed to ensure accurate and consistent results.
                </p>
                <div style={{ fontSize: "var(--fs-sm)", margin: "0 0 10px 0" }}>
                  <strong>Purpose:</strong>
                  <ul style={{ margin: "4px 0 0 20px", padding: 0, listStyleType: "disc" }}>
                    <li>Standardize testing procedures.</li>
                    <li>Ensure quality and reliability of results.</li>
                    <li>Guide staff through sample handling, testing, quality control, and result reporting.</li>
                  </ul>
                </div>
                <div style={{ fontSize: "var(--fs-sm)" }}>
                  <strong>Typical Contents:</strong> Principle of the test, Sample requirements, Reagents and equipment, Quality control procedures, Step-by-step analytical method, Result calculation and interpretation.
                  <br />
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "block", marginTop: 4 }}>
                    <strong>Example:</strong> SOP for Blood Glucose Analysis, PCR Testing, or Water Quality Testing.
                  </span>
                </div>
              </div>
            )}
            {sopType === "Equipment SOP" && (
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700, color: "var(--color-primary)" }}>⚙️ 2. Equipment SOPs</h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "var(--fs-sm)", lineHeight: "1.5" }}>
                  Equipment SOPs describe how laboratory instruments and equipment should be operated, calibrated, maintained, and troubleshooted.
                </p>
                <div style={{ fontSize: "var(--fs-sm)", margin: "0 0 10px 0" }}>
                  <strong>Purpose:</strong>
                  <ul style={{ margin: "4px 0 0 20px", padding: 0, listStyleType: "disc" }}>
                    <li>Ensure safe and correct use of equipment.</li>
                    <li>Maintain accuracy and performance.</li>
                    <li>Reduce equipment failures and downtime.</li>
                  </ul>
                </div>
                <div style={{ fontSize: "var(--fs-sm)" }}>
                  <strong>Typical Contents:</strong> Equipment description, Safety precautions, Calibration procedures, Maintenance schedules, Operating instructions, Troubleshooting guidelines.
                  <br />
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "block", marginTop: 4 }}>
                    <strong>Example:</strong> SOP for Centrifuge Operation, Spectrophotometer Maintenance, or ELISA Reader Calibration.
                  </span>
                </div>
              </div>
            )}
            {sopType === "Procedure SOP" && (
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700, color: "var(--color-primary)" }}>📋 3. Procedure SOPs</h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "var(--fs-sm)", lineHeight: "1.5" }}>
                  Procedure SOPs describe administrative, operational, and management processes carried out in the laboratory.
                </p>
                <div style={{ fontSize: "var(--fs-sm)", margin: "0 0 10px 0" }}>
                  <strong>Purpose:</strong>
                  <ul style={{ margin: "4px 0 0 20px", padding: 0, listStyleType: "disc" }}>
                    <li>Standardize routine laboratory activities.</li>
                    <li>Ensure compliance with quality management requirements.</li>
                    <li>Define responsibilities and workflow.</li>
                  </ul>
                </div>
                <div style={{ fontSize: "var(--fs-sm)" }}>
                  <strong>Typical Contents:</strong> Objectives and scope, Roles and responsibilities, Step-by-step process description, Documentation requirements, Record management.
                  <br />
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", display: "block", marginTop: 4 }}>
                    <strong>Example:</strong> SOP for Document Control, Sample Reception, Staff Training, or Internal Audits.
                  </span>
                </div>
              </div>
            )}

            {/* Summary Table */}
            <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: "12px", marginTop: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>SOP Types Reference Summary</span>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-offset)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", borderRight: "1px solid var(--color-border)" }}>SOP Type</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", borderRight: "1px solid var(--color-border)" }}>Main Focus</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: sopType === "Analysis SOP" ? "var(--color-primary-soft)" : "transparent" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600, borderRight: "1px solid var(--color-border)" }}>Analysis SOP</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid var(--color-border)" }}>How a test/analysis is performed</td>
                    <td style={{ padding: "6px 8px" }}>Blood Glucose Test SOP</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: sopType === "Equipment SOP" ? "var(--color-primary-soft)" : "transparent" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600, borderRight: "1px solid var(--color-border)" }}>Equipment SOP</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid var(--color-border)" }}>How equipment is operated and maintained</td>
                    <td style={{ padding: "6px 8px" }}>Centrifuge SOP</td>
                  </tr>
                  <tr style={{ background: sopType === "Procedure SOP" ? "var(--color-primary-soft)" : "transparent" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600, borderRight: "1px solid var(--color-border)" }}>Procedure SOP</td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid var(--color-border)" }}>How laboratory processes are managed</td>
                    <td style={{ padding: "6px 8px" }}>Document Control SOP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION ID: SOP Identification */}
          <div id="section-ID" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              SOP Identification & Metadata
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full title of the SOP"
                    value={sopTitle}
                    onChange={(e) => setSopTitle(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }}
                  />
                </div>

                <div style={{ width: "200px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Author *</label>
                  <select
                    disabled
                    required
                    value={enteredBy}
                    onChange={(e) => setEnteredBy(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-offset)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "not-allowed" }}
                  >
                    <option value="" disabled>Select Author</option>
                    {users.map(u => (
                      <option key={u.id} value={u.displayName}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Code (from QO)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Auto-assigned by QO"
                    value={sopCode}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-offset)", color: "var(--color-text-muted)", fontSize: "var(--fs-sm)", outline: "none", cursor: "not-allowed" }}
                  />
                </div>

                <CircleDropdown
                  label="Version *"
                  value={sopVersion}
                  onChange={setSopVersion}
                  options={SOP_VERSION_OPTIONS}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Next Review Date</label>
                  <input
                    type="date"
                    value={nextReviewDate}
                    onChange={(e) => setNextReviewDate(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <CircleDropdown
                  label="Owning Site *"
                  value={owningSite}
                  onChange={setOwningSite}
                  options={["AHRI – Addis Ababa", "AHRI – Field Site", "Partner Laboratory"]}
                />

                <CircleDropdown
                  label="Owning Laboratory Unit *"
                  value={owningLabUnit}
                  onChange={setOwningLabUnit}
                  options={["MNTD Molecular Lab", "MNTD Serology Lab", "MNTD Vector Entomology Lab", "MNTD NGS / Sequencing Lab", "Field laboratory"]}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid var(--color-divider)", paddingTop: 16 }}>
                <CircleDropdown
                  label="Assay category (cascading parent) *"
                  value={assayCategory}
                  onChange={setAssayCategory}
                  options={ASSAY_CATEGORY_OPTIONS}
                />

                <CircleDropdown
                  label="Method family *"
                  value={methodFamily}
                  onChange={setMethodFamily}
                  options={METHOD_FAMILY_OPTIONS}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid var(--color-divider)", paddingTop: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Proposed Verifier (QO)</label>
                  <select
                    disabled
                    value={proposedVerifier}
                    onChange={(e) => setProposedVerifier(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-offset)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "not-allowed" }}
                  >
                    <option value="" disabled>Select Verifier</option>
                    {users.map(u => (
                      <option key={u.id} value={u.displayName}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Proposed Authorizer (LM)</label>
                  <select
                    disabled
                    value={proposedAuthorizer}
                    onChange={(e) => setProposedAuthorizer(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-offset)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", cursor: "not-allowed" }}
                  >
                    <option value="" disabled>Select Authorizer</option>
                    {users.map(u => (
                      <option key={u.id} value={u.displayName}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION REV_HISTORY: Revision & Amendment History */}
          <div id="section-REV_HISTORY" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Revision & Amendment History
            </h3>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "0 0 24px 0" }}>
              Track all document revisions, version changes, and amendments using the three tables below.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* ── TABLE A: Annual Review of Document ── */}
              <div style={{ borderLeft: "3px solid #0d9488", paddingLeft: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.04em" }}>A. Annual Review of Document</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)", color: "var(--color-text)", minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface-offset)" }}>
                        <th rowSpan={2} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", verticalAlign: "middle", width: "12%" }}>Revision No.</th>
                        <th rowSpan={2} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", verticalAlign: "middle", width: "15%" }}>Review Date</th>
                        <th colSpan={2} style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>Reviewed By</th>
                        <th colSpan={2} style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>Approved By</th>
                        <th rowSpan={2} style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", width: 40, verticalAlign: "middle" }}></th>
                      </tr>
                      <tr style={{ background: "var(--color-surface-offset)" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Name</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Signature</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Name</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annualReviews.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="e.g. 1" value={row.revNo} onChange={(e) => { const u = [...annualReviews]; u[idx].revNo = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="date" value={row.reviewDate} onChange={(e) => { const u = [...annualReviews]; u[idx].reviewDate = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Full name" value={row.reviewedByName} onChange={(e) => { const u = [...annualReviews]; u[idx].reviewedByName = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Signature" value={row.reviewedBySignature} onChange={(e) => { const u = [...annualReviews]; u[idx].reviewedBySignature = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Full name" value={row.approvedByName} onChange={(e) => { const u = [...annualReviews]; u[idx].approvedByName = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Signature" value={row.approvedBySignature} onChange={(e) => { const u = [...annualReviews]; u[idx].approvedBySignature = e.target.value; setAnnualReviews(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px", textAlign: "center" }}>
                            <button type="button" onClick={() => setAnnualReviews(annualReviews.filter((_, i) => i !== idx))} disabled={annualReviews.length <= 1} style={{ background: "none", border: "none", color: "#ef4444", cursor: annualReviews.length <= 1 ? "default" : "pointer", fontSize: 15, opacity: annualReviews.length <= 1 ? 0.3 : 1 }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setAnnualReviews([...annualReviews, { revNo: "", reviewDate: "", reviewedByName: "", reviewedBySignature: "", approvedByName: "", approvedBySignature: "" }])} style={{ marginTop: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "none", padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>+ Add Revision Doc</button>
              </div>

              {/* ── TABLE B: Version History ── */}
              <div style={{ borderLeft: "3px solid #0d9488", paddingLeft: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.04em" }}>B. Version History</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)", color: "var(--color-text)", minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface-offset)" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "8%" }}>Rev. No.</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "7%" }}>Page No.</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "20%" }}>Description of Amendment</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "10%" }}>Amendment Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "10%" }}>Effective Date</th>
                        <th colSpan={2} style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>Name & Signature of Amend</th>
                        <th colSpan={2} style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>Name & Signature of Approval</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", width: 40 }}></th>
                      </tr>
                      <tr style={{ background: "var(--color-surface-offset)" }}>
                        <th colSpan={5} style={{ border: "none", padding: 0 }}></th>
                        <th style={{ padding: "5px 10px", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Name</th>
                        <th style={{ padding: "5px 10px", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Signature</th>
                        <th style={{ padding: "5px 10px", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Name</th>
                        <th style={{ padding: "5px 10px", fontWeight: 500, borderBottom: "1px solid var(--color-border)", fontSize: "11px", color: "var(--color-text-muted)" }}>Signature</th>
                        <th style={{ border: "none", padding: 0 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionHistory.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="e.g. 1.0" value={row.revNo} onChange={(e) => { const u = [...versionHistory]; u[idx].revNo = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="e.g. 3" value={row.pageNo} onChange={(e) => { const u = [...versionHistory]; u[idx].pageNo = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><textarea placeholder="Describe amendment..." value={row.description} onChange={(e) => { const u = [...versionHistory]; u[idx].description = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", resize: "vertical", minHeight: 40 }} /></td>
                          <td style={{ padding: "5px" }}><input type="date" value={row.amendmentDate} onChange={(e) => { const u = [...versionHistory]; u[idx].amendmentDate = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="date" value={row.effectiveDate} onChange={(e) => { const u = [...versionHistory]; u[idx].effectiveDate = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Full name" value={row.amendName} onChange={(e) => { const u = [...versionHistory]; u[idx].amendName = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Signature" value={row.amendSignature} onChange={(e) => { const u = [...versionHistory]; u[idx].amendSignature = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Full name" value={row.approvalName} onChange={(e) => { const u = [...versionHistory]; u[idx].approvalName = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="Signature" value={row.approvalSignature} onChange={(e) => { const u = [...versionHistory]; u[idx].approvalSignature = e.target.value; setVersionHistory(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px", textAlign: "center" }}>
                            <button type="button" onClick={() => setVersionHistory(versionHistory.filter((_, i) => i !== idx))} disabled={versionHistory.length <= 1} style={{ background: "none", border: "none", color: "#ef4444", cursor: versionHistory.length <= 1 ? "default" : "pointer", fontSize: 15, opacity: versionHistory.length <= 1 ? 0.3 : 1 }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setVersionHistory([...versionHistory, { revNo: "", pageNo: "", description: "", amendmentDate: "", effectiveDate: "", amendName: "", amendSignature: "", approvalName: "", approvalSignature: "" }])} style={{ marginTop: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "none", padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>+ Add Version</button>
              </div>

              {/* ── TABLE C: Amendment Log ── */}
              <div style={{ borderLeft: "3px solid #0d9488", paddingLeft: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.04em" }}>C. Amendment</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)", color: "var(--color-text)", minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface-offset)" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "8%" }}>S. N</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "15%" }}>Version No.</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)", width: "18%" }}>Effective Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>Changes/Comments</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {amendmentLog.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "5px", textAlign: "center", fontWeight: 600, color: "var(--color-text-muted)", fontSize: "var(--fs-xs)" }}>{idx + 1}</td>
                          <td style={{ padding: "5px" }}><input type="text" placeholder="e.g. 1.1" value={row.versionNo} onChange={(e) => { const u = [...amendmentLog]; u[idx].versionNo = e.target.value; setAmendmentLog(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><input type="date" value={row.effectiveDate} onChange={(e) => { const u = [...amendmentLog]; u[idx].effectiveDate = e.target.value; setAmendmentLog(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)" }} /></td>
                          <td style={{ padding: "5px" }}><textarea placeholder="Describe changes or comments..." value={row.changesComments} onChange={(e) => { const u = [...amendmentLog]; u[idx].changesComments = e.target.value; setAmendmentLog(u); }} style={{ width: "100%", padding: "7px 8px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", resize: "vertical", minHeight: 40 }} /></td>
                          <td style={{ padding: "5px", textAlign: "center" }}>
                            <button type="button" onClick={() => setAmendmentLog(amendmentLog.filter((_, i) => i !== idx))} disabled={amendmentLog.length <= 1} style={{ background: "none", border: "none", color: "#ef4444", cursor: amendmentLog.length <= 1 ? "default" : "pointer", fontSize: 15, opacity: amendmentLog.length <= 1 ? 0.3 : 1 }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setAmendmentLog([...amendmentLog, { versionNo: "", effectiveDate: "", changesComments: "" }])} style={{ marginTop: 10, background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "none", padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>+ Add Amendment</button>
              </div>

            </div>
          </div>

          {/* SECTION PURPOSE_SCOPE: Purpose, Scope & Background */}

          <div id="section-PURPOSE_SCOPE" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 24 }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
              Purpose, Scope & Background
            </h3>

            <RichTextEditor
              label="Purpose *"
              required
              value={purpose}
              onChange={setPurpose}
              placeholder="Verbatim purpose of this SOP..."
            />

            <RichTextEditor
              label="Scope (– what this SOP covers and what is explicitly excluded) *"
              required
              value={scope}
              onChange={setScope}
              placeholder="What this SOP covers and what is explicitly excluded..."
            />

            <RichTextEditor
              label="Background / Introduction"
              value={background}
              onChange={setBackground}
              placeholder="Scientific background or introduction..."
            />
          </div>

          {/* SECTION ABBREV: Abbreviations and definitions */}
          <div id="section-ABBREV" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Abbreviations and definitions
            </h3>
            <RichTextEditor
              label="List abbreviations and terms with their definitions (refer to first chapter of QM for general ones)"
              value={abbreviationsDefinitions}
              onChange={setAbbreviationsDefinitions}
              placeholder="e.g. SOP: Standard Operating Procedure..."
            />
          </div>

          {/* SECTION ROLES: Tasks, responsibilities and accountabilities */}
          <div id="section-ROLES" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Tasks, responsibilities and accountabilities
            </h3>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-text-muted)", margin: "0 0 16px 0" }}>
              Describe the responsibilities and authorizations related to the execution of the procedure. Refer to Authorization Matrix for general details.
            </p>

            <div style={{ marginBottom: 20 }}>
              <RichTextEditor
                label="Responsibility & accountability"
                value={responsibilityAccountability}
                onChange={setResponsibilityAccountability}
                placeholder="Description of responsibilities and accountabilities..."
              />
            </div>


            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px", fontSize: "var(--fs-sm)", color: "var(--color-text)" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-offset)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: 600, width: "30%" }}>Task</th>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: 600, width: "32.5%" }}>Authorized</th>
                    <th style={{ padding: "10px", textAlign: "left", fontWeight: 600, width: "32.5%" }}>Responsible</th>
                    <th style={{ padding: "10px", width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tasksGrid.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "6px", verticalAlign: "top" }}>
                        <input
                          type="text"
                          placeholder="e.g. Run Calibration"
                          value={row.task}
                          onChange={(e) => {
                            const updated = [...tasksGrid];
                            updated[idx].task = e.target.value;
                            setTasksGrid(updated);
                          }}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface-2)", color: "var(--color-text)", minHeight: 40 }}
                        />
                      </td>
                      <td style={{ padding: "6px", verticalAlign: "top" }}>
                        <RectangleMultiselect
                          label=""
                          selectedValues={row.authorized || []}
                          onChange={(vals) => {
                            const updated = [...tasksGrid];
                            updated[idx].authorized = vals;
                            setTasksGrid(updated);
                          }}
                          options={ROLE_OPTIONS}
                          hasOther={true}
                          otherValue={row.authorizedOther || ""}
                          onOtherChange={(val) => {
                            const updated = [...tasksGrid];
                            updated[idx].authorizedOther = val;
                            setTasksGrid(updated);
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px", verticalAlign: "top" }}>
                        <RectangleMultiselect
                          label=""
                          selectedValues={row.responsible || []}
                          onChange={(vals) => {
                            const updated = [...tasksGrid];
                            updated[idx].responsible = vals;
                            setTasksGrid(updated);
                          }}
                          options={ROLE_OPTIONS}
                          hasOther={true}
                          otherValue={row.responsibleOther || ""}
                          onOtherChange={(val) => {
                            const updated = [...tasksGrid];
                            updated[idx].responsibleOther = val;
                            setTasksGrid(updated);
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px", verticalAlign: "top", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setTasksGrid(tasksGrid.filter((_, i) => i !== idx))}
                          disabled={tasksGrid.length <= 1}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: tasksGrid.length <= 1 ? "default" : "pointer", fontSize: "16px", opacity: tasksGrid.length <= 1 ? 0.3 : 1, marginTop: 8 }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setTasksGrid([...tasksGrid, { task: "", authorized: [], authorizedOther: "", responsible: [], responsibleOther: "" }])}
                style={{
                  alignSelf: "flex-start",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                + Add Task Row
              </button>
            </div>
          </div>

          {/* Dynamic Sections based on SOP Type */}
          {sopType === "Equipment SOP" && (
            <>
              {/* section-EQUIP_DESC: Description of the piece of equipment */}
              <div id="section-EQUIP_DESC" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
                  Description of the piece of equipment
                </h3>
                <RichTextEditor
                  label="Short introduction, brand, manufacturer, supplier, measurement range, functions, etc."
                  value={equipmentDescription}
                  onChange={setEquipmentDescription}
                  placeholder="Describe details of the piece of equipment here..."
                />
              </div>

              {/* section-SAFETY: Environmental & Safety Controls */}
              <div id="section-SAFETY" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Environmental & Safety Controls
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RectangleMultiselect
                    label="PPE required *"
                    selectedValues={ppeRequired}
                    onChange={setPpeRequired}
                    options={PPE_REQUIRED_OPTIONS}
                    hasOther={true}
                    otherValue={ppeRequiredOther}
                    onOtherChange={setPpeRequiredOther}
                  />
                  <CircleDropdown
                    label="Biosafety level required"
                    value={bslRequired}
                    onChange={setBslRequired}
                    options={BIOSAFETY_LEVEL_OPTIONS}
                  />
                </div>
                <RectangleMultiselect
                  label="Hazards relevant to this procedure"
                  selectedValues={hazardsRelevant}
                  onChange={setHazardsRelevant}
                  options={HAZARDS_RELEVANT_OPTIONS}
                  hasOther={true}
                  otherValue={hazardsRelevantOther}
                  onOtherChange={setHazardsRelevantOther}
                />
                <RichTextEditor
                  label="Waste handling instructions"
                  value={wasteHandling}
                  onChange={setWasteHandling}
                  placeholder="How to handle waste generated from this procedure..."
                  rows={3}
                />
                <RichTextEditor
                  label="Additional safety / environmental controls"
                  value={additionalSafety}
                  onChange={setAdditionalSafety}
                  placeholder="Describe other safety and environmental controls..."
                  rows={3}
                />
              </div>

              {/* section-STARTUP_MAINT: Startup procedure (calibration and controls) and maintenance */}
              <div id="section-STARTUP_MAINT" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 24 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Startup procedure (calibration and controls) and maintenance
                </h3>

                <RichTextEditor
                  label="Calibration (frequency, automatic calibration, error code actions, records)"
                  value={calibration}
                  onChange={setCalibration}
                  placeholder="Describe calibration protocols..."
                  rows={3}
                />

                <RichTextEditor
                  label="Controls (internal/external controls schedule, result interpretation, action logs)"
                  value={controls}
                  onChange={setControls}
                  placeholder="Describe controls schedules..."
                  rows={3}
                />

                <RichTextEditor
                  label="Maintenance (schedule daily/weekly/monthly/yearly, staff vs technical expert duties)"
                  value={maintenance}
                  onChange={setMaintenance}
                  placeholder="Describe maintenance protocols..."
                  rows={3}
                />
              </div>

              {/* section-OPERATION: Operation */}
              <div id="section-OPERATION" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
                  Operation
                </h3>
                <RichTextEditor
                  label="Describe in chronological order the steps for operation (imperative voice, user knowledge levels)"
                  value={operation}
                  onChange={setOperation}
                  placeholder="Chronological operational steps..."
                />
              </div>

              {/* section-PROBLEM_SOLVING: Problem solving */}
              <div id="section-PROBLEM_SOLVING" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
                  Problem solving
                </h3>
                <RichTextEditor
                  label="Describe the most common errors (referring to manual pages is allowed)"
                  value={problemSolving}
                  onChange={setProblemSolving}
                  placeholder="Common troubleshooting steps..."
                />
              </div>
            </>
          )}

          {sopType === "Analysis SOP" && (
            <>
              {/* section-PRINCIPLE: Principle of the Method */}
              <div id="section-PRINCIPLE" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
                  Principle of the Method
                </h3>
                <RichTextEditor
                  label="Principle / Methodological basis *"
                  required
                  value={principleMethodologicalBasis}
                  onChange={setPrincipleMethodologicalBasis}
                  placeholder="Describe scientific and methodological basis..."
                />
              </div>

              {/* section-SAFETY: Environmental & Safety Controls */}
              <div id="section-SAFETY" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Environmental & Safety Controls
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RectangleMultiselect
                    label="PPE required *"
                    selectedValues={ppeRequired}
                    onChange={setPpeRequired}
                    options={PPE_REQUIRED_OPTIONS}
                    hasOther={true}
                    otherValue={ppeRequiredOther}
                    onOtherChange={setPpeRequiredOther}
                  />
                  <CircleDropdown
                    label="Biosafety level required"
                    value={bslRequired}
                    onChange={setBslRequired}
                    options={BIOSAFETY_LEVEL_OPTIONS}
                  />
                </div>
                <RectangleMultiselect
                  label="Hazards relevant to this procedure"
                  selectedValues={hazardsRelevant}
                  onChange={setHazardsRelevant}
                  options={HAZARDS_RELEVANT_OPTIONS}
                  hasOther={true}
                  otherValue={hazardsRelevantOther}
                  onOtherChange={setHazardsRelevantOther}
                />
                <RichTextEditor
                  label="Waste handling instructions"
                  value={wasteHandling}
                  onChange={setWasteHandling}
                  placeholder="How to handle waste generated from this procedure..."
                  rows={3}
                />
                <RichTextEditor
                  label="Additional safety / environmental controls"
                  value={additionalSafety}
                  onChange={setAdditionalSafety}
                  placeholder="Describe other safety and environmental controls..."
                  rows={3}
                />
              </div>

              {/* section-SAMPLE: Samples / Specimens Covered */}
              <div id="section-SAMPLE" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Samples / Specimens Covered
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RectangleMultiselect
                    label="Sample matrices covered by this SOP *"
                    selectedValues={sampleMatrices}
                    onChange={setSampleMatrices}
                    options={SAMPLE_MATRIX_OPTIONS}
                    hasOther={true}
                    otherValue={sampleMatricesOther}
                    onOtherChange={setSampleMatricesOther}
                  />
                  <RectangleMultiselect
                    label="Input material type(s)"
                    selectedValues={inputMaterialTypes}
                    onChange={setInputMaterialTypes}
                    options={INPUT_MATERIAL_OPTIONS}
                    hasOther={true}
                    otherValue={inputMaterialTypesOther}
                    onOtherChange={setInputMaterialTypesOther}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Volume/amount required per sample</label>
                  <textarea
                    placeholder="Describe volume/amount requirements..."
                    value={sampleVolume}
                    onChange={(e) => setSampleVolume(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: "4px", background: "var(--color-surface-2)", color: "var(--color-text)", resize: "vertical", minHeight: 40 }}
                  />
                </div>
                <RichTextEditor
                  label="Sample acceptance criteria"
                  value={sampleAcceptance}
                  onChange={setSampleAcceptance}
                  placeholder="Acceptance guidelines..."
                  rows={3}
                />
                <RichTextEditor
                  label="Sample rejection criteria"
                  value={sampleRejection}
                  onChange={setSampleRejection}
                  placeholder="Rejection guidelines..."
                  rows={3}
                />
              </div>

              {/* section-REAGENTS: Reagents & supplies */}
              <div id="section-REAGENTS" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Reagents & supplies
                </h3>
                <RichTextEditor
                  label="Reagents & supplies details"
                  value={reagentsNarrative}
                  onChange={setReagentsNarrative}
                  placeholder="Reagents and supplies details..."
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reagents & supplies (one per line)</label>
                  <textarea
                    placeholder="Enter items one per line..."
                    value={reagentsOnePerLine}
                    onChange={(e) => setReagentsOnePerLine(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", minHeight: 80 }}
                  />
                </div>
              </div>

              {/* section-EQUIP_SUPPLIES: Equipment & Instruments */}
              <div id="section-EQUIP_SUPPLIES" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Equipment & Instruments
                </h3>
                <RectangleMultiselect
                  label="Primary equipment used"
                  selectedValues={primaryEquipment}
                  onChange={setPrimaryEquipment}
                  options={PRIMARY_EQUIPMENT_OPTIONS}
                  hasOther={true}
                  otherValue={primaryEquipmentOther}
                  onOtherChange={setPrimaryEquipmentOther}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Equipment & instruments (one per line)</label>
                  <textarea
                    placeholder="Enter equipment details one per line..."
                    value={equipmentOnePerLine}
                    onChange={(e) => setEquipmentOnePerLine(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", minHeight: 80 }}
                  />
                </div>
              </div>

              {/* section-QC: Quality Control */}
              <div id="section-QC" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Quality Control
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RectangleMultiselect
                    label="Controls included in this SOP"
                    selectedValues={controlsIncluded}
                    onChange={setControlsIncluded}
                    options={CONTROLS_INCLUDED_OPTIONS}
                    hasOther={true}
                    otherValue={controlsIncludedOther}
                    onOtherChange={setControlsIncludedOther}
                  />
                  <RectangleMultiselect
                    label="DNA/RNA QC methods specified"
                    selectedValues={qcMethods}
                    onChange={setQcMethods}
                    options={QC_METHODS_OPTIONS}
                    hasOther={true}
                    otherValue={qcMethodsOther}
                    onOtherChange={setQcMethodsOther}
                  />
                </div>
                <RichTextEditor
                  label="Acceptance / rejection criteria"
                  value={acceptanceRejectionCriteria}
                  onChange={setAcceptanceRejectionCriteria}
                  placeholder="QC acceptance guidelines..."
                  rows={3}
                />
                <RichTextEditor
                  label="Quality control details"
                  value={qcNarrative}
                  onChange={setQcNarrative}
                  placeholder="Quality Control details..."
                />
              </div>

              {/* section-PROCEDURE: Stepwise Procedure */}
              <div id="section-PROCEDURE" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Stepwise Procedure
                </h3>
                <RichTextEditor
                  label="Procedure details *"
                  required
                  value={procedureNarrative}
                  onChange={setProcedureNarrative}
                  placeholder="Step-by-step procedure description..."
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Stepwise procedure (one step per line)</label>
                  <textarea
                    placeholder="Enter steps one per line..."
                    value={procedureOnePerLine}
                    onChange={(e) => setProcedureOnePerLine(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", minHeight: 80 }}
                  />
                </div>
              </div>

              {/* section-CALCULATION: Calculation / Data Analysis */}
              <div id="section-CALCULATION" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Calculation / Data Analysis
                </h3>
                <RichTextEditor
                  label="Calculations / formulas used"
                  value={calculationsFormulas}
                  onChange={setCalculationsFormulas}
                  placeholder="Formulas and result calculations..."
                  rows={3}
                />
                <RichTextEditor
                  label="Software / analysis tools used"
                  value={softwareAnalysisTools}
                  onChange={setSoftwareAnalysisTools}
                  placeholder="Software or statistical tools..."
                  rows={3}
                />
                <RichTextEditor
                  label="Interpretation rules / thresholds"
                  value={interpretationThresholds}
                  onChange={setInterpretationThresholds}
                  placeholder="Interpretation thresholds and cut-offs..."
                  rows={3}
                />
              </div>

              {/* section-REPORTING: Result Reporting & Interpretation */}
              <div id="section-REPORTING" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Result Reporting & Interpretation
                </h3>
                <RichTextEditor
                  label="Reporting format (units, layout)"
                  value={reportingFormat}
                  onChange={setReportingFormat}
                  placeholder="Units and result layout..."
                  rows={3}
                />
                <RichTextEditor
                  label="Cut-offs / thresholds"
                  value={cutOffsThresholds}
                  onChange={setCutOffsThresholds}
                  placeholder="Reference ranges and critical alert cut-offs..."
                  rows={3}
                />
                <RichTextEditor
                  label="LIMS / database field mapping"
                  value={limsDatabaseMapping}
                  onChange={setLimsDatabaseMapping}
                  placeholder="Field names in LIMS system database..."
                  rows={3}
                />
                <RichTextEditor
                  label="Result reporting narrative"
                  value={resultReportingNarrative}
                  onChange={setResultReportingNarrative}
                  placeholder="Detailed result reporting guidelines..."
                />
              </div>

              {/* section-STORAGE_TRANSPORT: Storage & Transport Requirements */}
              <div id="section-STORAGE_TRANSPORT" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                  Storage & Transport Requirements
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RectangleMultiselect
                    label="Sample types this SOP stores / transports"
                    selectedValues={storageSampleTypes}
                    onChange={setStorageSampleTypes}
                    options={STORAGE_SAMPLE_TYPE_OPTIONS}
                    hasOther={true}
                    otherValue={storageSampleTypesOther}
                    onOtherChange={setStorageSampleTypesOther}
                  />
                  <CircleDropdown
                    label="Recommended storage temperature"
                    value={storageTemperature}
                    onChange={setStorageTemperature}
                    options={STORAGE_TEMP_OPTIONS}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <RichTextEditor
                    label="Maximum storage duration"
                    value={maxStorageDuration}
                    onChange={setMaxStorageDuration}
                    placeholder="e.g. 1 year at -80°C..."
                    rows={3}
                  />
                  <RectangleMultiselect
                    label="Acceptable transport modes"
                    selectedValues={acceptableTransportModes}
                    onChange={setAcceptableTransportModes}
                    options={TRANSPORT_MODE_OPTIONS}
                    hasOther={true}
                    otherValue={acceptableTransportModesOther}
                    onOtherChange={setAcceptableTransportModesOther}
                  />
                </div>
                <RichTextEditor
                  label="Storage & transport narrative"
                  value={storageTransportNarrative}
                  onChange={setStorageTransportNarrative}
                  placeholder="Detailed storage and shipping instructions..."
                />
              </div>
            </>
          )}

          {sopType === "Procedure SOP" && (
            <div id="section-PROCEDURE" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 20 }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, color: "var(--color-text)", margin: 0 }}>
                Stepwise Procedure
              </h3>
              <RichTextEditor
                label="Procedure details *"
                required
                value={procedureNarrative}
                onChange={setProcedureNarrative}
                placeholder="Stepwise procedure description..."
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Stepwise procedure (one step per line)</label>
                <textarea
                  placeholder="Enter steps one per line..."
                  value={procedureOnePerLine}
                  onChange={(e) => setProcedureOnePerLine(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", resize: "vertical", minHeight: 80 }}
                />
              </div>
            </div>
          )}

          {/* SECTION DOCS: Related Documents */}
          <div id="section-DOCS" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              {sopType === "Procedure SOP" ? "6. Related Documents" : sopType === "Equipment SOP" ? "10. Related Documents" : "12. Related Documents"}
            </h3>
            <RichTextEditor
              label="Related SOPs, QM chapters, log sheets, manuals, package inserts (with locations if not coded)"
              value={relatedDocuments}
              onChange={setRelatedDocuments}
              placeholder="e.g. QM1 'General'; Biosafety Manual in Room 102..."
            />
          </div>

          {/* SECTION FORMS: Related Forms */}
          <div id="section-FORMS" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              {sopType === "Procedure SOP" ? "7. Related Forms" : sopType === "Equipment SOP" ? "11. Related Forms" : "13. Related Forms"}
            </h3>
            <RichTextEditor
              label="List forms relevant to this SOP (include locations if not coded)"
              value={relatedForms}
              onChange={setRelatedForms}
              placeholder="e.g. P43F1 'Induction checklist'..."
            />
          </div>

          {/* SECTION REFS: References */}
          <div id="section-REFS" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              {sopType === "Procedure SOP" ? "8. References" : sopType === "Equipment SOP" ? "12. References" : "14. References"}
            </h3>
            <RichTextEditor
              label="Refer to literature used (Books: Title, ed, authors, publisher, year. Journals: name, year/vol/issue, authors)"
              value={references}
              onChange={setReferences}
              placeholder="Literature references..."
            />
          </div>

          {/* SECTION ATTACHMENTS: Attachments */}
          <div id="section-ATTACHMENTS" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              {sopType === "Procedure SOP" ? "9. Attachments" : sopType === "Equipment SOP" ? "13. Attachments" : "15. Attachments"}
            </h3>
            <RichTextEditor
              label="Annexes list (controlled and uncontrolled annexes, locations)"
              value={attachments}
              onChange={setAttachments}
              placeholder="List of attachments..."
            />
          </div>
        </form>
      </div>
    </div>
  );
}
