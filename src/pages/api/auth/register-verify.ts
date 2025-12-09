import type { NextApiRequest, NextApiResponse } from "next";
import { hashPhoneNumber } from "@/lib/hash";

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

  const { code, codeVerifier, expectedName, phone } = req.body;

  if (!code || !expectedName || !phone) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
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
      return res.status(401).json({ error: "토큰 교환에 실패했습니다." });
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

    const userId = userInfo.sub;           // "userId"
    const certId = userInfo.certificate_id; // "certId"  
    const certName = userInfo.name;         // "userName"

    if (!userId || !certName) {
      return res.status(400).json({ error: "인증서 정보가 올바르지 않습니다." });
    }

    // 3. 이름 일치 검증
    if (expectedName.trim() !== certName.trim()) {
      return res.status(400).json({ 
        error: `입력하신 정보와 인증서의 정보가 일치하지 않습니다.` 
      });
    }

    // 4. 전화번호 해시 검증 (userId === 전화번호 해시 앞 32자리)
    const phoneHash = hashPhoneNumber(phone);
    if (userId !== phoneHash) {
      return res.status(400).json({ 
        error: "입력하신 정보와 인증서의 정보가 일치하지 않습니다." 
      });
    }

    // 검증 성공
    return res.status(200).json({
      success: true,
      userId,
      certId,
      certName,
    });

  } catch (error) {
    console.error("Register verify error:", error);
    return res.status(500).json({ error: "인증서 검증 중 오류가 발생했습니다." });
  }
}
