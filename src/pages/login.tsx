import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import { generatePKCE, generateState } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "YOUR_CLIENT_ID";
const REDIRECT_URI = "https://samsquare.2check.io/api/auth/callback";
const PKI_ORIGIN = "https://pki.2check.io";

export default function Login() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isNearEdge, setIsNearEdge] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 화면 중앙에 초기 위치 설정
  useEffect(() => {
    const centerX = (window.innerWidth - 400) / 2;
    const centerY = (window.innerHeight - 300) / 2;
    setPosition({ x: centerX, y: centerY });
    setInitialized(true);
  }, []);

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

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const edgeThreshold = 15;
    const isNear =
      e.clientX - rect.left < edgeThreshold ||
      rect.right - e.clientX < edgeThreshold ||
      e.clientY - rect.top < edgeThreshold ||
      rect.bottom - e.clientY < edgeThreshold;

    setIsNearEdge(isNear);
  };

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isNearEdge) return;

    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.origin !== PKI_ORIGIN) return;

      if (e.data.type === "PKI_AUTH_RESPONSE") {
        const { code, state } = e.data.payload;

        // state 검증
        const savedState = sessionStorage.getItem("oauth_state");
        if (state !== savedState) {
          setError("인증 상태가 일치하지 않습니다.");
          return;
        }

        // code_verifier 가져오기
        const codeVerifier = sessionStorage.getItem("oauth_code_verifier");

        try {
          // 서버에서 토큰 교환
          const res = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, codeVerifier }),
          });

          if (res.ok) {
            sessionStorage.removeItem("oauth_state");
            sessionStorage.removeItem("oauth_code_verifier");
            router.push("/");
          } else {
            setError("토큰 교환에 실패했습니다.");
          }
        } catch (err) {
          setError("인증 처리 중 오류가 발생했습니다.");
        }
      }

      if (e.data.type === "PKI_AUTH_ERROR") {
        setError(e.data.payload?.message || "인증에 실패했습니다.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  const handleIframeLoad = async () => {
    if (!iframeRef.current?.contentWindow) return;

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    // 세션에 저장
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);

    // iframe에 인증 요청 전송
    iframeRef.current.contentWindow.postMessage(
      {
        type: "PKI_AUTH_REQUEST",
        payload: {
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          scope: "openid profile email",
          state,
          codeChallenge,
          codeChallengeMethod: "S256",
        },
      },
      PKI_ORIGIN
    );
  };

  if (!initialized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>로그인 - SAM</title>
      </Head>
      <div className={styles.page} style={{ position: "relative", minHeight: "100vh" }}>
        {error && (
          <p style={{ color: "red", position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)" }}>
            {error}
          </p>
        )}

        <div
          ref={containerRef}
          onMouseMove={handleContainerMouseMove}
          onMouseDown={handleContainerMouseDown}
          onMouseLeave={() => !isDragging && setIsNearEdge(false)}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            width: 400,
            height: 350,
            cursor: isNearEdge || isDragging ? "move" : "default",
            userSelect: isDragging ? "none" : "auto",
          }}
        >
          <div
            style={{
              padding: "10px",
              background: "#f5f5f5",
              borderRadius: "8px 8px 0 0",
              borderBottom: "1px solid #ccc",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            로그인
          </div>
          <iframe
            ref={iframeRef}
            id="pki-auth"
            src={`${PKI_ORIGIN}/auth/iframe`}
            style={{
              width: "100%",
              height: 300,
              border: "1px solid #ccc",
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              pointerEvents: isDragging ? "none" : "auto",
            }}
            onLoad={handleIframeLoad}
          />
        </div>

        <button
          onClick={() => router.push("/")}
          style={{
            position: "fixed",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </>
  );
}
