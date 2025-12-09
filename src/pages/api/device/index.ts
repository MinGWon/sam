import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const devices = await prisma.device.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ devices });
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      return res.status(500).json({ error: "기기 목록을 불러오는데 실패했습니다." });
    }
  }

  if (req.method === "POST") {
    const { deviceNumber, name, location } = req.body;

    if (!deviceNumber || !name) {
      return res.status(400).json({ error: "기기번호와 기기명은 필수입니다." });
    }

    try {
      const existing = await prisma.device.findUnique({
        where: { deviceNumber },
      });

      if (existing) {
        return res.status(400).json({ error: "이미 등록된 기기번호입니다." });
      }

      const device = await prisma.device.create({
        data: {
          deviceNumber,
          name,
          location: location || null,
        },
      });

      return res.status(201).json({ device });
    } catch (error) {
      console.error("Failed to create device:", error);
      return res.status(500).json({ error: "기기 등록에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
