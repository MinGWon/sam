import React from "react";

const colors = {
  gray50: "#fafbfc",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
};

export function TableSkeleton() {
  return (
    <div style={{ 
      display: "flex", 
      gap: "20px", 
      height: "100%",
      animation: "fadeIn 0.3s ease-in-out",
    }}>
      {/* 왼쪽 패널 스켈레톤 */}
      <div style={{ 
        width: "350px", 
        background: "#fff", 
        borderRadius: "12px",
        padding: "20px",
      }}>
        {/* 검색바 스켈레톤 */}
        <div style={{
          height: "40px",
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: "8px",
          marginBottom: "16px",
        }} />
        
        {/* 리스트 아이템 스켈레톤 */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} style={{
            height: "48px",
            background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
            backgroundSize: "200% 100%",
            animation: `shimmer 1.5s infinite`,
            animationDelay: `${i * 0.1}s`,
            borderRadius: "8px",
            marginBottom: "8px",
          }} />
        ))}
      </div>

      {/* 오른쪽 패널 스켈레톤 */}
      <div style={{ 
        flex: 1, 
        background: "#fff", 
        borderRadius: "12px",
        padding: "20px",
      }}>
        {/* 헤더 스켈레톤 */}
        <div style={{
          height: "32px",
          width: "200px",
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: "8px",
          marginBottom: "20px",
        }} />
        
        {/* 테이블 헤더 스켈레톤 */}
        <div style={{
          height: "44px",
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: "8px",
          marginBottom: "8px",
        }} />
        
        {/* 테이블 행 스켈레톤 */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} style={{
            height: "56px",
            background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            animationDelay: `${i * 0.05}s`,
            borderRadius: "8px",
            marginBottom: "4px",
          }} />
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "16px",
      animation: "fadeIn 0.3s ease-in-out",
    }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          padding: "24px",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #eaecef",
        }}>
          <div style={{
            height: "16px",
            width: "80px",
            background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            animationDelay: `${i * 0.1}s`,
            borderRadius: "4px",
            marginBottom: "12px",
          }} />
          <div style={{
            height: "32px",
            width: "150px",
            background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray50} 50%, ${colors.gray100} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            animationDelay: `${i * 0.1 + 0.2}s`,
            borderRadius: "6px",
          }} />
        </div>
      ))}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function SpinnerLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      minHeight: "400px",
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        border: "4px solid #f3f5f7",
        borderTop: "4px solid #3182f6",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
