const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'https://localhost:52443';
const PKI_API_URL = process.env.NEXT_PUBLIC_PKI_SERVER_URL || 'https://pki.2check.io';
const CLIENT_ID = process.env.NEXT_PUBLIC_PKI_CLIENT_ID || '';
const CLIENT_SECRET = process.env.NEXT_PUBLIC_PKI_CLIENT_SECRET || '';

export interface Certificate {
  certId: string;
  serialNumber: string;
  serialNumberHash?: string;
  subjectDN: string;
  issuerDN: string;
  notAfter: string;
  isExpired: boolean;
}

export interface DriveInfo {
  letter: string;
  label: string;
  type: 'Fixed' | 'Removable' | 'Network';
}

// Agent Health Check
export async function checkAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AGENT_URL}/api/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 드라이브 목록 가져오기
export async function getDrives(): Promise<DriveInfo[]> {
  const response = await fetch(`${AGENT_URL}/api/drives`, {
    method: 'GET',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Failed to fetch drives');
  return await response.json();
}

// 인증서 목록 가져오기
export async function getCertificates(drive: string = 'C'): Promise<Certificate[]> {
  const response = await fetch(`${AGENT_URL}/api/certificates?drive=${drive}`, {
    method: 'GET',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Failed to fetch certificates');
  return await response.json();
}

// 챌린지 생성
async function createChallenge(): Promise<string> {
  const response = await fetch(`${PKI_API_URL}/api/auth/challenge`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to create challenge');
  const { challenge } = await response.json();
  return challenge;
}

// Agent에서 서명 생성
async function signChallenge(
  certId: string,
  challenge: string,
  password: string
): Promise<{ signature: string; serialNumber: string }> {
  const response = await fetch(`${AGENT_URL}/api/certificates/${certId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: challenge, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signature failed');
  }
  
  return await response.json();
}

// PKI 서버에서 검증 및 Authorization Code 획득
async function verifyAndLogin(
  challenge: string,
  signature: string,
  serialNumber: string
): Promise<{ code: string; user: any }> {
  const response = await fetch(`${PKI_API_URL}/api/auth/verify-and-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge,
      signature,
      certificateSerialNumber: serialNumber,
      clientId: CLIENT_ID,
      redirectUri: window.location.origin,
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Verification failed');
  }
  
  return await response.json();
}

// Authorization Code를 Access Token으로 교환
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(`${PKI_API_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: window.location.origin,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Token exchange failed');
  }
  
  return await response.json();
}

// 전체 인증 플로우
export async function authenticateWithCertificate(
  certId: string,
  password: string
): Promise<{ accessToken: string; user: any }> {
  // 1. 챌린지 생성
  const challenge = await createChallenge();
  
  // 2. Agent에서 서명 생성
  const { signature, serialNumber } = await signChallenge(certId, challenge, password);
  
  // 3. PKI 서버에서 검증 및 인증 코드 획득
  const { code, user } = await verifyAndLogin(challenge, signature, serialNumber);
  
  // 4. 토큰 교환
  const { access_token, refresh_token } = await exchangeCodeForToken(code);
  
  // 5. 토큰 저장
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);
  localStorage.setItem('user', JSON.stringify(user));
  
  return { accessToken: access_token, user };
}

// CN 추출 헬퍼
export function extractCN(dn: string): string {
  const match = dn.match(/CN=([^,]+)/);
  if (!match) return dn;
  
  const cn = match[1].trim();
  
  // B64_ 접두사가 있으면 Base64 디코딩
  if (cn.startsWith('B64_')) {
    try {
      const base64 = cn.substring(4);
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      return cn;
    }
  }
  
  return cn;
}
