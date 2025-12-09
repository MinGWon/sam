import React from "react";

const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  white: "#ffffff",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray500: "#8b8f94",
  gray600: "#6b6e72",
  gray700: "#45474a",
  red: "#f04452",
  redLight: "#fee2e2",
  green: "#30b06e",
  greenLight: "#dcfce7",
  yellow: "#d97706",
  yellowLight: "#fef3c7",
};

export type SemiTagVariant = "primary" | "success" | "warning" | "danger" | "gray";
export type SemiTagSize = "sm" | "md";

export interface SemiTagButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SemiTagVariant;
  size?: SemiTagSize;
  icon?: string;
  children: React.ReactNode;
}

export default function SemiTagButton({
  variant = "primary",
  size = "md",
  icon,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: SemiTagButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const sizeStyles = {
    sm: { padding: "4px 8px", fontSize: "11px" },
    md: { padding: "6px 10px", fontSize: "12px" },
  };

  const variantStyles = {
    primary: {
      background: colors.primaryLight,
      color: colors.primary,
    },
    success: {
      background: colors.greenLight,
      color: colors.green,
    },
    warning: {
      background: colors.yellowLight,
      color: colors.yellow,
    },
    danger: {
      background: colors.redLight,
      color: colors.red,
    },
    gray: {
      background: colors.gray100,
      color: colors.gray600,
    },
  };

  const borderColor = isHovered || isFocused ? colors.primary : "transparent";
  const boxShadow = isHovered || isFocused 
    ? `0 0 0 3px ${colors.primary}20` 
    : "none";

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease",
        boxShadow,
        transform: isHovered || isFocused ? "translateY(-1px)" : "translateY(0)",
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon && <i className={icon} />}
      {children}
    </button>
  );
}
