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

export interface PKIUser {
  id: string;
  name: string;
  certificateId: string;
}

export interface VerifyAndLoginResponse {
  success: boolean;
  code: string;
  state: string;
  user: PKIUser;
}

// Agent Health Check
export async function checkAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AGENT_URL}/api/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.ok;
  } catch (err) {
    console.error('❌ [PKI] Agent health check failed:', err);
    return false;
  }
}

// 드라이브 목록 가져오기
export async function getDrives(): Promise<DriveInfo[]> {
  try {
    const response = await fetch(`${AGENT_URL}/api/drives`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      console.error('❌ [PKI] getDrives failed:', response.status);
      throw new Error('Failed to fetch drives');
    }
    const data = await response.json();
    console.log('✅ [PKI] 드라이브 목록:', data);
    return data;
  } catch (err) {
    console.error('❌ [PKI] getDrives error:', err);
    throw err;
  }
}

// 인증서 목록 가져오기
export async function getCertificates(drive: string = 'C'): Promise<Certificate[]> {
  try {
    const response = await fetch(`${AGENT_URL}/api/certificates?drive=${drive}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      console.error('❌ [PKI] getCertificates failed:', response.status);
      throw new Error('Failed to fetch certificates');
    }
    const data = await response.json();
    console.log(`✅ [PKI] ${drive}: 드라이브의 인증서 목록:`, data);
    return data;
  } catch (err) {
    console.error('❌ [PKI] getCertificates error:', err);
    throw err;
  }
}

// 챌린지 생성
async function createChallenge(): Promise<string> {
  try {
    console.log('🔗 [PKI] 챌린지 생성 요청:', PKI_API_URL);
    const response = await fetch(`${PKI_API_URL}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ [PKI] 챌린지 생성 실패:', response.status, error);
      throw new Error(`Failed to create challenge: ${response.status}`);
    }
    const { challenge } = await response.json();
    console.log('✅ [PKI] 챌린지 생성 성공:', { challengeLength: challenge.length });
    return challenge;
  } catch (err) {
    console.error('❌ [PKI] createChallenge error:', err);
    throw err;
  }
}

// Agent에서 서명 생성
async function signChallenge(
  certId: string,
  challenge: string,
  password: string
): Promise<{ signature: string; serialNumber: string }> {
  try {
    console.log('🔗 [PKI] Agent 서명 요청:', { 
      agent: AGENT_URL, 
      certId,
      challengeLength: challenge.length,
    });
    
    const response = await fetch(`${AGENT_URL}/api/certificates/${certId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: challenge, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ [PKI] signChallenge 실패:', response.status, error);
      throw new Error(error.error || `Signature failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [PKI] 서명 생성 성공:', { 
      signatureLength: result.signature.length,
      serialNumber: result.serialNumber,
    });
    return result;
  } catch (err) {
    console.error('❌ [PKI] signChallenge error:', err);
    throw err;
  }
}

