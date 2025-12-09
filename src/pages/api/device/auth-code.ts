import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { handleCors } from "@/lib/cors";

function generateAuthCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS 처리
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: "기기 ID가 필요합니다." });
  }

  try {
    const authCode = generateAuthCode();
    const authCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료

    const device = await prisma.device.update({
      where: { id: deviceId },
      data: {
        authCode,
        authCodeExpiry,
      },
    });

    return res.status(200).json({
      authCode: device.authCode,
      expiresAt: device.authCodeExpiry,
    });
  } catch (error) {
    console.error("Failed to generate auth code:", error);
    return res.status(500).json({ error: "인가코드 발급에 실패했습니다." });
  }
}
