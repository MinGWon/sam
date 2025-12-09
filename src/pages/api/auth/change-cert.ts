import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

// 다른 인증 API에서 사용하는 URL과 동일하게 맞춰야 함
const PKI_TOKEN_URL =
  process.env.PKI_TOKEN_URL || "https://pki.2check.io/api/oauth/token";
const PKI_USERINFO_URL =
  process.env.PKI_USERINFO_URL || "https://pki.2check.io/api/oauth/userinfo";
const CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || "";
const REDIRECT_URI = "https://samsquare.2check.io/api/auth/callback";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, codeVerifier, expectedName, phone } = req.body;

  console.log("Change cert request:", {
    hasCode: !!code,
    hasCodeVerifier: !!codeVerifier,
    expectedName,
    phone,
    clientId: CLIENT_ID,
    hasClientSecret: !!CLIENT_SECRET,
  });

  if (!code || !codeVerifier || !expectedName || !phone) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  try {
    // 1. 토큰 교환
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: codeVerifier,
    });

    console.log("Token request params:", {
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
    });

    const tokenRes = await fetch(PKI_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    const tokenResponseText = await tokenRes.text();
    console.log("Token response status:", tokenRes.status);
    console.log("Token response body:", tokenResponseText);

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenResponseText);
      return res.status(401).json({
        error: "인증서 검증에 실패했습니다.",
        detail:
          tokenRes.status === 400
            ? "인증 코드가 만료되었거나 유효하지 않습니다. 다시 시도해주세요."
            : undefined,
      });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch (e) {
      console.error("Failed to parse token response:", e);
      return res
        .status(500)
        .json({ error: "인증 서버 응답을 처리할 수 없습니다." });
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token in response:", tokenData);
      return res.status(401).json({ error: "액세스 토큰을 받지 못했습니다." });
    }

    // 2. 사용자 정보 조회
    const userinfoRes = await fetch(PKI_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoRes.ok) {
      const userinfoError = await userinfoRes.text();
      console.error("Userinfo failed:", userinfoError);
      return res.status(401).json({ error: "사용자 정보 조회에 실패했습니다." });
    }

    const userinfo = await userinfoRes.json();
    console.log("Userinfo:", userinfo);

    const certName = userinfo.name;
    const newCertId = userinfo.cert_id || userinfo.certId || userinfo.sub;

    // 3. 인증서 이름과 입력한 이름 비교
    if (certName !== expectedName.trim()) {
      return res.status(400).json({
        error: `입력하신 정보와 인증서의 정보가 일치하지 않습니다.`,
      });
    }

    // 4. DB에서 name과 phone이 모두 일치하는 사용자 찾기
    const existingUser = await prisma.user.findFirst({
      where: {
        name: expectedName.trim(),
        phone: phone,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: "입력하신 정보와 인증서의 정보가 일치하지 않습니다.",
      });
    }

    // 5. certId만 업데이트
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { certId: newCertId },
    });

    return res.status(200).json({
      success: true,
      message: "인증서가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Change cert error:", error);
    return res
      .status(500)
      .json({ error: "인증서 변경 처리 중 오류가 발생했습니다." });
  }
}
