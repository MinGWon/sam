import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { deviceAuthMiddleware, DeviceAuthRequest } from "@/middleware/deviceAuth";

async function handler(req: DeviceAuthRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { deviceNumber } = req.query;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      date: {
        gte: today,
        lt: tomorrow,
      },
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

    const totalCheckIns = attendances.length;
    const totalCheckOuts = attendances.filter((a) => a.checkOutTime !== null).length;
    const currentlyCheckedIn = attendances.filter((a) => a.checkOutTime === null).length;

    const records = attendances.map((att) => ({
      userId: att.student.id,
      userName: att.student.name,
      fingerprintId: att.student.fingerprintId,
      checkInTime: att.checkInTime.toISOString(),
      checkOutTime: att.checkOutTime?.toISOString() || null,
      studyDuration: att.studyDuration,
    }));

    return res.status(200).json({
      date: today.toISOString().split("T")[0],
      totalCheckIns,
      totalCheckOuts,
      currentlyCheckedIn,
      records,
    });
  } catch (error) {
    console.error("Today error:", error);
    return res.status(500).json({ error: "오늘 현황 조회 중 오류가 발생했습니다." });
  }
}

export default deviceAuthMiddleware(handler);
