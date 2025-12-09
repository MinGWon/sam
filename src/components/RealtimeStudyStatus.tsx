import React, { useState, useEffect, useMemo } from "react";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
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

interface Device {
  id: string;
  deviceNumber: string;
  location: string;
  isActive: boolean;
}

interface StudyingStudent {
  id: string;
  name: string;
  grade: number | null;
  class: number | null;
  fingerprintId: number;
  checkInTime: string;
  elapsedMinutes: number;
}

interface RecentStudent {
  id: string;
  name: string;
  grade: number | null;
  class: number | null;
  fingerprintId: number;
  checkInTime: string;
  checkOutTime: string;
  studyDuration: number;
}

export default function RealtimeStudyStatus({ tabId }: { tabId?: string }) {
  const { getTabState, setTabState } = useTabStore();
  
  const initialState = useMemo(() => {
    if (!tabId) return null;
    return getTabState(tabId)?.realtimeStudyStatus;
  }, [tabId, getTabState]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(initialState?.selectedDevice || "");
  const [studyingStudents, setStudyingStudents] = useState<StudyingStudent[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 상태 저장
  useEffect(() => {
    if (!tabId) return;
    
    const timeoutId = setTimeout(() => {
      setTabState(tabId, {
        realtimeStudyStatus: {
          selectedDevice,
        },
      });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [selectedDevice]);

  // 기기 목록 조회
  useEffect(() => {
    fetchDevices();
  }, []);

  // 선택된 기기의 실시간 데이터 조회
  useEffect(() => {
    if (selectedDevice) {
      fetchRealtimeData();
    }
  }, [selectedDevice]);

  // 자동 새로고침 (10초마다)
  useEffect(() => {
    if (!autoRefresh || !selectedDevice) return;

    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDevice]);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/device");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices.filter((d: Device) => d.isActive));
        
        if (data.devices.length > 0 && !selectedDevice) {
          setSelectedDevice(data.devices[0].deviceNumber);
        }
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    if (!selectedDevice) return;

    try {
      const res = await fetch(`/api/attendance/realtime?deviceNumber=${selectedDevice}`);
      if (res.ok) {
        const data = await res.json();
        setStudyingStudents(data.studying);
        setRecentStudents(data.recent);
      }
    } catch (e) {
      console.error("Failed to fetch realtime data:", e);
    }
  };

  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deviceOptions = [
    { value: "", label: "기기 선택" },
    ...devices.map(device => ({
      value: device.deviceNumber,
      label: `${device.location} (${device.deviceNumber})`,
    })),
  ];

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: colors.gray500 }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
      {/* 상단 컨트롤 */}
      <div
        style={{
          background: colors.white,
          borderRadius: "12px",
          border: `1px solid ${colors.gray200}`,
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            options={deviceOptions}
            style={{ width: "300px" }}
            required
          />
          
          <Button
            variant="primary"
            icon="fa-solid fa-rotate"
            onClick={() => fetchRealtimeData()}
            autoLoading
            loadingDuration={1000}
          >
            새로고침
          </Button>
          
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: "16px", height: "16px" }}
            />
            <span style={{ fontSize: "14px", color: colors.gray700 }}>
              자동 새로고침 (10초)
            </span>
          </label>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      {selectedDevice ? (
        <div style={{ display: "flex", gap: "20px", flex: 1, overflow: "hidden" }}>
          {/* 왼쪽: 공부 중인 학생 */}
          <div
            style={{
              flex: 1,
              background: colors.white,
              borderRadius: "16px",
              border: `1px solid ${colors.gray200}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: `1px solid ${colors.gray200}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "700",
                  color: colors.gray900,
                }}
              >
                공부 중인 학생
              </h3>
              <div
                style={{
                  padding: "6px 12px",
                  background: colors.primaryLight,
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {studyingStudents.length}명
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "10px",
                alignContent: "flex-start",
              }}
            >
              {studyingStudents.length > 0 ? (
                studyingStudents.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      aspectRatio: "1",
                      background: colors.white,
                      borderRadius: "10px",
                      padding: "12px",
                      border: `2px solid ${colors.green}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 8px rgba(48, 176, 110, 0.1)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(48, 176, 110, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(48, 176, 110, 0.1)";
                    }}
                  >
                    {/* 공부 중 표시 */}
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: colors.green,
                        boxShadow: `0 0 0 2px ${colors.white}, 0 0 6px ${colors.green}`,
                        animation: "pulse 2s infinite",
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: colors.gray900,
                          lineHeight: "1.2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.name}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: colors.gray500,
                          fontWeight: "500",
                        }}
                      >
                        {student.grade && student.class
                          ? `${student.grade}-${student.class}`
                          : `#${student.fingerprintId}`}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: colors.gray600,
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <i className="fa-solid fa-arrow-right-to-bracket" style={{ fontSize: "9px", color: colors.green }} />
                        {formatTime(student.checkInTime)}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: colors.green,
                        }}
                      >
                        {formatElapsedTime(student.elapsedMinutes)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "80px 20px",
                    color: colors.gray400,
                  }}
                >
                  <i
                    className="fa-solid fa-user-clock"
                    style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}
                  />
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    현재 공부 중인 학생이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 최근 퇴실 학생 */}
          <div
            style={{
              flex: 1,
              background: colors.white,
              borderRadius: "16px",
              border: `1px solid ${colors.gray200}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: `1px solid ${colors.gray200}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "700",
                  color: colors.gray900,
                }}
              >
                최근 퇴실 학생
              </h3>
              <div
                style={{
                  fontSize: "12px",
                  color: colors.gray500,
                  fontWeight: "500",
                }}
              >
                최근 10명
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "10px",
                alignContent: "flex-start",
              }}
            >
              {recentStudents.length > 0 ? (
                recentStudents.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      aspectRatio: "1",
                      background: colors.gray50,
                      borderRadius: "10px",
                      padding: "12px",
                      border: `1px solid ${colors.gray200}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.background = colors.white;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                      e.currentTarget.style.background = colors.gray50;
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: colors.gray900,
                          lineHeight: "1.2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {student.name}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: colors.gray500,
                          fontWeight: "500",
                        }}
                      >
                        {student.grade && student.class
                          ? `${student.grade}-${student.class}`
                          : `#${student.fingerprintId}`}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: colors.gray600,
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <i className="fa-solid fa-arrow-right-to-bracket" style={{ fontSize: "9px", color: colors.green }} />
                        {formatTime(student.checkInTime)}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: colors.gray600,
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: "9px", color: colors.red }} />
                        {formatTime(student.checkOutTime)}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: colors.primary,
                          marginTop: "2px",
                        }}
                      >
                        {formatElapsedTime(student.studyDuration)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "80px 20px",
                    color: colors.gray400,
                  }}
                >
                  <i
                    className="fa-solid fa-door-open"
                    style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}
                  />
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    최근 퇴실 기록이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            background: colors.white,
            borderRadius: "16px",
            border: `1px solid ${colors.gray200}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: colors.gray400 }}>
            <i
              className="fa-solid fa-computer"
              style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}
            />
            <p style={{ margin: 0, fontSize: "15px" }}>
              자습 기기를 선택하세요
            </p>
          </div>
        </div>
      )}
      
      {/* CSS 애니메이션 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `
      }} />
    </div>
  );
}
