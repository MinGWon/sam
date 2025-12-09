import { useState, useEffect, useMemo } from "react";
import { useTabStore } from "@/store/tabStore";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import CompactTable, { TableColumn } from "@/components/common/CompactTable";
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

interface Device {
  id: string;
  deviceNumber: string;
  name: string;
  location: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function DeviceManagement({ tabId }: { tabId?: string }) {
  const { getTabState, setTabState } = useTabStore();

  const initialState = useMemo(() => {
    if (!tabId) return null;
    return getTabState(tabId)?.deviceManagement;
  }, [tabId, getTabState]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthCodeModal, setShowAuthCodeModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(
    initialState?.selectedDevice || null
  );
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [authCodeExpiry, setAuthCodeExpiry] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ deviceNumber: "", name: "", location: "" });
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState(
    initialState?.filterStatus || "all"
  );

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/device");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAdd = async () => {
    setError(null);
    if (!formData.deviceNumber || !formData.name) {
      setError("기기번호와 기기명은 필수입니다.");
      return;
    }

    try {
      const res = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({ deviceNumber: "", name: "", location: "" });
        fetchDevices();
      } else {
        const data = await res.json();
        setError(data.error || "등록에 실패했습니다.");
      }
    } catch (e) {
      setError("등록 중 오류가 발생했습니다.");
    }
  };

  const handleEdit = async () => {
    if (!selectedDevice) return;
    setError(null);

    try {
      const res = await fetch(`/api/device/${selectedDevice}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedDevice(null);
        setFormData({ deviceNumber: "", name: "", location: "" });
        fetchDevices();
      } else {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
      }
    } catch (e) {
      setError("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (device: Device) => {
    if (!confirm(`'${device.name}' 기기를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/device/${device.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDevices();
      }
    } catch (e) {
      console.error("Failed to delete device:", e);
    }
  };

  const handleToggleActive = async (device: Device) => {
    try {
      const res = await fetch(`/api/device/${device.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !device.isActive }),
      });
      if (res.ok) {
        fetchDevices();
      }
    } catch (e) {
      console.error("Failed to toggle device:", e);
    }
  };

  const handleGenerateAuthCode = async (device: Device) => {
    try {
      const res = await fetch("/api/device/auth-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: device.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuthCode(data.authCode);
        setAuthCodeExpiry(new Date(data.expiresAt));
        setSelectedDevice(device.id);
        setShowAuthCodeModal(true);
      }
    } catch (e) {
      console.error("Failed to generate auth code:", e);
    }
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device.id);
    setFormData({
      deviceNumber: device.deviceNumber,
      name: device.name,
      location: device.location || "",
    });
    setError(null);
    setShowEditModal(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  useEffect(() => {
    if (!tabId) return;
    
    const timeoutId = setTimeout(() => {
      setTabState(tabId, {
        deviceManagement: {
          selectedDevice,
          filterStatus,
        },
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedDevice, filterStatus]);

  // CompactTable 컬럼 정의
  const deviceColumns: TableColumn[] = [
    {
      key: "deviceNumber",
      label: "기기번호",
      width: "120px",
      align: "left",
      cellStyle: {
        fontWeight: "600",
        fontFamily: "monospace",
      },
    },
    {
      key: "name",
      label: "기기명",
      align: "left",
      cellStyle: {
        fontSize: "13px",
      },
    },
    {
      key: "location",
      label: "설치 위치",
      align: "left",
      cellStyle: {
        color: colors.gray600,
      },
      render: (value) => value || "-",
    },
    {
      key: "isActive",
      label: "상태",
      width: "80px",
      render: (value) => (
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            background: value ? "#dcfce7" : colors.gray100,
            color: value ? colors.green : colors.gray500,
          }}
        >
          {value ? "활성" : "비활성"}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      label: "마지막 접속",
      width: "180px",
      cellStyle: {
        fontSize: "12px",
        color: colors.gray500,
      },
      render: (value) => formatDate(value),
    },
    {
      key: "actions",
      label: "관리",
      width: "200px",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <SemiTagButton
            variant="primary"
            size="sm"
            icon="fa-solid fa-key"
            onClick={() => handleGenerateAuthCode(row)}
            title="인가코드 발급"
          />
          <SemiTagButton
            variant="gray"
            size="sm"
            icon="fa-solid fa-pen"
            onClick={() => openEditModal(row)}
            title="수정"
          />
          <SemiTagButton
            variant={row.isActive ? "warning" : "success"}
            size="sm"
            icon={`fa-solid ${row.isActive ? "fa-pause" : "fa-play"}`}
            onClick={() => handleToggleActive(row)}
            title={row.isActive ? "비활성화" : "활성화"}
          />
          <SemiTagButton
            variant="danger"
            size="sm"
            icon="fa-solid fa-trash"
            onClick={() => handleDelete(row)}
            title="삭제"
          />
        </div>
      ),
    },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: colors.gray900 }}>
            출결 기기 목록
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.gray500 }}>
            총 {devices.length}개의 기기가 등록되어 있습니다.
          </p>
        </div>
        <Button
          variant="primary"
          icon="fa-solid fa-plus"
          onClick={() => {
            setFormData({ deviceNumber: "", name: "", location: "" });
            setError(null);
            setShowAddModal(true);
          }}
        >
          기기 등록
        </Button>
      </div>

      {/* 테이블 컨테이너 */}
      <div
        style={{
          background: colors.white,
          borderRadius: "12px",
          border: `1px solid ${colors.gray200}`,
          overflow: "hidden",
        }}
      >
        <CompactTable
          columns={deviceColumns}
          data={devices}
          keyExtractor={(row) => row.id}
          emptyMessage="등록된 기기가 없습니다."
          emptyIcon="fa-solid fa-microchip"
          height="calc(100vh - 320px)"
          rowHeight="20px"
        />
      </div>

      {/* 기기 등록 모달 */}
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
              width: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700", color: colors.gray900 }}>
              기기 등록
            </h3>
            
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#fee2e2", color: colors.red, borderRadius: "8px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <Input
              label="기기번호"
              value={formData.deviceNumber}
              onChange={(e) => setFormData({ ...formData, deviceNumber: e.target.value })}
              placeholder="예: DEV-001"
              required
              fullWidth
              style={{ marginBottom: "16px" }}
            />

            <Input
              label="기기명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 1학년 1반 출결기기"
              required
              fullWidth
              style={{ marginBottom: "16px" }}
            />

            <Input
              label="설치 위치"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="예: 본관 1층 1-1 교실"
              fullWidth
              style={{ marginBottom: "24px" }}
            />

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
                loadingDuration={800}
                fullWidth
              >
                등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 기기 수정 모달 */}
      {showEditModal && selectedDevice && (
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
              width: "400px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "700", color: colors.gray900 }}>
              기기 수정
            </h3>

            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#fee2e2", color: colors.red, borderRadius: "8px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <Input
              label="기기번호"
              value={formData.deviceNumber}
              disabled
              fullWidth
              style={{ marginBottom: "16px" }}
            />

            <Input
              label="기기명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              style={{ marginBottom: "16px" }}
            />

            <Input
              label="설치 위치"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
              style={{ marginBottom: "24px" }}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(false)}
                fullWidth
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleEdit}
                autoLoading
                loadingDuration={800}
                fullWidth
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 인가코드 모달 */}
      {showAuthCodeModal && selectedDevice && authCode && (
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
          onClick={() => setShowAuthCodeModal(false)}
        >
          <div
            style={{
              background: colors.white,
              borderRadius: "16px",
              padding: "24px",
              width: "360px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                background: colors.primaryLight,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <i className="fa-solid fa-key" style={{ fontSize: "24px", color: colors.primary }} />
            </div>
            
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: colors.gray900 }}>
              인가코드 발급 완료
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: colors.gray500 }}>
              {devices.find(d => d.id === selectedDevice)?.name}
            </p>

            <div
              style={{
                padding: "20px",
                background: colors.gray50,
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: colors.gray500 }}>
                인가코드
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "32px",
                  fontWeight: "700",
                  color: colors.primary,
                  fontFamily: "monospace",
                  letterSpacing: "4px",
                }}
              >
                {authCode}
              </p>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "12px", color: colors.red }}>
              <i className="fa-solid fa-clock" style={{ marginRight: "4px" }} />
              10분 후 만료됩니다. ({authCodeExpiry?.toLocaleTimeString("ko-KR")})
            </p>

            <Button
              variant="primary"
              onClick={() => setShowAuthCodeModal(false)}
              fullWidth
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
