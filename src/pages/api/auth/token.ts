import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://pki.2check.io/api/auth/token";
const USERINFO_URL = "https://pki.2check.io/api/oauth/userinfo";
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = "https://samsquare.2check.io/api/auth/callback";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, codeVerifier } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    // 1. 토큰 교환
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }),
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.json().catch(() => ({}));
      console.error("Token exchange failed:", error);
      return res.status(401).json({ error: "Token exchange failed", details: error });
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. userinfo 조회
    const userInfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      const error = await userInfoRes.text();
      console.error("Userinfo fetch failed:", error);
      return res.status(401).json({ error: "사용자 정보 조회에 실패했습니다." });
    }

    const userInfo = await userInfoRes.json();
    console.log("UserInfo from PKI:", userInfo);

    const pkiUserId = userInfo.sub;
    const pkiCertId = userInfo.certificate_id;
    const pkiName = userInfo.name;

    if (!pkiUserId || !pkiName) {
      return res.status(400).json({ error: "인증서 정보가 올바르지 않습니다." });
    }

    // 3. 회원 DB 조회
    const existingUser = await prisma.user.findUnique({
      where: { pkiUserId },
    });

    // 미등록 사용자
    if (!existingUser) {
      return res.status(403).json({ 
        error: "등록되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요.",
        code: "NOT_REGISTERED"
      });
    }

    // userId는 일치하지만 certId가 다른 경우
    if (pkiCertId && existingUser.certId && existingUser.certId !== pkiCertId) {
      return res.status(403).json({ 
        error: "등록된 인증서와 다른 인증서입니다. 회원가입 시 등록한 인증서로 로그인해주세요.",
        code: "CERT_MISMATCH"
      });
    }

    // 이름이 다른 경우
    if (existingUser.name.trim() !== pkiName.trim()) {
      return res.status(403).json({ 
        error: "사용자 정보가 일치하지 않습니다.",
        code: "NAME_MISMATCH"
      });
    }

    // 4. 모든 검증 통과 - 쿠키 저장
    const isProduction = process.env.NODE_ENV === "production";

    res.setHeader("Set-Cookie", [
      serialize("access_token", tokens.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in || 3600,
      }),
      serialize("refresh_token", tokens.refresh_token || "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }),
    ]);

    return res.status(200).json({ 
      success: true,
      user: {
        id: existingUser.id,
        visibleId: existingUser.visibleId,
        name: existingUser.name,
      }
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
