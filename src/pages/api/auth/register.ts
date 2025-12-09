import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, certId, name, phone } = req.body;

  if (!userId || !name || !phone) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  try {
    // 이미 가입된 사용자인지 확인 (PKI 유저 ID로)
    const existingUser = await prisma.user.findUnique({
      where: { pkiUserId: userId },
    });

    if (existingUser) {
      return res.status(409).json({ error: "이미 가입된 사용자입니다." });
    }

    // 인증서 ID로도 확인
    if (certId) {
      const existingCert = await prisma.user.findUnique({
        where: { certId },
      });

      if (existingCert) {
        return res.status(409).json({ error: "이미 등록된 인증서입니다." });
      }
    }

    // visibleId 생성 (예: USR-0001 형태)
    const userCount = await prisma.user.count();
    const visibleId = `USR-${String(userCount + 1).padStart(4, "0")}`;

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        visibleId,
        pkiUserId: userId,
        certId: certId || null,
        name,
        phone,
      },
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        visibleId: user.visibleId,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "회원가입 처리 중 오류가 발생했습니다." });
  }
}
