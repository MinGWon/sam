import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { deviceAuthMiddleware, DeviceAuthRequest } from "@/middleware/deviceAuth";

async function handler(req: DeviceAuthRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fingerprintId, timestamp } = req.body;

  if (!fingerprintId || !timestamp) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { fingerprintId: parseInt(fingerprintId) },
    });

    if (!student) {
      return res.status(404).json({ error: "등록되지 않은 학생입니다." });
    }

    // 현재 입실 중인 기록 찾기
    const attendance = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        checkOutTime: null,
      },
    });

    if (!attendance) {
      return res.status(404).json({ error: "입실 기록이 없습니다." });
    }

    // 퇴실 처리
    const checkOutTime = new Date(timestamp);
    const duration = Math.floor(
      (checkOutTime.getTime() - new Date(attendance.checkInTime).getTime()) / 60000
    );

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        studyDuration: duration,
      },
    });

    // 당일 총 공부시간 계산
    const todayStart = new Date(attendance.date);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayTotal = await prisma.attendance.aggregate({
      where: {
        studentId: student.id,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
        studyDuration: { not: null },
      },
      _sum: { studyDuration: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        checkInTime: updated.checkInTime.toISOString(),
        checkOutTime: updated.checkOutTime!.toISOString(),
        studyDuration: updated.studyDuration,
        todayTotalStudyTime: todayTotal._sum.studyDuration || 0,
      },
    });
  } catch (error) {
    console.error("Check-out error:", error);
    return res.status(500).json({ error: "퇴실 처리 중 오류가 발생했습니다." });
  }
}

export default deviceAuthMiddleware(handler);
