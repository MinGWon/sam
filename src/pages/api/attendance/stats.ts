import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { deviceAuthMiddleware, DeviceAuthRequest } from "@/middleware/deviceAuth";

async function handler(req: DeviceAuthRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fingerprintId, period = "weekly" } = req.query;

  if (!fingerprintId) {
    return res.status(400).json({ error: "지문ID가 필요합니다." });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { fingerprintId: parseInt(fingerprintId as string) },
    });

    if (!student) {
      return res.status(404).json({ error: "학생을 찾을 수 없습니다." });
    }

    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (period === "daily") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "monthly") {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      return res.status(400).json({ error: "유효하지 않은 기간입니다." });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        studyDuration: { not: null },
      },
      orderBy: { date: "asc" },
    });

    const dailyStats = attendances.reduce((acc: any, att) => {
      const dateKey = att.date.toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, studyTime: 0, checkInCount: 0 };
      }
      acc[dateKey].studyTime += att.studyDuration || 0;
      acc[dateKey].checkInCount += 1;
      return acc;
    }, {});

    const totalStudyTime = attendances.reduce(
      (sum, att) => sum + (att.studyDuration || 0),
      0
    );

    const totalDays = Object.keys(dailyStats).length;
    const averageStudyTime = totalDays > 0 ? Math.floor(totalStudyTime / totalDays) : 0;

    return res.status(200).json({
      period,
      totalStudyTime,
      totalDays,
      averageStudyTime,
      dailyStats: Object.values(dailyStats),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ error: "통계 조회 중 오류가 발생했습니다." });
  }
}

export default deviceAuthMiddleware(handler);
