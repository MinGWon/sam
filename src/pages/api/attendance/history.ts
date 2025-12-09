import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fingerprintId, startDate, endDate, deviceNumber } = req.query;

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

    const where: any = {
      studentId: student.id,
      // studyDuration 조건 제거 - checkOutTime이 null인 레코드도 포함
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (deviceNumber) {
      where.deviceNumber = deviceNumber;
    }

    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: { checkInTime: "desc" },
    });

    console.log("📊 [API] 조회된 출석 기록:", attendances.length);

    const records = attendances.map((att) => {
      const isStudying = att.checkOutTime === null;

      console.log("📝 [API] 레코드 변환:", {
        id: att.id,
        checkInTime: att.checkInTime,
        checkOutTime: att.checkOutTime,
        isNull: att.checkOutTime === null,
        studyDuration: att.studyDuration,
      });

      return {
        id: att.id,
        date: att.date.toISOString().split("T")[0],
        checkInTime: att.checkInTime.toISOString(),
        checkOutTime: att.checkOutTime ? att.checkOutTime.toISOString() : null,
        studyDuration: att.studyDuration || 0,
        deviceNumber: att.deviceNumber,
      };
    });

    const totalStudyTime = attendances.reduce(
      (sum, att) => sum + (att.studyDuration || 0),
      0
    );

    const totalDays = new Set(
      attendances.map((att) => att.date.toISOString().split("T")[0])
    ).size;

    return res.status(200).json({
      records,
      totalStudyTime,
      totalDays,
    });
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ error: "이력 조회 중 오류가 발생했습니다." });
  }
}
