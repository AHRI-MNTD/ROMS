import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
  onOtherChange = () => { },
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
  onOtherChange = () => { },
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
              <path d="M4 2h4.5a3.5 3.5 0 0 1 2.5 6 3.5 3.5 0 0 1-2.5 6H4V2zm2 2.5v3.5h2a1.75 1.75 0 0 0 0-3.5H6zm0 5.5v3h2.5a1.75 1.75 0 0 0 0-3.5H6z"/>
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
              <path d="M6 2h6v2.5H9.4l-2.8 7H9v2.5H3V11.5h2.6l2.8-7H6V2z"/>
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
                      boxShadow: "inset 0 0 2px rgba(0,0,0,0.2)",
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
              <circle cx="3" cy="4" r="1.5"/>
              <rect x="7" y="3" width="8" height="2" rx="0.5"/>
              <circle cx="3" cy="8" r="1.5"/>
              <rect x="7" y="7" width="8" height="2" rx="0.5"/>
              <circle cx="3" cy="12" r="1.5"/>
              <rect x="7" y="11" width="8" height="2" rx="0.5"/>
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
              <rect x="7" y="3" width="8" height="2" rx="0.5"/>
              <rect x="7" y="7" width="8" height="2" rx="0.5"/>
              <rect x="7" y="11" width="8" height="2" rx="0.5"/>
            </svg>
          </button>

          <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />

          {/* Interactive Table & Elements Popover (Sample Image Requirement) */}
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
                        <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 2h3.5v3.5H2V2z"/>
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

