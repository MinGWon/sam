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
type StorageType = 'harddisk' | 'removable';

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
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDriveDropdown, setShowDriveDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      setSelectedCert(firstValid || null);
    } catch {
      setCertificates([]);
      setSelectedCert(null);
    }
  }

  async function handleSubmit() {
    if (!selectedCert || !password) {
      setError('인증서와 비밀번호를 선택/입력해주세요.');
      return;
    }

    setStep('signing');
    setError(null);

    try {
      const result = await authenticateWithCertificate(selectedCert.certId, password);
      setStep('success');
      setTimeout(() => {
        onSuccess(result);
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '인증 중 오류 발생';
      if (errorMessage.includes('password') || errorMessage.includes('비밀번호')) {
        setError('비밀번호가 올바르지 않습니다.');
      } else {
        setError(errorMessage);
      }
      setStep('error');
    }
  }

  return (
    <>
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
        <div style={{
          background: colors.white,
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }} onClick={e => e.stopPropagation()}>

          {/* 로딩 상태 */}
          {step === 'loading' && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid ' + colors.gray200,
                borderTop: '3px solid ' + colors.primary,
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: colors.gray500, fontSize: '14px', margin: 0 }}>Agent 연결 중...</p>
            </div>
          )}

          {/* Agent 없음 상태 */}
          {step === 'no-agent' && (
            <div style={{ padding: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#fef3c7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', textAlign: 'center' }}>Agent 연결 실패</h3>
              <p style={{ color: colors.gray600, fontSize: '14px', margin: '0 0 12px', textAlign: 'center' }}>2Check Agent가 실행 중인지 확인해주세요.</p>
              
              {error && (
                <div style={{
                  background: '#fee2e2',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: colors.red,
                  fontFamily: 'monospace',
                }}>
                  {error}
                </div>
              )}

              <div style={{
                background: '#fef3c7',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12px',
              }}>
                <p style={{ color: '#92400e', margin: '0 0 8px', fontWeight: '600' }}>확인사항:</p>
                <ul style={{ color: '#92400e', paddingLeft: '20px', margin: 0 }}>
                  <li>Agent가 설치되고 실행 중인가요?</li>
                  <li>포트 52443이 열려있나요?</li>
                  <li>자체 서명 인증서를 신뢰했나요?</li>
                </ul>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href="https://pki.2check.io/download/agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: colors.primary,
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  Agent 다운로드
                </a>
                <button
                  onClick={checkAgent}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: colors.white,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* 인증서 선택 상태 */}
          {step === 'select' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700' }}>인증서 로그인</h2>
              
              {error && (
                <div style={{
                  padding: '10px',
                  background: '#fee2e2',
                  border: `1px solid ${colors.red}`,
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: colors.red,
                  fontSize: '13px',
                }}>
                  {error}
                </div>
              )}

              {/* 저장소 탭 */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', borderBottom: `1px solid ${colors.gray200}` }}>
                <button
                  onClick={() => {
                    setStorageType('harddisk');
                    setShowDriveDropdown(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    background: storageType === 'harddisk' ? colors.primary : 'transparent',
                    color: storageType === 'harddisk' ? 'white' : colors.gray700,
                    border: 'none',
                    borderBottom: storageType === 'harddisk' ? `3px solid ${colors.primary}` : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="fa-solid fa-hdd" style={{ marginRight: '6px' }} />
                  하드디스크
                </button>
                <button
                  onClick={() => setStorageType('removable')}
                  style={{
                    padding: '10px 16px',
                    background: storageType === 'removable' ? colors.primary : 'transparent',
                    color: storageType === 'removable' ? 'white' : colors.gray700,
                    border: 'none',
                    borderBottom: storageType === 'removable' ? `3px solid ${colors.primary}` : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="fa-solid fa-usb" style={{ marginRight: '6px' }} />
                  이동식디스크
                </button>
              </div>

              {/* 이동식 디스크 선택 */}
              {storageType === 'removable' && (
                <div style={{ marginBottom: '16px' }} ref={dropdownRef}>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowDriveDropdown(!showDriveDropdown)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: '8px',
                        background: colors.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {selectedDrive ? `${selectedDrive}: ` : '드라이브 선택'}
                        {drives.find(d => d.letter === selectedDrive)?.label}
                      </span>
                      <i className={`fa-solid fa-chevron-${showDriveDropdown ? 'up' : 'down'}`} style={{ fontSize: '11px' }} />
                    </button>

                    {showDriveDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: colors.white,
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        overflow: 'hidden',
                      }}>
                        {removableDrives.length === 0 ? (
                          <div style={{ padding: '12px', fontSize: '12px', color: colors.gray400, textAlign: 'center' }}>이동식 디스크 없음</div>
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
                                borderBottom: `1px solid ${colors.gray100}`,
                                background: selectedDrive === drive.letter ? colors.primaryLight : colors.white,
                                color: selectedDrive === drive.letter ? colors.primary : colors.gray700,
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: selectedDrive === drive.letter ? '600' : '400',
                                transition: 'all 0.2s',
                              }}
                            >
                              <i className="fa-solid fa-usb" style={{ marginRight: '8px', fontSize: '12px' }} />
                              {drive.letter}: {drive.label || '이동식 디스크'}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 인증서 목록 */}
              {certificates.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: colors.gray50,
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <i className="fa-solid fa-certificate" style={{ fontSize: '32px', color: colors.gray300, marginBottom: '8px', display: 'block' }} />
                  <p style={{ color: colors.gray600, fontSize: '13px', margin: 0 }}>저장된 인증서가 없습니다.</p>
                </div>
              ) : (
                <div style={{
                  border: `1px solid ${colors.gray200}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}>
                  {certificates.map((cert, index) => (
                    <div
                      key={cert.certId}
                      onClick={() => !cert.isExpired && setSelectedCert(cert)}
                      style={{
                        padding: '12px',
                        borderBottom: index < certificates.length - 1 ? `1px solid ${colors.gray100}` : 'none',
                        background: selectedCert?.certId === cert.certId ? colors.primaryLight : colors.white,
                        cursor: cert.isExpired ? 'not-allowed' : 'pointer',
                        opacity: cert.isExpired ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {cert.isExpired ? (
                        <svg width="16" height="16" fill="none" stroke={colors.red} strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke={selectedCert?.certId === cert.certId ? colors.primary : colors.green} strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: selectedCert?.certId === cert.certId ? '600' : '500',
                          color: selectedCert?.certId === cert.certId ? colors.primary : colors.gray900,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {extractCN(cert.subjectDN)}
                        </div>
                        <div style={{ fontSize: '11px', color: colors.gray500 }}>
                          만료: {new Date(cert.notAfter).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 비밀번호 입력 */}
              {certificates.length > 0 && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: colors.gray700 }}>비밀번호</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="비밀번호를 입력하세요"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={onClose}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: colors.white,
                        color: colors.gray700,
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.gray50;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.white;
                      }}
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleSubmit} 
                      disabled={!selectedCert || !password}
                      style={{
                        flex: 2,
                        padding: '10px',
                        background: selectedCert && password ? colors.primary : colors.gray300,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: selectedCert && password ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCert && password) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(49, 130, 246, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <i className="fa-solid fa-key" style={{ marginRight: '6px' }} />
                      로그인
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 서명 중 상태 */}
          {step === 'signing' && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid ' + colors.gray200,
                borderTop: '3px solid ' + colors.primary,
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: colors.gray600, fontSize: '13px', margin: 0 }}>인증 중입니다...</p>
            </div>
          )}

          {/* 성공 상태 */}
          {step === 'success' && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" fill="none" stroke={colors.green} strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>인증 성공!</h3>
              <p style={{ color: colors.gray600, fontSize: '13px', margin: 0 }}>로그인 중입니다...</p>
            </div>
          )}

          {/* 오류 상태 */}
          {step === 'error' && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" fill="none" stroke={colors.red} strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>인증 실패</h3>
              <p style={{ color: colors.red, fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
              <button
                onClick={() => setStep('select')}
                style={{
                  padding: '10px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </>
  );
}
