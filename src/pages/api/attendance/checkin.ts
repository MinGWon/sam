import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { deviceAuthMiddleware, DeviceAuthRequest } from "@/middleware/deviceAuth";

async function handler(req: DeviceAuthRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fingerprintId, timestamp } = req.body;
  const deviceNumber = req.device?.deviceNumber;

  if (!fingerprintId || !timestamp || !deviceNumber) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { fingerprintId: parseInt(fingerprintId) },
    });

    if (!student) {
      return res.status(404).json({ error: "등록되지 않은 학생입니다." });
    }

    // 미퇴실 기록 확인
    const existingCheckIn = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        checkOutTime: null,
      },
    });

    // 미퇴실 기록이 있으면 자동 퇴실 처리
    if (existingCheckIn) {
      const now = new Date(timestamp);
      const duration = Math.floor(
        (now.getTime() - new Date(existingCheckIn.checkInTime).getTime()) / 60000
      );

      await prisma.attendance.update({
        where: { id: existingCheckIn.id },
        data: {
          checkOutTime: now,
          studyDuration: duration,
        },
      });

      console.warn(
        `Auto checkout for student ${student.name} (${student.fingerprintId})`
      );
    }

    // 새 입실 기록 생성
    const checkInTime = new Date(timestamp);
    const date = new Date(checkInTime.toISOString().split("T")[0]);

    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        deviceNumber,
        checkInTime,
        date,
      },
    });

    // 현재 입실 중인 사용자 수
    const currentCount = await prisma.attendance.count({
      where: {
        checkOutTime: null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: attendance.id,
        userId: student.id,
        userName: student.name,
        checkInTime: attendance.checkInTime.toISOString(),
        currentAttendanceCount: currentCount,
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return res.status(500).json({ error: "입실 처리 중 오류가 발생했습니다." });
  }
}

export default deviceAuthMiddleware(handler);
