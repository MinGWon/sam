import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { fingerprintId } = req.query;

  if (!fingerprintId || typeof fingerprintId !== "string") {
    return res.status(400).json({ error: "유효하지 않은 지문ID입니다." });
  }

  const fpId = parseInt(fingerprintId);
  if (isNaN(fpId)) {
    return res.status(400).json({ error: "지문ID는 숫자여야 합니다." });
  }

  if (req.method === "GET") {
    try {
      const student = await prisma.student.findUnique({
        where: { fingerprintId: fpId },
        include: {
          attendances: {
            orderBy: { checkInTime: "desc" },
            take: 10,
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "학생을 찾을 수 없습니다." });
      }

      const totalStudyTime = await prisma.attendance.aggregate({
        where: { studentId: student.id },
        _sum: { studyDuration: true },
      });

      const attendanceCount = await prisma.attendance.count({
        where: { studentId: student.id },
      });

      return res.status(200).json({
        student: {
          id: student.id,
          fingerprintId: student.fingerprintId,
          name: student.name,
          grade: student.grade,
          class: student.class,
          totalStudyTime: totalStudyTime._sum.studyDuration || 0,
          attendanceCount,
          recentAttendances: student.attendances,
        },
      });
    } catch (error) {
      console.error("Failed to fetch student:", error);
      return res.status(500).json({ error: "학생 정보 조회에 실패했습니다." });
    }
  }

  if (req.method === "PUT") {
    try {
      const { name, grade, class: classNum, number } = req.body;

      const student = await prisma.student.update({
        where: { fingerprintId: parseInt(fingerprintId as string) },
        data: {
          name,
          grade: grade ? parseInt(grade) : null,
          class: classNum ? parseInt(classNum) : null,
          number: number ? parseInt(number) : null,
        },
      });

      return res.status(200).json({ student });
    } catch (error) {
      console.error("Failed to update student:", error);
      return res.status(500).json({ error: "학생 수정에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
