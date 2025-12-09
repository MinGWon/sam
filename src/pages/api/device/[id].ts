import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid device ID" });
  }

  if (req.method === "GET") {
    try {
      const device = await prisma.device.findUnique({
        where: { id },
      });

      if (!device) {
        return res.status(404).json({ error: "기기를 찾을 수 없습니다." });
      }

      return res.status(200).json({ device });
    } catch (error) {
      console.error("Failed to fetch device:", error);
      return res.status(500).json({ error: "기기 조회에 실패했습니다." });
    }
  }

  if (req.method === "PUT") {
    const { name, location, isActive } = req.body;

    try {
      const device = await prisma.device.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(location !== undefined && { location }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return res.status(200).json({ device });
    } catch (error) {
      console.error("Failed to update device:", error);
      return res.status(500).json({ error: "기기 수정에 실패했습니다." });
    }
  }

  if (req.method === "DELETE") {
    try {
      await prisma.device.delete({
        where: { id },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to delete device:", error);
      return res.status(500).json({ error: "기기 삭제에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
