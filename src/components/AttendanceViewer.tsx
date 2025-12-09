import React, { useState, useEffect, useMemo } from "react";
import CompactTable, { TableColumn } from "@/components/common/CompactTable";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { useTabStore } from "@/store/tabStore";

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
  totalStudyTime: number;
  attendanceCount: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  studyDuration: number;
  deviceNumber?: string;
}

interface DailyAttendance {
  date: string;
  records: AttendanceRecord[];
  totalMinutes: number;
}

export default function AttendanceViewer({ tabId }: { tabId?: string }) {
  const { getTabState, setTabState } = useTabStore();
  
  // 초기 상태를 useMemo로 즉시 계산
  const initialState = useMemo(() => {
    if (!tabId) return null;
    return getTabState(tabId)?.attendanceViewer;
  }, [tabId, getTabState]);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    initialState?.selectedStudent || null
  );
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(
    initialState?.dateRange || { start: "", end: "" }
  );
  const [searchTerm, setSearchTerm] = useState(initialState?.searchTerm || "");
  const [displayedStudents, setDisplayedStudents] = useState<Student[]>(
    initialState?.displayedStudents || []
  );
  const [selectedGrade, setSelectedGrade] = useState<string>(
    initialState?.selectedGrade || "all"
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    initialState?.selectedClass || "all"
  );
  const [hoveredRecord, setHoveredRecord] = useState<{
    record: AttendanceRecord;
    date: string;
    position: { x: number; y: number };
    deviceLocation?: string;
  } | null>(null);
  const [timelineAnimating, setTimelineAnimating] = useState(false);

  // 상태 변경 시 저장 (debounce 적용)
  useEffect(() => {
    if (!tabId) return;
    
    const timeoutId = setTimeout(() => {
      setTabState(tabId, {
        attendanceViewer: {
          searchTerm,
          selectedGrade,
          selectedClass,
          displayedStudents,
          selectedStudent,
          dateRange,
        },
      });
    }, 200); // 200ms로 통일

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedGrade, selectedClass, displayedStudents, selectedStudent, dateRange]);

  useEffect(() => {
    fetchStudents();
    // 기본 날짜 설정 (최근 30일)
    if (!initialState?.dateRange) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setDateRange({
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      });
    }
  }, []);

  // 날짜 범위 변경 시 자동으로 데이터 재조회
  useEffect(() => {
    if (selectedStudent && dateRange.start && dateRange.end) {
      fetchAttendance(selectedStudent);
    }
  }, [dateRange]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/student");
      if (res.ok) {
        const data = await res.json();
        console.log("🔍 [AttendanceViewer] API 응답:", data);
        console.log("🔍 [AttendanceViewer] 첫 번째 학생:", data.students[0]);
        console.log("🔍 [AttendanceViewer] 학생 수:", data.students.length);
        
        // 학년 → 반 → 번호 순으로 정렬
        const sortedStudents = data.students.sort((a: Student, b: Student) => {
          // 학년 비교 (null은 맨 뒤로)
          if (a.grade === null && b.grade !== null) return 1;
          if (a.grade !== null && b.grade === null) return -1;
          if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
          
          // 반 비교 (null은 맨 뒤로)
          if (a.class === null && b.class !== null) return 1;
          if (a.class !== null && b.class === null) return -1;
          if (a.class !== b.class) return (a.class || 0) - (b.class || 0);
          
          // 번호 비교 (number 필드가 있다고 가정, 없으면 fingerprintId로 대체)
          const aNumber = (a as any).number || a.fingerprintId;
          const bNumber = (b as any).number || b.fingerprintId;
          return aNumber - bNumber;
        });
        
        setStudents(sortedStudents);
        setDisplayedStudents(sortedStudents);
      } else {
        console.error("❌ [AttendanceViewer] API 오류:", res.status);
      }
    } catch (e) {
      console.error("❌ [AttendanceViewer] Fetch 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (student: Student) => {
    try {
      const params = new URLSearchParams({
        fingerprintId: student.fingerprintId.toString(),
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const res = await fetch(`/api/attendance/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        
        console.log("🔍 [AttendanceViewer] API 응답 데이터:", data);
        
        // 날짜별로 그룹화
        const dailyMap = new Map<string, AttendanceRecord[]>();
        
        if (data.records && Array.isArray(data.records)) {
          data.records.forEach((record: AttendanceRecord) => {
            const dateStr = record.date.split("T")[0];
            
            console.log("🔍 [AttendanceViewer] 레코드:", {
              id: record.id,
              date: dateStr,
              checkInTime: record.checkInTime,
              checkOutTime: record.checkOutTime,
              isNull: record.checkOutTime === null,
              studyDuration: record.studyDuration,
            });
            
            if (!dailyMap.has(dateStr)) {
              dailyMap.set(dateStr, []);
            }
            dailyMap.get(dateStr)!.push(record);
          });
        }

        // 날짜 범위 내 모든 날짜 생성
        const days: DailyAttendance[] = [];
        const current = new Date(dateRange.start + "T00:00:00");
        const endDate = new Date(dateRange.end + "T23:59:59");

        while (current <= endDate) {
          const dateStr = current.toISOString().split("T")[0];
          const records = dailyMap.get(dateStr) || [];
          const totalMinutes = records.reduce((sum, r) => sum + r.studyDuration, 0);
          
          days.push({
            date: dateStr,
            records,
            totalMinutes,
          });

          current.setDate(current.getDate() + 1);
        }

        setAttendanceData(days.reverse());
        // 데이터 로드 직후 애니메이션 시작 (지체 없이)
        setTimeout(() => setTimelineAnimating(false), 10);
      } else {
        console.error("API error:", res.status, await res.text());
        setAttendanceData([]);
        setTimelineAnimating(false);
      }
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
      setAttendanceData([]);
      setTimelineAnimating(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setTimelineAnimating(true);
    
    // 데이터 초기화하여 즉시 빈 테이블 표시
    setAttendanceData([]);
    
    // 비동기로 데이터 가져오기
    fetchAttendance(student);
  };

  const formatTime = (minutes: number) => {
    const hours = (minutes / 60).toFixed(2);
    return `${hours}`;
  };

  const renderTimeline = (records: AttendanceRecord[]) => {
    if (!records || records.length === 0) return null;

    const blocks: React.ReactElement[] = [];
    
    records.forEach((record, idx) => {
      const checkIn = new Date(record.checkInTime);
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
      
      // 시간을 소수점으로 변환 (예: 9:30 = 9.5)
      const startHour = checkIn.getHours() + checkIn.getMinutes() / 60;
      const endHour = checkOut ? checkOut.getHours() + checkOut.getMinutes() / 60 : startHour;
      
      // 전체 24시간 중에서의 위치 계산
      const left = (startHour / 24) * 100;
      const width = ((endHour - startHour) / 24) * 100;
      
      // 최소 폭 보장
      const minWidth = 0.3;
      const displayWidth = Math.max(width, minWidth);

      const formatTimeDisplay = (date: Date) => {
        const h = date.getHours();
        const m = String(date.getMinutes()).padStart(2, "0");
        return `${h}:${m}`;
      };

      blocks.push(
        <div
          key={idx}
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${displayWidth}%`,
            height: "20px",
            background: colors.green,
            borderRadius: "3px",
            top: "50%",
            transform: "translateY(-50%)",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(48, 176, 110, 0.3)",
          }}
          title={checkOut ? `${formatTimeDisplay(checkIn)} ~ ${formatTimeDisplay(checkOut)} (${formatTime(record.studyDuration)})` : `${formatTimeDisplay(checkIn)} ~ 공부 중`}
        />
      );
    });

    return blocks;
  };

  const filteredStudents = students.filter((s) =>
    s.name.includes(searchTerm) || s.fingerprintId.toString().includes(searchTerm)
  );

  const handleSearch = () => {
    let filtered = students;

    // 학년 필터
    if (selectedGrade !== "all") {
      filtered = filtered.filter((s) => s.grade?.toString() === selectedGrade);
    }

    // 반 필터
    if (selectedClass !== "all") {
      filtered = filtered.filter((s) => s.class?.toString() === selectedClass);
    }

    // 이름 검색
    if (searchTerm.trim()) {
      filtered = filtered.filter((s) => s.name.includes(searchTerm.trim()));
    }

    // 정렬 적용
    const sortedFiltered = filtered.sort((a: Student, b: Student) => {
      if (a.grade === null && b.grade !== null) return 1;
      if (a.grade !== null && b.grade === null) return -1;
      if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
      
      if (a.class === null && b.class !== null) return 1;
      if (a.class !== null && b.class === null) return -1;
      if (a.class !== b.class) return (a.class || 0) - (b.class || 0);
      
      const aNumber = (a as any).number || a.fingerprintId;
      const bNumber = (b as any).number || b.fingerprintId;
      return aNumber - bNumber;
    });

    setDisplayedStudents(sortedFiltered);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 학년 선택 변경 시 (조회 버튼을 눌러야 반영됨)
  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
  };

  // 반 선택 변경 시 (조회 버튼을 눌러야 반영됨)
  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  // 검색어 변경 시 (조회 버튼을 눌러야 반영됨)
  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
  };

  // CompactTable 컬럼 정의
  const studentColumns: TableColumn[] = [
    {
      key: "grade",
      label: "학년",
      width: "50px",
      render: (value) => value ?? "-",
    },
    {
      key: "class",
      label: "반",
      width: "50px",
      render: (value) => value ?? "-",
    },
    {
      key: "number",
      label: "번호",
      width: "60px",
      render: (value) => value ?? "-",
      cellStyle: {
        fontFamily: "monospace",
        color: colors.gray600,
      },
    },
    {
      key: "name",
      label: "이름",
      align: "left",
      cellStyle: {
        fontSize: "13px",
        color: colors.gray900,
      },
    },
  ];

  // 학년/반 목록 추출 (중복 제거 및 정렬)
  const grades = Array.from(new Set(students.filter(s => s.grade).map(s => s.grade)))
    .sort((a, b) => (a! - b!));
  
  const classes = Array.from(new Set(students.filter(s => s.class).map(s => s.class)))
    .sort((a, b) => (a! - b!));

  // Select 옵션 생성
  const gradeOptions = [
    { value: "all", label: "학년" },
    ...grades.map(grade => ({
      value: grade!.toString(),
      label: `${grade}학년`
    }))
  ];

  const classOptions = [
    { value: "all", label: "반" },
    ...classes.map(cls => ({
      value: cls!.toString(),
      label: `${cls}반`
    }))
  ];

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: colors.gray500 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "20px", height: "100%" }}>
      {/* 왼쪽: 학생 목록 */}
      <div
        style={{
          width: "350px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* 검색 필터 */}
        <div
          style={{
            background: colors.white,
            borderRadius: "12px",
            border: `1px solid ${colors.gray200}`,
            padding: "16px",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "15px",
              fontWeight: "700",
              color: colors.gray900,
            }}
          >
            학생 검색
          </h3>
          
          {/* 학년/반 필터 + 이름 검색 + 조회 버튼 */}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <Select
              size="sm"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              options={gradeOptions}
              style={{ width: "85px" }}
            />
            
            <Select
              size="sm"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classOptions}
              style={{ width: "75px" }}
            />

            <Input
              size="sm"
              placeholder="이름 검색..."
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ width: "90px" }}
            />
            
            <Button
              size="sm"
              variant="primary"
              onClick={handleSearch}
              required
              autoLoading
              loadingDuration={500}
              style={{ whiteSpace: "nowrap" }}
            >
              조회
            </Button>
          </div>
        </div>

        {/* 학생 목록 테이블 컨테이너 */}
        <div
          style={{
            flex: 1,
            background: colors.white,
            borderRadius: "12px",
            border: `1px solid ${colors.gray200}`,
            overflow: "hidden",
          }}
        >
          <CompactTable
            columns={studentColumns}
            data={displayedStudents}
            keyExtractor={(row) => row.id}
            selectedRowKey={selectedStudent?.id}
            onRowClick={handleSelectStudent}
            emptyMessage="조회 버튼을 눌러 학생을 검색하세요."
            emptyIcon="fa-solid fa-user-slash"
            height="100%"
            rowHeight="20px"
          />
        </div>
      </div>

      {/* 오른쪽: 타임라인 */}
      <div
        style={{
          flex: 1,
          background: colors.white,
          borderRadius: "12px",
          border: `1px solid ${colors.gray200}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.gray200}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: "16px",
                fontWeight: "700",
                color: colors.gray900,
              }}
            >
              {selectedStudent
                ? `${selectedStudent.name}님의 출석 기록`
                : "학생을 선택하세요"}
            </h3>
            {selectedStudent && (
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: colors.gray500,
                }}
              >
                총 {selectedStudent.attendanceCount}회 출석 · 누적{" "}
                {formatTime(selectedStudent.totalStudyTime)}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
              }}
              style={{
                padding: "8px 12px",
                border: `1px solid ${colors.gray300}`,
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <span style={{ color: colors.gray400 }}>~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
              }}
              style={{
                padding: "8px 12px",
                border: `1px solid ${colors.gray300}`,
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* 타임라인 */}
        {selectedStudent ? (
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {/* CSS 애니메이션 추가 */}
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes ripple {
                  0% {
                    transform: scale(1);
                    opacity: 0.8;
                  }
                  100% {
                    transform: scale(3);
                    opacity: 0;
                  }
                }
              `
            }} />
            
            {/* 테이블 헤더 */}
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: colors.gray50, zIndex: 10 }}>
                  <th
                    style={{
                      width: "36px",
                      padding: "8px 4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: colors.gray600,
                      borderBottom: `2px solid ${colors.gray300}`,
                      borderRight: `1px solid ${colors.gray200}`,
                      textAlign: "center",
                      background: colors.gray50,
                    }}
                  >
                    요일
                  </th>
                  <th
                    style={{
                      width: "30px",
                      padding: "8px 4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: colors.gray600,
                      borderBottom: `2px solid ${colors.gray300}`,
                      borderRight: `1px solid ${colors.gray200}`,
                      textAlign: "center",
                      background: colors.gray50,
                    }}
                  >
                    월
                  </th>
                  <th
                    style={{
                      width: "30px",
                      padding: "8px 4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: colors.gray600,
                      borderBottom: `2px solid ${colors.gray300}`,
                      borderRight: `1px solid ${colors.gray200}`,
                      textAlign: "center",
                      background: colors.gray50,
                    }}
                  >
                    일
                  </th>
                  {/* 0~24시 전체 영역 - 26개 컬럼 (0~25) */}
                  <th
                    colSpan={26}
                    style={{
                      padding: "8px 0",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: colors.gray600,
                      borderBottom: `2px solid ${colors.gray300}`,
                      borderRight: `1px solid ${colors.gray200}`,
                      textAlign: "center",
                      background: colors.gray50,
                      position: "relative",
                    }}
                  >
                    <div style={{ 
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}>
                      {Array.from({ length: 25 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: `${((i + 1) / 26) * 100}%`,
                            transform: "translateX(-50%)",
                            fontSize: "10px",
                            fontWeight: i % 3 === 0 ? "700" : "500",
                            color: i % 3 === 0 ? colors.gray700 : colors.gray500,
                          }}
                        >
                          {i}
                        </div>
                      ))}
                    </div>
                  </th>
                  {/* 버퍼 컬럼 제거 */}
                  <th
                    style={{
                      width: "48px",
                      padding: "8px 4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: colors.gray600,
                      borderBottom: `2px solid ${colors.gray300}`,
                      textAlign: "center",
                      background: colors.gray50,
                    }}
                  >
                    총 시간
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length > 0 ? (
                  attendanceData.map((day) => {
                    const dayDate = new Date(day.date + "T00:00:00");
                    const weekday = dayDate.toLocaleDateString("ko-KR", { weekday: "short" });
                    const month = dayDate.getMonth() + 1;
                    const date = dayDate.getDate();
                    const dayOfWeek = dayDate.getDay();

                    const weekdayColor = 
                      dayOfWeek === 0 ? colors.red :
                      dayOfWeek === 6 ? "#0066cc" :
                      colors.gray700;

                    return (
                      <tr key={day.date}>
                        <td
                          style={{
                            padding: "6px 2px",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: weekdayColor,
                            borderRight: `1px solid ${colors.gray200}`,
                            borderBottom: `1px solid ${colors.gray100}`,
                            textAlign: "center",
                            background: colors.gray50,
                            height: "24px",
                          }}
                        >
                          {weekday}
                        </td>
                        <td
                          style={{
                            padding: "6px 2px",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: colors.gray700,
                            borderRight: `1px solid ${colors.gray200}`,
                            borderBottom: `1px solid ${colors.gray100}`,
                            textAlign: "center",
                            background: colors.gray50,
                            height: "24px",
                          }}
                        >
                          {month}
                        </td>
                        <td
                          style={{
                            padding: "6px 2px",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: colors.gray700,
                            borderRight: `1px solid ${colors.gray200}`,
                            borderBottom: `1px solid ${colors.gray100}`,
                            textAlign: "center",
                            background: colors.gray50,
                            height: "24px",
                          }}
                        >
                          {date}
                        </td>
                        {/* 0~25시 타임라인 - 26개 컬럼 */}
                        <td
                          colSpan={26}
                          style={{
                            padding: 0,
                            position: "relative",
                            height: "24px",
                            borderBottom: `1px solid ${colors.gray100}`,
                            borderRight: `1px solid ${colors.gray200}`,
                            background: colors.white,
                          }}
                        >
                          {/* 시간 그리드선 (배경) - 26개 */}
                          <div style={{ 
                            position: "absolute", 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0,
                            display: "flex",
                          }}>
                            {Array.from({ length: 26 }, (_, hour) => (
                              <div
                                key={hour}
                                style={{
                                  flex: 1,
                                  borderRight: hour < 25 ? (hour % 3 === 0 ? `1px solid ${colors.gray300}` : `1px solid ${colors.gray100}`) : "none",
                                }}
                              />
                            ))}
                          </div>

                          {/* 출석 기록 바 (연속된 줄) */}
                          {day.records.map((record, idx) => {
                            console.log("🎨 [렌더링]", {
                              idx,
                              date: day.date,
                              checkInTime: record.checkInTime,
                              checkOutTime: record.checkOutTime,
                              isNull: record.checkOutTime === null,
                              typeOf: typeof record.checkOutTime,
                            });
                            
                            const checkIn = new Date(record.checkInTime);
                            const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
                            
                            // 현재 공부 중인 경우 현재 시간을 endHour로 사용
                            const now = new Date();
                            const isStudying = record.checkOutTime === null;
                            const effectiveCheckOut = isStudying ? now : checkOut;
                            
                            const startHour = checkIn.getHours() + checkIn.getMinutes() / 60;
                            const endHour = effectiveCheckOut ? effectiveCheckOut.getHours() + effectiveCheckOut.getMinutes() / 60 : startHour;
                            
                            // 26개 그리드: [빈칸][0시][1시]...[24시]
                            const colWidth = 100 / 26;
                            const timeStart = colWidth * 0.99;
                            const timeWidth = colWidth * 24.0;
                            
                            const startPos = (startHour / 24) * timeWidth;
                            const endPos = (endHour / 24) * timeWidth;
                            
                            const left = timeStart + startPos;
                            const width = endPos - startPos;
                            const centerPos = left + width / 2;
                            const rightPos = left + width; // 바의 끝 위치 (현재 시간)
                            
                            console.log("✅ [판단]", {
                              idx,
                              isStudying,
                              checkOutTime: record.checkOutTime,
                            });

                            if (isStudying) {
                              console.log("🔴 [빨간바+점 렌더링]", { idx, left, width, rightPos });
                              // 현재 공부 중: 빨간 바 + 끝에 빨간 점 + 도플러 효과
                              return (
                                <React.Fragment key={idx}>
                                  {/* 빨간 타임라인 바 */}
                                  <div
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const scrollTop = e.currentTarget.closest('div[style*="overflowY"]')?.scrollTop || 0;
                                      
                                      setHoveredRecord({
                                        record,
                                        date: day.date,
                                        deviceLocation: record.deviceNumber || "미지정",
                                        position: {
                                          x: rect.left + rect.width / 2,
                                          y: rect.top + scrollTop,
                                        },
                                      });
                                    }}
                                    style={{
                                      position: "absolute",
                                      left: timelineAnimating ? `${centerPos}%` : `${left}%`,
                                      width: timelineAnimating ? "0%" : `${width}%`,
                                      height: "8px",
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      background: `linear-gradient(135deg, ${colors.red} 0%, #d63447 100%)`,
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      boxShadow: "0 1px 3px rgba(240, 68, 82, 0.3)",
                                      transition: timelineAnimating 
                                        ? "none" 
                                        : "left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s ease",
                                      zIndex: 5,
                                      opacity: timelineAnimating ? 0 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!timelineAnimating) {
                                        e.currentTarget.style.height = "10px";
                                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(240, 68, 82, 0.4)";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.height = "8px";
                                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(240, 68, 82, 0.3)";
                                    }}
                                  />
                                  
                                  {/* 현재 시간 위치의 빨간 점 + 도플러 효과 */}
                                  <div
                                    style={{
                                      position: "absolute",
                                      left: timelineAnimating ? `${centerPos}%` : `${rightPos}%`,
                                      top: "50%",
                                      transform: "translate(-50%, -50%)",
                                      zIndex: 10,
                                      opacity: timelineAnimating ? 0 : 1,
                                      transition: timelineAnimating 
                                        ? "none" 
                                        : "left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
                                      width: "8px",
                                      height: "8px",
                                    }}
                                  >
                                    {/* 도플러 효과 (3개의 동심원) */}
                                    {[0, 0.4, 0.8].map((delay) => (
                                      <div
                                        key={delay}
                                        style={{
                                          position: "absolute",
                                          width: "8px",
                                          height: "8px",
                                          borderRadius: "50%",
                                          background: colors.red,
                                          top: "0",
                                          left: "0",
                                          animation: `ripple 2s ease-out infinite`,
                                          animationDelay: `${delay}s`,
                                        }}
                                      />
                                    ))}
                                    
                                    {/* 중심 빨간 점 */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const scrollTop = e.currentTarget.closest('div[style*="overflowY"]')?.scrollTop || 0;
                                        
                                        setHoveredRecord({
                                          record,
                                          date: day.date,
                                          deviceLocation: record.deviceNumber || "미지정",
                                          position: {
                                            x: rect.left + rect.width / 2,
                                            y: rect.top + scrollTop,
                                          },
                                        });
                                      }}
                                      style={{
                                        position: "absolute",
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        background: colors.red,
                                        cursor: "pointer",
                                        boxShadow: "0 2px 8px rgba(240, 68, 82, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.8)",
                                        top: "0",
                                        left: "0",
                                        zIndex: 1,
                                      }}
                                    />
                                  </div>
                                </React.Fragment>
                              );
                            }

                            console.log("🟢 [초록바 렌더링]", { idx, left, width });
                            // 일반 출석 기록: 초록색 바
                            return (
                              <div
                                key={idx}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const scrollTop = e.currentTarget.closest('div[style*="overflowY"]')?.scrollTop || 0;
                                  
                                  setHoveredRecord({
                                    record,
                                    date: day.date,
                                    deviceLocation: record.deviceNumber || "미지정",
                                    position: {
                                      x: rect.left + rect.width / 2,
                                      y: rect.top + scrollTop,
                                    },
                                  });
                                }}
                                style={{
                                  position: "absolute",
                                  left: timelineAnimating ? `${centerPos}%` : `${left}%`,
                                  width: timelineAnimating ? "0%" : `${width}%`,
                                  height: "8px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  background: `linear-gradient(135deg, ${colors.green} 0%, #26a65b 100%)`,
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  boxShadow: "0 1px 3px rgba(48, 176, 110, 0.3)",
                                  transition: timelineAnimating 
                                    ? "none" 
                                    : "left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s ease",
                                  zIndex: 5,
                                  opacity: timelineAnimating ? 0 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!timelineAnimating) {
                                    e.currentTarget.style.height = "10px";
                                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(48, 176, 110, 0.4)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.height = "8px";
                                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(48, 176, 110, 0.3)";
                                }}
                              />
                            );
                          })}
                        </td>
                        {/* 버퍼 셀 제거 */}
                        <td
                          style={{
                            padding: "6px 4px",
                            fontSize: "10px",
                            fontWeight: "600",
                            color: day.totalMinutes > 0 ? colors.primary : colors.gray400,
                            textAlign: "center",
                            background: colors.gray50,
                            height: "24px",
                            borderBottom: `1px solid ${colors.gray100}`,
                          }}
                        >
                          {day.totalMinutes > 0 ? formatTime(day.totalMinutes) : "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={29}
                      style={{
                        padding: "60px 20px",
                        textAlign: "center",
                        color: colors.gray500,
                      }}
                    >
                      {timelineAnimating ? (
                        <>
                          <i
                            className="fa-solid fa-spinner fa-spin"
                            style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3, display: "block" }}
                          />
                          <p style={{ margin: 0, fontSize: "14px" }}>
                            출석 기록을 불러오는 중...
                          </p>
                        </>
                      ) : (
                        <>
                          <i
                            className="fa-solid fa-calendar-xmark"
                            style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3, display: "block" }}
                          />
                          <p style={{ margin: 0, fontSize: "14px" }}>
                            선택한 기간에 출석 기록이 없습니다.
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.gray400,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <i
                className="fa-solid fa-user-check"
                style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}
              />
              <p style={{ margin: 0, fontSize: "15px" }}>
                왼쪽에서 학생을 선택하세요
              </p>
            </div>
          </div>
        )}

        {/* 출석 기록 상세 말풍선 */}
        {hoveredRecord && (
          <>
            {/* 배경 오버레이 (클릭 시 닫기) */}
            <div
              onClick={() => setHoveredRecord(null)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
            />
            
            {/* 말풍선 */}
            <div
              style={{
                position: "fixed",
                left: `${hoveredRecord.position.x}px`,
                top: `${hoveredRecord.position.y - 220}px`,
                transform: "translateX(-50%)",
                background: colors.white,
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                zIndex: 1000,
                minWidth: "280px",
                border: `2px solid ${colors.primary}`,
                animation: "fadeInScale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 화살표 */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: `10px solid ${colors.primary}`,
                }}
              />
              
              {/* 내용 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  paddingBottom: "12px",
                  borderBottom: `1px solid ${colors.gray200}`,
                }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: "15px", 
                    fontWeight: "700", 
                    color: colors.gray900,
                  }}>
                    출석 상세 정보
                  </h4>
                  <button
                    onClick={() => setHoveredRecord(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: colors.gray400,
                      fontSize: "16px",
                    }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-calendar" style={{ 
                      width: "20px", 
                      color: colors.primary,
                      fontSize: "14px",
                    }} />
                    <span style={{ fontSize: "13px", color: colors.gray700, fontWeight: "600" }}>
                      날짜:
                    </span>
                    <span style={{ fontSize: "13px", color: colors.gray900 }}>
                      {new Date(hoveredRecord.date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-clock" style={{ 
                      width: "20px", 
                      color: colors.green,
                      fontSize: "14px",
                    }} />
                    <span style={{ fontSize: "13px", color: colors.gray700, fontWeight: "600" }}>
                      입실:
                    </span>
                    <span style={{ fontSize: "13px", color: colors.gray900 }}>
                      {new Date(hoveredRecord.record.checkInTime).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-clock" style={{ 
                      width: "20px", 
                      color: colors.red,
                      fontSize: "14px",
                    }} />
                    <span style={{ fontSize: "13px", color: colors.gray700, fontWeight: "600" }}>
                      퇴실:
                    </span>
                    <span style={{ fontSize: "13px", color: colors.gray900 }}>
                      {hoveredRecord.record.checkOutTime 
                        ? new Date(hoveredRecord.record.checkOutTime).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "공부 중"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-hourglass-half" style={{ 
                      width: "20px", 
                      color: colors.primary,
                      fontSize: "14px",
                    }} />
                    <span style={{ fontSize: "13px", color: colors.gray700, fontWeight: "600" }}>
                      학습시간:
                    </span>
                    <span style={{ 
                      fontSize: "14px", 
                      color: hoveredRecord.record.checkOutTime ? colors.primary : colors.red, 
                      fontWeight: "700",
                    }}>
                      {hoveredRecord.record.checkOutTime 
                        ? `${formatTime(hoveredRecord.record.studyDuration)}시간`
                        : "진행 중"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-solid fa-computer" style={{ 
                      width: "20px", 
                      color: colors.gray600,
                      fontSize: "14px",
                    }} />
                    <span style={{ fontSize: "13px", color: colors.gray700, fontWeight: "600" }}>
                      기기:
                    </span>
                    <span style={{ fontSize: "13px", color: colors.gray900 }}>
                      {hoveredRecord.deviceLocation}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CSS 애니메이션 */}
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes fadeInScale {
                  0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.9);
                  }
                  100% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                  }
                }
              `
            }} />
          </>
        )}
      </div>
    </div>
  );
}
