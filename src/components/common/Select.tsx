import React from "react";

const colors = {
  primary: "#3182f6",
  white: "#ffffff",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray500: "#8b8f94",
  gray700: "#45474a",
  red: "#f04452",
};

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'required'> {
  size?: SelectSize;
  fullWidth?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
  options: SelectOption[];
}

export default function Select({
  size = "md",
  fullWidth = false,
  error,
  helperText,
  label,
  required: requiredProp = false,
  options,
  disabled,
  style,
  ...props
}: SelectProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const sizeStyles = {
    sm: { padding: "6px 32px 6px 12px", fontSize: "12px", height: "32px" },
    md: { padding: "10px 40px 10px 14px", fontSize: "14px", height: "40px" },
    lg: { padding: "12px 48px 12px 16px", fontSize: "16px", height: "48px" },
  };

  const borderColor = error
    ? colors.red
    : isFocused || isHovered
    ? colors.primary
    : colors.gray200;

  const boxShadow = (isFocused || isHovered) && !error
    ? `0 0 0 3px ${colors.primary}20`
    : error
    ? `0 0 0 3px ${colors.red}20`
    : "none";

  return (
    <div
      style={{
        position: "relative",
        width: fullWidth ? "100%" : "auto",
        display: "inline-block",
      }}
    >
      {/* 라벨 */}
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "13px",
            fontWeight: "600",
            color: colors.gray700,
          }}
        >
          {label}
          {requiredProp && <span style={{ color: colors.red, marginLeft: "4px" }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative", width: "100%" }}>
        {/* 필수 표시 - 좌상단 삼각형 */}
        {requiredProp && (
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
              zIndex: 1,
            }}
          />
        )}

        {/* Select */}
        <select
          {...props}
          disabled={disabled}
          required={requiredProp}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onMouseEnter={() => !disabled && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: "100%",
            border: `1px solid ${borderColor}`,
            borderRadius: "8px",
            outline: "none",
            transition: "all 0.2s ease",
            backgroundColor: disabled ? colors.gray100 : colors.white,
            cursor: disabled ? "not-allowed" : "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${isFocused || isHovered ? "%233182f6" : "%238b8f94"}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: `right ${size === "sm" ? "8px" : size === "md" ? "12px" : "16px"} center`,
            overflow: "hidden",
            boxShadow,
            transform: isFocused || isHovered ? "translateY(-1px)" : "translateY(0)",
            ...sizeStyles[size],
            ...style,
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 에러 메시지 또는 도움말 */}
      {(error || helperText) && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "12px",
            color: error ? colors.red : colors.gray500,
          }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