export default function CreateSOPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("edit");

  const formRef = useRef<HTMLFormElement>(null);
  const [activeSection, setActiveSection] = useState("A");

  // A. SOP Identification
  const [enteredBy, setEnteredBy] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [sopCode, setSopCode] = useState("");
  const [sopVersion, setSopVersion] = useState("1.0");
  const [supersedes, setSupersedes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [sopStatus, setSopStatus] = useState("Draft");
  const [owningSite, setOwningSite] = useState("AHRI – Addis Ababa");
  const [owningSiteOther, setOwningSiteOther] = useState("");
  const [owningLabUnit, setOwningLabUnit] = useState("MNTD Molecular Lab");
  const [assayCategory, setAssayCategory] = useState("Sample collection / preparation");
  const [methodFamily, setMethodFamily] = useState("Conventional PCR");
  const [methodFamilyOther, setMethodFamilyOther] = useState("");

  // B. Revision & Amendment History
  const [revisionNumber, setRevisionNumber] = useState("");
  const [revisionDate, setRevisionDate] = useState("");
  const [revisionSummary, setRevisionSummary] = useState("");
  const [revisionRationale, setRevisionRationale] = useState("");

  // C. Purpose, Scope & Background
  const [purpose, setPurpose] = useState("");
  const [scopeCovers, setScopeCovers] = useState("");
  const [scopeExcluded, setScopeExcluded] = useState("");
  const [background, setBackground] = useState("");

  // D. Definitions & Abbreviations
  const [definitions, setDefinitions] = useState("");
  const [abbreviations, setAbbreviations] = useState("");

  // E. Responsibility & Accountability
  const [rolesInvolved, setRolesInvolved] = useState<string[]>([]);
  const [rolesInvolvedOther, setRolesInvolvedOther] = useState("");
  const [responsibilityNarrative, setResponsibilityNarrative] = useState("");

  // F. Principle of the Method
  const [principleBasis, setPrincipleBasis] = useState("");

  // G. Samples / Specimens Covered
  const [sampleMatrices, setSampleMatrices] = useState<string[]>([]);
  const [sampleMatricesOther, setSampleMatricesOther] = useState("");
  const [inputMaterialTypes, setInputMaterialTypes] = useState<string[]>([]);
  const [inputMaterialTypesOther, setInputMaterialTypesOther] = useState("");
  const [volumeRequired, setVolumeRequired] = useState("");
  const [sampleAcceptanceCriteria, setSampleAcceptanceCriteria] = useState("");
  const [sampleRejectionCriteria, setSampleRejectionCriteria] = useState("");

  // H. Reagents & Supplies
  const [reagentsSuppliesNarrative, setReagentsSuppliesNarrative] = useState("");
  const [reagentsSuppliesList, setReagentsSuppliesList] = useState("");

  // I. Equipment & Instruments
  const [primaryEquipment, setPrimaryEquipment] = useState<string[]>([]);
  const [primaryEquipmentOther, setPrimaryEquipmentOther] = useState("");
  const [equipmentList, setEquipmentList] = useState("");

  // J. Environmental & Safety Controls
  const [ppeRequired, setPpeRequired] = useState<string[]>([]);
  const [ppeRequiredOther, setPpeRequiredOther] = useState("");
  const [biosafetyLevel, setBiosafetyLevel] = useState("BSL-1");
  const [hazardsRelevant, setHazardsRelevant] = useState<string[]>([]);
  const [hazardsRelevantOther, setHazardsRelevantOther] = useState("");
  const [wasteHandling, setWasteHandling] = useState("");
  const [additionalSafetyControls, setAdditionalSafetyControls] = useState("");

  // K. Quality Control
  const [controlsIncluded, setControlsIncluded] = useState<string[]>([]);
  const [controlsIncludedOther, setControlsIncludedOther] = useState("");
  const [qcMethods, setQcMethods] = useState<string[]>([]);
  const [qcMethodsOther, setQcMethodsOther] = useState("");
  const [qcAcceptanceCriteria, setQcAcceptanceCriteria] = useState("");
  const [qcNarrative, setQcNarrative] = useState("");

  // L. Stepwise Procedure
  const [procedureNarrative, setProcedureNarrative] = useState("");
  const [procedureStepsList, setProcedureStepsList] = useState("");

  // M. Calculation / Data Analysis
  const [calculationsFormulas, setCalculationsFormulas] = useState("");
  const [softwareTools, setSoftwareTools] = useState("");
  const [interpretationRules, setInterpretationRules] = useState("");

  // N. Result Reporting & Interpretation
  const [reportingFormat, setReportingFormat] = useState("");
  const [cutOffsThresholds, setCutOffsThresholds] = useState("");
  const [limsDatabaseMapping, setLimsDatabaseMapping] = useState("");
  const [resultReportingNarrative, setResultReportingNarrative] = useState("");

  // P. Storage & Transport Requirements
  const [storageSampleTypes, setStorageSampleTypes] = useState<string[]>([]);
  const [recommendedTemp, setRecommendedTemp] = useState("Room temperature");
  const [maxStorageDuration, setMaxStorageDuration] = useState("");
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [storageTransportNarrative, setStorageTransportNarrative] = useState("");

  // Q. References & Attachments
  const [referencesText, setReferencesText] = useState("");
  const [originalSopFile, setOriginalSopFile] = useState<File | null>(null);
  const [supplementaryFile, setSupplementaryFile] = useState<File | null>(null);
  const [workflowFile, setWorkflowFile] = useState<File | null>(null);

  // R. Document Control & Sign-off
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedByRole, setPreparedByRole] = useState("");
  const [preparedDate, setPreparedDate] = useState("");
  const [reviewedByName, setReviewedByName] = useState("");
  const [reviewedByRole, setReviewedByRole] = useState("");
  const [reviewedDate, setReviewedDate] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedByRole, setApprovedByRole] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [controlledCopyNumber, setControlledCopyNumber] = useState("");
  const [distributionList, setDistributionList] = useState("");
  const [finalComments, setFinalComments] = useState("");

  // Detect Edit Mode & Load Data
  useEffect(() => {
    if (editCode) {
      try {
        const saved = localStorage.getItem("roms_local_sops");
        if (saved) {
          const list = JSON.parse(saved);
          const item = list.find((s: any) => s.code === editCode);
          if (item) {
            setSopCode(item.code || "");
            setSopTitle(item.title || "");
            setSopVersion(item.version || "1.0");
            setSopStatus(item.status || "Draft");
            setAssayCategory(item.sopSection || "");
            setOwningLabUnit(item.sopSubSection || "");

            const details = item.details || {};
            setEnteredBy(item.author || "");
            setSupersedes(details.supersedes || "");
            setEffectiveDate(details.effectiveDate || "");
            setNextReviewDate(details.nextReviewDate || "");

            const siteStr = details.owningSite || "";
            if (siteStr.startsWith("Other: ")) {
              setOwningSite("Other (specify)");
              setOwningSiteOther(siteStr.replace("Other: ", ""));
            } else {
              setOwningSite(siteStr || "AHRI – Addis Ababa");
            }

            const familyStr = details.methodFamily || "";
            if (familyStr.startsWith("Other: ")) {
              setMethodFamily("Other (specify)");
              setMethodFamilyOther(familyStr.replace("Other: ", ""));
            } else {
              setMethodFamily(familyStr || "Conventional PCR");
            }

            const rev = details.revision || {};
            setRevisionNumber(rev.revisionNumber || "");
            setRevisionDate(rev.revisionDate || "");
            setRevisionSummary(rev.revisionSummary || "");
            setRevisionRationale(rev.revisionRationale || "");

            const ps = details.purposeScope || {};
            setPurpose(ps.purpose || "");
            setScopeCovers(ps.scopeCovers || "");
            setScopeExcluded(ps.scopeExcluded || "");
            setBackground(ps.background || "");

            const defs = details.definitions || {};
            setDefinitions(defs.definitions || "");
            setAbbreviations(defs.abbreviations || "");

            const resp = details.responsibility || {};
            const roles: string[] = resp.roles || [];
            const normalRoles = roles.map(r => {
              if (r.startsWith("Other: ")) {
                setRolesInvolvedOther(r.replace("Other: ", ""));
                return "Other (specify)";
              }
              return r;
            });
            setRolesInvolved(normalRoles);
            setResponsibilityNarrative(resp.responsibilityNarrative || "");

            setPrincipleBasis(details.principle || "");

            const sm = details.samples || {};
            const mats: string[] = sm.matrices || [];
            const normalMats = mats.map(m => {
              if (m.startsWith("Other: ")) {
                setSampleMatricesOther(m.replace("Other: ", ""));
                return "Other (specify)";
              }
              return m;
            });
            setSampleMatrices(normalMats);

            const inputs: string[] = sm.inputMaterials || [];
            const normalInputs = inputs.map(i => {
              if (i.startsWith("Other: ")) {
                setInputMaterialTypesOther(i.replace("Other: ", ""));
                return "Other (specify)";
              }
              return i;
            });
            setInputMaterialTypes(normalInputs);
            setVolumeRequired(sm.volumeRequired || "");
            setSampleAcceptanceCriteria(sm.acceptance || "");
            setSampleRejectionCriteria(sm.rejection || "");

            const rg = details.reagents || {};
            setReagentsSuppliesNarrative(rg.narrative || "");
            setReagentsSuppliesList(rg.list || "");

            const eq = details.equipment || {};
            const equips: string[] = eq.primary || [];
            const normalEquips = equips.map(e => {
              if (e.startsWith("Other: ")) {
                setPrimaryEquipmentOther(e.replace("Other: ", ""));
                return "Other (specify)";
              }
              return e;
            });
            setPrimaryEquipment(normalEquips);
            setEquipmentList(eq.list || "");

            const sf = details.safety || {};
            const ppes: string[] = sf.ppe || [];
            const normalPpes = ppes.map(p => {
              if (p.startsWith("Other: ")) {
                setPpeRequiredOther(p.replace("Other: ", ""));
                return "Other (specify)";
              }
              return p;
            });
            setPpeRequired(normalPpes);
            setBiosafetyLevel(sf.level || "BSL-1");

            const haz: string[] = sf.hazards || [];
            const normalHaz = haz.map(h => {
              if (h.startsWith("Other: ")) {
                setHazardsRelevantOther(h.replace("Other: ", ""));
                return "Other (specify)";
              }
              return h;
            });
            setHazardsRelevant(normalHaz);
            setWasteHandling(sf.waste || "");
            setAdditionalSafetyControls(sf.additional || "");

            const qc = details.qualityControl || {};
            const ctrls: string[] = qc.controls || [];
            const normalCtrls = ctrls.map(c => {
              if (c.startsWith("Other: ")) {
                setControlsIncludedOther(c.replace("Other: ", ""));
                return "Other (specify)";
              }
              return c;
            });
            setControlsIncluded(normalCtrls);

            const qcm: string[] = qc.methods || [];
            const normalQcm = qcm.map(q => {
              if (q.startsWith("Other: ")) {
                setQcMethodsOther(q.replace("Other: ", ""));
                return "Other (specify)";
              }
              return q;
            });
            setQcMethods(normalQcm);
            setQcAcceptanceCriteria(qc.acceptance || "");
            setQcNarrative(qc.narrative || "");

            const pr = details.procedure || {};
            setProcedureNarrative(pr.narrative || "");
            setProcedureStepsList(pr.steps || "");

            const calc = details.calculation || {};
            setCalculationsFormulas(calc.formulas || "");
            setSoftwareTools(calc.software || "");
            setInterpretationRules(calc.thresholds || "");

            const rr = details.resultReporting || {};
            setReportingFormat(rr.format || "");
            setCutOffsThresholds(rr.thresholds || "");
            setLimsDatabaseMapping(rr.lims || "");
            setResultReportingNarrative(rr.narrative || "");

            const st = details.storage || {};
            setStorageSampleTypes(st.types || []);
            setRecommendedTemp(st.temp || "Room temperature");
            setMaxStorageDuration(st.duration || "");
            setTransportModes(st.transport || []);
            setStorageTransportNarrative(st.narrative || "");

            setReferencesText(details.references || "");

            const sig = details.signoff || {};
            setPreparedByName(sig.preparedByName || "");
            setPreparedByRole(sig.preparedByRole || "");
            setPreparedDate(sig.preparedDate || "");
            setReviewedByName(sig.reviewedByName || "");
            setReviewedByRole(sig.reviewedByRole || "");
            setReviewedDate(sig.reviewedDate || "");
            setApprovedByName(sig.approvedByName || "");
            setApprovedByRole(sig.approvedByRole || "");
            setApprovedDate(sig.approvedDate || "");
            setControlledCopyNumber(sig.controlledCopyNumber || "");
            setDistributionList(sig.distributionList || "");
            setFinalComments(sig.finalComments || "");
          }
        }
      } catch (e) {
        console.error("Error loading SOP for editing:", e);
      }
    }
  }, [editCode]);

  // Save drafts and submit actions
  const saveSOPToLocalStorage = (statusToSave: string) => {
    if (!sopCode || !sopTitle) {
      alert("SOP Code and SOP Title are required to save draft or submit!");
      return false;
    }

    const newSopItem = {
      id: editCode ? `sop-local-${editCode}` : `sop-local-${Date.now()}`,
      code: sopCode,
      title: sopTitle,
      sopSection: assayCategory,
      sopSubSection: owningLabUnit,
      version: sopVersion,
      status: statusToSave,
      author: preparedByName || enteredBy || "Data Steward",
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      details: {
        supersedes,
        effectiveDate,
        nextReviewDate,
        owningSite: owningSite === "Other (specify)" ? `Other: ${owningSiteOther}` : owningSite,
        methodFamily: methodFamily === "Other (specify)" ? `Other: ${methodFamilyOther}` : methodFamily,
        revision: {
          revisionNumber,
          revisionDate,
          revisionSummary,
          revisionRationale
        },
        purposeScope: {
          purpose,
          scopeCovers,
          scopeExcluded,
          background
        },
        definitions: {
          definitions,
          abbreviations
        },
        responsibility: {
          roles: rolesInvolved.map(r => r === "Other (specify)" ? `Other: ${rolesInvolvedOther}` : r),
          responsibilityNarrative
        },
        principle: principleBasis,
        samples: {
          matrices: sampleMatrices.map(s => s === "Other (specify)" ? `Other: ${sampleMatricesOther}` : s),
          inputMaterials: inputMaterialTypes.map(i => i === "Other (specify)" ? `Other: ${inputMaterialTypesOther}` : i),
          volumeRequired,
          acceptance: sampleAcceptanceCriteria,
          rejection: sampleRejectionCriteria
        },
        reagents: {
          narrative: reagentsSuppliesNarrative,
          list: reagentsSuppliesList
        },
        equipment: {
          primary: primaryEquipment.map(e => e === "Other (specify)" ? `Other: ${primaryEquipmentOther}` : e),
          list: equipmentList
        },
        safety: {
          ppe: ppeRequired.map(p => p === "Other (specify)" ? `Other: ${ppeRequiredOther}` : p),
          level: biosafetyLevel,
          hazards: hazardsRelevant.map(h => h === "Other (specify)" ? `Other: ${hazardsRelevantOther}` : h),
          waste: wasteHandling,
          additional: additionalSafetyControls
        },
        qualityControl: {
          controls: controlsIncluded.map(c => c === "Other (specify)" ? `Other: ${controlsIncludedOther}` : c),
          methods: qcMethods.map(q => q === "Other (specify)" ? `Other: ${qcMethodsOther}` : q),
          acceptance: qcAcceptanceCriteria,
          narrative: qcNarrative
        },
        procedure: {
          narrative: procedureNarrative,
          steps: procedureStepsList
        },
        calculation: {
          formulas: calculationsFormulas,
          software: softwareTools,
          thresholds: interpretationRules
        },
        resultReporting: {
          format: reportingFormat,
          thresholds: cutOffsThresholds,
          lims: limsDatabaseMapping,
          narrative: resultReportingNarrative
        },
        storage: {
          types: storageSampleTypes,
          temp: recommendedTemp,
          duration: maxStorageDuration,
          transport: transportModes,
          narrative: storageTransportNarrative
        },
        references: referencesText,
        signoff: {
          preparedByName,
          preparedByRole,
          preparedDate,
          reviewedByName,
          reviewedByRole,
          reviewedDate,
          approvedByName,
          approvedByRole,
          approvedDate,
          controlledCopyNumber,
          distributionList,
          finalComments
        }
      }
    };

    try {
      const existing = localStorage.getItem("roms_local_sops");
      const list = existing ? JSON.parse(existing) : [];
      // Remove any existing one with the same code or previous code (editCode) to overwrite
      const codeToFilter = editCode || sopCode;
      const filtered = list.filter((item: any) => item.code !== codeToFilter);
      localStorage.setItem("roms_local_sops", JSON.stringify([newSopItem, ...filtered]));
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
      alert("SOP Draft saved successfully!");
      navigate("/domains/qms");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = saveSOPToLocalStorage(sopStatus || "Under review");
    if (success) {
      alert("SOP Submitted successfully!");
      navigate("/domains/qms");
    }
  };

  // List of sections for the left sidebar
  const sections = [
    { id: "A", label: "SOP Identification" },
    { id: "B", label: "Revision & History" },
    { id: "C", label: "Purpose & Scope" },
    { id: "D", label: "Definitions" },
    { id: "E", label: "Responsibility" },
    { id: "F", label: "Method Principle" },
    { id: "G", label: "Samples & Specimens" },
    { id: "H", label: "Reagents & Supplies" },
    { id: "I", label: "Equipment & Instruments" },
    { id: "J", label: "Safety Controls" },
    { id: "K", label: "Quality Control" },
    { id: "L", label: "Stepwise Procedure" },
    { id: "M", label: "Calculation & Analysis" },
    { id: "N", label: "Result Reporting" },
    { id: "P", label: "Storage & Transport" },
    { id: "Q", label: "References & Files" },
    { id: "R", label: "Control & Sign-off" }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
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
          ← Back to QMS List
        </button>

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

        {/* HEADER BLOCK (Compact, Minimalist) */}
        <div
          style={{
            padding: "10px 24px",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              AHRI MNTD – Standard Operating Procedure (SOP) Intake
            </h1>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", margin: 0 }}>
              Fill in all fields to complete Full SOP documentation.
            </p>
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
          {/* SECTION A. SOP Identification */}
          <div id="section-A" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              SOP Identification
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Row 1: Entered by (1/5) and SOP Title (4/5) */}
              <div style={{ display: "flex", gap: 20, width: "100%" }}>
                <div style={{ flex: "1 1 20%", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Entered by (data steward) *</label>
                  <input type="text" required placeholder="Name of data steward" value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: "4 1 80%", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Title *</label>
                  <input type="text" required placeholder="Full title of the SOP" value={sopTitle} onChange={(e) => setSopTitle(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Row 2: SOP Code, Version, Supersedes, Effective Date, Next review date (1/5 space each) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>SOP Code / number *</label>
                  <input type="text" required placeholder="e.g. SOP-MNTD-042" value={sopCode} onChange={(e) => setSopCode(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>

                <CircleDropdown
                  label="SOP version *"
                  value={sopVersion}
                  onChange={setSopVersion}
                  options={SOP_VERSION_OPTIONS}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Supersedes (previous SOP code/version)</label>
                  <input type="text" placeholder="e.g. SOP-MNTD-030 v1.2" value={supersedes} onChange={(e) => setSupersedes(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Effective Date *</label>
                  <input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Next review date *</label>
                  <input type="date" required value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Row 3: SOP status, Owning site, Owning Lab Unit, Assay Category, Method Family (1/5 space each) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, width: "100%" }}>
                <CircleDropdown
                  label="SOP status *"
                  value={sopStatus}
                  onChange={setSopStatus}
                  options={["Draft", "Under review", "Active / Approved", "Superseded", "Retired / Archived"]}
                />

                <CircleDropdown
                  label="Owning site / institution *"
                  value={owningSite}
                  onChange={setOwningSite}
                  options={["AHRI – Addis Ababa", "AHRI – Field Site", "Partner Laboratory", "Other (specify)"]}
                  hasOther={true}
                  otherValue={owningSiteOther}
                  onOtherChange={setOwningSiteOther}
                />

                <CircleDropdown
                  label="Owning Laboratory Unit *"
                  value={owningLabUnit}
                  onChange={setOwningLabUnit}
                  options={["MNTD Molecular Lab", "MNTD Serology Lab", "MNTD Vector Entomology Lab", "MNTD NGS / Sequencing Lab", "Field laboratory"]}
                />

                <CircleDropdown
                  label="Assay Category (cascading parent) *"
                  value={assayCategory}
                  onChange={setAssayCategory}
                  options={[
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
                  ]}
                />

                <CircleDropdown
                  label="Method Family *"
                  value={methodFamily}
                  onChange={setMethodFamily}
                  options={[
                    "Conventional PCR",
                    "Real-time qPCR",
                    "Digital PCR",
                    "Next-generation sequencing",
                    "Immunoassay / serology",
                    "Nucleic-acid extraction",
                    "Sample collection / preparation",
                    "Vector / entomology",
                    "Equipment SOP",
                    "Other (specify)"
                  ]}
                  hasOther={true}
                  otherValue={methodFamilyOther}
                  onOtherChange={setMethodFamilyOther}
                />
              </div>
            </div>
          </div>

          {/* SECTION B. Revision & Amendment History */}
          <div id="section-B" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Revision & Amendment History
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Revision Number</label>
                <input type="text" placeholder="e.g. Rev 1" value={revisionNumber} onChange={(e) => setRevisionNumber(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Revision Date</label>
                <input type="date" value={revisionDate} onChange={(e) => setRevisionDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Summary of changes from previous version"
                placeholder="Describe the changes made in this revision..."
                value={revisionSummary}
                onChange={setRevisionSummary}
                rows={3}
              />

              <RichTextEditor
                label="Rationale for change"
                placeholder="Explain the reasons/necessity for making this change..."
                value={revisionRationale}
                onChange={setRevisionRationale}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION C. Purpose, Scope & Background */}
          <div id="section-C" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Purpose, Scope & Background
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Purpose (verbatim) *"
                required={true}
                placeholder="State the purpose of this SOP exactly as described in the official document..."
                value={purpose}
                onChange={setPurpose}
                rows={4}
              />

              <RichTextEditor
                label="Scope – what this SOP covers *"
                required={true}
                placeholder="Detail the applicability and coverage of this procedure..."
                value={scopeCovers}
                onChange={setScopeCovers}
                rows={3}
              />

              <RichTextEditor
                label="Scope – what is explicitly excluded"
                placeholder="Identify what procedures, parameters or targets are explicitly excluded from this SOP..."
                value={scopeExcluded}
                onChange={setScopeExcluded}
                rows={3}
              />

              <RichTextEditor
                label="Background / Introduction"
                placeholder="Provide necessary theoretical context or laboratory introduction..."
                value={background}
                onChange={setBackground}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION D. Definitions & Abbreviations */}
          <div id="section-D" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Definitions & Abbreviations
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Definitions / Terminology (narrative)"
                placeholder="List key terms and their technical definition in context..."
                value={definitions}
                onChange={setDefinitions}
                rows={4}
              />

              <RichTextEditor
                label="Abbreviations used in this SOP"
                placeholder="e.g. DBS: Dried Blood Spot; qPCR: Quantitative Polymerase Chain Reaction..."
                value={abbreviations}
                onChange={setAbbreviations}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION E. Responsibility & Accountability */}
          <div id="section-E" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Responsibility & Accountability
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Roles involved in executing this SOP *"
                selectedValues={rolesInvolved}
                onChange={setRolesInvolved}
                options={[
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
                ]}
                hasOther={true}
                otherValue={rolesInvolvedOther}
                onOtherChange={setRolesInvolvedOther}
              />

              <RichTextEditor
                label="Responsibility & accountability (narrative) *"
                required={true}
                placeholder="Describe detailed roles and their exact procedural accountability..."
                value={responsibilityNarrative}
                onChange={setResponsibilityNarrative}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION F. Principle of the Method */}
          <div id="section-F" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Principle of the Method
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Principle / Methodological basis *"
                required={true}
                placeholder="Explain the scientific/methodological principles governing the assay..."
                value={principleBasis}
                onChange={setPrincipleBasis}
                rows={6}
              />
            </div>
          </div>

          {/* SECTION G. Samples / Specimens Covered */}
          <div id="section-G" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Samples / Specimens Covered
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, width: "100%" }}>
                <RectangleMultiselect
                  label="Sample matrices covered by this SOP *"
                  selectedValues={sampleMatrices}
                  onChange={setSampleMatrices}
                  options={[
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
                  ]}
                  hasOther={true}
                  otherValue={sampleMatricesOther}
                  onOtherChange={setSampleMatricesOther}
                />

                <RectangleMultiselect
                  label="Input material type(s) *"
                  selectedValues={inputMaterialTypes}
                  onChange={setInputMaterialTypes}
                  options={[
                    "DBS punch(es)",
                    "Whole blood",
                    "Plasma / serum",
                    "Single mosquito",
                    "Mosquito pool",
                    "Larvae",
                    "Cultured parasites",
                    "Other (specify)"
                  ]}
                  hasOther={true}
                  otherValue={inputMaterialTypesOther}
                  onOtherChange={setInputMaterialTypesOther}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Volume / amount required per sample *</label>
                <input type="text" required placeholder="e.g. 50 µL or 3 DBS punches" value={volumeRequired} onChange={(e) => setVolumeRequired(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <RichTextEditor
                label="Sample acceptance criteria *"
                required={true}
                placeholder="Detailed criteria for accepting incoming samples..."
                value={sampleAcceptanceCriteria}
                onChange={setSampleAcceptanceCriteria}
                rows={3}
              />

              <RichTextEditor
                label="Sample rejection criteria *"
                required={true}
                placeholder="Detailed criteria for rejecting incoming samples..."
                value={sampleRejectionCriteria}
                onChange={setSampleRejectionCriteria}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION H. Reagents & Supplies */}
          <div id="section-H" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Reagents & Supplies
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Reagents & supplies (full narrative as in SOP) *"
                required={true}
                placeholder="Describe full list of materials, concentrations, and manufacturer guidelines..."
                value={reagentsSuppliesNarrative}
                onChange={setReagentsSuppliesNarrative}
                rows={5}
              />

              <RichTextEditor
                label="Reagents & supplies (one per line) *"
                required={true}
                placeholder="Item 1 - Brand - Cat &#10;Item 2 - Brand - Cat #"
                value={reagentsSuppliesList}
                onChange={setReagentsSuppliesList}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION I. Equipment & Instruments */}
          <div id="section-I" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Equipment & Instruments
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RectangleMultiselect
                label="Primary equipment used *"
                selectedValues={primaryEquipment}
                onChange={setPrimaryEquipment}
                options={[
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
                ]}
                hasOther={true}
                otherValue={primaryEquipmentOther}
                onOtherChange={setPrimaryEquipmentOther}
              />

              <RichTextEditor
                label="Equipment & instruments (one per line) *"
                required={true}
                placeholder="Equipment Name - Model - Manufacturer"
                value={equipmentList}
                onChange={setEquipmentList}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION J. Environmental & Safety Controls */}
          <div id="section-J" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Environmental & Safety Controls
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="PPE required *"
                selectedValues={ppeRequired}
                onChange={setPpeRequired}
                options={[
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
                ]}
                hasOther={true}
                otherValue={ppeRequiredOther}
                onOtherChange={setPpeRequiredOther}
              />

              <CircleDropdown
                label="Biosafety level required *"
                value={biosafetyLevel}
                onChange={setBiosafetyLevel}
                options={["BSL-1", "BSL-2", "BSL-2+", "BSL-3"]}
              />

              <RectangleMultiselect
                label="Hazards relevant to this procedure *"
                selectedValues={hazardsRelevant}
                onChange={setHazardsRelevant}
                options={[
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
                ]}
                hasOther={true}
                otherValue={hazardsRelevantOther}
                onOtherChange={setHazardsRelevantOther}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Waste handling instructions *"
                required={true}
                placeholder="Detailed procedures for managing biological, chemical, or sharps waste..."
                value={wasteHandling}
                onChange={setWasteHandling}
                rows={3}
              />

              <RichTextEditor
                label="Additional safety / environmental controls"
                placeholder="e.g. Spill kits, specialized fume hoods..."
                value={additionalSafetyControls}
                onChange={setAdditionalSafetyControls}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION K. Quality Control */}
          <div id="section-K" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Quality Control
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="Controls included in this SOP *"
                selectedValues={controlsIncluded}
                onChange={setControlsIncluded}
                options={[
                  "Positive control",
                  "Negative control",
                  "No-template control (NTC)",
                  "Internal / extraction control",
                  "Calibrator / standard curve",
                  "Reference strain (e.g., 3D7)",
                  "Blank",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={controlsIncludedOther}
                onOtherChange={setControlsIncludedOther}
              />

              <RectangleMultiselect
                label="DNA/RNA QC methods specified *"
                selectedValues={qcMethods}
                onChange={setQcMethods}
                options={[
                  "NanoDrop (UV)",
                  "Qubit (fluorometric)",
                  "TapeStation / Bioanalyzer",
                  "Agarose gel",
                  "Not performed",
                  "Other (specify)"
                ]}
                hasOther={true}
                otherValue={qcMethodsOther}
                onOtherChange={setQcMethodsOther}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Acceptance / rejection criteria *"
                required={true}
                placeholder="Criteria for validating the assay run based on control outputs..."
                value={qcAcceptanceCriteria}
                onChange={setQcAcceptanceCriteria}
                rows={3}
              />

              <RichTextEditor
                label="Quality control narrative (verbatim from SOP)"
                placeholder="Verbatim text detailing Quality Control guidelines..."
                value={qcNarrative}
                onChange={setQcNarrative}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION L. Stepwise Procedure */}
          <div id="section-L" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Stepwise Procedure
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Full procedure narrative (verbatim from SOP) *"
                required={true}
                placeholder="Enter the exact wording of the stepwise procedure as described in the SOP document..."
                value={procedureNarrative}
                onChange={setProcedureNarrative}
                rows={8}
              />

              <RichTextEditor
                label="Stepwise procedure (one step per line) *"
                required={true}
                placeholder="Step 1: Perform task A&#10;Step 2: Perform task B"
                value={procedureStepsList}
                onChange={setProcedureStepsList}
                rows={6}
              />
            </div>
          </div>

          {/* SECTION M. Calculation / Data Analysis */}
          <div id="section-M" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Calculation / Data Analysis
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Calculations / formulas used"
                placeholder="List any math formulas or biological conversion factors needed..."
                value={calculationsFormulas}
                onChange={setCalculationsFormulas}
                rows={3}
              />

              <RichTextEditor
                label="Software / analysis tools used"
                placeholder="e.g. Bio-Rad CFX Manager, Microsoft Excel, R Studio..."
                value={softwareTools}
                onChange={setSoftwareTools}
                rows={3}
              />

              <RichTextEditor
                label="Interpretation rules / thresholds"
                placeholder="e.g. Cycle threshold (Ct) value < 37 is positive..."
                value={interpretationRules}
                onChange={setInterpretationRules}
                rows={3}
              />
            </div>
          </div>

          {/* SECTION N. Result Reporting & Interpretation */}
          <div id="section-N" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Result Reporting & Interpretation
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="Reporting format (units, layout)"
                placeholder="e.g. parasites/µL, positive/negative..."
                value={reportingFormat}
                onChange={setReportingFormat}
                rows={3}
              />

              <RichTextEditor
                label="Cut-offs / thresholds"
                placeholder="Indicate boundaries for diagnostic reporting..."
                value={cutOffsThresholds}
                onChange={setCutOffsThresholds}
                rows={3}
              />

              <RichTextEditor
                label="LIMS / database field mapping"
                placeholder="Map variables to fields in database schema..."
                value={limsDatabaseMapping}
                onChange={setLimsDatabaseMapping}
                rows={3}
              />

              <RichTextEditor
                label="Result reporting narrative"
                placeholder="Full workflow narrative for reporting..."
                value={resultReportingNarrative}
                onChange={setResultReportingNarrative}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION P. Storage & Transport Requirements */}
          <div id="section-P" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Storage & Transport Requirements
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <RectangleMultiselect
                label="Sample types this SOP stores / transports *"
                selectedValues={storageSampleTypes}
                onChange={setStorageSampleTypes}
                options={[
                  "DBS",
                  "Whole blood",
                  "Plasma",
                  "Serum",
                  "Cell pellet",
                  "Whole blood in RNA-protect",
                  "Preserved mosquitoes",
                  "Purified DNA / RNA"
                ]}
              />

              <CircleDropdown
                label="Recommended storage temperature *"
                value={recommendedTemp}
                onChange={setRecommendedTemp}
                options={["Room temperature", "+4 °C", "−20 °C", "−80 °C", "Liquid nitrogen", "Dry ice (transport)"]}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Maximum storage duration *</label>
                <input type="text" required placeholder="e.g. 6 months at -20°C, Indefinitely at -80°C" value={maxStorageDuration} onChange={(e) => setMaxStorageDuration(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none" }} />
              </div>

              <RectangleMultiselect
                label="Acceptable transport modes *"
                selectedValues={transportModes}
                onChange={setTransportModes}
                options={[
                  "Cold box with ice packs",
                  "Dry ice",
                  "LN2 dry shipper",
                  "Ambient with desiccant (DBS)",
                  "Commercial courier (categorized)",
                  "Hand-carried"
                ]}
              />

              <RichTextEditor
                label="Storage & transport narrative"
                placeholder="Verbatim guidelines for storage container preparation and shipping validation..."
                value={storageTransportNarrative}
                onChange={setStorageTransportNarrative}
                rows={4}
              />
            </div>
          </div>

          {/* SECTION Q. References & Attachments */}
          <div id="section-Q" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              References & Attachments
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <RichTextEditor
                label="References (citations, manufacturer manuals)"
                placeholder="Provide academic citations, guidelines or user guides referred to..."
                value={referencesText}
                onChange={setReferencesText}
                rows={4}
              />

              {/* Three file input fields in one row, 1/3 space each */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach the original SOP document (PDF or DOCX) *</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => setOriginalSopFile(e.target.files ? e.target.files[0] : null)}
                    style={{
                      padding: "8px 12px",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      cursor: "pointer",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                  {originalSopFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {originalSopFile.name}</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach supplementary file (optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setSupplementaryFile(e.target.files ? e.target.files[0] : null)}
                    style={{
                      padding: "8px 12px",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      cursor: "pointer",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                  {supplementaryFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {supplementaryFile.name}</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Attach workflow diagram (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setWorkflowFile(e.target.files ? e.target.files[0] : null)}
                    style={{
                      padding: "8px 12px",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      fontSize: "var(--fs-sm)",
                      cursor: "pointer",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                  {workflowFile && <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-primary)" }}>Selected: {workflowFile.name}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION R. Document Control & Sign-off */}
          <div id="section-R" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, borderBottom: "1px solid var(--color-divider)", paddingBottom: 10, marginBottom: 20, color: "var(--color-text)" }}>
              Document Control & Sign-off
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Row 1 & Row 2: 10 fields, 5 columns of 1/5 width each */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>
                {/* Prepared by (name) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared by (name) *</label>
                  <input type="text" required value={preparedByName} onChange={(e) => setPreparedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Prepared by (role) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared by (role) *</label>
                  <input type="text" required value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Prepared date */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Prepared date *</label>
                  <input type="date" required value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Reviewed by (name) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed by (name) *</label>
                  <input type="text" required value={reviewedByName} onChange={(e) => setReviewedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Reviewed by (role) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed by (role) *</label>
                  <input type="text" required value={reviewedByRole} onChange={(e) => setReviewedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>

                {/* Row 2 starts here in the same grid flow */}
                {/* Reviewed date */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Reviewed date *</label>
                  <input type="date" required value={reviewedDate} onChange={(e) => setReviewedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Approved by (name) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved by (name) *</label>
                  <input type="text" required value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Approved by (role) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved by (role) *</label>
                  <input type="text" required value={approvedByRole} onChange={(e) => setApprovedByRole(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Approved date */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Approved date *</label>
                  <input type="date" required value={approvedDate} onChange={(e) => setApprovedDate(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
                {/* Controlled copy number */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Controlled copy number *</label>
                  <input type="text" required placeholder="e.g. Copy 01" value={controlledCopyNumber} onChange={(e) => setControlledCopyNumber(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Row 3: Remaining field Distribution list * (1/5 space, so inside a 5-column grid spanning 1 column) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>
                <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--color-text-muted)" }}>Distribution list *</label>
                  <input type="text" required placeholder="Who should receive copies of this SOP" value={distributionList} onChange={(e) => setDistributionList(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: "var(--fs-sm)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              <RichTextEditor
                label="Final comments / notes"
                placeholder="Any final comments or notes on document sign-off..."
                value={finalComments}
                onChange={setFinalComments}
                rows={3}
              />
            </div>
          </div>
        </form>

        {/* FLOATING ACTION BOTTOM BAR */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            padding: "16px 40px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            boxShadow: "0 -4px 10px rgba(0,0,0,0.05)",
            zIndex: 99,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/domains/qms")}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              padding: "10px 20px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={(e) => {
              if (formRef.current) {
                if (formRef.current.reportValidity()) {
                  formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
              }
            }}
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Submit SOP
          </button>
        </div>

      </div>
    </div>
  );
}
