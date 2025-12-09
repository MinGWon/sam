import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { handleCors } from "@/lib/cors";

const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET || "device-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS 처리
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { deviceNumber, authCode } = req.body;

  if (!deviceNumber || !authCode) {
    return res.status(400).json({ error: "기기번호와 인가코드가 필요합니다." });
  }

  try {
    const device = await prisma.device.findUnique({
      where: { deviceNumber },
    });

    if (!device) {
      return res.status(404).json({ error: "등록되지 않은 기기입니다." });
    }

    if (!device.isActive) {
      return res.status(403).json({ error: "비활성화된 기기입니다." });
    }

    if (!device.authCode || !device.authCodeExpiry) {
      return res.status(400).json({ error: "발급된 인가코드가 없습니다." });
    }

    if (new Date() > device.authCodeExpiry) {
      return res.status(400).json({ error: "인가코드가 만료되었습니다." });
    }

    if (device.authCode !== authCode) {
      return res.status(400).json({ error: "인가코드가 일치하지 않습니다." });
    }

    // 인가코드 사용 후 무효화 및 로그인 시간 기록
    await prisma.device.update({
      where: { id: device.id },
      data: {
        authCode: null,
        authCodeExpiry: null,
        lastLoginAt: new Date(),
      },
    });

    // JWT 토큰 발급 (24시간 유효)
    const token = jwt.sign(
      {
        deviceId: device.id,
        deviceNumber: device.deviceNumber,
      },
      DEVICE_JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      device: {
        id: device.id,
        deviceNumber: device.deviceNumber,
        name: device.name,
        location: device.location,
      },
      token, // 기기가 이후 API 호출 시 사용
    });
  } catch (error) {
    console.error("Failed to verify device:", error);
    return res.status(500).json({ error: "인증에 실패했습니다." });
  }
}
