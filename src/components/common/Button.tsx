import React from "react";

const colors = {
  primary: "#3182f6",
  primaryDark: "#1b64da",
  white: "#ffffff",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray700: "#45474a",
  red: "#f04452",
  redDark: "#d93344",
  green: "#30b06e",
  greenDark: "#28a05e",
};

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: string;
  required?: boolean;
  autoLoading?: boolean; // 자동 로딩 활성화
  loadingDuration?: number; // 로딩 지속 시간 (ms)
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  icon,
  required = false,
  autoLoading = false,
  loadingDuration = 1000,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);
  const [isAutoLoading, setIsAutoLoading] = React.useState(false);

  const isLoading = loading || isAutoLoading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (autoLoading && !isLoading) {
      setIsAutoLoading(true);
      
      // 로딩 종료
      setTimeout(() => {
        setIsAutoLoading(false);
      }, loadingDuration);
    }

    onClick?.(e);
  };

  const sizeStyles = {
    sm: { padding: "6px 12px", fontSize: "12px", height: "32px" },
    md: { padding: "10px 16px", fontSize: "14px", height: "40px" },
    lg: { padding: "12px 20px", fontSize: "16px", height: "48px" },
  };

  const variantStyles = {
    primary: {
      background: isHovered ? colors.primaryDark : colors.primary,
      color: colors.white,
      border: "none",
    },
    secondary: {
      background: isHovered ? colors.gray200 : colors.gray100,
      color: colors.gray700,
      border: "none",
    },
    danger: {
      background: isHovered ? colors.redDark : colors.red,
      color: colors.white,
      border: "none",
    },
    success: {
      background: isHovered ? colors.greenDark : colors.green,
      color: colors.white,
      border: "none",
    },
    ghost: {
      background: isHovered ? colors.gray100 : "transparent",
      color: colors.gray700,
      border: `1px solid ${colors.gray200}`,
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        borderRadius: "8px",
        fontWeight: "600",
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: "all 0.2s ease",
        width: fullWidth ? "100%" : "auto",
        overflow: "hidden",
        boxShadow:
          isHovered && !disabled && !isLoading
            ? `0 0 0 3px ${
                variant === "primary"
                  ? colors.primary + "20"
                  : variant === "danger"
                  ? colors.red + "20"
                  : variant === "success"
                  ? colors.green + "20"
                  : colors.gray200
              }`
            : "none",
        transform:
          isActive && !disabled && !isLoading
            ? "scale(0.97)"
            : isHovered && !disabled && !isLoading
            ? "translateY(-1px)"
            : "translateY(0)",
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {/* 필수 표시 - 좌상단 삼각형 */}
      {required && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            borderTop: `14px solid ${colors.red}`,
            borderRight: "14px solid transparent",
            borderTopLeftRadius: "8px",
          }}
        />
      )}

      {/* 클릭 중 표시 */}
      {isActive && !disabled && !isLoading && (
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* 로딩 스피너 */}
      {isLoading && (
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ 
            fontSize: size === "sm" ? "10px" : size === "md" ? "12px" : "14px",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}

      {/* 아이콘 */}
      {!isLoading && icon && (
        <i
          className={icon}
          style={{ fontSize: size === "sm" ? "10px" : size === "md" ? "12px" : "14px" }}
        />
      )}

      {/* 텍스트 */}
      <span style={{ opacity: isLoading ? 0.7 : 1 }}>
        {children}
      </span>

      {/* 스피너 애니메이션 */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
