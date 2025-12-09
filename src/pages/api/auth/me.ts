import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { prisma } from "@/lib/prisma";

const USERINFO_URL = "https://pki.2check.io/api/oauth/userinfo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = parse(req.headers.cookie || "");
  const accessToken = cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const pkiUser = await userRes.json();

    // DB에서 사용자 정보 조회
    const dbUser = await prisma.user.findUnique({
      where: { pkiUserId: pkiUser.sub },
    });

    if (!dbUser) {
      return res.status(200).json({
        user: {
          sub: pkiUser.sub,
          name: pkiUser.name,
        },
      });
    }

    return res.status(200).json({
      user: {
        sub: pkiUser.sub,
        name: dbUser.name,
        visibleId: dbUser.visibleId,
        phone: dbUser.phone,
      },
    });
  } catch (error) {
    console.error("Userinfo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
