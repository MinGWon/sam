import React, { useState, useEffect, useRef } from 'react';
import {
  checkAgentHealth,
  getDrives,
  getCertificates,
  authenticateWithCertificate,
  extractCN,
  Certificate,
  DriveInfo,
} from '@/lib/pki-auth';

type Step = 'loading' | 'no-agent' | 'select' | 'signing' | 'success' | 'error';
type StorageType = 'harddisk' | 'removable' | 'token' | 'cloud';

interface Props {
  onClose: () => void;
  onSuccess: (data: { accessToken: string; user: any }) => void;
}

const colors = {
  primary: "#3182f6",
  primaryLight: "#e8f3ff",
  white: "#ffffff",
  gray50: "#fafbfc",
  gray100: "#f3f5f7",
  gray200: "#eaecef",
  gray300: "#d5d8dc",
  gray400: "#b5b9be",
  gray500: "#8b8f94",
  gray600: "#6b6e72",
  gray700: "#45474a",
  gray900: "#1a1b1d",
  red: "#f04452",
  green: "#30b06e",
};

export default function CertificateLoginModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [storageType, setStorageType] = useState<StorageType>('harddisk');
  const [selectedDrive, setSelectedDrive] = useState<string>('C');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDriveDropdown, setShowDriveDropdown] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const removableDrives = drives.filter(d => d.type === 'Removable');

  useEffect(() => {
    checkAgent();
  }, []);

  useEffect(() => {
    if (step === 'select') {
      if (storageType === 'harddisk') {
        loadCertificates('C');
      } else if (storageType === 'removable' && selectedDrive) {
        loadCertificates(selectedDrive);
      } else if (storageType === 'token' || storageType === 'cloud') {
        setCertificates([]);
        setSelectedCert(null);
      }
    }
  }, [storageType, selectedDrive, step]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDriveDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function checkAgent() {
    setStep('loading');
    try {
      const isHealthy = await checkAgentHealth();
      if (!isHealthy) throw new Error('Agent not available');

      const drivesData = await getDrives();
      setDrives(drivesData);
      
      const removable = drivesData.filter(d => d.type === 'Removable');
      if (removable.length > 0) {
        setSelectedDrive(removable[0].letter);
      }

      await loadCertificates('C');
      setStep('select');
    } catch (err) {
      console.error('Agent connection error:', err);
      setError(err instanceof Error ? err.message : 'Agent 연결 실패');
      setStep('no-agent');
    }
  }

  async function loadCertificates(drive: string) {
    try {
      const certs = await getCertificates(drive);
      setCertificates(certs);
      
      const firstValid = certs.find(c => !c.isExpired);
      setSelectedCert(firstValid ? firstValid.certId : null);
    } catch {
      setCertificates([]);
      setSelectedCert(null);
    }
  }

  function handleStorageTypeChange(type: StorageType) {
    if (type === 'removable') {
      setShowDriveDropdown(!showDriveDropdown);
      if (storageType !== 'removable') {
        setStorageType(type);
        setSelectedCert(null);
        setPassword('');
        setError(null);
        setCertificates([]);
      }
    } else {
      setShowDriveDropdown(false);
      setStorageType(type);
      setSelectedCert(null);
      setPassword('');
      setError(null);
    }
  }

  function showErrorToast(message: string) {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  async function handleSubmit() {
    if (!selectedCert || !password) {
      showErrorToast('인증서와 비밀번호를 입력해주세요.');
      return;
    }

    setStep('signing');
    setError(null);

    try {
      const result = await authenticateWithCertificate(selectedCert, password);
      setStep('success');
      setTimeout(() => {
        onSuccess(result);
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '인증 중 오류 발생';
      if (errorMessage.includes('password') || errorMessage.includes('비밀번호')) {
        showErrorToast('비밀번호가 올바르지 않습니다.');
        setStep('select');
      } else {
        setError(errorMessage);
        setStep('error');
      }
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deviceOptions: { type: StorageType; label: string; icon: React.ReactElement; disabled?: boolean }[] = [
    {
      type: 'harddisk',
      label: '하드디스크',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 15h16" />
          <circle cx="7" cy="18" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'removable',
      label: '이동식디스크',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="6" y="4" width="12" height="16" rx="1" />
          <path d="M9 4V2h6v2" />
          <path d="M6 8h12" />
        </svg>
      ),
    },
    {
      type: 'token',
      label: '보안토큰',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="5" y="10" width="14" height="8" rx="2" />
          <path d="M12 6v4" />
          <circle cx="12" cy="5" r="2" />
        </svg>
      ),
      disabled: true,
    },
    {
      type: 'cloud',
      label: '클라우드',
      icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M19 18H6a4 4 0 01-.5-7.97A6.002 6.002 0 0117.66 8.5a5 5 0 011.34 9.5z" />
        </svg>
      ),
      disabled: true,
    },
  ];

  // 드래그 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <>
      {/* Toast 알림 */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '24px 40px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 1100,
          minWidth: '320px',
          maxWidth: '450px',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span style={{ fontSize: '16px', fontWeight: '500' }}>{toastMessage}</span>
          </div>
          <div style={{ 
            height: '3px', 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            borderRadius: '3px', 
            overflow: 'hidden',
            width: '270px',
            margin: '0 auto',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#f87171',
              animation: 'cooldown 2s linear forwards',
            }} />
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes cooldown {
                from { width: 100%; }
                to { width: 0%; }
              }
            `
          }} />
        </div>
      )}

      {/* 모달 오버레이 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }} onClick={onClose}>
        
        {/* 모달 컨테이너 */}
        <div
          ref={modalRef}
          style={{
            background: colors.white,
            borderRadius: '12px',
            maxWidth: '392px', // 560 * 0.7 = 392px
            width: '70%',
            maxHeight: '90vh',
            minHeight: '600px', // 높이를 약 1.5배로 설정 (왜곡 없이)
            height: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            position: 'fixed',
            left: `calc(50% + ${position.x}px)`,
            top: `calc(50% + ${position.y}px)`,
            transform: 'translate(-50%, -50%)', // scale 제거
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Topbar */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              padding: '9px 16px',
              borderBottom: `1px solid ${colors.gray300}`,
              background: colors.gray200,
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.gray900,
            }}>
              인증서 선택창
            </span>
            <button
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                color: colors.gray600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.gray200;
                e.currentTarget.style.color = colors.gray900;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.gray600;
              }}
            >
              ×
            </button>
          </div>

          {/* 모달 내용 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {step === 'loading' && (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Agent 연결 중...</p>
              </div>
            )}

            {step === 'no-agent' && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Agent 연결 실패</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>2Check Agent가 실행 중인지 확인해주세요.</p>
                
                {error && (
                  <div style={{ backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '11px', color: '#991b1b', fontFamily: 'monospace', textAlign: 'left', wordBreak: 'break-word', width: '100%' }}>
                    {error}
                  </div>
                )}

                <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
                  <p style={{ color: '#92400e', marginBottom: '8px', fontWeight: '500' }}>확인사항:</p>
                  <ul style={{ color: '#92400e', paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                    <li>Agent가 설치되어 실행 중인가요?</li>
                    <li>방화벽이 52443 포트를 차단하고 있나요?</li>
                    <li>자체 서명 인증서를 신뢰했나요?</li>
                  </ul>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <a href="https://pki.2check.io/download/agent" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                    Agent 다운로드
                  </a>
                  <button onClick={checkAgent} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    다시 시도
                  </button>
                </div>
              </div>
            )}

            {step === 'select' && (
              <div style={{ padding: '20px' }}>
                {error && (
                  <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                {/* 저장소 유형 선택 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>인증서 위치</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {deviceOptions.map((option) => (
                      <div key={option.type} style={{ position: 'relative' }} ref={option.type === 'removable' ? dropdownRef : undefined}>
                        <button
                          onClick={() => !option.disabled && handleStorageTypeChange(option.type)}
                          disabled={option.disabled}
                          style={{
                            width: '100%',
                            padding: '12px 8px',
                            borderRadius: '8px',
                            border: storageType === option.type ? '2px solid #2563eb' : '1px solid #d1d5db',
                            backgroundColor: option.disabled ? '#f3f4f6' : storageType === option.type ? '#eff6ff' : 'white',
                            color: option.disabled ? '#9ca3af' : storageType === option.type ? '#2563eb' : '#374151',
                            fontSize: '11px',
                            fontWeight: storageType === option.type ? '600' : '400',
                            cursor: option.disabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: option.disabled ? 0.6 : 1,
                          }}
                        >
                          {option.icon}
                          <span style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: '1.3' }}>
                            {option.label}
                          </span>
                        </button>

                        {/* 이동식디스크 드롭다운 */}
                        {option.type === 'removable' && showDriveDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: '4px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 100,
                            minWidth: '140px',
                            overflow: 'hidden',
                          }}>
                            <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>
                              드라이브 선택
                            </div>
                            {removableDrives.length === 0 ? (
                              <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                                이동식 디스크 없음
                              </div>
                            ) : (
                              removableDrives.map((drive) => (
                                <button
                                  key={drive.letter}
                                  onClick={() => {
                                    setSelectedDrive(drive.letter);
                                    setShowDriveDropdown(false);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: 'none',
                                    backgroundColor: selectedDrive === drive.letter ? '#eff6ff' : 'white',
                                    color: selectedDrive === drive.letter ? '#2563eb' : '#374151',
                                    fontSize: '13px',
                                    fontWeight: selectedDrive === drive.letter ? '600' : '400',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderBottom: '1px solid #f3f4f6',
                                  }}
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <rect x="6" y="4" width="12" height="16" rx="1" />
                                    <path d="M9 4V2h6v2" />
                                  </svg>
                                  {drive.letter}: {drive.label || '이동식 디스크'}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 보안토큰/클라우드 준비중 메시지 */}
                {(storageType === 'token' || storageType === 'cloud') && (
                  <div style={{ marginBottom: '16px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      {storageType === 'token' ? '보안토큰' : '클라우드'} 인증서는 준비 중입니다.
                    </p>
                  </div>
                )}

                {/* 인증서 목록 */}
                {(storageType === 'harddisk' || storageType === 'removable') && (
                  <>
                    {certificates.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>저장된 인증서가 없습니다.</p>
                      </div>
                    ) : (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                              <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', width: '32px' }}>
                                <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              </th>
                              <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>이름</th>
                              <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>발급자</th>
                              <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>만료일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {certificates.map((cert, index) => (
                              <tr
                                key={cert.certId}
                                onClick={() => !cert.isExpired && setSelectedCert(cert.certId)}
                                style={{
                                  cursor: cert.isExpired ? 'not-allowed' : 'pointer',
                                  backgroundColor: selectedCert === cert.certId ? '#eff6ff' : 'white',
                                  opacity: cert.isExpired ? 0.5 : 1,
                                  borderBottom: index < certificates.length - 1 ? '1px solid #f3f4f6' : 'none',
                                  transition: 'background-color 0.15s',
                                }}
                              >
                                <td style={{ padding: '6px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                                  {cert.isExpired ? (
                                    <svg width="16" height="16" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" fill="none" stroke={selectedCert === cert.certId ? '#2563eb' : '#16a34a'} strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                  )}
                                </td>
                                <td style={{ padding: '6px', borderRight: '1px solid #e5e7eb', fontWeight: '500', color: selectedCert === cert.certId ? '#2563eb' : '#111827', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {extractCN(cert.subjectDN)}
                                </td>
                                <td style={{ padding: '6px', borderRight: '1px solid #e5e7eb', color: '#6b7280', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {extractCN(cert.issuerDN) === '2Check Intermediate CA' ? '인증센터' : extractCN(cert.issuerDN)}
                                </td>
                                <td style={{ padding: '6px', color: '#6b7280' }}>
                                  {new Date(cert.notAfter).toLocaleDateString('ko-KR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 'signing' && (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>인증 중...</p>
              </div>
            )}

            {step === 'success' && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>인증 성공!</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>잠시 후 이동합니다...</p>
              </div>
            )}

            {step === 'error' && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>인증 실패</h3>
                <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '20px', whiteSpace: 'pre-line' }}>{error}</p>
                <button onClick={() => setStep('select')} style={{ padding: '10px 24px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  다시 시도
                </button>
              </div>
            )}
          </div>

          {/* Footer: Password and Buttons */}
          {step === 'select' && (storageType === 'harddisk' || storageType === 'removable') && certificates.length > 0 && (
            <div style={{ 
              padding: '16px', 
              borderTop: `1px solid ${colors.gray200}`, 
              background: colors.white 
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>인증서 비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  placeholder="비밀번호를 입력하세요"
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  취소
                </button>
                <button onClick={handleSubmit} disabled={!selectedCert || !password} style={{ flex: 2, padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: (!selectedCert || !password) ? 0.5 : 1 }}>
                  로그인
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </>
  );
}
