import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { deviceNumber } = req.query;

  if (!deviceNumber) {
    return res.status(400).json({ error: "기기 번호가 필요합니다." });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 공부 중인 학생 (checkOutTime이 null)
    const studyingRecords = await prisma.attendance.findMany({
      where: {
        deviceNumber: deviceNumber as string,
        date: {
          gte: today,
        },
        checkOutTime: null,
      },
      include: {
        student: true,
      },
      orderBy: {
        checkInTime: "desc",
      },
    });

    // 최근 퇴실 학생 (오늘 퇴실, 최근 10명)
    const recentRecords = await prisma.attendance.findMany({
      where: {
        deviceNumber: deviceNumber as string,
        date: {
          gte: today,
        },
        checkOutTime: {
          not: null,
        },
      },
      include: {
        student: true,
      },
      orderBy: {
        checkOutTime: "desc",
      },
      take: 10,
    });

    // 공부 중인 학생 데이터 변환
    const studying = studyingRecords.map((record) => {
      const now = new Date();
      const checkIn = new Date(record.checkInTime);
      const elapsedMinutes = Math.floor((now.getTime() - checkIn.getTime()) / 60000);

      return {
        id: record.id,
        name: record.student.name,
        grade: record.student.grade,
        class: record.student.class,
        fingerprintId: record.student.fingerprintId,
        checkInTime: record.checkInTime.toISOString(),
        elapsedMinutes,
      };
    });

    // 최근 퇴실 학생 데이터 변환
    const recent = recentRecords.map((record) => ({
      id: record.id,
      name: record.student.name,
      grade: record.student.grade,
      class: record.student.class,
      fingerprintId: record.student.fingerprintId,
      checkInTime: record.checkInTime.toISOString(),
      checkOutTime: record.checkOutTime!.toISOString(),
      studyDuration: record.studyDuration || 0,
    }));

    return res.status(200).json({
      studying,
      recent,
    });
  } catch (error) {
    console.error("Realtime status error:", error);
    return res.status(500).json({ error: "실시간 현황 조회 중 오류가 발생했습니다." });
  }
}
