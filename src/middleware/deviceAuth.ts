import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { handleCors } from "@/lib/cors";

const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET || "device-secret-key";

export interface DeviceAuthRequest extends NextApiRequest {
  device?: {
    deviceId: string;
    deviceNumber: string;
  };
}

export function deviceAuthMiddleware(
  handler: (req: DeviceAuthRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: DeviceAuthRequest, res: NextApiResponse) => {
    // CORS 처리
    if (handleCors(req, res)) return;

    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "인증 토큰이 필요합니다." });
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, DEVICE_JWT_SECRET) as {
          deviceId: string;
          deviceNumber: string;
        };
        
        req.device = decoded;
        return handler(req, res);
      } catch (jwtError) {
        return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
      }
    } catch (error) {
      console.error("Device auth error:", error);
      return res.status(500).json({ error: "인증 처리 중 오류가 발생했습니다." });
    }
  };
}