// PKI 서버에서 검증 및 Authorization Code 획득
async function verifyAndLogin(
  challenge: string,
  signature: string,
  serialNumber: string
): Promise<VerifyAndLoginResponse> {
  try {
    const requestBody = {
      challenge,
      signature,
      certificateSerialNumber: serialNumber,
      clientId: CLIENT_ID || 'default',
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    };

    console.log('🔗 [PKI] 서명 검증 요청:', { 
      url: `${PKI_API_URL}/api/auth/verify-and-login`,
      challengeLength: challenge.length,
      signatureLength: signature.length,
      serialNumber: serialNumber,
      clientId: requestBody.clientId,
      hasSignature: !!signature,
      signaturePrefix: signature.substring(0, 20) + '...',
    });

    const response = await fetch(`${PKI_API_URL}/api/auth/verify-and-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [PKI] verifyAndLogin 실패:', { 
        status: response.status,
        error: error.error,
        received: error,
      });
      
      // 상태 코드별로 에러 메시지 분류
      if (response.status === 401) {
        throw new Error('INVALID_SIGNATURE');
      } else if (response.status === 404) {
        throw new Error('USER_NOT_FOUND');
      } else {
        throw new Error(error.error || `Verification failed: ${response.status}`);
      }
    }
    
    const result: VerifyAndLoginResponse = await response.json();
    
    // 응답 검증
    if (!result.success || !result.code || !result.user) {
      console.error('❌ [PKI] 응답 형식 오류:', result);
      throw new Error('INVALID_RESPONSE');
    }

    console.log('✅ [PKI] 서명 검증 및 로그인 성공:', { 
      codeLength: result.code?.length || 0,
      userId: result.user?.id,
      userName: result.user?.name,
      certificateId: result.user?.certificateId,
    });
    
    return result;
  } catch (err) {
    console.error('❌ [PKI] verifyAndLogin error:', err);
    throw err;
  }
}

// Authorization Code를 Access Token으로 교환
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  try {
    const requestBody = {
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
    };

    console.log('🔗 [PKI] 토큰 교환 요청:', { 
      url: `${PKI_API_URL}/api/oauth/token`,
      codeLength: code.length,
      clientId: CLIENT_ID,
      hasSecret: !!CLIENT_SECRET,
    });

    const response = await fetch(`${PKI_API_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ [PKI] exchangeCodeForToken 실패:', error);
      throw new Error(error.error || `Token exchange failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [PKI] 토큰 교환 성공:', { 
      tokenLength: result.access_token?.length || 0,
      expiresIn: result.expires_in,
    });
    return result;
  } catch (err) {
    console.error('❌ [PKI] exchangeCodeForToken error:', err);
    throw err;
  }
}

// 전체 인증 플로우
export async function authenticateWithCertificate(
  certId: string,
  password: string
): Promise<{ accessToken: string; user: PKIUser }> {
  try {
    console.log('🔐 [PKI] 인증 시작:', { certId });
    
    // 1. 챌린지 생성
    console.log('1️⃣ 챌린지 생성 중...');
    const challenge = await createChallenge();
    
    // 2. Agent에서 서명 생성
    console.log('2️⃣ Agent에서 서명 생성 중...');
    const { signature, serialNumber } = await signChallenge(certId, challenge, password);
    
    // 3. PKI 서버에서 검증 및 인증 코드 획득
    console.log('3️⃣ PKI 서버에서 서명 검증 중...');
    let verifyResponse: VerifyAndLoginResponse;
    
    try {
      verifyResponse = await verifyAndLogin(challenge, signature, serialNumber);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '인증 실패';
      
      // 에러 타입별 처리
      if (errorMessage === 'INVALID_SIGNATURE') {
        console.error('❌ [PKI] 서명 검증 실패 - Invalid signature');
        throw new Error('서명 검증에 실패했습니다. 비밀번호를 확인하세요.');
      } else if (errorMessage === 'USER_NOT_FOUND') {
        console.error('❌ [PKI] 사용자 미등록');
        throw new Error('등록되지 않은 사용자입니다. 관리자에게 문의하세요.');
      } else if (errorMessage === 'INVALID_RESPONSE') {
        console.error('❌ [PKI] PKI 서버 응답 형식 오류');
        throw new Error('인증 서버에서 올바르지 않은 응답을 받았습니다.');
      } else {
        throw err;
      }
    }
    
    // 4. 토큰 교환
    console.log('4️⃣ 토큰 교환 중...');
    const { access_token, refresh_token } = await exchangeCodeForToken(verifyResponse.code);
    
    // 5. 토큰 저장
    console.log('5️⃣ 토큰 저장 중...');
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(verifyResponse.user));
    }
    
    console.log('✅ [PKI] 인증 완료!');
    return { accessToken: access_token, user: verifyResponse.user };
  } catch (err) {
    console.error('❌ [PKI] 인증 실패:', err);
    throw err;
  }
}

// CN 추출 헬퍼
export function extractCN(dn: string): string {
  try {
    const match = dn.match(/CN=([^,]+)/);
    if (!match) return dn;
    
    const cn = match[1].trim();
    
    // B64_ 접두사가 있으면 Base64 디코딩
    if (cn.startsWith('B64_')) {
      try {
        const base64 = cn.substring(4);
        return decodeURIComponent(escape(atob(base64)));
      } catch {
        console.warn('❌ [PKI] Base64 디코딩 실패:', cn);
        return cn;
      }
    }
    
    return cn;
  } catch (err) {
    console.error('❌ [PKI] extractCN error:', err);
    return dn;
  }
}
