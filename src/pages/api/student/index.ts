import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const students = await prisma.student.findMany({
        include: {
          attendances: {
            select: {
              studyDuration: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const studentsWithStats = students.map((student) => {
        const totalStudyTime = student.attendances.reduce(
          (sum, att) => sum + (att.studyDuration || 0),
          0
        );
        const attendanceCount = student.attendances.length;

        return {
          id: student.id,
          fingerprintId: student.fingerprintId,
          name: student.name,
          grade: student.grade,
          class: student.class,
          number: student.number,
          totalStudyTime,
          attendanceCount,
        };
      });

      return res.status(200).json({ students: studentsWithStats });
    } catch (error) {
      console.error("Failed to fetch students:", error);
      return res.status(500).json({ error: "학생 목록 조회에 실패했습니다." });
    }
  }

  if (req.method === "POST") {
    try {
      const { fingerprintId, name, grade, class: classNum, number } = req.body;

      if (!fingerprintId || !name) {
        return res.status(400).json({ error: "지문ID와 이름은 필수입니다." });
      }

      const student = await prisma.student.create({
        data: {
          fingerprintId: parseInt(fingerprintId),
          name,
          grade: grade ? parseInt(grade) : null,
          class: classNum ? parseInt(classNum) : null,
          number: number ? parseInt(number) : null,
        },
      });

      return res.status(201).json({ student });
    } catch (error) {
      console.error("Failed to create student:", error);
      return res.status(500).json({ error: "학생 등록에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
