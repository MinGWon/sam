import { useState, useEffect, useMemo } from "react";
import { useTabStore } from "@/store/tabStore";
import CompactTable, { TableColumn } from "@/components/common/CompactTable";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import SemiTagButton from "@/components/common/SemiTagButton";

const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  background: "#f7f8fa",
  white: "#ffffff",
  gray50: "#fafbfc",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray400: "#b5b9be",
  gray500: "#8b8f94",
  gray600: "#6b6e72",
  gray700: "#45474a",
  gray800: "#2d2f31",
  gray900: "#1a1b1d",
  red: "#f04452",
  green: "#30b06e",
};

interface Student {
  id: string;
  fingerprintId: number;
  name: string;
  grade: number | null;
  class: number | null;
  number: number | null;
  totalStudyTime: number;
  attendanceCount: number;
}

export default function StudentManagement({ tabId }: { tabId?: string }) {
  const { getTabState, setTabState } = useTabStore();

  // 초기 상태를 즉시 계산
  const initialState = useMemo(() => {
    if (!tabId) return null;
    return getTabState(tabId)?.studentManagement;
  }, [tabId, getTabState]);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    fingerprintId: "",
    name: "",
    grade: "",
    class: "",
    number: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialState?.searchTerm || "");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    initialState?.selectedStudents || []
  );
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/student");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
      }
    } catch (e) {
      console.error("Failed to fetch students:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Debounced 저장
  useEffect(() => {
    if (!tabId) return;

    const timeoutId = setTimeout(() => {
      setTabState(tabId, {
        studentManagement: {
          searchTerm,
          selectedStudents,
        },
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedStudents]);

  const handleAdd = async () => {
    setError(null);
    if (!formData.fingerprintId || !formData.name) {
      setError("지문ID와 이름은 필수입니다.");
      return;
    }

    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprintId: parseInt(formData.fingerprintId),
          name: formData.name,
          grade: formData.grade ? parseInt(formData.grade) : null,
          class: formData.class ? parseInt(formData.class) : null,
          number: formData.number ? parseInt(formData.number) : null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({ fingerprintId: "", name: "", grade: "", class: "", number: "" });
        fetchStudents();
      } else {
        const data = await res.json();
        setError(data.error || "등록에 실패했습니다.");
      }
    } catch (e) {
      setError("등록 중 오류가 발생했습니다.");
    }
  };

  const handleEdit = async () => {
    setError(null);
    if (!editingStudent || !formData.fingerprintId || !formData.name) {
      setError("지문ID와 이름은 필수입니다.");
      return;
    }

    try {
      const res = await fetch(`/api/student/${editingStudent.fingerprintId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          grade: formData.grade ? parseInt(formData.grade) : null,
          class: formData.class ? parseInt(formData.class) : null,
          number: formData.number ? parseInt(formData.number) : null,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingStudent(null);
        setFormData({ fingerprintId: "", name: "", grade: "", class: "", number: "" });
        fetchStudents();
      } else {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
      }
    } catch (e) {
      setError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`'${student.name}' 학생을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/student/${student.fingerprintId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchStudents();
      }
    } catch (e) {
      console.error("Failed to delete student:", e);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.includes(searchTerm) ||
      student.fingerprintId.toString().includes(searchTerm) ||
      (student.grade && student.grade.toString().includes(searchTerm)) ||
      (student.class && student.class.toString().includes(searchTerm)) ||
      (student.number && student.number.toString().includes(searchTerm));

    const matchesGrade = filterGrade === "" || student.grade?.toString() === filterGrade;

    return matchesSearch && matchesGrade;
  });

  const handleRowClick = (student: Student) => {
    if (selectedStudents.includes(student.id)) {
      // 이미 선택된 학생을 다시 클릭 -> 수정 모달 열기
      setEditingStudent(student);
      setFormData({
        fingerprintId: student.fingerprintId.toString(),
        name: student.name,
        grade: student.grade?.toString() || "",
        class: student.class?.toString() || "",
        number: student.number?.toString() || "",
      });
      setError(null);
      setShowEditModal(true);
    } else {
      // 새로운 학생 선택
      setSelectedStudents([student.id]);
    }
  };

  // CompactTable 컬럼 정의
  const columns: TableColumn[] = [
    {
      key: "fingerprintId",
      label: "지문ID",
      width: "80px",
      cellStyle: {
        fontFamily: "monospace",
        fontWeight: "600",
        color: colors.gray900,
      },
    },
    {
      key: "name",
      label: "이름",
      width: "120px",
      align: "left",
      cellStyle: {
        fontWeight: "500",
        color: colors.gray800,
      },
    },
    {
      key: "gradeClass",
      label: "학년/반/번호",
      width: "120px",
      render: (_, row: Student) => {
        if (row.grade && row.class && row.number) {
          return `${row.grade}학년 ${row.class}반 ${row.number}번`;
        } else if (row.grade && row.class) {
          return `${row.grade}학년 ${row.class}반`;
        }
        return "-";
      },
      cellStyle: {
        color: colors.gray600,
      },
    },
    {
      key: "attendanceCount",
      label: "출석 횟수",
      width: "100px",
      align: "right",
      render: (value) => `${value}회`,
      cellStyle: {
        fontWeight: "500",
        color: colors.gray700,
      },
    },
    {
      key: "totalStudyTime",
      label: "총 공부시간",
      width: "140px",
      align: "right",
      render: (value) => formatTime(value),
      cellStyle: {
        fontWeight: "600",
        color: colors.primary,
      },
    },
    {
      key: "actions",
      label: "관리",
      width: "80px",
      align: "center",
      render: (_, row: Student) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <SemiTagButton
            variant="danger"
            size="sm"
            icon="fa-solid fa-trash"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            title="삭제"
          />
        </div>
      ),
    },
  ];

  // 학년 옵션
  const gradeOptions = [
    { value: "", label: "전체 학년" },
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: colors.gray500 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "700",
                color: colors.gray900,
              }}
            >
              학생 목록
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: colors.gray500,
              }}
            >
              총 {filteredStudents.length}명의 학생이 등록되어 있습니다.
            </p>
          </div>
          <Button
            variant="primary"
            icon="fa-solid fa-plus"
            onClick={() => {
              setFormData({
                fingerprintId: "",
                name: "",
                grade: "",
                class: "",
                number: "",
              });
              setError(null);
              setShowAddModal(true);
            }}
          >
            학생 등록
          </Button>
        </div>

        {/* 필터 */}
        <div style={{ display: "flex", gap: "12px" }}>
          <Input
            placeholder="이름, 지문ID, 학번 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="fa-solid fa-search"
            fullWidth
          />
          <Select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            options={gradeOptions}
            style={{ minWidth: "140px" }}
          />
        </div>
      </div>

      {/* 테이블 컨테이너 */}
      <div
        style={{
          height: "calc(100vh - 360px)",
          background: colors.white,
          borderRadius: "12px",
          border: `1px solid ${colors.gray200}`,
          overflow: "hidden",
        }}
      >
        <CompactTable
          columns={columns}
          data={filteredStudents}
          keyExtractor={(row) => row.id}
          selectedRowKey={selectedStudents[0]}
          onRowClick={handleRowClick}
          emptyMessage={
            searchTerm || filterGrade
              ? "검색 결과가 없습니다."
              : "등록된 학생이 없습니다."
          }
          emptyIcon="fa-solid fa-user-slash"
          height="100%"
        />
      </div>

      {/* 학생 등록 모달 */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: "16px",
              padding: "24px",
              width: "440px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 20px",
                fontSize: "18px",
                fontWeight: "700",
                color: colors.gray900,
              }}
            >
              학생 등록
            </h3>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 14px",
                  background: "#fee2e2",
                  color: colors.red,
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <Input
                label="지문ID"
                type="number"
                value={formData.fingerprintId}
                onChange={(e) =>
                  setFormData({ ...formData, fingerprintId: e.target.value })
                }
                placeholder="예: 123"
                required
                fullWidth
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <Input
                label="이름"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 홍길동"
                required
                fullWidth
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <Input
                label="학년"
                type="number"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                placeholder="1-3"
                style={{ width: "100%" }}
              />
              <Input
                label="반"
                type="number"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
                placeholder="1-10"
                style={{ width: "100%" }}
              />
              <Input
                label="번호"
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                placeholder="1-40"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                fullWidth
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                autoLoading
                required
                fullWidth
              >
                등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 수정 모달 */}
      {showEditModal && editingStudent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: "16px",
              padding: "24px",
              width: "440px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 20px",
                fontSize: "18px",
                fontWeight: "700",
                color: colors.gray900,
              }}
            >
              학생 정보 수정
            </h3>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 14px",
                  background: "#fee2e2",
                  color: colors.red,
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <Input
                label="지문ID"
                type="number"
                value={formData.fingerprintId}
                disabled
                fullWidth
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <Input
                label="이름"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 홍길동"
                required
                fullWidth
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <Input
                label="학년"
                type="number"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                placeholder="1-3"
                style={{ width: "100%" }}
              />
              <Input
                label="반"
                type="number"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
                placeholder="1-10"
                style={{ width: "100%" }}
              />
              <Input
                label="번호"
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                placeholder="1-40"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingStudent(null);
                }}
                fullWidth
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleEdit}
                autoLoading
                required
                fullWidth
              >
                수정
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
