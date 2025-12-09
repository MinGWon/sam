import React from "react";

const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  white: "#ffffff",
  gray50: "#fafbfc",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray400: "#b5b9be",
  gray500: "#8b8f94",
  gray600: "#6b6e72",
  gray700: "#45474a",
  gray800: "#2d2f31",
  gray900: "#1a1b1d",
  red: "#f04452",
};

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  stickyLeft?: string;
  render?: (value: any, row: any) => React.ReactNode;
  headerStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties | ((row: any) => React.CSSProperties);
}

export interface CompactTableProps {
  columns: TableColumn[];
  data: any[];
  keyExtractor: (row: any, index: number) => string;
  emptyMessage?: string;
  emptyIcon?: string;
  height?: string;
  rowHeight?: string;
  onRowClick?: (row: any) => void;
  selectedRowKey?: string;
  hoverable?: boolean;
}

export default function CompactTable({
  columns,
  data,
  keyExtractor,
  emptyMessage = "데이터가 없습니다.",
  emptyIcon = "fa-solid fa-inbox",
  height = "auto",
  rowHeight = "24px",
  onRowClick,
  selectedRowKey,
  hoverable = true,
}: CompactTableProps) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  const getRowBackground = (row: any, rowKey: string) => {
    if (selectedRowKey && keyExtractor(row, 0) === selectedRowKey) {
      return colors.primaryLight;
    }
    if (hoverable && hoveredRow === rowKey) {
      return colors.gray50;
    }
    return colors.white;
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "auto",
        position: "relative",
        height,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr
            style={{
              position: "sticky",
              top: 0,
              background: colors.gray50,
              zIndex: 10,
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  padding: "8px 6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: colors.gray600,
                  borderBottom: `2px solid ${colors.gray300}`,
                  borderRight:
                    idx < columns.length - 1
                      ? `1px solid ${colors.gray200}`
                      : "none",
                  textAlign: col.align || "center",
                  position: col.sticky ? "sticky" : "relative",
                  left: col.sticky ? col.stickyLeft || 0 : "auto",
                  background: colors.gray50,
                  zIndex: col.sticky ? 11 : 10,
                  ...col.headerStyle,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIdx) => {
              const rowKey = keyExtractor(row, rowIdx);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => hoverable && setHoveredRow(rowKey)}
                  onMouseLeave={() => hoverable && setHoveredRow(null)}
                  style={{
                    cursor: onRowClick ? "pointer" : "default",
                    background: getRowBackground(row, rowKey),
                    transition: "all 0.15s",
                  }}
                >
                  {columns.map((col, colIdx) => {
                    const cellStyle =
                      typeof col.cellStyle === "function"
                        ? col.cellStyle(row)
                        : col.cellStyle;

                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: "6px 4px",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: colors.gray700,
                          borderRight:
                            colIdx < columns.length - 1
                              ? `1px solid ${colors.gray200}`
                              : "none",
                          borderBottom: `1px solid ${colors.gray100}`,
                          textAlign: col.align || "center",
                          height: rowHeight,
                          position: col.sticky ? "sticky" : "relative",
                          left: col.sticky ? col.stickyLeft || 0 : "auto",
                          background: col.sticky
                            ? colors.gray50
                            : getRowBackground(row, rowKey),
                          zIndex: col.sticky ? 1 : 0,
                          ...cellStyle,
                        }}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] || "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: colors.gray500,
                }}
              >
                <i
                  className={emptyIcon}
                  style={{
                    fontSize: "48px",
                    marginBottom: "16px",
                    opacity: 0.3,
                    display: "block",
                  }}
                />
                <p style={{ margin: 0, fontSize: "14px" }}>{emptyMessage}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
