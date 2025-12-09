import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 쿠키에서 토큰 가져오기
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // JWT 검증
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return res.status(200).json({
      user: {
        sub: decoded.id,
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}
