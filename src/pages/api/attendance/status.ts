import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { deviceAuthMiddleware, DeviceAuthRequest } from "@/middleware/deviceAuth";

async function handler(req: DeviceAuthRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { deviceNumber } = req.query;

  try {
    const where: any = {
      checkOutTime: null,
    };

    if (deviceNumber) {
      where.deviceNumber = deviceNumber;
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: true,
      },
      orderBy: { checkInTime: "desc" },
    });

    const currentlyCheckedIn = attendances.map((att) => {
      const duration = Math.floor(
        (Date.now() - new Date(att.checkInTime).getTime()) / 60000
      );

      return {
        userId: att.student.id,
        userName: att.student.name,
        fingerprintId: att.student.fingerprintId,
        checkInTime: att.checkInTime.toISOString(),
        duration,
      };
    });

    return res.status(200).json({
      currentlyCheckedIn,
      count: currentlyCheckedIn.length,
    });
  } catch (error) {
    console.error("Status error:", error);
    return res.status(500).json({ error: "상태 조회 중 오류가 발생했습니다." });
  }
}

export default deviceAuthMiddleware(handler);
