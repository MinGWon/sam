import Head from "next/head";
import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import { useEffect, useState } from "react";
import CertificateLoginModal from "@/components/CertificateLoginModal";

const TYPING_TEXTS = ["SAMSQUARE", "쌤광장"];
const TYPING_SPEED = 150;
const DELETING_SPEED = 100;
const PAUSE_DURATION = 2000;

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);

  // 타이핑 효과 상태
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // 이미 로그인된 경우 대시보드로 이동
          router.push("/app/dashboard");
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // 타이핑 효과
  useEffect(() => {
    const currentText = TYPING_TEXTS[textIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // 타이핑 중
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          // 타이핑 완료, 잠시 대기 후 삭제 시작
          setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
        }
      } else {
        // 삭제 중
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          // 삭제 완료, 다음 텍스트로
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % TYPING_TEXTS.length);
        }
      }
    }, isDeleting ? DELETING_SPEED : TYPING_SPEED);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex]);

  const handleCertLoginSuccess = async (data: { accessToken: string; user: any }) => {
    console.log("Certificate login success:", data);
    setUser({
      sub: data.user.id || data.user.sub,
      name: data.user.name,
      email: data.user.email,
    });
    // 대시보드로 이동
    router.push("/app/dashboard");
  };

  if (loading) {
    return <div className={styles.page}>로딩 중...</div>;
  }

  return (
    <>
      <Head>
        <title>SAMSQUARE - 학교 종합 정보 시스템</title>
        <meta name="description" content="학교 종합 정보 시스템" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.page}>
        <main className={styles.main}>
          <h1 style={{ 
            minHeight: "1.5em",
            lineHeight: "1.5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem"
          }}>
            <span style={{ display: "inline-block", minWidth: "1px" }}>
              {displayText}
            </span>
            <span style={{ 
              borderRight: "3px solid #333",
              height: "1em",
              marginLeft: "2px",
              animation: "blink 1s infinite",
              display: "inline-block"
            }} />
          </h1>

          {user ? (
            <div className={styles.intro}>
              <p>환영합니다, {user.name || user.email || user.sub}님!</p>
              <button 
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                className={styles.secondary}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "2rem",
              gap: "12px",
            }}>
              {/* 인증서 로그인 버튼 */}
              <button 
                onClick={() => setShowCertModal(true)}
                style={{
                  padding: "14px 32px",
                  fontSize: "16px",
                  fontWeight: "600",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #0070f3 0%, #0051a8 100%)",
                  color: "#fff",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                인증서 로그인
              </button>
              
              {/* 도움말 링크 */}
              <div style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
              }}>
                <a
                  href="https://pki.2check.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "6px 16px",
                    fontSize: "12px",
                    fontWeight: "500",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: "#fafafa",
                    color: "#9ca3af",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fafafa";
                    e.currentTarget.style.color = "#9ca3af";
                  }}
                >
                  인증센터
                </a>
                <a
                  href="https://pki.2check.io/download/agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "6px 16px",
                    fontSize: "12px",
                    fontWeight: "500",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: "#fafafa",
                    color: "#9ca3af",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fafafa";
                    e.currentTarget.style.color = "#9ca3af";
                  }}
                >
                  Agent 다운로드
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 인증서 로그인 모달 */}
      {showCertModal && (
        <CertificateLoginModal
          onClose={() => setShowCertModal(false)}
          onSuccess={handleCertLoginSuccess}
        />
      )}

      <style jsx>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
