import Head from "next/head";
import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { generatePKCE, generateState } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "YOUR_CLIENT_ID";
const REDIRECT_URI = "https://samsquare.2check.io/api/auth/callback";
const PKI_ORIGIN = "https://pki.2check.io";

const TYPING_TEXTS = ["SAMSQUARE", "쌤광장"];
const TYPING_SPEED = 150;
const DELETING_SPEED = 100;
const PAUSE_DURATION = 2000;

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
}

interface CertInfo {
  userId: string;
  certId: string;
  certName: string;
}

type ModalType = "login" | "registerForm" | "registerCert" | "changeCert" | "changeCertSelect" | "error" | "success" | null;

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>("오류");
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null);
  const [certRegistered, setCertRegistered] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // 타이핑 효과 상태
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 회원가입 폼 상태
  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
  });

  // 인증서 변경 폼 상태
  const [changeCertForm, setChangeCertForm] = useState({
    name: "",
    phone: "",
  });
  const [changeCertInfo, setChangeCertInfo] = useState<CertInfo | null>(null);

  // 드래그 관련 상태
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

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

  // 모달 열릴 때 중앙 위치 설정
  useEffect(() => {
    if (modalType) {
      const modalWidth = modalType === "registerForm" ? 400 : 450; // 여기도 맞춰서 수정
      const modalHeight = modalType === "registerForm" ? 300 : 540;
      const centerX = (window.innerWidth - modalWidth) / 2;
      const centerY = (window.innerHeight - modalHeight) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [modalType]);

  // 드래그 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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

  // OAuth 메시지 처리
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.origin !== PKI_ORIGIN) return;

      console.log("Received message from PKI:", e.data);

      const messageType = e.data.type || e.data.messageType;
      const payload = e.data.payload || e.data;

      if (messageType === "PKI_AUTH_RESPONSE") {
        // 로그인 모드
        if (modalType === "login") {
          const code = payload.code || e.data.code;
          const state = payload.state || e.data.state;

          if (!code) {
            console.log("No code in message:", e.data);
            return;
          }

          // iframe 먼저 닫기
          setModalType(null);

          const savedState = sessionStorage.getItem("oauth_state");
          if (state && state !== savedState) {
            setErrorTitle("인증 오류");
            setError("인증 상태가 일치하지 않습니다.");
            setModalType("error");
            return;
          }

          const codeVerifier = sessionStorage.getItem("oauth_code_verifier");

          try {
            const res = await fetch("/api/auth/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, codeVerifier }),
            });

            const data = await res.json();

            if (res.ok) {
              sessionStorage.removeItem("oauth_state");
              sessionStorage.removeItem("oauth_code_verifier");
              setUser({
                sub: data.user.id,
                name: data.user.name,
              });
              // 로그인 성공 시 대시보드로 이동
              router.push("/app/dashboard");
            } else {
              console.error("Login failed:", data);
              // 에러 코드에 따른 타이틀 설정
              if (data.code === "NOT_REGISTERED") {
                setErrorTitle("미등록 사용자");
              } else if (data.code === "CERT_MISMATCH") {
                setErrorTitle("인증서 불일치");
              } else if (data.code === "NAME_MISMATCH") {
                setErrorTitle("정보 불일치");
              } else {
                setErrorTitle("로그인 실패");
              }
              setError(data.error || "로그인에 실패했습니다.");
              setModalType("error");
            }
          } catch (err) {
            console.error("Token exchange error:", err);
            setErrorTitle("오류");
            setError("인증 처리 중 오류가 발생했습니다.");
            setModalType("error");
          }
          return;
        }

        // 회원가입 모드: 토큰 교환 후 userinfo 조회
        if (modalType === "registerCert") {
          const code = payload.code || e.data.code;
          const state = payload.state || e.data.state;

          if (!code) {
            console.log("No code in message:", e.data);
            return;
          }

          // iframe 먼저 닫기
          setModalType(null);

          const savedState = sessionStorage.getItem("oauth_state");
          if (state && state !== savedState) {
            setError("인증 상태가 일치하지 않습니다.");
            setModalType("registerForm");
            return;
          }

          const codeVerifier = sessionStorage.getItem("oauth_code_verifier");

          try {
            const res = await fetch("/api/auth/register-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                code, 
                codeVerifier,
                expectedName: registerForm.name.trim(),
                phone: registerForm.phone,
              }),
            });

            const data = await res.json();

            if (res.ok) {
              sessionStorage.removeItem("oauth_state");
              sessionStorage.removeItem("oauth_code_verifier");
              
              setCertInfo({
                userId: data.userId,
                certId: data.certId,
                certName: data.certName,
              });
              setCertRegistered(true);
              setError(null);
              setModalType("registerForm");
            } else {
              setError(data.error || "인증서 검증에 실패했습니다.");
              setModalType("registerForm");
            }
          } catch (err) {
            console.error("Cert verify error:", err);
            setError("인증서 검증 중 오류가 발생했습니다.");
            setModalType("registerForm");
          }
          return;
        }

        // 인증서 변경 모드
        if (modalType === "changeCertSelect") {
          const code = payload.code || e.data.code;
          const state = payload.state || e.data.state;

          if (!code) {
            console.log("No code in message:", e.data);
            return;
          }

          // iframe 먼저 닫기
          setModalType(null);

          const savedState = sessionStorage.getItem("oauth_state");
          if (state && state !== savedState) {
            setError("인증 상태가 일치하지 않습니다.");
            setModalType("changeCert");
            return;
          }

          const codeVerifier = sessionStorage.getItem("oauth_code_verifier");

          try {
            const res = await fetch("/api/auth/change-cert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                code, 
                codeVerifier,
                expectedName: changeCertForm.name.trim(),
                phone: changeCertForm.phone,
              }),
            });

            const data = await res.json();

            if (res.ok) {
              sessionStorage.removeItem("oauth_state");
              sessionStorage.removeItem("oauth_code_verifier");
              
              setSuccessMessage("인증서가 성공적으로 변경되었습니다.");
              setModalType("success");
              setChangeCertForm({ name: "", phone: "" });
              setChangeCertInfo(null);
            } else {
              setError(data.error || "인증서 변경에 실패했습니다.");
              setModalType("changeCert");
            }
          } catch (err) {
            console.error("Cert change error:", err);
            setError("인증서 변경 중 오류가 발생했습니다.");
            setModalType("changeCert");
          }
          return;
        }
      }

      if (
        messageType === "PKI_AUTH_ERROR" ||
        messageType === "AUTH_ERROR" ||
        messageType === "AUTH_CANCEL" ||
        messageType === "PKI_AUTH_CANCEL"
      ) {
        // iframe 닫고 에러 모달 표시
        if (modalType === "login") {
          setModalType(null);
          setErrorTitle("인증 실패");
          setError(payload.message || "인증에 실패했습니다.");
          setModalType("error");
        } else if (modalType === "registerCert") {
          setError(payload.message || "인증에 실패했습니다.");
          setModalType("registerForm");
        } else if (modalType === "changeCertSelect") {
          setError(payload.message || "인증에 실패했습니다.");
          setModalType("changeCert");
        }
        return;
      }

      if (messageType === "CLOSE" || messageType === "PKI_CLOSE") {
        setModalType(null);
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [modalType, registerForm.name, registerForm.phone, changeCertForm.name, changeCertForm.phone]);

  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleIframeLoad = () => {
    console.log("Iframe loaded");
  };

  const openLoginModal = async () => {
    setError(null);

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_type: "code",
    });

    setIframeSrc(`${PKI_ORIGIN}/auth/iframe?${params.toString()}`);
    setModalType("login");
  };

  const openRegisterFormModal = () => {
    setError(null);
    setRegisterForm({ name: "", phone: "" });
    setCertInfo(null);
    setCertRegistered(false);
    setModalType("registerForm");
  };

  const openChangeCertModal = () => {
    setError(null);
    setChangeCertForm({ name: "", phone: "" });
    setChangeCertInfo(null);
    setModalType("changeCert");
  };

  const handleCertRegister = async () => {
    setError(null);

    if (!registerForm.name.trim()) {
      setError("이름을 먼저 입력해주세요.");
      return;
    }

    if (!registerForm.phone.trim()) {
      setError("전화번호를 먼저 입력해주세요.");
      return;
    }

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_type: "code",
    });

    setIframeSrc(`${PKI_ORIGIN}/auth/iframe?${params.toString()}`);
    setModalType("registerCert");
  };

  const handleChangeCertSelect = async () => {
    setError(null);

    if (!changeCertForm.name.trim()) {
      setError("이름을 먼저 입력해주세요.");
      return;
    }

    if (!changeCertForm.phone.trim()) {
      setError("전화번호를 먼저 입력해주세요.");
      return;
    }

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_type: "code",
    });

    setIframeSrc(`${PKI_ORIGIN}/auth/iframe?${params.toString()}`);
    setModalType("changeCertSelect");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registerForm.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!registerForm.phone.trim()) {
      setError("전화번호를 입력해주세요.");
      return;
    }

    if (!certInfo || !certRegistered) {
      setError("인증서를 등록해주세요.");
      return;
    }

    // 회원가입 API 호출
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: certInfo.userId,
          certId: certInfo.certId,
          name: registerForm.name.trim(),
          certName: certInfo.certName,
          phone: registerForm.phone,
        }),
      });

      if (res.ok) {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
        setModalType(null);
        setCertInfo(null);
        setCertRegistered(false);
        setRegisterForm({ name: "", phone: "" });
      } else {
        const data = await res.json();
        setError(data.error || "회원가입에 실패했습니다.");
      }
    } catch (err) {
      setError("회원가입 처리 중 오류가 발생했습니다.");
    }
  };

  const closeModal = () => {
    setModalType(null);
    setError(null);
    setErrorTitle("오류");
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
              <button className={styles.secondary}>
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
              {/* 로그인/회원가입/인증서 변경 버튼 */}
              <div style={{ 
                display: "flex", 
                gap: "16px", 
              }}>
                <button 
                  onClick={openLoginModal} 
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
                  로그인
                </button>
                <button 
                  onClick={openRegisterFormModal} 
                  style={{
                    padding: "14px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                    border: "2px solid #0070f3",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "transparent",
                    color: "#0070f3",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0070f3";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#0070f3";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  회원가입
                </button>
                <button 
                  onClick={openChangeCertModal} 
                  style={{
                    padding: "14px 32px",
                    fontSize: "16px",
                    fontWeight: "600",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "transparent",
                    color: "#6b7280",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#6b7280";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#6b7280";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  인증서 변경
                </button>
              </div>
              
              {/* 인증센터 & 인증서 프로그램 다운로드 버튼 */}
              <div style={{
                display: "flex",
                gap: "8px",
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
                  href="https://pki.2check.io/download"
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
                  인증서 프로그램 다운로드
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 로그인 모달 */}
      {modalType === "login" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 450, // 여기서 너비 조절 (기존 430)
              userSelect: isDragging ? "none" : "auto",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                background: "#f5f5f5",
                borderRadius: "8px 8px 0 0",
                border: "1px solid #ccc",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onMouseDown={handleTitleBarMouseDown}
                style={{ flex: 1, cursor: "move", paddingRight: "10px" }}
              >
                <span style={{ fontWeight: "bold" }}>인증서 선택창</span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "0 5px",
                }}
              >
                ✕
              </button>
            </div>
            {error && (
              <div style={{ padding: "10px", background: "#fee", color: "red", fontSize: "14px" }}>
                {error}
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={iframeSrc || ""}
              style={{
                width: "100%",
                height: 510,
                border: "1px solid #ccc",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                background: "#fff",
                pointerEvents: isDragging ? "none" : "auto",
              }}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>
      )}

      {/* 회원가입 폼 모달 */}
      {modalType === "registerForm" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 400,
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              userSelect: isDragging ? "none" : "auto",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                background: "#f5f5f5",
                borderRadius: "8px 8px 0 0",
                borderBottom: "1px solid #ccc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onMouseDown={handleTitleBarMouseDown}
                style={{ flex: 1, cursor: "move", paddingRight: "10px" }}
              >
                <span style={{ fontWeight: "bold" }}>회원가입</span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "0 5px",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ padding: "20px" }}>
              {error && (
                <div style={{ marginBottom: "15px", padding: "10px", background: "#fee", color: "red", fontSize: "14px", borderRadius: "4px" }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  이름 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => {
                    setRegisterForm({ ...registerForm, name: e.target.value });
                    // 이름 변경 시 인증서 등록 초기화
                    if (certRegistered) {
                      setCertRegistered(false);
                      setCertInfo(null);
                    }
                  }}
                  placeholder="인증서에 등록된 이름과 동일하게 입력"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  전화번호 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  인증서 등록 <span style={{ color: "red" }}>*</span>
                </label>
                {certRegistered ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px",
                      border: "1px solid #22c55e",
                      borderRadius: "4px",
                      background: "#f0fdf4",
                      color: "#16a34a",
                      fontSize: "14px",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    인증서 등록 완료
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCertRegister}
                    disabled={!registerForm.name.trim() || !registerForm.phone.trim()}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px dashed #ccc",
                      borderRadius: "4px",
                      background: (!registerForm.name.trim() || !registerForm.phone.trim()) ? "#f0f0f0" : "#fafafa",
                      color: (!registerForm.name.trim() || !registerForm.phone.trim()) ? "#aaa" : "#666",
                      fontSize: "14px",
                      cursor: (!registerForm.name.trim() || !registerForm.phone.trim()) ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (registerForm.name.trim() && registerForm.phone.trim()) {
                        e.currentTarget.style.borderColor = "#0070f3";
                        e.currentTarget.style.color = "#0070f3";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (registerForm.name.trim() && registerForm.phone.trim()) {
                        e.currentTarget.style.borderColor = "#ccc";
                        e.currentTarget.style.color = "#666";
                      }
                    }}
                  >
                    {(!registerForm.name.trim() || !registerForm.phone.trim()) 
                      ? "이름과 전화번호를 먼저 입력하세요" 
                      : "인증서 선택하기"}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!certRegistered}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: certRegistered ? "#0070f3" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: certRegistered ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
              >
                회원가입
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 인증서 선택 모달 (회원가입용) */}
      {modalType === "registerCert" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 430, // 여기서 너비 조절 (기존 430)
              userSelect: isDragging ? "none" : "auto",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                background: "#f5f5f5",
                borderRadius: "8px 8px 0 0",
                border: "1px solid #ccc",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onMouseDown={handleTitleBarMouseDown}
                style={{ flex: 1, cursor: "move", paddingRight: "10px" }}
              >
                <span style={{ fontWeight: "bold" }}>인증서 선택창</span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "0 5px",
                }}
              >
                ✕
              </button>
            </div>
            {error && (
              <div style={{ padding: "10px", background: "#fee", color: "red", fontSize: "14px", borderLeft: "1px solid #ccc", borderRight: "1px solid #ccc" }}>
                {error}
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={iframeSrc || ""}
              style={{
                width: "100%",
                height: 510,
                border: "1px solid #ccc",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                background: "#fff",
                pointerEvents: isDragging ? "none" : "auto",
              }}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>
      )}

      {/* 인증서 변경 폼 모달 */}
      {modalType === "changeCert" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 400,
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              userSelect: isDragging ? "none" : "auto",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                background: "#f5f5f5",
                borderRadius: "8px 8px 0 0",
                borderBottom: "1px solid #ccc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onMouseDown={handleTitleBarMouseDown}
                style={{ flex: 1, cursor: "move", paddingRight: "10px" }}
              >
                <span style={{ fontWeight: "bold" }}>인증서 변경</span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "0 5px",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {error && (
                <div style={{ marginBottom: "15px", padding: "10px", background: "#fee", color: "red", fontSize: "14px", borderRadius: "4px" }}>
                  {error}
                </div>
              )}

              <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
                기존에 등록된 회원의 인증서를 변경합니다.<br/>
                회원가입 시 입력한 이름과 동일하게 입력해주세요.
              </p>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  이름 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={changeCertForm.name}
                  onChange={(e) => setChangeCertForm({ ...changeCertForm, name: e.target.value })}
                  placeholder="회원가입 시 입력한 이름"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  전화번호 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="tel"
                  value={changeCertForm.phone}
                  onChange={(e) => setChangeCertForm({ ...changeCertForm, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                    fontSize: "14px",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleChangeCertSelect}
                disabled={!changeCertForm.name.trim() || !changeCertForm.phone.trim()}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: (changeCertForm.name.trim() && changeCertForm.phone.trim()) ? "#0070f3" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "16px",
                  cursor: (changeCertForm.name.trim() && changeCertForm.phone.trim()) ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
              >
                새 인증서 선택하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인증서 선택 모달 (인증서 변경용) */}
      {modalType === "changeCertSelect" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 450,
              userSelect: isDragging ? "none" : "auto",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                background: "#f5f5f5",
                borderRadius: "8px 8px 0 0",
                border: "1px solid #ccc",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                onMouseDown={handleTitleBarMouseDown}
                style={{ flex: 1, cursor: "move", paddingRight: "10px" }}
              >
                <span style={{ fontWeight: "bold" }}>새 인증서 선택</span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "0 5px",
                }}
              >
                ✕
              </button>
            </div>
            {error && (
              <div style={{ padding: "10px", background: "#fee", color: "red", fontSize: "14px", borderLeft: "1px solid #ccc", borderRight: "1px solid #ccc" }}>
                {error}
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={iframeSrc || ""}
              style={{
                width: "100%",
                height: 510,
                border: "1px solid #ccc",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                background: "#fff",
                pointerEvents: isDragging ? "none" : "auto",
              }}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>
      )}

      {/* 성공 모달 */}
      {modalType === "success" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              width: 380,
              background: "#fff",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#dcfce7",
                borderBottom: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontWeight: "bold", color: "#16a34a", fontSize: "16px" }}>
                완료
              </span>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ 
                margin: 0, 
                color: "#374151", 
                fontSize: "14px", 
                lineHeight: "1.6",
                whiteSpace: "pre-line"
              }}>
                {successMessage}
              </p>
            </div>
            <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 24px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 모달 */}
      {modalType === "error" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              width: 380,
              background: "#fff",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#fee2e2",
                borderBottom: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontWeight: "bold", color: "#dc2626", fontSize: "16px" }}>
                {errorTitle}
              </span>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ 
                margin: 0, 
                color: "#374151", 
                fontSize: "14px", 
                lineHeight: "1.6",
                whiteSpace: "pre-line"
              }}>
                {error}
              </p>
            </div>
            <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 24px",
                  background: "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
