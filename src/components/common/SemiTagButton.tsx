import React from "react";

const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  success: "#30b06e",
  successLight: "#dcfce7",
  warning: "#fbbf24",
  warningLight: "#fef3c7",
  danger: "#f04452",
  dangerLight: "#fee2e2",
  gray: "#6b6e72",
  grayLight: "#f3f5f7",
};

export type SemiTagButtonVariant = "primary" | "success" | "warning" | "danger" | "gray";
export type SemiTagButtonSize = "sm" | "md";

export interface SemiTagButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: SemiTagButtonVariant;
  size?: SemiTagButtonSize;
  icon?: string;
  children?: React.ReactNode;
}

export default function SemiTagButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  disabled,
  style,
  ...props
}: SemiTagButtonProps) {
  const colorMap = {
    primary: { bg: colors.primaryLight, text: colors.primary },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    danger: { bg: colors.dangerLight, text: colors.danger },
    gray: { bg: colors.grayLight, text: colors.gray },
  };

  const sizeStyles = {
    sm: { padding: "6px 8px", fontSize: "12px", gap: "4px" },
    md: { padding: "8px 10px", fontSize: "13px", gap: "6px" },
  };

  const { bg, text } = colorMap[variant];

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: disabled ? colors.grayLight : bg,
        color: disabled ? "#999" : text,
        border: "none",
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        fontSize: sizeStyles[size].fontSize,
        padding: sizeStyles[size].padding,
        gap: sizeStyles[size].gap,
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.1)`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {icon && <i className={icon} style={{ fontSize: size === "sm" ? "10px" : "12px" }} />}
      {children}
    </button>
  );
}
